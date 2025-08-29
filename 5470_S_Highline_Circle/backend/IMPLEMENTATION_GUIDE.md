# Single Source of Truth Implementation Guide
## 5470 S Highline Circle Inventory Management System

### Current Situation
- **690 physical items** documented by Johnson Storage & Moving
- **428+ items missing** from current databases
- **$150,000-184,000 in value** unaccounted for
- Data scattered across 3+ sources with conflicting information

### Solution Architecture

## 1. Database Schema (SQLite)
**Location:** `/database/schema.sql`

### Core Tables:
- **items** - Master inventory table with 30+ fields
- **rooms** - 14 room definitions
- **categories** - Hierarchical categorization
- **item_decisions** - Keep/Sell/Donate tracking
- **item_valuations** - Historical value tracking
- **item_photos** - Image documentation
- **audit_log** - Complete change history
- **migration_log** - Data source tracking

### Key Features:
- UUID for global uniqueness
- Checksums for data integrity
- Moving company ID reconciliation
- Comprehensive audit trails
- Automatic triggers for updates

## 2. Migration Strategy
**Script:** `/database/migration_strategy.py`

### Step-by-Step Process:

#### Step 1: Initialize Master Database
```bash
cd backend
python database/migration_strategy.py
```

#### Step 2: Archive Old Databases
```bash
python database/backup_validation.py archive
```
This moves old databases to `/backups/archives/` with metadata.

#### Step 3: Import Data Sources
The migration script handles:
- Local SQLite (134 items)
- Production API (239 items)
- Moving company manifest (690 items)

#### Step 4: Reconciliation
The system will:
- Match existing items with moving manifest
- Identify missing items
- Flag duplicates for review
- Generate reconciliation report

### Expected Results:
- All 690 items tracked
- ~250 matched automatically
- ~440 items need verification
- Complete audit trail

## 3. Data Validation
**Script:** `/database/backup_validation.py`

### Validation Checks:
- Duplicate detection
- Orphaned records cleanup
- Checksum verification
- Value consistency
- Moving manifest coverage

### Run Validation:
```bash
python database/backup_validation.py validate
```

### Auto-fix Common Issues:
```bash
python database/backup_validation.py validate --fix
```

## 4. Backup Strategy

### Automated Backups:
- **Daily:** 2 AM, 30-day retention
- **Weekly:** Sunday 3 AM, 90-day retention
- **Before migrations:** Automatic

### Manual Backup:
```bash
python database/backup_validation.py backup
```

### Restore from Backup:
```bash
python database/backup_validation.py restore backups/inventory_backup_20240101_120000.db.gz
```

## 5. Unified API
**Location:** `/api/unified_inventory_api.py`

### Start API Server:
```bash
cd backend
pip install fastapi uvicorn
python api/unified_inventory_api.py
```

### API Endpoints:

#### Items Management
- `GET /api/items` - List all items with filters
- `GET /api/items/{id}` - Get specific item
- `POST /api/items` - Create new item
- `PUT /api/items/{id}` - Update item
- `DELETE /api/items/{id}` - Soft delete

#### Decisions & Valuations
- `POST /api/decisions` - Record Keep/Sell/Donate decision
- `GET /api/decisions/summary` - Decision statistics
- `POST /api/valuations` - Record new valuation

#### Dashboard & Analytics
- `GET /api/dashboard` - Complete statistics
- `GET /api/reconciliation/missing` - Missing items report

#### Reference Data
- `GET /api/rooms` - List all rooms
- `GET /api/categories` - List categories

#### Data Integrity
- `POST /api/verify/{id}` - Mark item as verified
- `POST /api/backup` - Trigger backup
- `GET /api/health` - System health check

## 6. Priority Items to Verify

### Top 10 High-Value Items:
1. **Hyperbaric Chamber** - $15,000-30,000
2. **Pool Table (Slate)** - $8,000-12,000
3. **Sleep Number King Bed** - $4,000-6,000
4. **Eames Chair & Ottoman** - $5,000-7,000
5. **Tonal Exercise System** - $4,000
6. **Peloton Bike** - $2,000-3,000
7. **NordicTrack Treadmill** - $2,000-3,000
8. **Bowflex Home Gym** - $1,500-2,500
9. **Steinway Piano** (if present) - $10,000+
10. **Art Collection** - Value TBD

## 7. Implementation Timeline

### Day 1: Database Setup
1. Run schema creation
2. Archive old databases
3. Create initial backup

### Day 2: Data Migration
1. Import local SQLite data
2. Import API data
3. Import moving manifest CSV

### Day 3: Reconciliation
1. Match items with moving manifest
2. Identify missing high-value items
3. Generate missing items report

### Day 4: Validation
1. Run full validation suite
2. Fix data integrity issues
3. Verify high-value items

### Day 5: API Deployment
1. Deploy unified API
2. Update frontend to use new endpoints
3. Test all functionality

## 8. Preventing Future Data Loss

### Best Practices:
1. **Always use the unified API** - Never modify database directly
2. **Regular backups** - Automated daily/weekly
3. **Audit everything** - All changes logged
4. **Verify imports** - Check counts after any import
5. **Monitor health** - Regular health checks
6. **Document changes** - Update migration log

### Monitoring Commands:
```bash
# Check database health
curl http://localhost:8000/api/health

# View dashboard stats
curl http://localhost:8000/api/dashboard

# Check missing items
curl http://localhost:8000/api/reconciliation/missing
```

## 9. Recovery Procedures

### If Data Loss Occurs:
1. Stop all write operations
2. Create immediate backup
3. Check audit log for last changes
4. Restore from most recent good backup
5. Replay changes from audit log

### Emergency Contacts:
- Database Admin: [Your contact]
- Johnson Storage & Moving: [Contact from PDF]
- Insurance Company: [For valuation disputes]

## 10. Next Steps

### Immediate Actions:
1. ✅ Create master database with schema
2. ✅ Set up backup strategy
3. ⏳ Migrate all data sources
4. ⏳ Reconcile with moving manifest
5. ⏳ Verify high-value items
6. ⏳ Deploy unified API
7. ⏳ Update frontend
8. ⏳ Train users on new system

### Long-term Goals:
- Photo documentation for all items
- Barcode/QR code tracking
- Mobile app for updates
- Integration with insurance system
- Automated valuation updates

## Success Metrics

### Target Goals:
- **690/690 items** tracked (100% coverage)
- **90%+ items** verified with moving manifest
- **100% high-value items** documented with photos
- **Zero data loss** incidents
- **< 5 second** query response time
- **Daily backups** with 30-day retention

## Troubleshooting

### Common Issues:

#### Missing Items Not Found
- Check moving manifest CSV format
- Verify room name mappings
- Review unmatched items in audit log

#### API Performance Issues
- Create indexes on frequently queried fields
- Implement pagination for large results
- Consider caching for dashboard stats

#### Backup Failures
- Check disk space
- Verify backup directory permissions
- Review backup logs in audit table

### Support Resources:
- SQLite Documentation: https://sqlite.org/docs.html
- FastAPI Documentation: https://fastapi.tiangolo.com/
- This implementation guide

---

**Remember:** This system is your single source of truth. All other databases should be considered deprecated and archived. Always use the unified API for all operations.