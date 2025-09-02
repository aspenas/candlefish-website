#!/usr/bin/env python3
"""
Unified Inventory API
======================
Single source of truth API for all inventory operations
Replaces scattered endpoints with consolidated access
"""

from fastapi import FastAPI, HTTPException, Query, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import sqlite3
import json
import uuid
import hashlib
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="5470 S Highline Circle Inventory API",
    description="Unified inventory management system - Single source of truth",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database configuration
DB_PATH = "database/inventory_master.db"

# =====================================================
# Pydantic Models
# =====================================================

class ItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    room_id: Optional[int] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    condition: str = "Good"
    condition_notes: Optional[str] = None
    is_fragile: bool = False
    is_high_value: bool = False
    purchase_price: Optional[float] = None
    purchase_date: Optional[date] = None
    estimated_value: Optional[float] = None
    replacement_cost: Optional[float] = None

class ItemCreate(ItemBase):
    moving_company_id: Optional[str] = None
    box_number: Optional[str] = None
    location_notes: Optional[str] = None

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    room_id: Optional[int] = None
    condition: Optional[str] = None
    estimated_value: Optional[float] = None
    status: Optional[str] = None

class Item(ItemBase):
    id: int
    uuid: str
    status: str = "Active"
    created_at: datetime
    updated_at: datetime
    moving_company_id: Optional[str] = None
    is_verified: bool = False
    
    class Config:
        from_attributes = True

class ItemDecision(BaseModel):
    item_id: int
    decision: str = Field(..., pattern="^(Keep|Sell|Donate|Unsure|Pending)$")
    reason: Optional[str] = None
    target_price: Optional[float] = None
    target_date: Optional[date] = None
    notes: Optional[str] = None

class ItemValuation(BaseModel):
    item_id: int
    valuation_type: str = Field(..., pattern="^(Purchase|Appraisal|Market|Insurance|Sale)$")
    amount: float
    source: Optional[str] = None
    notes: Optional[str] = None
    valuation_date: Optional[date] = None

class Room(BaseModel):
    id: int
    name: str
    floor: Optional[int] = None
    square_feet: Optional[int] = None
    description: Optional[str] = None

class Category(BaseModel):
    id: int
    name: str
    parent_category_id: Optional[int] = None
    description: Optional[str] = None
    is_valuable: bool = False

class DashboardStats(BaseModel):
    total_items: int
    verified_items: int
    unverified_items: int
    missing_items: int
    total_value: float
    items_by_status: Dict[str, int]
    items_by_room: Dict[str, int]
    items_by_decision: Dict[str, int]
    high_value_items: List[Dict]
    recent_updates: List[Dict]

# =====================================================
# Database Connection
# =====================================================

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def dict_from_row(row):
    """Convert SQLite row to dictionary"""
    return dict(row) if row else None

# =====================================================
# Utility Functions
# =====================================================

def generate_uuid() -> str:
    """Generate unique identifier"""
    return str(uuid.uuid4())

def calculate_checksum(item: Dict) -> str:
    """Calculate checksum for data integrity"""
    checksum_fields = [
        str(item.get('name', '')),
        str(item.get('description', '')),
        str(item.get('serial_number', '')),
        str(item.get('purchase_price', 0))
    ]
    checksum_string = '|'.join(checksum_fields)
    return hashlib.md5(checksum_string.encode()).hexdigest()

def log_audit(conn: sqlite3.Connection, table: str, record_id: int, 
              action: str, user: str = "api", notes: str = None):
    """Log audit trail"""
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO audit_log (table_name, record_id, action, user_name, notes)
        VALUES (?, ?, ?, ?, ?)
    """, (table, record_id, action, user, notes))

# =====================================================
# API Endpoints - Items
# =====================================================

@app.get("/api/items", response_model=List[Item])
async def get_items(
    conn: sqlite3.Connection = Depends(get_db),
    room_id: Optional[int] = None,
    category_id: Optional[int] = None,
    status: Optional[str] = None,
    decision: Optional[str] = None,
    high_value: Optional[bool] = None,
    verified: Optional[bool] = None,
    search: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """Get all items with optional filters"""
    cursor = conn.cursor()
    
    query = """
        SELECT i.*, d.decision as current_decision
        FROM items i
        LEFT JOIN item_decisions d ON i.id = d.item_id 
            AND d.id = (SELECT MAX(id) FROM item_decisions WHERE item_id = i.id)
        WHERE 1=1
    """
    params = []
    
    if room_id:
        query += " AND i.room_id = ?"
        params.append(room_id)
    if category_id:
        query += " AND i.category_id = ?"
        params.append(category_id)
    if status:
        query += " AND i.status = ?"
        params.append(status)
    if decision:
        query += " AND d.decision = ?"
        params.append(decision)
    if high_value is not None:
        query += " AND i.is_high_value = ?"
        params.append(int(high_value))
    if verified is not None:
        query += " AND i.is_verified = ?"
        params.append(int(verified))
    if search:
        query += " AND (i.name LIKE ? OR i.description LIKE ?)"
        search_param = f"%{search}%"
        params.extend([search_param, search_param])
        
    query += " ORDER BY i.updated_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    
    cursor.execute(query, params)
    items = [dict_from_row(row) for row in cursor.fetchall()]
    
    return items

@app.get("/api/items/{item_id}", response_model=Item)
async def get_item(item_id: int, conn: sqlite3.Connection = Depends(get_db)):
    """Get single item by ID"""
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM items WHERE id = ?", (item_id,))
    item = dict_from_row(cursor.fetchone())
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    return item

@app.post("/api/items", response_model=Item)
async def create_item(
    item: ItemCreate,
    conn: sqlite3.Connection = Depends(get_db)
):
    """Create new item"""
    cursor = conn.cursor()
    
    item_dict = item.dict()
    item_dict['uuid'] = generate_uuid()
    item_dict['checksum'] = calculate_checksum(item_dict)
    item_dict['created_by'] = 'api'
    
    columns = ', '.join(item_dict.keys())
    placeholders = ', '.join(['?' for _ in item_dict])
    
    cursor.execute(
        f"INSERT INTO items ({columns}) VALUES ({placeholders})",
        list(item_dict.values())
    )
    
    item_id = cursor.lastrowid
    
    # Create default decision
    cursor.execute("""
        INSERT INTO item_decisions (item_id, decision, decided_by)
        VALUES (?, 'Pending', 'api')
    """, (item_id,))
    
    # Log audit
    log_audit(conn, 'items', item_id, 'INSERT')
    
    conn.commit()
    
    # Return created item
    cursor.execute("SELECT * FROM items WHERE id = ?", (item_id,))
    return dict_from_row(cursor.fetchone())

@app.put("/api/items/{item_id}", response_model=Item)
async def update_item(
    item_id: int,
    item: ItemUpdate,
    conn: sqlite3.Connection = Depends(get_db)
):
    """Update existing item"""
    cursor = conn.cursor()
    
    # Check if item exists
    cursor.execute("SELECT * FROM items WHERE id = ?", (item_id,))
    existing = cursor.fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Build update query
    updates = {k: v for k, v in item.dict().items() if v is not None}
    if updates:
        updates['checksum'] = calculate_checksum({**dict(existing), **updates})
        updates['updated_by'] = 'api'
        
        set_clause = ', '.join([f"{k} = ?" for k in updates.keys()])
        values = list(updates.values()) + [item_id]
        
        cursor.execute(
            f"UPDATE items SET {set_clause} WHERE id = ?",
            values
        )
        
        # Log audit
        log_audit(conn, 'items', item_id, 'UPDATE')
        
        conn.commit()
    
    # Return updated item
    cursor.execute("SELECT * FROM items WHERE id = ?", (item_id,))
    return dict_from_row(cursor.fetchone())

@app.delete("/api/items/{item_id}")
async def delete_item(
    item_id: int,
    conn: sqlite3.Connection = Depends(get_db)
):
    """Delete item (soft delete by changing status)"""
    cursor = conn.cursor()
    
    cursor.execute(
        "UPDATE items SET status = 'Deleted', updated_by = 'api' WHERE id = ?",
        (item_id,)
    )
    
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Item not found")
        
    log_audit(conn, 'items', item_id, 'DELETE')
    conn.commit()
    
    return {"message": "Item deleted successfully"}

# =====================================================
# API Endpoints - Decisions
# =====================================================

@app.post("/api/decisions")
async def create_decision(
    decision: ItemDecision,
    conn: sqlite3.Connection = Depends(get_db)
):
    """Create or update item decision"""
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO item_decisions 
        (item_id, decision, reason, target_price, target_date, notes, decided_by)
        VALUES (?, ?, ?, ?, ?, ?, 'api')
    """, (
        decision.item_id,
        decision.decision,
        decision.reason,
        decision.target_price,
        decision.target_date,
        decision.notes
    ))
    
    log_audit(conn, 'item_decisions', cursor.lastrowid, 'INSERT')
    conn.commit()
    
    return {"message": "Decision recorded successfully", "id": cursor.lastrowid}

@app.get("/api/decisions/summary")
async def get_decisions_summary(conn: sqlite3.Connection = Depends(get_db)):
    """Get summary of all decisions"""
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT 
            d.decision,
            COUNT(*) as count,
            SUM(i.estimated_value) as total_value,
            AVG(i.estimated_value) as avg_value
        FROM item_decisions d
        JOIN items i ON d.item_id = i.id
        WHERE d.id IN (
            SELECT MAX(id) FROM item_decisions GROUP BY item_id
        )
        GROUP BY d.decision
    """)
    
    summary = [dict_from_row(row) for row in cursor.fetchall()]
    return summary

# =====================================================
# API Endpoints - Valuations
# =====================================================

@app.post("/api/valuations")
async def create_valuation(
    valuation: ItemValuation,
    conn: sqlite3.Connection = Depends(get_db)
):
    """Record item valuation"""
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO item_valuations 
        (item_id, valuation_type, amount, source, notes, valuation_date)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        valuation.item_id,
        valuation.valuation_type,
        valuation.amount,
        valuation.source,
        valuation.notes,
        valuation.valuation_date or date.today()
    ))
    
    # Update item's estimated value if this is the latest valuation
    cursor.execute("""
        UPDATE items 
        SET estimated_value = ?, valuation_date = ?, valuation_source = ?
        WHERE id = ?
    """, (
        valuation.amount,
        valuation.valuation_date or date.today(),
        valuation.source,
        valuation.item_id
    ))
    
    log_audit(conn, 'item_valuations', cursor.lastrowid, 'INSERT')
    conn.commit()
    
    return {"message": "Valuation recorded successfully", "id": cursor.lastrowid}

# =====================================================
# API Endpoints - Dashboard & Analytics
# =====================================================

@app.get("/api/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(conn: sqlite3.Connection = Depends(get_db)):
    """Get comprehensive dashboard statistics"""
    cursor = conn.cursor()
    
    # Basic stats
    cursor.execute("""
        SELECT 
            COUNT(*) as total_items,
            COUNT(CASE WHEN is_verified = 1 THEN 1 END) as verified_items,
            COUNT(CASE WHEN is_verified = 0 THEN 1 END) as unverified_items,
            COALESCE(SUM(estimated_value), 0) as total_value
        FROM items
        WHERE status != 'Deleted'
    """)
    basic_stats = dict_from_row(cursor.fetchone())
    
    # Items by status
    cursor.execute("""
        SELECT status, COUNT(*) as count
        FROM items
        GROUP BY status
    """)
    items_by_status = {row['status']: row['count'] for row in cursor.fetchall()}
    
    # Items by room
    cursor.execute("""
        SELECT r.name, COUNT(i.id) as count
        FROM rooms r
        LEFT JOIN items i ON r.id = i.room_id AND i.status != 'Deleted'
        GROUP BY r.id
    """)
    items_by_room = {row['name']: row['count'] for row in cursor.fetchall()}
    
    # Items by decision
    cursor.execute("""
        SELECT d.decision, COUNT(*) as count
        FROM item_decisions d
        WHERE d.id IN (
            SELECT MAX(id) FROM item_decisions GROUP BY item_id
        )
        GROUP BY d.decision
    """)
    items_by_decision = {row['decision']: row['count'] for row in cursor.fetchall()}
    
    # High value items
    cursor.execute("""
        SELECT id, name, estimated_value, room_id, status
        FROM items
        WHERE (is_high_value = 1 OR estimated_value > 5000)
        AND status != 'Deleted'
        ORDER BY estimated_value DESC
        LIMIT 10
    """)
    high_value_items = [dict_from_row(row) for row in cursor.fetchall()]
    
    # Recent updates
    cursor.execute("""
        SELECT id, name, updated_at, updated_by
        FROM items
        ORDER BY updated_at DESC
        LIMIT 10
    """)
    recent_updates = [dict_from_row(row) for row in cursor.fetchall()]
    
    # Calculate missing items
    missing_items = max(0, 690 - basic_stats['verified_items'])
    
    return DashboardStats(
        total_items=basic_stats['total_items'],
        verified_items=basic_stats['verified_items'],
        unverified_items=basic_stats['unverified_items'],
        missing_items=missing_items,
        total_value=basic_stats['total_value'],
        items_by_status=items_by_status,
        items_by_room=items_by_room,
        items_by_decision=items_by_decision,
        high_value_items=high_value_items,
        recent_updates=recent_updates
    )

@app.get("/api/reconciliation/missing")
async def get_missing_items(conn: sqlite3.Connection = Depends(get_db)):
    """Get list of potentially missing items"""
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT 
            'Unverified' as category,
            name,
            description,
            estimated_value,
            updated_at
        FROM items
        WHERE is_verified = 0
        AND status != 'Deleted'
        
        UNION ALL
        
        SELECT 
            'No Moving ID' as category,
            name,
            description,
            estimated_value,
            updated_at
        FROM items
        WHERE moving_company_id IS NULL
        AND status != 'Deleted'
        ORDER BY estimated_value DESC
    """)
    
    missing_items = [dict_from_row(row) for row in cursor.fetchall()]
    
    return {
        'missing_count': len(missing_items),
        'expected_total': 690,
        'items': missing_items
    }

# =====================================================
# API Endpoints - Reference Data
# =====================================================

@app.get("/api/rooms", response_model=List[Room])
async def get_rooms(conn: sqlite3.Connection = Depends(get_db)):
    """Get all rooms"""
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM rooms ORDER BY sort_order")
    return [dict_from_row(row) for row in cursor.fetchall()]

@app.get("/api/categories", response_model=List[Category])
async def get_categories(conn: sqlite3.Connection = Depends(get_db)):
    """Get all categories"""
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM categories ORDER BY name")
    return [dict_from_row(row) for row in cursor.fetchall()]

# =====================================================
# API Endpoints - Data Integrity
# =====================================================

@app.post("/api/verify/{item_id}")
async def verify_item(
    item_id: int,
    verified_by: str = "api",
    conn: sqlite3.Connection = Depends(get_db)
):
    """Mark item as verified"""
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE items 
        SET is_verified = 1, 
            verification_date = CURRENT_TIMESTAMP,
            verified_by = ?
        WHERE id = ?
    """, (verified_by, item_id))
    
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Item not found")
        
    log_audit(conn, 'items', item_id, 'UPDATE', notes='Item verified')
    conn.commit()
    
    return {"message": "Item verified successfully"}

@app.get("/api/health")
async def health_check(conn: sqlite3.Connection = Depends(get_db)):
    """API health check with database stats"""
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT 
            COUNT(*) as total_items,
            COUNT(DISTINCT moving_company_id) as verified_items,
            SUM(estimated_value) as total_value
        FROM items
    """)
    stats = dict_from_row(cursor.fetchone())
    
    return {
        'status': 'healthy',
        'database': DB_PATH,
        'stats': stats,
        'timestamp': datetime.now().isoformat()
    }

# =====================================================
# Background Tasks
# =====================================================

async def backup_database():
    """Background task to backup database"""
    from database.backup_validation import DatabaseBackup
    
    backup = DatabaseBackup(DB_PATH)
    backup_path = backup.create_backup()
    logger.info(f"Database backed up to {backup_path}")

@app.post("/api/backup")
async def trigger_backup(background_tasks: BackgroundTasks):
    """Trigger database backup"""
    background_tasks.add_task(backup_database)
    return {"message": "Backup initiated"}

# =====================================================
# Startup Events
# =====================================================

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    db_path = Path(DB_PATH)
    
    if not db_path.exists():
        logger.warning(f"Database not found at {DB_PATH}")
        logger.info("Please run migration_strategy.py to create database")
    else:
        logger.info(f"Connected to database: {DB_PATH}")
        
        # Verify database integrity
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT COUNT(*) as count FROM items
        """)
        item_count = cursor.fetchone()[0]
        
        logger.info(f"Database contains {item_count} items")
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)