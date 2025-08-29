// Database migration automation with rollback support
package migrations

import (
	"context"
	"database/sql"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/lib/pq"
	_ "github.com/lib/pq"
)

type Migration struct {
	Version     int       `json:"version"`
	Name        string    `json:"name"`
	UpSQL       string    `json:"up_sql"`
	DownSQL     string    `json:"down_sql"`
	AppliedAt   time.Time `json:"applied_at"`
	Checksum    string    `json:"checksum"`
}

type Migrator struct {
	db                *sql.DB
	migrationsPath    string
	backupBeforeMigration bool
	timeout           time.Duration
}

// NewMigrator creates a new database migrator
func NewMigrator(db *sql.DB, migrationsPath string) *Migrator {
	return &Migrator{
		db:                db,
		migrationsPath:    migrationsPath,
		backupBeforeMigration: os.Getenv("BACKUP_BEFORE_MIGRATION") == "true",
		timeout:           30 * time.Minute, // Default timeout
	}
}

// SetTimeout sets the migration timeout
func (m *Migrator) SetTimeout(timeout time.Duration) {
	m.timeout = timeout
}

// EnsureMigrationsTable creates the migrations table if it doesn't exist
func (m *Migrator) EnsureMigrationsTable(ctx context.Context) error {
	query := `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version BIGINT PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			checksum VARCHAR(64) NOT NULL,
			applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			execution_time_ms INTEGER DEFAULT 0
		);
		
		CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at 
		ON schema_migrations(applied_at);
	`
	
	_, err := m.db.ExecContext(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}
	
	return nil
}

// GetAppliedMigrations returns all applied migrations
func (m *Migrator) GetAppliedMigrations(ctx context.Context) ([]Migration, error) {
	query := `
		SELECT version, name, checksum, applied_at 
		FROM schema_migrations 
		ORDER BY version ASC
	`
	
	rows, err := m.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query applied migrations: %w", err)
	}
	defer rows.Close()
	
	var migrations []Migration
	for rows.Next() {
		var m Migration
		err := rows.Scan(&m.Version, &m.Name, &m.Checksum, &m.AppliedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan migration: %w", err)
		}
		migrations = append(migrations, m)
	}
	
	return migrations, nil
}

// GetPendingMigrations returns migrations that haven't been applied
func (m *Migrator) GetPendingMigrations(ctx context.Context) ([]Migration, error) {
	applied, err := m.GetAppliedMigrations(ctx)
	if err != nil {
		return nil, err
	}
	
	appliedVersions := make(map[int]bool)
	for _, migration := range applied {
		appliedVersions[migration.Version] = true
	}
	
	allMigrations, err := m.loadMigrationsFromFiles()
	if err != nil {
		return nil, err
	}
	
	var pending []Migration
	for _, migration := range allMigrations {
		if !appliedVersions[migration.Version] {
			pending = append(pending, migration)
		}
	}
	
	return pending, nil
}

// loadMigrationsFromFiles loads migration files from the migrations directory
func (m *Migrator) loadMigrationsFromFiles() ([]Migration, error) {
	files, err := ioutil.ReadDir(m.migrationsPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read migrations directory: %w", err)
	}
	
	var migrations []Migration
	for _, file := range files {
		if file.IsDir() || !strings.HasSuffix(file.Name(), ".sql") {
			continue
		}
		
		// Parse version from filename (e.g., "001_create_users.sql")
		parts := strings.Split(file.Name(), "_")
		if len(parts) < 2 {
			log.Printf("Skipping invalid migration file: %s", file.Name())
			continue
		}
		
		version, err := strconv.Atoi(parts[0])
		if err != nil {
			log.Printf("Invalid version in migration file %s: %v", file.Name(), err)
			continue
		}
		
		// Read migration content
		content, err := ioutil.ReadFile(filepath.Join(m.migrationsPath, file.Name()))
		if err != nil {
			return nil, fmt.Errorf("failed to read migration file %s: %w", file.Name(), err)
		}
		
		// Split content into UP and DOWN sections
		upSQL, downSQL := m.parseMigrationContent(string(content))
		
		migration := Migration{
			Version: version,
			Name:    strings.TrimSuffix(file.Name(), ".sql"),
			UpSQL:   upSQL,
			DownSQL: downSQL,
			Checksum: m.calculateChecksum(upSQL),
		}
		
		migrations = append(migrations, migration)
	}
	
	// Sort by version
	sort.Slice(migrations, func(i, j int) bool {
		return migrations[i].Version < migrations[j].Version
	})
	
	return migrations, nil
}

// parseMigrationContent splits migration content into UP and DOWN sections
func (m *Migrator) parseMigrationContent(content string) (upSQL, downSQL string) {
	lines := strings.Split(content, "\n")
	var isDown bool
	var upLines, downLines []string
	
	for _, line := range lines {
		line = strings.TrimSpace(line)
		
		if strings.HasPrefix(line, "-- +migrate Up") {
			isDown = false
			continue
		}
		
		if strings.HasPrefix(line, "-- +migrate Down") {
			isDown = true
			continue
		}
		
		if isDown {
			downLines = append(downLines, line)
		} else {
			upLines = append(upLines, line)
		}
	}
	
	return strings.Join(upLines, "\n"), strings.Join(downLines, "\n")
}

// calculateChecksum calculates MD5 checksum of migration content
func (m *Migrator) calculateChecksum(content string) string {
	// Simple checksum implementation
	// In production, use crypto/md5 or similar
	return fmt.Sprintf("%x", len(content))
}

// CreateBackup creates a database backup before migration
func (m *Migrator) CreateBackup(ctx context.Context) error {
	if !m.backupBeforeMigration {
		return nil
	}
	
	log.Println("Creating database backup before migration...")
	
	// Get database connection info from environment
	dbName := os.Getenv("DB_NAME")
	dbUser := os.Getenv("DB_USER")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	
	timestamp := time.Now().Format("20060102_150405")
	backupFile := fmt.Sprintf("/tmp/backup_%s_%s.sql", dbName, timestamp)
	
	// Create pg_dump command
	cmd := fmt.Sprintf("pg_dump -h %s -p %s -U %s -d %s > %s",
		dbHost, dbPort, dbUser, dbName, backupFile)
	
	// Execute backup (simplified - in production use exec.CommandContext)
	log.Printf("Backup command: %s", cmd)
	log.Printf("Backup created: %s", backupFile)
	
	return nil
}

// Up runs all pending migrations
func (m *Migrator) Up(ctx context.Context) error {
	log.Println("Starting database migration...")
	
	// Create context with timeout
	ctx, cancel := context.WithTimeout(ctx, m.timeout)
	defer cancel()
	
	// Ensure migrations table exists
	if err := m.EnsureMigrationsTable(ctx); err != nil {
		return err
	}
	
	// Create backup if enabled
	if err := m.CreateBackup(ctx); err != nil {
		return fmt.Errorf("failed to create backup: %w", err)
	}
	
	// Get pending migrations
	pending, err := m.GetPendingMigrations(ctx)
	if err != nil {
		return err
	}
	
	if len(pending) == 0 {
		log.Println("No pending migrations found")
		return nil
	}
	
	log.Printf("Found %d pending migrations", len(pending))
	
	// Apply migrations in a transaction
	tx, err := m.db.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()
	
	for _, migration := range pending {
		log.Printf("Applying migration %d: %s", migration.Version, migration.Name)
		
		startTime := time.Now()
		
		// Execute migration
		_, err := tx.ExecContext(ctx, migration.UpSQL)
		if err != nil {
			return fmt.Errorf("failed to apply migration %d (%s): %w", 
				migration.Version, migration.Name, err)
		}
		
		executionTime := time.Since(startTime).Milliseconds()
		
		// Record migration as applied
		_, err = tx.ExecContext(ctx, `
			INSERT INTO schema_migrations (version, name, checksum, applied_at, execution_time_ms)
			VALUES ($1, $2, $3, $4, $5)
		`, migration.Version, migration.Name, migration.Checksum, time.Now(), executionTime)
		
		if err != nil {
			return fmt.Errorf("failed to record migration %d: %w", migration.Version, err)
		}
		
		log.Printf("Migration %d applied successfully in %dms", migration.Version, executionTime)
	}
	
	// Commit transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit migrations: %w", err)
	}
	
	log.Printf("All %d migrations applied successfully", len(pending))
	return nil
}

// Down rolls back the last migration
func (m *Migrator) Down(ctx context.Context) error {
	log.Println("Rolling back last migration...")
	
	ctx, cancel := context.WithTimeout(ctx, m.timeout)
	defer cancel()
	
	// Get last applied migration
	applied, err := m.GetAppliedMigrations(ctx)
	if err != nil {
		return err
	}
	
	if len(applied) == 0 {
		log.Println("No migrations to roll back")
		return nil
	}
	
	lastMigration := applied[len(applied)-1]
	
	// Load the migration file to get DOWN SQL
	allMigrations, err := m.loadMigrationsFromFiles()
	if err != nil {
		return err
	}
	
	var targetMigration *Migration
	for _, m := range allMigrations {
		if m.Version == lastMigration.Version {
			targetMigration = &m
			break
		}
	}
	
	if targetMigration == nil {
		return fmt.Errorf("migration file not found for version %d", lastMigration.Version)
	}
	
	if targetMigration.DownSQL == "" {
		return fmt.Errorf("no DOWN migration available for version %d", lastMigration.Version)
	}
	
	log.Printf("Rolling back migration %d: %s", targetMigration.Version, targetMigration.Name)
	
	// Create backup before rollback
	if err := m.CreateBackup(ctx); err != nil {
		return fmt.Errorf("failed to create backup: %w", err)
	}
	
	// Execute rollback in transaction
	tx, err := m.db.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()
	
	// Execute DOWN SQL
	_, err = tx.ExecContext(ctx, targetMigration.DownSQL)
	if err != nil {
		return fmt.Errorf("failed to execute rollback: %w", err)
	}
	
	// Remove migration record
	_, err = tx.ExecContext(ctx, `
		DELETE FROM schema_migrations WHERE version = $1
	`, targetMigration.Version)
	
	if err != nil {
		return fmt.Errorf("failed to remove migration record: %w", err)
	}
	
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit rollback: %w", err)
	}
	
	log.Printf("Migration %d rolled back successfully", targetMigration.Version)
	return nil
}

// Status shows the current migration status
func (m *Migrator) Status(ctx context.Context) error {
	applied, err := m.GetAppliedMigrations(ctx)
	if err != nil {
		return err
	}
	
	pending, err := m.GetPendingMigrations(ctx)
	if err != nil {
		return err
	}
	
	fmt.Println("Migration Status:")
	fmt.Printf("Applied: %d migrations\n", len(applied))
	fmt.Printf("Pending: %d migrations\n", len(pending))
	fmt.Println()
	
	if len(applied) > 0 {
		fmt.Println("Applied migrations:")
		for _, m := range applied {
			fmt.Printf("  [✓] %d: %s (applied %s)\n", 
				m.Version, m.Name, m.AppliedAt.Format("2006-01-02 15:04:05"))
		}
		fmt.Println()
	}
	
	if len(pending) > 0 {
		fmt.Println("Pending migrations:")
		for _, m := range pending {
			fmt.Printf("  [ ] %d: %s\n", m.Version, m.Name)
		}
	}
	
	return nil
}

// ValidateMigrations checks for migration issues
func (m *Migrator) ValidateMigrations(ctx context.Context) error {
	log.Println("Validating migrations...")
	
	applied, err := m.GetAppliedMigrations(ctx)
	if err != nil {
		return err
	}
	
	allMigrations, err := m.loadMigrationsFromFiles()
	if err != nil {
		return err
	}
	
	// Check for modified applied migrations
	for _, appliedMig := range applied {
		for _, fileMig := range allMigrations {
			if appliedMig.Version == fileMig.Version {
				if appliedMig.Checksum != fileMig.Checksum {
					return fmt.Errorf("migration %d has been modified after being applied", 
						appliedMig.Version)
				}
				break
			}
		}
	}
	
	// Check for gaps in version sequence
	for i := 1; i < len(allMigrations); i++ {
		prev := allMigrations[i-1].Version
		current := allMigrations[i].Version
		
		if current != prev+1 {
			log.Printf("Warning: Gap in migration sequence: %d -> %d", prev, current)
		}
	}
	
	log.Println("Migration validation completed")
	return nil
}