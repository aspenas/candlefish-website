package database

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
)

func Init() (*sqlx.DB, error) {
	// Use SQLite database - check for inventory_master.db first, fallback to inventory.db
	dbPath := os.Getenv("DATABASE_PATH")
	if dbPath == "" {
		// Try inventory_master.db first (new master database)
		if _, err := os.Stat("inventory_master.db"); err == nil {
			dbPath = "inventory_master.db"
		} else {
			// Fallback to inventory.db
			dbPath = "inventory.db"
		}
	}

	// Make path absolute
	if !filepath.IsAbs(dbPath) {
		wd, err := os.Getwd()
		if err != nil {
			return nil, fmt.Errorf("failed to get working directory: %w", err)
		}
		dbPath = filepath.Join(wd, dbPath)
	}

	// Check if database file exists
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("database file not found: %s", dbPath)
	}
	
	fmt.Printf("Connecting to database: %s\n", dbPath)

	// Connect to SQLite database
	db, err := sqlx.Connect("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Enable foreign keys
	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		return nil, fmt.Errorf("failed to enable foreign keys: %w", err)
	}

	return db, nil
}
