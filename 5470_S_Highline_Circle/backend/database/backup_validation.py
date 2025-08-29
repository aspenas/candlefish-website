#!/usr/bin/env python3
"""
Backup and Validation Strategy for Inventory Database
======================================================
Ensures data integrity and prevents future data loss
"""

import sqlite3
import hashlib
import json
import shutil
import gzip
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DatabaseBackup:
    """Handles database backup and archival operations"""
    
    def __init__(self, db_path: str, backup_dir: str = "backups"):
        """Initialize backup manager"""
        self.db_path = Path(db_path)
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(exist_ok=True)
        
    def create_backup(self, compress: bool = True) -> str:
        """Create timestamped backup of database"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"inventory_backup_{timestamp}.db"
        
        if compress:
            backup_name += ".gz"
            backup_path = self.backup_dir / backup_name
            
            # Compress and backup
            with open(self.db_path, 'rb') as f_in:
                with gzip.open(backup_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
        else:
            backup_path = self.backup_dir / backup_name
            shutil.copy2(self.db_path, backup_path)
            
        logger.info(f"Backup created: {backup_path}")
        return str(backup_path)
        
    def restore_backup(self, backup_path: str, target_path: Optional[str] = None):
        """Restore database from backup"""
        backup_file = Path(backup_path)
        target = Path(target_path) if target_path else self.db_path
        
        if backup_file.suffix == '.gz':
            # Decompress backup
            with gzip.open(backup_file, 'rb') as f_in:
                with open(target, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
        else:
            shutil.copy2(backup_file, target)
            
        logger.info(f"Database restored from {backup_path} to {target}")
        
    def archive_old_database(self, db_path: str, archive_reason: str):
        """Archive old database with metadata"""
        source_path = Path(db_path)
        if not source_path.exists():
            logger.warning(f"Database not found for archival: {db_path}")
            return
            
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        archive_dir = self.backup_dir / "archives"
        archive_dir.mkdir(exist_ok=True)
        
        # Create archive with metadata
        archive_name = f"{source_path.stem}_archived_{timestamp}"
        archive_path = archive_dir / f"{archive_name}.db"
        metadata_path = archive_dir / f"{archive_name}.json"
        
        # Copy database
        shutil.copy2(source_path, archive_path)
        
        # Save metadata
        conn = sqlite3.connect(str(source_path))
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM items")
        item_count = cursor.fetchone()[0]
        cursor.execute("SELECT SUM(estimated_value) FROM items")
        total_value = cursor.fetchone()[0] or 0
        conn.close()
        
        metadata = {
            'original_path': str(source_path),
            'archive_date': datetime.now().isoformat(),
            'archive_reason': archive_reason,
            'item_count': item_count,
            'total_value': float(total_value),
            'file_size': source_path.stat().st_size
        }
        
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
            
        logger.info(f"Database archived: {archive_path}")
        logger.info(f"Archive metadata: {metadata}")
        
    def cleanup_old_backups(self, keep_days: int = 30):
        """Remove backups older than specified days"""
        cutoff_date = datetime.now() - timedelta(days=keep_days)
        
        for backup_file in self.backup_dir.glob("inventory_backup_*.db*"):
            # Parse timestamp from filename
            timestamp_str = backup_file.stem.split('_')[2:4]
            timestamp_str = '_'.join(timestamp_str).replace('.db', '')
            
            try:
                file_date = datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")
                if file_date < cutoff_date:
                    backup_file.unlink()
                    logger.info(f"Deleted old backup: {backup_file}")
            except ValueError:
                logger.warning(f"Could not parse date from backup: {backup_file}")
                

class DataValidator:
    """Validates data integrity and consistency"""
    
    def __init__(self, db_path: str):
        """Initialize validator"""
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self.cursor = self.conn.cursor()
        self.validation_errors = []
        
    def validate_all(self) -> Dict:
        """Run all validation checks"""
        logger.info("Starting data validation...")
        
        results = {
            'timestamp': datetime.now().isoformat(),
            'database': self.db_path,
            'checks': {},
            'errors': [],
            'warnings': [],
            'summary': {}
        }
        
        # Run validation checks
        checks = [
            ('duplicates', self.check_duplicates()),
            ('orphans', self.check_orphaned_records()),
            ('integrity', self.check_data_integrity()),
            ('valuations', self.check_valuations()),
            ('missing_data', self.check_missing_required_data()),
            ('consistency', self.check_consistency()),
            ('moving_manifest', self.check_moving_manifest_coverage())
        ]
        
        for check_name, check_result in checks:
            results['checks'][check_name] = check_result
            if check_result.get('errors'):
                results['errors'].extend(check_result['errors'])
            if check_result.get('warnings'):
                results['warnings'].extend(check_result['warnings'])
                
        # Generate summary
        results['summary'] = {
            'total_errors': len(results['errors']),
            'total_warnings': len(results['warnings']),
            'validation_passed': len(results['errors']) == 0
        }
        
        logger.info(f"Validation completed: {results['summary']}")
        return results
        
    def check_duplicates(self) -> Dict:
        """Check for duplicate items"""
        result = {'errors': [], 'warnings': [], 'stats': {}}
        
        # Check for duplicate UUIDs
        self.cursor.execute("""
            SELECT uuid, COUNT(*) as count
            FROM items
            GROUP BY uuid
            HAVING COUNT(*) > 1
        """)
        
        duplicate_uuids = self.cursor.fetchall()
        if duplicate_uuids:
            for row in duplicate_uuids:
                result['errors'].append(
                    f"Duplicate UUID found: {row['uuid']} ({row['count']} items)"
                )
                
        # Check for potential duplicate items by name/description
        self.cursor.execute("""
            SELECT name, description, COUNT(*) as count
            FROM items
            WHERE name IS NOT NULL
            GROUP BY name, description
            HAVING COUNT(*) > 1
        """)
        
        potential_duplicates = self.cursor.fetchall()
        if potential_duplicates:
            for row in potential_duplicates:
                result['warnings'].append(
                    f"Potential duplicate: {row['name']} ({row['count']} items)"
                )
                
        result['stats'] = {
            'duplicate_uuids': len(duplicate_uuids),
            'potential_duplicates': len(potential_duplicates)
        }
        
        return result
        
    def check_orphaned_records(self) -> Dict:
        """Check for orphaned records in related tables"""
        result = {'errors': [], 'warnings': [], 'stats': {}}
        
        # Check for decisions without items
        self.cursor.execute("""
            SELECT COUNT(*) as count
            FROM item_decisions d
            LEFT JOIN items i ON d.item_id = i.id
            WHERE i.id IS NULL
        """)
        orphaned_decisions = self.cursor.fetchone()['count']
        
        if orphaned_decisions > 0:
            result['errors'].append(
                f"Found {orphaned_decisions} orphaned decision records"
            )
            
        # Check for photos without items
        self.cursor.execute("""
            SELECT COUNT(*) as count
            FROM item_photos p
            LEFT JOIN items i ON p.item_id = i.id
            WHERE i.id IS NULL
        """)
        orphaned_photos = self.cursor.fetchone()['count']
        
        if orphaned_photos > 0:
            result['errors'].append(
                f"Found {orphaned_photos} orphaned photo records"
            )
            
        result['stats'] = {
            'orphaned_decisions': orphaned_decisions,
            'orphaned_photos': orphaned_photos
        }
        
        return result
        
    def check_data_integrity(self) -> Dict:
        """Check data integrity constraints"""
        result = {'errors': [], 'warnings': [], 'stats': {}}
        
        # Check for invalid checksums
        self.cursor.execute("SELECT id, name, checksum FROM items")
        items = self.cursor.fetchall()
        
        invalid_checksums = 0
        for item in items:
            expected_checksum = self.calculate_checksum(dict(item))
            if item['checksum'] != expected_checksum:
                invalid_checksums += 1
                result['warnings'].append(
                    f"Invalid checksum for item {item['id']}: {item['name']}"
                )
                
        # Check for negative values
        self.cursor.execute("""
            SELECT id, name, estimated_value
            FROM items
            WHERE estimated_value < 0
        """)
        negative_values = self.cursor.fetchall()
        
        for item in negative_values:
            result['errors'].append(
                f"Negative value for item {item['id']}: {item['name']} "
                f"(${item['estimated_value']})"
            )
            
        result['stats'] = {
            'invalid_checksums': invalid_checksums,
            'negative_values': len(negative_values)
        }
        
        return result
        
    def check_valuations(self) -> Dict:
        """Check valuation consistency"""
        result = {'errors': [], 'warnings': [], 'stats': {}}
        
        # Check high-value items without valuations
        self.cursor.execute("""
            SELECT i.id, i.name, i.estimated_value
            FROM items i
            WHERE i.is_high_value = 1
            AND NOT EXISTS (
                SELECT 1 FROM item_valuations v WHERE v.item_id = i.id
            )
        """)
        
        missing_valuations = self.cursor.fetchall()
        for item in missing_valuations:
            result['warnings'].append(
                f"High-value item without valuation record: "
                f"{item['name']} (${item['estimated_value']})"
            )
            
        # Check for sold items without sale price
        self.cursor.execute("""
            SELECT i.id, i.name
            FROM items i
            LEFT JOIN item_decisions d ON i.id = d.item_id
            WHERE i.status = 'Sold'
            AND (d.actual_price IS NULL OR d.actual_price = 0)
        """)
        
        missing_sale_prices = self.cursor.fetchall()
        for item in missing_sale_prices:
            result['errors'].append(
                f"Sold item without sale price: {item['name']}"
            )
            
        result['stats'] = {
            'missing_valuations': len(missing_valuations),
            'missing_sale_prices': len(missing_sale_prices)
        }
        
        return result
        
    def check_missing_required_data(self) -> Dict:
        """Check for missing required fields"""
        result = {'errors': [], 'warnings': [], 'stats': {}}
        
        # Check for items without UUIDs
        self.cursor.execute("""
            SELECT COUNT(*) as count
            FROM items
            WHERE uuid IS NULL OR uuid = ''
        """)
        missing_uuids = self.cursor.fetchone()['count']
        
        if missing_uuids > 0:
            result['errors'].append(f"Found {missing_uuids} items without UUIDs")
            
        # Check for items without names
        self.cursor.execute("""
            SELECT COUNT(*) as count
            FROM items
            WHERE name IS NULL OR name = ''
        """)
        missing_names = self.cursor.fetchone()['count']
        
        if missing_names > 0:
            result['errors'].append(f"Found {missing_names} items without names")
            
        # Check for items without decisions
        self.cursor.execute("""
            SELECT COUNT(*) as count
            FROM items i
            WHERE NOT EXISTS (
                SELECT 1 FROM item_decisions d WHERE d.item_id = i.id
            )
        """)
        missing_decisions = self.cursor.fetchone()['count']
        
        if missing_decisions > 0:
            result['warnings'].append(
                f"Found {missing_decisions} items without decision records"
            )
            
        result['stats'] = {
            'missing_uuids': missing_uuids,
            'missing_names': missing_names,
            'missing_decisions': missing_decisions
        }
        
        return result
        
    def check_consistency(self) -> Dict:
        """Check data consistency across tables"""
        result = {'errors': [], 'warnings': [], 'stats': {}}
        
        # Check item count vs moving manifest
        self.cursor.execute("SELECT COUNT(*) as count FROM items")
        total_items = self.cursor.fetchone()['count']
        
        if total_items < 690:
            result['warnings'].append(
                f"Item count ({total_items}) less than moving manifest (690)"
            )
        elif total_items > 690:
            result['warnings'].append(
                f"Item count ({total_items}) exceeds moving manifest (690) - "
                "possible duplicates"
            )
            
        # Check value discrepancies
        self.cursor.execute("""
            SELECT 
                SUM(estimated_value) as db_value,
                COUNT(*) as item_count
            FROM items
        """)
        db_stats = self.cursor.fetchone()
        
        expected_ranges = {
            'min_value': 213300 + 150000,  # Local DB + missing items minimum
            'max_value': 374242 + 184000   # API + missing items maximum
        }
        
        if db_stats['db_value']:
            if db_stats['db_value'] < expected_ranges['min_value']:
                result['warnings'].append(
                    f"Total value (${db_stats['db_value']:,.2f}) below "
                    f"expected minimum (${expected_ranges['min_value']:,.2f})"
                )
                
        result['stats'] = {
            'total_items': total_items,
            'total_value': float(db_stats['db_value'] or 0)
        }
        
        return result
        
    def check_moving_manifest_coverage(self) -> Dict:
        """Check coverage of moving manifest items"""
        result = {'errors': [], 'warnings': [], 'stats': {}}
        
        # Count verified items
        self.cursor.execute("""
            SELECT COUNT(DISTINCT moving_company_id) as verified
            FROM items
            WHERE moving_company_id IS NOT NULL
        """)
        verified_count = self.cursor.fetchone()['verified']
        
        missing_count = 690 - verified_count
        coverage_percent = (verified_count / 690) * 100
        
        if missing_count > 0:
            result['warnings'].append(
                f"{missing_count} items from moving manifest not matched "
                f"({coverage_percent:.1f}% coverage)"
            )
            
            # List unverified high-value items
            self.cursor.execute("""
                SELECT name, estimated_value
                FROM items
                WHERE moving_company_id IS NULL
                AND estimated_value > 5000
                ORDER BY estimated_value DESC
                LIMIT 10
            """)
            
            unverified_valuable = self.cursor.fetchall()
            for item in unverified_valuable:
                result['warnings'].append(
                    f"High-value unverified: {item['name']} "
                    f"(${item['estimated_value']:,.2f})"
                )
                
        result['stats'] = {
            'verified_items': verified_count,
            'missing_items': missing_count,
            'coverage_percent': coverage_percent
        }
        
        return result
        
    def calculate_checksum(self, item: Dict) -> str:
        """Calculate MD5 checksum for item"""
        checksum_fields = [
            str(item.get('name', '')),
            str(item.get('description', '')),
            str(item.get('serial_number', '')),
            str(item.get('purchase_price', 0))
        ]
        checksum_string = '|'.join(checksum_fields)
        return hashlib.md5(checksum_string.encode()).hexdigest()
        
    def fix_common_issues(self):
        """Automatically fix common data issues"""
        logger.info("Attempting to fix common data issues...")
        
        fixes_applied = 0
        
        # Generate missing UUIDs
        self.cursor.execute("""
            SELECT id FROM items WHERE uuid IS NULL OR uuid = ''
        """)
        missing_uuid_items = self.cursor.fetchall()
        
        for item in missing_uuid_items:
            import uuid
            new_uuid = str(uuid.uuid4())
            self.cursor.execute(
                "UPDATE items SET uuid = ? WHERE id = ?",
                (new_uuid, item['id'])
            )
            fixes_applied += 1
            
        # Update checksums
        self.cursor.execute("SELECT id, name, description FROM items")
        all_items = self.cursor.fetchall()
        
        for item in all_items:
            checksum = self.calculate_checksum(dict(item))
            self.cursor.execute(
                "UPDATE items SET checksum = ? WHERE id = ?",
                (checksum, item['id'])
            )
            fixes_applied += 1
            
        # Create missing decision records
        self.cursor.execute("""
            INSERT INTO item_decisions (item_id, decision, decided_by)
            SELECT i.id, 'Pending', 'auto-fix'
            FROM items i
            WHERE NOT EXISTS (
                SELECT 1 FROM item_decisions d WHERE d.item_id = i.id
            )
        """)
        
        self.conn.commit()
        logger.info(f"Applied {fixes_applied} fixes to database")
        

def setup_automated_backups():
    """Setup automated backup schedule"""
    backup_config = {
        'daily_backup': {
            'enabled': True,
            'time': '02:00',
            'retention_days': 30,
            'compress': True
        },
        'weekly_backup': {
            'enabled': True,
            'day': 'Sunday',
            'retention_days': 90,
            'compress': True
        },
        'before_migration': {
            'enabled': True,
            'compress': True
        }
    }
    
    config_path = Path('database/backup_config.json')
    with open(config_path, 'w') as f:
        json.dump(backup_config, f, indent=2)
        
    logger.info(f"Backup configuration saved to {config_path}")
    
    # Create cron job for automated backups (Unix/Linux)
    cron_command = """
0 2 * * * /usr/bin/python3 /path/to/backup_validation.py backup
0 3 * * 0 /usr/bin/python3 /path/to/backup_validation.py validate
"""
    
    logger.info("Add the following to crontab for automated backups:")
    print(cron_command)
    

def main():
    """Main execution for backup and validation"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python backup_validation.py [backup|validate|restore|archive]")
        sys.exit(1)
        
    command = sys.argv[1]
    db_path = 'database/inventory_master.db'
    
    if command == 'backup':
        backup_manager = DatabaseBackup(db_path)
        backup_path = backup_manager.create_backup()
        print(f"Backup created: {backup_path}")
        
    elif command == 'validate':
        validator = DataValidator(db_path)
        results = validator.validate_all()
        
        # Save validation report
        report_path = Path('validation_report.json')
        with open(report_path, 'w') as f:
            json.dump(results, f, indent=2)
            
        print(f"Validation report saved to {report_path}")
        print(f"Errors: {results['summary']['total_errors']}")
        print(f"Warnings: {results['summary']['total_warnings']}")
        
        if results['summary']['total_errors'] > 0:
            print("\nFixing common issues...")
            validator.fix_common_issues()
            
    elif command == 'restore':
        if len(sys.argv) < 3:
            print("Usage: python backup_validation.py restore <backup_file>")
            sys.exit(1)
            
        backup_manager = DatabaseBackup(db_path)
        backup_manager.restore_backup(sys.argv[2])
        
    elif command == 'archive':
        # Archive old databases
        backup_manager = DatabaseBackup(db_path)
        
        old_databases = [
            ('database/inventory.db', 'Local SQLite with 134 items'),
            ('database/inventory_api.db', 'Production API cache with 239 items')
        ]
        
        for old_db, reason in old_databases:
            if Path(old_db).exists():
                backup_manager.archive_old_database(old_db, reason)
                
    elif command == 'setup':
        setup_automated_backups()
        
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
        

if __name__ == '__main__':
    main()