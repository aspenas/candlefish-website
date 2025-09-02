// Environment configuration manager with AWS Secrets Manager integration
package config

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
	"github.com/joho/godotenv"
)

type Config struct {
	// Application Configuration
	NodeEnv    string `json:"node_env"`
	AppName    string `json:"app_name"`
	AppVersion string `json:"app_version"`
	Debug      bool   `json:"debug"`

	// Server Configuration
	APIPort      int           `json:"api_port"`
	WSPort       int           `json:"ws_port"`
	FrontendPort int           `json:"frontend_port"`
	Timeout      time.Duration `json:"timeout"`

	// Database Configuration
	Database DatabaseConfig `json:"database"`

	// Redis Configuration
	Redis RedisConfig `json:"redis"`

	// File Upload Configuration
	Upload UploadConfig `json:"upload"`

	// AWS Configuration
	AWS AWSConfig `json:"aws"`

	// Security Configuration
	Security SecurityConfig `json:"security"`

	// Logging Configuration
	Logging LoggingConfig `json:"logging"`

	// Feature Flags
	Features FeatureConfig `json:"features"`

	// Health Check Configuration
	HealthCheck HealthCheckConfig `json:"health_check"`

	// Cache Configuration
	Cache CacheConfig `json:"cache"`

	// Email Configuration
	Email EmailConfig `json:"email"`

	// Monitoring Configuration
	Monitoring MonitoringConfig `json:"monitoring"`
}

type DatabaseConfig struct {
	Host               string        `json:"host"`
	Port               int           `json:"port"`
	Name               string        `json:"name"`
	User               string        `json:"user"`
	Password           string        `json:"password"`
	MaxConnections     int           `json:"max_connections"`
	MaxIdleTime        time.Duration `json:"max_idle_time"`
	ConnectionTimeout  time.Duration `json:"connection_timeout"`
	SSLMode            string        `json:"ssl_mode"`
	RetryCount         int           `json:"retry_count"`
	RetryDelay         time.Duration `json:"retry_delay"`
	MigrationTimeout   time.Duration `json:"migration_timeout"`
	AutoMigrate        bool          `json:"auto_migrate"`
	BackupBeforeMigration bool       `json:"backup_before_migration"`
}

type RedisConfig struct {
	Host               string        `json:"host"`
	Port               int           `json:"port"`
	Password           string        `json:"password"`
	MaxConnections     int           `json:"max_connections"`
	ConnectionTimeout  time.Duration `json:"connection_timeout"`
	ClusterMode        bool          `json:"cluster_mode"`
}

type UploadConfig struct {
	Path              string   `json:"path"`
	MaxFileSize       string   `json:"max_file_size"`
	AllowedFileTypes  []string `json:"allowed_file_types"`
	ImageQuality      int      `json:"image_quality"`
	ThumbnailSize     int      `json:"thumbnail_size"`
	WebSize           int      `json:"web_size"`
	OriginalRetention bool     `json:"original_retention"`
}

type AWSConfig struct {
	Region          string `json:"region"`
	S3Bucket        string `json:"s3_bucket"`
	CloudFrontDomain string `json:"cloudfront_domain"`
	KMSKeyID        string `json:"kms_key_id"`
}

type SecurityConfig struct {
	CORSOrigins        []string      `json:"cors_origins"`
	RateLimitRequests  int           `json:"rate_limit_requests"`
	RateLimitWindow    time.Duration `json:"rate_limit_window"`
	RateLimitBurst     int           `json:"rate_limit_burst"`
	SessionTimeout     time.Duration `json:"session_timeout"`
	JWTSecret          string        `json:"jwt_secret"`
	JWTExpiration      time.Duration `json:"jwt_expiration"`
	SecureCookies      bool          `json:"secure_cookies"`
	CSRFProtection     bool          `json:"csrf_protection"`
	SecurityHeaders    bool          `json:"security_headers"`
}

type LoggingConfig struct {
	Level                string `json:"level"`
	Format               string `json:"format"`
	FileEnabled          bool   `json:"file_enabled"`
	FilePath             string `json:"file_path"`
	StructuredLogging    bool   `json:"structured_logging"`
	Rotation             string `json:"rotation"`
	RetentionDays        int    `json:"retention_days"`
	SensitiveDataMasking bool   `json:"sensitive_data_masking"`
}

type FeatureConfig struct {
	PhotoBatchUpload   bool `json:"photo_batch_upload"`
	AIValuation        bool `json:"ai_valuation"`
	RealTimeUpdates    bool `json:"real_time_updates"`
	AdvancedSearch     bool `json:"advanced_search"`
	BetaFeatures       bool `json:"beta_features"`
}

type HealthCheckConfig struct {
	Interval            time.Duration `json:"interval"`
	Timeout             time.Duration `json:"timeout"`
	Dependencies        []string      `json:"dependencies"`
	LivenessPath        string        `json:"liveness_path"`
	ReadinessPath       string        `json:"readiness_path"`
}

type CacheConfig struct {
	TTLDefault    time.Duration `json:"ttl_default"`
	TTLItems      time.Duration `json:"ttl_items"`
	TTLValuations time.Duration `json:"ttl_valuations"`
	TTLStatic     time.Duration `json:"ttl_static"`
	Invalidation  bool          `json:"invalidation_enabled"`
}

type EmailConfig struct {
	SMTPHost     string `json:"smtp_host"`
	SMTPPort     int    `json:"smtp_port"`
	SMTPSecure   bool   `json:"smtp_secure"`
	SMTPUser     string `json:"smtp_user"`
	SMTPPassword string `json:"smtp_password"`
	FromAddress  string `json:"from_address"`
	ReplyTo      string `json:"reply_to"`
}

type MonitoringConfig struct {
	MetricsEnabled     bool   `json:"metrics_enabled"`
	MetricsPort        int    `json:"metrics_port"`
	TracingEnabled     bool   `json:"tracing_enabled"`
	JaegerEndpoint     string `json:"jaeger_endpoint"`
	PrometheusEndpoint string `json:"prometheus_endpoint"`
	DatadogEnabled     bool   `json:"datadog_enabled"`
	DatadogAPIKey      string `json:"datadog_api_key"`
}

var GlobalConfig *Config

// LoadConfig loads configuration from environment files and AWS Secrets Manager
func LoadConfig() (*Config, error) {
	// Determine environment
	env := getEnv("NODE_ENV", "development")
	
	// Load environment file
	envFile := fmt.Sprintf("environments/.env.%s", env)
	if err := godotenv.Load(envFile); err != nil && env != "production" {
		log.Printf("Warning: Could not load %s: %v", envFile, err)
	}

	config := &Config{
		NodeEnv:    env,
		AppName:    getEnv("APP_NAME", "inventory-system"),
		AppVersion: getEnv("APP_VERSION", "1.0.0"),
		Debug:      getBoolEnv("DEBUG", env == "development"),
		
		APIPort:      getIntEnv("API_PORT", 8080),
		WSPort:       getIntEnv("WS_PORT", 8081),
		FrontendPort: getIntEnv("FRONTEND_PORT", 3000),
		Timeout:      getDurationEnv("TIMEOUT", "30s"),
	}

	// Load database configuration
	config.Database = DatabaseConfig{
		Host:                  getEnv("DB_HOST", "localhost"),
		Port:                  getIntEnv("DB_PORT", 5432),
		Name:                  getEnv("DB_NAME", "inventory_dev"),
		User:                  getEnv("DB_USER", "postgres"),
		MaxConnections:        getIntEnv("DB_MAX_CONNECTIONS", 10),
		MaxIdleTime:          getDurationEnv("DB_MAX_IDLE_TIME", "60s"),
		ConnectionTimeout:    getDurationEnv("DB_CONNECTION_TIMEOUT", "30s"),
		SSLMode:              getEnv("DB_SSL_MODE", "disable"),
		RetryCount:           getIntEnv("DB_CONNECTION_RETRY_COUNT", 3),
		RetryDelay:           getDurationEnv("DB_CONNECTION_RETRY_DELAY", "5s"),
		MigrationTimeout:     getDurationEnv("MIGRATION_TIMEOUT", "300s"),
		AutoMigrate:          getBoolEnv("AUTO_MIGRATE", env == "development"),
		BackupBeforeMigration: getBoolEnv("BACKUP_BEFORE_MIGRATION", env == "production"),
	}

	// Load Redis configuration
	config.Redis = RedisConfig{
		Host:              getEnv("REDIS_HOST", "localhost"),
		Port:              getIntEnv("REDIS_PORT", 6379),
		MaxConnections:    getIntEnv("REDIS_MAX_CONNECTIONS", 10),
		ConnectionTimeout: getDurationEnv("REDIS_CONNECTION_TIMEOUT", "5s"),
		ClusterMode:       getBoolEnv("REDIS_CLUSTER_MODE", false),
	}

	// Load other configurations...
	config.Upload = UploadConfig{
		Path:              getEnv("UPLOAD_PATH", "/tmp/uploads"),
		MaxFileSize:       getEnv("MAX_FILE_SIZE", "10MB"),
		AllowedFileTypes:  strings.Split(getEnv("ALLOWED_FILE_TYPES", "jpg,jpeg,png,pdf"), ","),
		ImageQuality:      getIntEnv("IMAGE_QUALITY", 85),
		ThumbnailSize:     getIntEnv("THUMBNAIL_SIZE", 300),
		WebSize:           getIntEnv("WEB_SIZE", 1200),
		OriginalRetention: getBoolEnv("ORIGINAL_RETENTION", true),
	}

	config.AWS = AWSConfig{
		Region:           getEnv("AWS_REGION", "us-east-1"),
		S3Bucket:         getEnv("S3_BUCKET", ""),
		CloudFrontDomain: getEnv("CLOUDFRONT_DOMAIN", ""),
		KMSKeyID:         getEnv("AWS_KMS_KEY_ID", ""),
	}

	config.Security = SecurityConfig{
		CORSOrigins:       strings.Split(getEnv("CORS_ORIGINS", "http://localhost:3000"), ","),
		RateLimitRequests: getIntEnv("RATE_LIMIT_REQUESTS", 100),
		RateLimitWindow:   getDurationEnv("RATE_LIMIT_WINDOW", "15m"),
		RateLimitBurst:    getIntEnv("RATE_LIMIT_BURST", 50),
		SessionTimeout:    getDurationEnv("SESSION_TIMEOUT", "24h"),
		JWTExpiration:     getDurationEnv("JWT_EXPIRATION", "24h"),
		SecureCookies:     getBoolEnv("SECURE_COOKIES", env == "production"),
		CSRFProtection:    getBoolEnv("CSRF_PROTECTION", env == "production"),
		SecurityHeaders:   getBoolEnv("SECURITY_HEADERS", env == "production"),
	}

	// Load secrets from AWS Secrets Manager in production
	if env == "production" || env == "staging" {
		if err := loadSecrets(config, env); err != nil {
			return nil, fmt.Errorf("failed to load secrets: %w", err)
		}
	} else {
		// For development, load from environment variables
		config.Database.Password = getEnv("DB_PASSWORD", "changeme")
		config.Redis.Password = getEnv("REDIS_PASSWORD", "changeme")
		config.Security.JWTSecret = getEnv("JWT_SECRET", "dev-secret-key")
	}

	GlobalConfig = config
	return config, nil
}

// loadSecrets loads sensitive configuration from AWS Secrets Manager
func loadSecrets(config *Config, env string) error {
	ctx := context.Background()
	
	// Create AWS config
	cfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(config.AWS.Region))
	if err != nil {
		return fmt.Errorf("unable to load AWS config: %w", err)
	}

	client := secretsmanager.NewFromConfig(cfg)

	// Load database password
	dbSecret, err := getSecret(client, ctx, fmt.Sprintf("%s/inventory/database", env))
	if err != nil {
		return fmt.Errorf("failed to get database secret: %w", err)
	}
	config.Database.Password = dbSecret["password"].(string)

	// Load Redis password
	redisSecret, err := getSecret(client, ctx, fmt.Sprintf("%s/inventory/redis", env))
	if err != nil {
		return fmt.Errorf("failed to get redis secret: %w", err)
	}
	config.Redis.Password = redisSecret["password"].(string)

	// Load JWT secret
	jwtSecret, err := getSecret(client, ctx, fmt.Sprintf("%s/inventory/jwt", env))
	if err != nil {
		return fmt.Errorf("failed to get JWT secret: %w", err)
	}
	config.Security.JWTSecret = jwtSecret["secret"].(string)

	// Load email credentials
	emailSecret, err := getSecret(client, ctx, fmt.Sprintf("%s/inventory/email", env))
	if err == nil {
		config.Email.SMTPUser = emailSecret["username"].(string)
		config.Email.SMTPPassword = emailSecret["password"].(string)
	}

	// Load monitoring secrets
	if config.Monitoring.DatadogEnabled {
		datadogSecret, err := getSecret(client, ctx, fmt.Sprintf("%s/inventory/datadog", env))
		if err == nil {
			config.Monitoring.DatadogAPIKey = datadogSecret["api_key"].(string)
		}
	}

	return nil
}

// getSecret retrieves a secret from AWS Secrets Manager
func getSecret(client *secretsmanager.Client, ctx context.Context, secretID string) (map[string]interface{}, error) {
	result, err := client.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
		SecretId: aws.String(secretID),
	})
	if err != nil {
		return nil, err
	}

	var secretData map[string]interface{}
	err = json.Unmarshal([]byte(*result.SecretString), &secretData)
	if err != nil {
		return nil, err
	}

	return secretData, nil
}

// Helper functions for environment variable parsing
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getIntEnv(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getBoolEnv(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolVal, err := strconv.ParseBool(value); err == nil {
			return boolVal
		}
	}
	return defaultValue
}

func getDurationEnv(key, defaultValue string) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	duration, _ := time.ParseDuration(defaultValue)
	return duration
}

// ValidateConfig validates the loaded configuration
func ValidateConfig(config *Config) error {
	if config.Database.Host == "" {
		return fmt.Errorf("database host is required")
	}
	if config.Database.Password == "" && config.NodeEnv != "development" {
		return fmt.Errorf("database password is required")
	}
	if config.Security.JWTSecret == "" {
		return fmt.Errorf("JWT secret is required")
	}
	if len(config.Security.JWTSecret) < 32 {
		return fmt.Errorf("JWT secret must be at least 32 characters long")
	}
	return nil
}