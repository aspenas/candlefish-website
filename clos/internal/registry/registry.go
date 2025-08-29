package registry

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/candlefish-ai/clos/pkg/types"
	_ "github.com/mattn/go-sqlite3"
)

// Registry manages the SQLite database for service and port tracking
type Registry struct {
	db   *sql.DB
	path string
}

// New creates a new registry instance and initializes the database
func New(dbPath string) (*Registry, error) {
	// Create directory if it doesn't exist
	if err := createDirectoryIfNotExists(filepath.Dir(dbPath)); err != nil {
		return nil, fmt.Errorf("failed to create database directory: %w", err)
	}

	db, err := sql.Open("sqlite3", dbPath+"?_foreign_keys=on")
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	registry := &Registry{
		db:   db,
		path: dbPath,
	}

	if err := registry.initSchema(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to initialize schema: %w", err)
	}

	return registry, nil
}

// Close closes the database connection
func (r *Registry) Close() error {
	return r.db.Close()
}

// initSchema creates the necessary tables if they don't exist
func (r *Registry) initSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS services (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		group_name TEXT NOT NULL,
		port INTEGER UNIQUE NOT NULL,
		status TEXT NOT NULL,
		started_at DATETIME,
		stopped_at DATETIME,
		health_url TEXT,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS port_allocations (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		project TEXT NOT NULL,
		start_port INTEGER NOT NULL,
		end_port INTEGER NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS service_tags (
		service_id TEXT NOT NULL,
		tag TEXT NOT NULL,
		PRIMARY KEY (service_id, tag),
		FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS service_environment (
		service_id TEXT NOT NULL,
		key TEXT NOT NULL,
		value TEXT NOT NULL,
		PRIMARY KEY (service_id, key),
		FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE
	);

	-- Indexes for performance
	CREATE INDEX IF NOT EXISTS idx_services_group ON services (group_name);
	CREATE INDEX IF NOT EXISTS idx_services_port ON services (port);
	CREATE INDEX IF NOT EXISTS idx_services_status ON services (status);
	CREATE INDEX IF NOT EXISTS idx_port_allocations_project ON port_allocations (project);

	-- Triggers for updated_at
	CREATE TRIGGER IF NOT EXISTS update_services_updated_at
		AFTER UPDATE ON services
		FOR EACH ROW
		BEGIN
			UPDATE services SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
		END;
	`

	_, err := r.db.Exec(schema)
	return err
}

// RegisterService registers a new service in the registry
func (r *Registry) RegisterService(service *types.Service) error {
	if service.ID == "" {
		service.ID = generateServiceID(service.Name, service.Group)
	}

	service.CreatedAt = time.Now()
	service.UpdatedAt = time.Now()

	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	// Insert service
	_, err = tx.Exec(`
		INSERT INTO services (id, name, group_name, port, status, health_url, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		service.ID, service.Name, service.Group, service.Port, service.Status,
		service.HealthURL, service.CreatedAt, service.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert service: %w", err)
	}

	// Insert tags
	for _, tag := range service.Tags {
		_, err = tx.Exec("INSERT INTO service_tags (service_id, tag) VALUES (?, ?)",
			service.ID, tag)
		if err != nil {
			return fmt.Errorf("failed to insert tag: %w", err)
		}
	}

	// Insert environment variables
	for key, value := range service.Environment {
		_, err = tx.Exec("INSERT INTO service_environment (service_id, key, value) VALUES (?, ?, ?)",
			service.ID, key, value)
		if err != nil {
			return fmt.Errorf("failed to insert environment variable: %w", err)
		}
	}

	return tx.Commit()
}

// UpdateServiceStatus updates the status of a service
func (r *Registry) UpdateServiceStatus(serviceID string, status types.ServiceStatus) error {
	now := time.Now()
	var startedAt, stoppedAt interface{}

	switch status {
	case types.StatusRunning:
		startedAt = now
		stoppedAt = nil
	case types.StatusStopped, types.StatusFailed:
		stoppedAt = now
	}

	_, err := r.db.Exec(`
		UPDATE services 
		SET status = ?, started_at = COALESCE(?, started_at), stopped_at = COALESCE(?, stopped_at)
		WHERE id = ?`,
		status, startedAt, stoppedAt, serviceID)
	
	return err
}

// GetService retrieves a service by ID
func (r *Registry) GetService(serviceID string) (*types.Service, error) {
	service := &types.Service{}
	
	row := r.db.QueryRow(`
		SELECT id, name, group_name, port, status, started_at, stopped_at, 
			   health_url, created_at, updated_at
		FROM services WHERE id = ?`, serviceID)

	var startedAt, stoppedAt sql.NullTime
	err := row.Scan(&service.ID, &service.Name, &service.Group, &service.Port,
		&service.Status, &startedAt, &stoppedAt, &service.HealthURL,
		&service.CreatedAt, &service.UpdatedAt)
	if err != nil {
		return nil, err
	}

	if startedAt.Valid {
		service.StartedAt = &startedAt.Time
	}
	if stoppedAt.Valid {
		service.StoppedAt = &stoppedAt.Time
	}

	// Load tags
	service.Tags, err = r.getServiceTags(serviceID)
	if err != nil {
		return nil, err
	}

	// Load environment variables
	service.Environment, err = r.getServiceEnvironment(serviceID)
	if err != nil {
		return nil, err
	}

	return service, nil
}

// GetServiceByPort retrieves a service by port number
func (r *Registry) GetServiceByPort(port int) (*types.Service, error) {
	service := &types.Service{}
	
	row := r.db.QueryRow(`
		SELECT id, name, group_name, port, status, started_at, stopped_at, 
			   health_url, created_at, updated_at
		FROM services WHERE port = ?`, port)

	var startedAt, stoppedAt sql.NullTime
	err := row.Scan(&service.ID, &service.Name, &service.Group, &service.Port,
		&service.Status, &startedAt, &stoppedAt, &service.HealthURL,
		&service.CreatedAt, &service.UpdatedAt)
	if err != nil {
		return nil, err
	}

	if startedAt.Valid {
		service.StartedAt = &startedAt.Time
	}
	if stoppedAt.Valid {
		service.StoppedAt = &stoppedAt.Time
	}

	// Load tags and environment
	service.Tags, _ = r.getServiceTags(service.ID)
	service.Environment, _ = r.getServiceEnvironment(service.ID)

	return service, nil
}

// ListServices returns all services in the registry
func (r *Registry) ListServices() ([]*types.Service, error) {
	rows, err := r.db.Query(`
		SELECT id, name, group_name, port, status, started_at, stopped_at, 
			   health_url, created_at, updated_at
		FROM services ORDER BY group_name, name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var services []*types.Service
	for rows.Next() {
		service := &types.Service{}
		var startedAt, stoppedAt sql.NullTime
		
		err := rows.Scan(&service.ID, &service.Name, &service.Group, &service.Port,
			&service.Status, &startedAt, &stoppedAt, &service.HealthURL,
			&service.CreatedAt, &service.UpdatedAt)
		if err != nil {
			return nil, err
		}

		if startedAt.Valid {
			service.StartedAt = &startedAt.Time
		}
		if stoppedAt.Valid {
			service.StoppedAt = &stoppedAt.Time
		}

		// Load tags and environment for each service
		service.Tags, _ = r.getServiceTags(service.ID)
		service.Environment, _ = r.getServiceEnvironment(service.ID)

		services = append(services, service)
	}

	return services, rows.Err()
}

// ListServicesByGroup returns services in a specific group
func (r *Registry) ListServicesByGroup(group string) ([]*types.Service, error) {
	rows, err := r.db.Query(`
		SELECT id, name, group_name, port, status, started_at, stopped_at, 
			   health_url, created_at, updated_at
		FROM services WHERE group_name = ? ORDER BY name`, group)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var services []*types.Service
	for rows.Next() {
		service := &types.Service{}
		var startedAt, stoppedAt sql.NullTime
		
		err := rows.Scan(&service.ID, &service.Name, &service.Group, &service.Port,
			&service.Status, &startedAt, &stoppedAt, &service.HealthURL,
			&service.CreatedAt, &service.UpdatedAt)
		if err != nil {
			return nil, err
		}

		if startedAt.Valid {
			service.StartedAt = &startedAt.Time
		}
		if stoppedAt.Valid {
			service.StoppedAt = &stoppedAt.Time
		}

		services = append(services, service)
	}

	return services, rows.Err()
}

// DeleteService removes a service from the registry
func (r *Registry) DeleteService(serviceID string) error {
	_, err := r.db.Exec("DELETE FROM services WHERE id = ?", serviceID)
	return err
}

// AllocatePort finds and allocates an available port in the specified range
func (r *Registry) AllocatePort(project string, startPort, endPort int) (int, error) {
	// Get all used ports in the range
	rows, err := r.db.Query("SELECT port FROM services WHERE port BETWEEN ? AND ?", startPort, endPort)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	usedPorts := make(map[int]bool)
	for rows.Next() {
		var port int
		if err := rows.Scan(&port); err != nil {
			return 0, err
		}
		usedPorts[port] = true
	}

	// Find first available port
	for port := startPort; port <= endPort; port++ {
		if !usedPorts[port] {
			return port, nil
		}
	}

	return 0, fmt.Errorf("no available ports in range %d-%d", startPort, endPort)
}

// GetPortUsage returns usage statistics for port ranges
func (r *Registry) GetPortUsage() ([]types.PortRange, error) {
	rows, err := r.db.Query(`
		SELECT project, start_port, end_port FROM port_allocations`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ranges []types.PortRange
	for rows.Next() {
		var pr types.PortRange
		err := rows.Scan(&pr.Project, &pr.StartPort, &pr.EndPort)
		if err != nil {
			return nil, err
		}

		// Count used ports in this range
		var count int
		err = r.db.QueryRow("SELECT COUNT(*) FROM services WHERE port BETWEEN ? AND ?", 
			pr.StartPort, pr.EndPort).Scan(&count)
		if err != nil {
			return nil, err
		}
		pr.Usage = count

		ranges = append(ranges, pr)
	}

	return ranges, rows.Err()
}

// Helper functions

func (r *Registry) getServiceTags(serviceID string) ([]string, error) {
	rows, err := r.db.Query("SELECT tag FROM service_tags WHERE service_id = ?", serviceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []string
	for rows.Next() {
		var tag string
		if err := rows.Scan(&tag); err != nil {
			return nil, err
		}
		tags = append(tags, tag)
	}

	return tags, rows.Err()
}

func (r *Registry) getServiceEnvironment(serviceID string) (map[string]string, error) {
	rows, err := r.db.Query("SELECT key, value FROM service_environment WHERE service_id = ?", serviceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	env := make(map[string]string)
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			return nil, err
		}
		env[key] = value
	}

	return env, rows.Err()
}

func generateServiceID(name, group string) string {
	return fmt.Sprintf("%s-%s", group, name)
}

func createDirectoryIfNotExists(dir string) error {
	if dir == "" {
		return nil
	}
	return ensureDir(dir)
}

// ensureDir creates a directory if it doesn't exist
func ensureDir(dir string) error {
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		return os.MkdirAll(dir, 0755)
	}
	return nil
}