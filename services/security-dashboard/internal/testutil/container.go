package testutil

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/candlefish-ai/security-dashboard/internal/database"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/modules/redis"
	"github.com/testcontainers/testcontainers-go/wait"
)

// TestContainer holds test database and Redis instances
type TestContainer struct {
	DB              *sqlx.DB
	Redis           *redis.Client
	postgresContainer *postgres.PostgresContainer
	redisContainer    *redis.RedisContainer
}

// SetupTestContainer creates test containers for PostgreSQL and Redis
func SetupTestContainer() (*TestContainer, error) {
	ctx := context.Background()

	// Setup PostgreSQL test container
	postgresContainer, err := postgres.RunContainer(ctx,
		testcontainers.WithImage("timescale/timescaledb:2.14.2-pg16"),
		postgres.WithDatabase("test_security_dashboard"),
		postgres.WithUsername("testuser"),
		postgres.WithPassword("testpass"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(30*time.Second),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to start postgres container: %w", err)
	}

	// Get PostgreSQL connection details
	host, err := postgresContainer.Host(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get postgres host: %w", err)
	}

	port, err := postgresContainer.MappedPort(ctx, "5432")
	if err != nil {
		return nil, fmt.Errorf("failed to get postgres port: %w", err)
	}

	// Connect to PostgreSQL
	dsn := fmt.Sprintf("host=%s port=%s user=testuser password=testpass dbname=test_security_dashboard sslmode=disable",
		host, port.Port())

	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		postgresContainer.Terminate(ctx)
		return nil, fmt.Errorf("failed to connect to test database: %w", err)
	}

	// Run database migrations
	err = database.RunMigrations(db)
	if err != nil {
		db.Close()
		postgresContainer.Terminate(ctx)
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	// Setup Redis test container
	redisContainer, err := redis.RunContainer(ctx,
		testcontainers.WithImage("redis:7-alpine"),
		testcontainers.WithWaitStrategy(wait.ForLog("Ready to accept connections")),
	)
	if err != nil {
		db.Close()
		postgresContainer.Terminate(ctx)
		return nil, fmt.Errorf("failed to start redis container: %w", err)
	}

	// Get Redis connection details
	redisHost, err := redisContainer.Host(ctx)
	if err != nil {
		db.Close()
		postgresContainer.Terminate(ctx)
		redisContainer.Terminate(ctx)
		return nil, fmt.Errorf("failed to get redis host: %w", err)
	}

	redisPort, err := redisContainer.MappedPort(ctx, "6379")
	if err != nil {
		db.Close()
		postgresContainer.Terminate(ctx)
		redisContainer.Terminate(ctx)
		return nil, fmt.Errorf("failed to get redis port: %w", err)
	}

	// Connect to Redis
	redisClient := redis.NewClient(&redis.Options{
		Addr: fmt.Sprintf("%s:%s", redisHost, redisPort.Port()),
		DB:   0,
	})

	// Test Redis connection
	_, err = redisClient.Ping(ctx).Result()
	if err != nil {
		db.Close()
		redisClient.Close()
		postgresContainer.Terminate(ctx)
		redisContainer.Terminate(ctx)
		return nil, fmt.Errorf("failed to ping redis: %w", err)
	}

	return &TestContainer{
		DB:                db,
		Redis:             redisClient,
		postgresContainer: postgresContainer,
		redisContainer:    redisContainer,
	}, nil
}

// Cleanup terminates test containers and closes connections
func (tc *TestContainer) Cleanup() {
	ctx := context.Background()

	if tc.DB != nil {
		tc.DB.Close()
	}

	if tc.Redis != nil {
		tc.Redis.Close()
	}

	if tc.postgresContainer != nil {
		tc.postgresContainer.Terminate(ctx)
	}

	if tc.redisContainer != nil {
		tc.redisContainer.Terminate(ctx)
	}
}

// CleanupDatabase removes all data from database tables for clean test runs
func (tc *TestContainer) CleanupDatabase() {
	ctx := context.Background()

	// Disable foreign key checks temporarily
	tc.DB.ExecContext(ctx, "SET session_replication_role = replica;")

	// Clean tables in reverse dependency order
	tables := []string{
		"security_events",
		"vulnerabilities",
		"alerts",
		"kong_api_status",
		"assets",
	}

	for _, table := range tables {
		tc.DB.ExecContext(ctx, fmt.Sprintf("TRUNCATE TABLE %s RESTART IDENTITY CASCADE", table))
	}

	// Re-enable foreign key checks
	tc.DB.ExecContext(ctx, "SET session_replication_role = DEFAULT;")

	// Clean Redis
	tc.Redis.FlushDB(ctx)
}

// SetupTestDatabase creates a test database connection for unit tests
func SetupTestDatabase(t *testing.T) *sqlx.DB {
	container, err := SetupTestContainer()
	if err != nil {
		t.Fatalf("Failed to setup test container: %v", err)
	}

	t.Cleanup(func() {
		container.Cleanup()
	})

	return container.DB
}

// SetupTestRedis creates a test Redis connection for unit tests
func SetupTestRedis(t *testing.T) *redis.Client {
	container, err := SetupTestContainer()
	if err != nil {
		t.Fatalf("Failed to setup test container: %v", err)
	}

	t.Cleanup(func() {
		container.Cleanup()
	})

	return container.Redis
}

// WaitForContainer waits for a container to be ready
func WaitForContainer(container testcontainers.Container, timeout time.Duration) error {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	return wait.ForHTTP("/").Port("80/tcp").WaitUntilReady(ctx, container)
}

// ExecuteInTransaction executes a function within a database transaction
func ExecuteInTransaction(db *sqlx.DB, fn func(*sqlx.Tx) error) error {
	tx, err := db.Beginx()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	defer func() {
		if p := recover(); p != nil {
			tx.Rollback()
			panic(p)
		}
	}()

	if err := fn(tx); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}
