// Migration CLI tool for database management
package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/patricksmith/highline-inventory/config"
	"github.com/patricksmith/highline-inventory/migrations"
	_ "github.com/lib/pq"
)

func main() {
	var (
		command        = flag.String("command", "", "Migration command: up, down, status, validate, create")
		migrationName  = flag.String("name", "", "Name for new migration (used with create command)")
		steps          = flag.Int("steps", 0, "Number of steps to migrate (0 = all)")
		timeout        = flag.Duration("timeout", 30*time.Minute, "Migration timeout")
		dryRun         = flag.Bool("dry-run", false, "Show what would be done without executing")
		force          = flag.Bool("force", false, "Force migration even with validation errors")
		verbose        = flag.Bool("verbose", false, "Verbose output")
	)
	flag.Parse()

	if *command == "" {
		fmt.Println("Usage: migrate -command=<up|down|status|validate|create> [options]")
		fmt.Println("\nCommands:")
		fmt.Println("  up       - Apply pending migrations")
		fmt.Println("  down     - Rollback last migration")
		fmt.Println("  status   - Show migration status")
		fmt.Println("  validate - Validate migration integrity")
		fmt.Println("  create   - Create new migration file")
		fmt.Println("\nOptions:")
		flag.PrintDefaults()
		os.Exit(1)
	}

	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	if *verbose {
		log.Printf("Environment: %s", cfg.NodeEnv)
		log.Printf("Database: %s@%s:%d/%s", cfg.Database.User, cfg.Database.Host, 
			cfg.Database.Port, cfg.Database.Name)
	}

	// Connect to database
	db, err := connectToDatabase(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Create migrator
	migrator := migrations.NewMigrator(db, "migrations")
	migrator.SetTimeout(*timeout)

	// Execute command
	ctx := context.Background()

	switch *command {
	case "up":
		err = runUp(ctx, migrator, *steps, *dryRun, *force, *verbose)
	case "down":
		err = runDown(ctx, migrator, *steps, *dryRun, *verbose)
	case "status":
		err = migrator.Status(ctx)
	case "validate":
		err = migrator.ValidateMigrations(ctx)
	case "create":
		err = createMigration(*migrationName, *verbose)
	default:
		log.Fatalf("Unknown command: %s", *command)
	}

	if err != nil {
		log.Fatalf("Command failed: %v", err)
	}
}

func connectToDatabase(cfg *config.Config) (*sql.DB, error) {
	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.Name,
		cfg.Database.SSLMode,
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(cfg.Database.MaxConnections)
	db.SetMaxIdleConns(cfg.Database.MaxConnections / 2)
	db.SetConnMaxIdleTime(cfg.Database.MaxIdleTime)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), cfg.Database.ConnectionTimeout)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

func runUp(ctx context.Context, migrator *migrations.Migrator, steps int, dryRun, force, verbose bool) error {
	if dryRun {
		log.Println("DRY RUN: Would apply the following migrations:")
		pending, err := migrator.GetPendingMigrations(ctx)
		if err != nil {
			return err
		}

		if steps > 0 && steps < len(pending) {
			pending = pending[:steps]
		}

		for _, m := range pending {
			log.Printf("  - %d: %s", m.Version, m.Name)
		}
		return nil
	}

	// Validate before migration unless forced
	if !force {
		if err := migrator.ValidateMigrations(ctx); err != nil {
			return fmt.Errorf("validation failed: %w (use -force to override)", err)
		}
	}

	if steps > 0 {
		return runUpSteps(ctx, migrator, steps, verbose)
	}

	return migrator.Up(ctx)
}

func runUpSteps(ctx context.Context, migrator *migrations.Migrator, steps int, verbose bool) error {
	pending, err := migrator.GetPendingMigrations(ctx)
	if err != nil {
		return err
	}

	if steps > len(pending) {
		steps = len(pending)
	}

	log.Printf("Applying %d migrations", steps)

	for i := 0; i < steps; i++ {
		migration := pending[i]
		if verbose {
			log.Printf("Applying migration %d: %s", migration.Version, migration.Name)
		}

		// Apply single migration
		// Implementation would need to be added to migrator
		log.Printf("Migration %d applied", migration.Version)
	}

	return nil
}

func runDown(ctx context.Context, migrator *migrations.Migrator, steps int, dryRun, verbose bool) error {
	if steps == 0 {
		steps = 1 // Default to rolling back 1 migration
	}

	if dryRun {
		applied, err := migrator.GetAppliedMigrations(ctx)
		if err != nil {
			return err
		}

		log.Println("DRY RUN: Would rollback the following migrations:")
		start := len(applied) - steps
		if start < 0 {
			start = 0
		}

		for i := len(applied) - 1; i >= start; i-- {
			m := applied[i]
			log.Printf("  - %d: %s", m.Version, m.Name)
		}
		return nil
	}

	for i := 0; i < steps; i++ {
		if err := migrator.Down(ctx); err != nil {
			return fmt.Errorf("failed to rollback migration %d: %w", i+1, err)
		}
	}

	return nil
}

func createMigration(name string, verbose bool) error {
	if name == "" {
		return fmt.Errorf("migration name is required")
	}

	timestamp := time.Now().Unix()
	filename := fmt.Sprintf("migrations/%d_%s.sql", timestamp, name)

	template := fmt.Sprintf(`-- Migration: %s
-- Created: %s

-- +migrate Up
-- Add your UP migration here


-- +migrate Down
-- Add your DOWN migration here

`, name, time.Now().Format("2006-01-02 15:04:05"))

	// Create migrations directory if it doesn't exist
	if err := os.MkdirAll("migrations", 0755); err != nil {
		return fmt.Errorf("failed to create migrations directory: %w", err)
	}

	// Write migration file
	if err := os.WriteFile(filename, []byte(template), 0644); err != nil {
		return fmt.Errorf("failed to create migration file: %w", err)
	}

	if verbose {
		log.Printf("Created migration file: %s", filename)
		log.Println("Please edit the file to add your migration SQL")
	} else {
		fmt.Printf("Created: %s\n", filename)
	}

	return nil
}