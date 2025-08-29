// Security Dashboard Backend API
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4001;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5433,
  database: process.env.DB_NAME || 'security_dashboard',
  user: process.env.DB_USER || 'dashboard_user',
  password: process.env.DB_PASSWORD || 'secure_password_2024',
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('✅ Database connected:', res.rows[0].now);
  }
});

// ============================================================================
// API ENDPOINTS
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Get dashboard overview
app.get('/api/dashboard/overview', async (req, res) => {
  try {
    const queries = {
      totalEvents: 'SELECT COUNT(*) as count FROM security_events',
      criticalAlerts: "SELECT COUNT(*) as count FROM alerts WHERE severity = 'critical' AND status = 'active'",
      openIncidents: "SELECT COUNT(*) as count FROM incidents WHERE status IN ('open', 'investigating')",
      activeThreats: 'SELECT COUNT(*) as count FROM threat_indicators WHERE is_active = true',
      recentEvents: `
        SELECT id, timestamp, event_type, severity, source_ip, description 
        FROM security_events 
        ORDER BY timestamp DESC 
        LIMIT 10
      `,
      alertsBySeverity: `
        SELECT severity, COUNT(*) as count 
        FROM alerts 
        WHERE status = 'active' 
        GROUP BY severity
      `,
      complianceStatus: `
        SELECT framework,
          COUNT(*) FILTER (WHERE status = 'compliant') as compliant,
          COUNT(*) FILTER (WHERE status = 'non-compliant') as non_compliant,
          COUNT(*) FILTER (WHERE status = 'partial') as partial
        FROM compliance_checks
        GROUP BY framework
      `
    };

    const results = {};
    for (const [key, query] of Object.entries(queries)) {
      const result = await pool.query(query);
      results[key] = result.rows;
    }

    res.json({
      overview: {
        totalEvents: parseInt(results.totalEvents[0].count),
        criticalAlerts: parseInt(results.criticalAlerts[0].count),
        openIncidents: parseInt(results.openIncidents[0].count),
        activeThreats: parseInt(results.activeThreats[0].count),
      },
      recentEvents: results.recentEvents,
      alertsBySeverity: results.alertsBySeverity,
      complianceStatus: results.complianceStatus
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, username, role, first_name, last_name, is_active, created_at FROM users'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get security events
app.get('/api/events', async (req, res) => {
  try {
    const { limit = 100, offset = 0, severity, event_type } = req.query;
    
    let query = 'SELECT * FROM security_events WHERE 1=1';
    const params = [];
    
    if (severity) {
      params.push(severity);
      query += ` AND severity = $${params.length}`;
    }
    
    if (event_type) {
      params.push(event_type);
      query += ` AND event_type = $${params.length}`;
    }
    
    query += ` ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get alerts
app.get('/api/alerts', async (req, res) => {
  try {
    const { status = 'active' } = req.query;
    const result = await pool.query(
      'SELECT * FROM alerts WHERE status = $1 ORDER BY triggered_at DESC',
      [status]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get incidents
app.get('/api/incidents', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, u.username as assigned_to_name 
      FROM incidents i
      LEFT JOIN users u ON i.assigned_to = u.id
      ORDER BY 
        CASE priority 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new incident
app.post('/api/incidents', async (req, res) => {
  try {
    const { title, description, priority, assigned_to } = req.body;
    
    // Generate incident number
    const incidentNumber = `INC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    
    const result = await pool.query(
      `INSERT INTO incidents (incident_number, title, description, priority, assigned_to, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [incidentNumber, title, description, priority, assigned_to, assigned_to]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating incident:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update alert status
app.patch('/api/alerts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, acknowledged_by } = req.body;
    
    const result = await pool.query(
      `UPDATE alerts 
       SET status = $1, 
           acknowledged_at = CASE WHEN $1 = 'acknowledged' THEN NOW() ELSE acknowledged_at END,
           acknowledged_by = $2,
           updated_at = NOW()
       WHERE id = $3 
       RETURNING *`,
      [status, acknowledged_by, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get threat indicators
app.get('/api/threats', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM threat_indicators WHERE is_active = true ORDER BY last_seen DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching threats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get compliance status
app.get('/api/compliance', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM compliance_checks ORDER BY framework, control_id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching compliance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Security Dashboard API running on http://localhost:${PORT}`);
  console.log(`📊 Database: postgresql://dashboard_user@localhost:5433/security_dashboard`);
  console.log('\nAvailable endpoints:');
  console.log('  GET  /health                - Health check');
  console.log('  GET  /api/dashboard/overview - Dashboard overview');
  console.log('  GET  /api/users             - List all users');
  console.log('  GET  /api/events            - Security events');
  console.log('  GET  /api/alerts            - Security alerts');
  console.log('  GET  /api/incidents         - Security incidents');
  console.log('  POST /api/incidents         - Create incident');
  console.log('  PATCH /api/alerts/:id       - Update alert');
  console.log('  GET  /api/threats           - Threat indicators');
  console.log('  GET  /api/compliance        - Compliance status');
});

module.exports = app;