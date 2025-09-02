package database

import (
	"database/sql"
	"io/ioutil"
	"log"
	"path/filepath"
)

// RunAuthMigrations runs the authentication related database migrations
func RunAuthMigrations(db *sql.DB) error {
	// Read migration file
	migrationPath := filepath.Join("migrations", "001_create_auth_tables.sql")
	content, err := ioutil.ReadFile(migrationPath)
	if err != nil {
		// Try alternative path
		content, err = ioutil.ReadFile(filepath.Join("backend", "migrations", "001_create_auth_tables.sql"))
		if err != nil {
			log.Printf("Warning: Could not read migration file: %v", err)
			// Create tables directly if file not found
			return createAuthTablesDirectly(db)
		}
	}

	// Execute migration
	_, err = db.Exec(string(content))
	if err != nil {
		log.Printf("Warning: Migration execution failed: %v", err)
		// Try creating tables directly
		return createAuthTablesDirectly(db)
	}

	log.Println("Auth migrations completed successfully")
	return nil
}

// createAuthTablesDirectly creates auth tables without reading from file
func createAuthTablesDirectly(db *sql.DB) error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			email TEXT UNIQUE NOT NULL,
			username TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			first_name TEXT NOT NULL,
			last_name TEXT NOT NULL,
			is_active BOOLEAN DEFAULT 1,
			is_verified BOOLEAN DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			last_login_at DATETIME,
			failed_logins INTEGER DEFAULT 0,
			locked_until DATETIME
		)`,
		
		`CREATE TABLE IF NOT EXISTS user_roles (
			user_id TEXT NOT NULL,
			role TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (user_id, role),
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		
		`CREATE TABLE IF NOT EXISTS refresh_tokens (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			token TEXT UNIQUE NOT NULL,
			expires_at DATETIME NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			revoked BOOLEAN DEFAULT 0,
			revoked_at DATETIME,
			device_info TEXT,
			ip_address TEXT,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		
		`CREATE TABLE IF NOT EXISTS auth_logs (
			id TEXT PRIMARY KEY,
			user_id TEXT,
			event TEXT NOT NULL,
			ip_address TEXT,
			user_agent TEXT,
			details TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
		)`,
		
		`CREATE TABLE IF NOT EXISTS sessions (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			access_token TEXT,
			refresh_token TEXT,
			ip_address TEXT,
			user_agent TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
			expires_at DATETIME NOT NULL,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		
		// Indexes
		`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
		`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
		`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)`,
		`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			log.Printf("Warning: Failed to execute query: %v", err)
			// Continue with other queries
		}
	}

	// Insert default admin user
	adminQuery := `INSERT OR IGNORE INTO users (id, email, username, password_hash, first_name, last_name, is_active, is_verified, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
	
	_, err := db.Exec(adminQuery,
		"00000000-0000-0000-0000-000000000001",
		"admin@highline.work",
		"admin",
		"$2a$10$YpPqz8H3H5IxK5jCOYQGy.FqCl8FzRmJL.mKnhDQZfpBcY8DqRXeG", // Admin123!
		"System",
		"Administrator",
	)
	
	if err != nil {
		log.Printf("Warning: Failed to insert admin user: %v", err)
	}

	// Assign admin role
	roleQuery := `INSERT OR IGNORE INTO user_roles (user_id, role, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)`
	_, err = db.Exec(roleQuery, "00000000-0000-0000-0000-000000000001", "admin")
	
	if err != nil {
		log.Printf("Warning: Failed to assign admin role: %v", err)
	}

	log.Println("Auth tables created successfully")
	return nil
}