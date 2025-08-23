#!/usr/bin/env python3
"""
Setup production database with schema and data
"""

import os
import subprocess
import time
import psycopg2
from psycopg2.extras import RealDictCursor

def wait_for_database(database_url, max_retries=30, retry_delay=2):
    """Wait for database to be available"""
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(database_url)
            conn.close()
            print("✅ Database is available")
            return True
        except Exception as e:
            print(f"Database not ready (attempt {attempt + 1}/{max_retries}): {e}")
            time.sleep(retry_delay)
    
    print("❌ Database failed to become available")
    return False

def setup_database():
    """Setup production database with schema and real data"""
    
    # Get database URL from environment or AWS secret
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        try:
            result = subprocess.run([
                'aws', 'secretsmanager', 'get-secret-value',
                '--secret-id', '5470-inventory/database-url',
                '--query', 'SecretString',
                '--output', 'text'
            ], capture_output=True, text=True, check=True)
            database_url = result.stdout.strip()
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to get database URL from AWS: {e}")
            return False
    
    print(f"Setting up database: {database_url.split('@')[1] if '@' in database_url else 'unknown'}")
    
    # Wait for database to be available
    if not wait_for_database(database_url):
        return False
    
    try:
        # Connect to database
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        # Check if database is already set up
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'items'
        """)
        
        if cursor.fetchone()[0] > 0:
            cursor.execute("SELECT COUNT(*) FROM items")
            item_count = cursor.fetchone()[0]
            if item_count > 0:
                print(f"✅ Database already contains {item_count} items, skipping setup")
                conn.close()
                return True
        
        print("🔧 Setting up database schema...")
        
        # Read and execute schema
        schema_path = os.path.join(os.path.dirname(__file__), '..', 'schema.sql')
        # Try alternative path if running in container
        if not os.path.exists(schema_path):
            schema_path = '/app/schema.sql'
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
        
        cursor.execute(schema_sql)
        conn.commit()
        print("✅ Schema created successfully")
        
        # Import data using our existing backup
        print("📥 Importing data from backup...")
        backup_path = os.path.join(os.path.dirname(__file__), '..', 'database_backup.sql')
        
        if os.path.exists(backup_path):
            # Use psql to import the backup (more reliable for large imports)
            env = os.environ.copy()
            env['PGPASSWORD'] = database_url.split(':')[2].split('@')[0]
            
            # Parse connection details from URL
            # postgresql://user:pass@host:port/db
            url_parts = database_url.replace('postgresql://', '').split('/')
            db_name = url_parts[-1]
            host_parts = url_parts[0].split('@')[-1].split(':')
            host = host_parts[0]
            port = host_parts[1] if len(host_parts) > 1 else '5432'
            user = url_parts[0].split('@')[0].split(':')[0]
            
            result = subprocess.run([
                'psql', 
                '-h', host,
                '-p', port,
                '-U', user,
                '-d', db_name,
                '-f', backup_path,
                '--quiet'
            ], env=env, capture_output=True, text=True)
            
            if result.returncode == 0:
                print("✅ Data imported successfully from backup")
            else:
                print(f"⚠️  Backup import failed: {result.stderr}")
                print("Falling back to Excel import...")
                return import_from_excel(database_url)
        else:
            print("⚠️  No backup file found, importing from Excel...")
            return import_from_excel(database_url)
        
        # Verify import
        cursor.execute("SELECT COUNT(*) FROM items")
        item_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT SUM(purchase_price) FROM items WHERE purchase_price IS NOT NULL")
        total_value = cursor.fetchone()[0]
        
        print(f"✅ Database setup complete!")
        print(f"   Items: {item_count}")
        print(f"   Total Value: ${total_value:,.2f}" if total_value else "   Total Value: N/A")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        return False

def import_from_excel(database_url):
    """Import data from Excel file directly"""
    try:
        # Set environment variable for import script
        env = os.environ.copy()
        env['DATABASE_URL'] = database_url
        
        # Run import script
        script_path = os.path.join(os.path.dirname(__file__), 'import-excel-data.py')
        excel_path = os.path.join(os.path.dirname(__file__), '5470_furnishings_inventory.xlsx')
        
        # Copy Excel file if it doesn't exist in scripts directory
        if not os.path.exists(excel_path):
            source_excel = os.path.join(os.path.dirname(__file__), '..', '5470_furnishings_inventory.xlsx')
            if os.path.exists(source_excel):
                subprocess.run(['cp', source_excel, excel_path], check=True)
        
        result = subprocess.run([
            'python3', script_path
        ], env=env, capture_output=True, text=True, cwd=os.path.dirname(__file__))
        
        if result.returncode == 0:
            print("✅ Excel import completed successfully")
            print(result.stdout)
            return True
        else:
            print(f"❌ Excel import failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Excel import error: {e}")
        return False

if __name__ == "__main__":
    success = setup_database()
    exit(0 if success else 1)