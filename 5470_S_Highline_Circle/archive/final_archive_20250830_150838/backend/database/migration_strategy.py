#!/usr/bin/env python3
"""
Migration Strategy for Consolidating Multiple Data Sources
============================================================
Consolidates 690+ items from:
- Johnson Storage & Moving PDF (690 items)
- Local SQLite Database (134 items, $213,300)
- Production API (239 items, $374,242)
- Frontend (0 items - broken)

Target: Single SQLite database with full audit trail
"""

import sqlite3
import hashlib
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class InventoryMigration:
    """Handles migration of inventory data from multiple sources to single database"""
    
    def __init__(self, target_db_path: str):
        """Initialize migration with target database path"""
        self.target_db = target_db_path
        self.conn = None
        self.cursor = None
        self.migration_stats = {
            'total_processed': 0,
            'successful': 0,
            'duplicates': 0,
            'errors': 0,
            'missing_items': []
        }
        
    def connect(self):
        """Connect to target database"""
        self.conn = sqlite3.connect(self.target_db)
        self.conn.row_factory = sqlite3.Row
        self.cursor = self.conn.cursor()
        logger.info(f"Connected to database: {self.target_db}")
        
    def disconnect(self):
        """Close database connection"""
        if self.conn:
            self.conn.commit()
            self.conn.close()
            logger.info("Database connection closed")
            
    def initialize_database(self, schema_file: str):
        """Create database schema from SQL file"""
        logger.info("Initializing database schema...")
        with open(schema_file, 'r') as f:
            schema_sql = f.read()
        self.cursor.executescript(schema_sql)
        self.conn.commit()
        logger.info("Database schema created successfully")
        
    def generate_uuid(self) -> str:
        """Generate unique identifier for items"""
        return str(uuid.uuid4())
    
    def calculate_checksum(self, item: Dict) -> str:
        """Calculate MD5 checksum for data integrity"""
        checksum_fields = [
            str(item.get('name', '')),
            str(item.get('description', '')),
            str(item.get('serial_number', '')),
            str(item.get('purchase_price', 0))
        ]
        checksum_string = '|'.join(checksum_fields)
        return hashlib.md5(checksum_string.encode()).hexdigest()
    
    def log_migration(self, source: str, status: str, details: Dict):
        """Log migration progress"""
        self.cursor.execute("""
            INSERT INTO migration_log 
            (source_database, source_table, source_count, migrated_count, 
             skipped_count, error_count, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            source,
            details.get('table', 'items'),
            details.get('source_count', 0),
            details.get('migrated_count', 0),
            details.get('skipped_count', 0),
            details.get('error_count', 0),
            status,
            json.dumps(details.get('notes', {}))
        ))
        self.conn.commit()
        
    def migrate_from_sqlite(self, source_db_path: str, source_name: str):
        """Migrate items from SQLite database"""
        logger.info(f"Starting migration from SQLite: {source_db_path}")
        
        # Connect to source database
        source_conn = sqlite3.connect(source_db_path)
        source_conn.row_factory = sqlite3.Row
        source_cursor = source_conn.cursor()
        
        # Get data source ID
        self.cursor.execute(
            "SELECT id FROM data_sources WHERE source_name = ?", 
            (source_name,)
        )
        data_source_id = self.cursor.fetchone()[0]
        
        # Fetch all items from source
        source_cursor.execute("SELECT * FROM items")
        items = source_cursor.fetchall()
        
        migration_details = {
            'source_count': len(items),
            'migrated_count': 0,
            'skipped_count': 0,
            'error_count': 0,
            'notes': {}
        }
        
        for item in items:
            try:
                # Check for existing item by name and description
                self.cursor.execute("""
                    SELECT id, checksum FROM items 
                    WHERE name = ? AND description = ?
                """, (item['name'], item['description']))
                
                existing = self.cursor.fetchone()
                
                if existing:
                    # Item exists - check if it needs updating
                    new_checksum = self.calculate_checksum(dict(item))
                    if existing['checksum'] != new_checksum:
                        # Update existing item
                        self.update_item(existing['id'], dict(item), data_source_id)
                        migration_details['migrated_count'] += 1
                    else:
                        migration_details['skipped_count'] += 1
                else:
                    # Insert new item
                    self.insert_item(dict(item), data_source_id)
                    migration_details['migrated_count'] += 1
                    
            except Exception as e:
                logger.error(f"Error migrating item {item.get('name', 'unknown')}: {e}")
                migration_details['error_count'] += 1
                migration_details['notes'][item.get('id', 'unknown')] = str(e)
                
        # Log migration results
        self.log_migration(
            source_name, 
            'Completed', 
            migration_details
        )
        
        source_conn.close()
        logger.info(f"Migration from {source_name} completed: {migration_details}")
        
    def migrate_from_api(self, api_url: str, api_key: str):
        """Migrate items from production API"""
        import requests
        
        logger.info(f"Starting migration from API: {api_url}")
        
        # Get data source ID
        self.cursor.execute(
            "SELECT id FROM data_sources WHERE source_name = ?", 
            ("Production API (Fly.io)",)
        )
        data_source_id = self.cursor.fetchone()[0]
        
        # Fetch items from API
        headers = {'Authorization': f'Bearer {api_key}'}
        response = requests.get(f"{api_url}/items", headers=headers)
        items = response.json()
        
        migration_details = {
            'source_count': len(items),
            'migrated_count': 0,
            'skipped_count': 0,
            'error_count': 0,
            'notes': {}
        }
        
        for item in items:
            try:
                # Map API fields to database fields
                mapped_item = self.map_api_item(item)
                
                # Check for existing item
                self.cursor.execute("""
                    SELECT id FROM items 
                    WHERE legacy_id = ? AND data_source_id = ?
                """, (item.get('id'), data_source_id))
                
                existing = self.cursor.fetchone()
                
                if not existing:
                    self.insert_item(mapped_item, data_source_id)
                    migration_details['migrated_count'] += 1
                else:
                    migration_details['skipped_count'] += 1
                    
            except Exception as e:
                logger.error(f"Error migrating API item {item.get('id', 'unknown')}: {e}")
                migration_details['error_count'] += 1
                
        self.log_migration("Production API", "Completed", migration_details)
        logger.info(f"API migration completed: {migration_details}")
        
    def migrate_from_moving_company(self, csv_path: str):
        """Import items from Johnson Storage & Moving manifest"""
        import csv
        
        logger.info(f"Importing moving company manifest: {csv_path}")
        
        # Get data source ID
        self.cursor.execute(
            "SELECT id FROM data_sources WHERE source_name = ?", 
            ("Johnson Storage & Moving PDF",)
        )
        data_source_id = self.cursor.fetchone()[0]
        
        with open(csv_path, 'r') as f:
            reader = csv.DictReader(f)
            items = list(reader)
            
        migration_details = {
            'source_count': len(items),
            'migrated_count': 0,
            'matched_count': 0,
            'new_count': 0,
            'notes': {}
        }
        
        for item in items:
            try:
                # Try to match with existing items
                matches = self.find_matching_items(item)
                
                if matches:
                    # Update the best match with moving company ID
                    best_match = matches[0]
                    self.cursor.execute("""
                        UPDATE items 
                        SET moving_company_id = ?, 
                            box_number = ?,
                            is_verified = 1,
                            verification_date = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (
                        item.get('moving_id'),
                        item.get('box_number'),
                        best_match['id']
                    ))
                    migration_details['matched_count'] += 1
                else:
                    # Create new item from moving manifest
                    new_item = {
                        'uuid': self.generate_uuid(),
                        'moving_company_id': item.get('moving_id'),
                        'name': item.get('description', 'Unknown Item'),
                        'description': item.get('notes'),
                        'box_number': item.get('box_number'),
                        'room_id': self.get_room_id(item.get('room')),
                        'condition': item.get('condition', 'Good'),
                        'data_source_id': data_source_id,
                        'is_verified': 0  # Needs verification
                    }
                    self.insert_item(new_item, data_source_id)
                    migration_details['new_count'] += 1
                    
                migration_details['migrated_count'] += 1
                
            except Exception as e:
                logger.error(f"Error processing moving item: {e}")
                migration_details['error_count'] += 1
                
        self.log_migration("Moving Company Manifest", "Completed", migration_details)
        logger.info(f"Moving manifest import completed: {migration_details}")
        
    def find_matching_items(self, moving_item: Dict) -> List[Dict]:
        """Find potential matches for moving company items"""
        description = moving_item.get('description', '')
        
        # Search strategies in order of preference
        queries = [
            # Exact name match
            ("SELECT * FROM items WHERE LOWER(name) = LOWER(?)", (description,)),
            # Partial name match
            ("SELECT * FROM items WHERE LOWER(name) LIKE LOWER(?)", (f"%{description}%",)),
            # Description match
            ("SELECT * FROM items WHERE LOWER(description) LIKE LOWER(?)", (f"%{description}%",))
        ]
        
        for query, params in queries:
            self.cursor.execute(query, params)
            matches = self.cursor.fetchall()
            if matches:
                return [dict(m) for m in matches]
                
        return []
        
    def insert_item(self, item: Dict, data_source_id: int) -> int:
        """Insert new item into database"""
        item['uuid'] = item.get('uuid', self.generate_uuid())
        item['checksum'] = self.calculate_checksum(item)
        item['data_source_id'] = data_source_id
        item['imported_at'] = datetime.now().isoformat()
        
        columns = ', '.join(item.keys())
        placeholders = ', '.join(['?' for _ in item])
        
        self.cursor.execute(
            f"INSERT INTO items ({columns}) VALUES ({placeholders})",
            list(item.values())
        )
        
        item_id = self.cursor.lastrowid
        
        # Create default decision record
        self.cursor.execute("""
            INSERT INTO item_decisions (item_id, decision, decided_by)
            VALUES (?, 'Pending', 'migration')
        """, (item_id,))
        
        return item_id
        
    def update_item(self, item_id: int, updates: Dict, data_source_id: int):
        """Update existing item"""
        updates['checksum'] = self.calculate_checksum(updates)
        updates['updated_at'] = datetime.now().isoformat()
        updates['updated_by'] = 'migration'
        
        set_clause = ', '.join([f"{k} = ?" for k in updates.keys()])
        values = list(updates.values()) + [item_id]
        
        self.cursor.execute(
            f"UPDATE items SET {set_clause} WHERE id = ?",
            values
        )
        
    def map_api_item(self, api_item: Dict) -> Dict:
        """Map API response fields to database schema"""
        return {
            'legacy_id': api_item.get('id'),
            'name': api_item.get('title', api_item.get('name')),
            'description': api_item.get('description'),
            'category_id': self.get_category_id(api_item.get('category')),
            'room_id': self.get_room_id(api_item.get('location')),
            'condition': api_item.get('condition', 'Good'),
            'purchase_price': api_item.get('purchasePrice'),
            'estimated_value': api_item.get('currentValue'),
            'status': 'Active' if not api_item.get('sold') else 'Sold'
        }
        
    def get_room_id(self, room_name: Optional[str]) -> Optional[int]:
        """Get room ID from name"""
        if not room_name:
            return None
            
        self.cursor.execute(
            "SELECT id FROM rooms WHERE LOWER(name) = LOWER(?)", 
            (room_name,)
        )
        result = self.cursor.fetchone()
        return result[0] if result else None
        
    def get_category_id(self, category_name: Optional[str]) -> Optional[int]:
        """Get category ID from name"""
        if not category_name:
            return None
            
        self.cursor.execute(
            "SELECT id FROM categories WHERE LOWER(name) = LOWER(?)", 
            (category_name,)
        )
        result = self.cursor.fetchone()
        return result[0] if result else None
        
    def reconcile_missing_items(self):
        """Identify and report missing items"""
        logger.info("Reconciling missing items...")
        
        # Check against expected 690 items
        self.cursor.execute("""
            SELECT COUNT(DISTINCT moving_company_id) as verified_count
            FROM items 
            WHERE moving_company_id IS NOT NULL
        """)
        verified_count = self.cursor.fetchone()[0]
        
        missing_count = 690 - verified_count
        
        if missing_count > 0:
            logger.warning(f"Missing {missing_count} items from moving manifest")
            
            # Get unverified high-value items
            self.cursor.execute("""
                SELECT id, name, estimated_value
                FROM items
                WHERE moving_company_id IS NULL
                AND (is_high_value = 1 OR estimated_value > 1000)
                ORDER BY estimated_value DESC
            """)
            
            unverified_valuable = self.cursor.fetchall()
            
            for item in unverified_valuable:
                logger.warning(
                    f"Unverified high-value item: {item['name']} "
                    f"(${item['estimated_value']})"
                )
                
        # Create reconciliation report
        self.cursor.execute("""
            INSERT INTO audit_log (table_name, record_id, action, notes)
            VALUES ('reconciliation', 0, 'INSERT', ?)
        """, (json.dumps({
            'timestamp': datetime.now().isoformat(),
            'verified_items': verified_count,
            'missing_items': missing_count,
            'total_expected': 690
        }),))
        
        logger.info(f"Reconciliation complete: {verified_count}/690 items verified")
        
    def generate_report(self) -> Dict:
        """Generate migration summary report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'database': self.target_db,
            'statistics': {},
            'data_sources': [],
            'high_value_items': [],
            'missing_items': [],
            'recommendations': []
        }
        
        # Get overall statistics
        self.cursor.execute("""
            SELECT 
                COUNT(*) as total_items,
                COUNT(DISTINCT moving_company_id) as verified_items,
                SUM(estimated_value) as total_value,
                COUNT(CASE WHEN is_high_value = 1 THEN 1 END) as high_value_count
            FROM items
        """)
        stats = dict(self.cursor.fetchone())
        report['statistics'] = stats
        
        # Get data source summary
        self.cursor.execute("""
            SELECT 
                ds.source_name,
                COUNT(i.id) as item_count,
                SUM(i.estimated_value) as total_value
            FROM data_sources ds
            LEFT JOIN items i ON i.data_source_id = ds.id
            GROUP BY ds.id
        """)
        report['data_sources'] = [dict(row) for row in self.cursor.fetchall()]
        
        # Get top high-value items
        self.cursor.execute("""
            SELECT name, estimated_value, room_id, status
            FROM items
            WHERE is_high_value = 1 OR estimated_value > 5000
            ORDER BY estimated_value DESC
            LIMIT 10
        """)
        report['high_value_items'] = [dict(row) for row in self.cursor.fetchall()]
        
        # Add recommendations
        if stats['verified_items'] < 690:
            report['recommendations'].append(
                f"Verify {690 - stats['verified_items']} missing items from moving manifest"
            )
            
        if stats['total_items'] > 690:
            report['recommendations'].append(
                "Review and deduplicate items - more items than moving manifest"
            )
            
        return report
        
    def run_full_migration(self, config: Dict):
        """Execute complete migration process"""
        logger.info("Starting full migration process...")
        
        try:
            # Initialize database
            self.connect()
            if config.get('initialize_schema'):
                self.initialize_database(config['schema_file'])
            
            # Migrate from each source
            if config.get('sqlite_sources'):
                for source in config['sqlite_sources']:
                    self.migrate_from_sqlite(source['path'], source['name'])
                    
            if config.get('api_source'):
                self.migrate_from_api(
                    config['api_source']['url'],
                    config['api_source']['key']
                )
                
            if config.get('moving_manifest'):
                self.migrate_from_moving_company(config['moving_manifest'])
                
            # Reconcile and report
            self.reconcile_missing_items()
            report = self.generate_report()
            
            # Save report
            report_path = Path(config.get('report_path', 'migration_report.json'))
            with open(report_path, 'w') as f:
                json.dump(report, f, indent=2)
                
            logger.info(f"Migration completed. Report saved to {report_path}")
            print(json.dumps(report, indent=2))
            
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            raise
            
        finally:
            self.disconnect()
            

def main():
    """Main migration execution"""
    config = {
        'schema_file': 'database/schema.sql',
        'initialize_schema': True,
        'sqlite_sources': [
            {
                'name': 'Local SQLite Database',
                'path': 'database/inventory.db'
            }
        ],
        'api_source': {
            'url': 'https://inventory-api.fly.dev',
            'key': 'your-api-key-here'  # From AWS Secrets Manager
        },
        'moving_manifest': 'data/johnson_storage_moving.csv',
        'report_path': 'migration_report.json'
    }
    
    migration = InventoryMigration('database/inventory_master.db')
    migration.run_full_migration(config)
    

if __name__ == '__main__':
    main()