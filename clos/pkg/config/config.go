package config

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// Config represents the CLOS configuration
type Config struct {
	Database     DatabaseConfig     `yaml:"database"`
	Docker       DockerConfig       `yaml:"docker"`
	PortRanges   []PortRangeConfig  `yaml:"port_ranges"`
	ServiceGroups []ServiceGroupConfig `yaml:"service_groups"`
	Dashboard    DashboardConfig    `yaml:"dashboard"`
	Logging      LoggingConfig      `yaml:"logging"`
}

// DatabaseConfig represents SQLite database configuration
type DatabaseConfig struct {
	Path    string `yaml:"path"`
	Timeout string `yaml:"timeout"`
}

// DockerConfig represents Docker configuration
type DockerConfig struct {
	Host            string `yaml:"host"`
	ComposeVersion  string `yaml:"compose_version"`
	NetworkName     string `yaml:"network_name"`
	TemplatesDir    string `yaml:"templates_dir"`
	ComposeFilesDir string `yaml:"compose_files_dir"`
}

// PortRangeConfig represents port range configuration
type PortRangeConfig struct {
	Project   string `yaml:"project"`
	StartPort int    `yaml:"start_port"`
	EndPort   int    `yaml:"end_port"`
}

// ServiceGroupConfig represents service group configuration
type ServiceGroupConfig struct {
	Name         string   `yaml:"name"`
	Dependencies []string `yaml:"dependencies"`
	StartOrder   int      `yaml:"start_order"`
	ComposeFile  string   `yaml:"compose_file"`
}

// DashboardConfig represents dashboard configuration
type DashboardConfig struct {
	Port    int    `yaml:"port"`
	Host    string `yaml:"host"`
	Enabled bool   `yaml:"enabled"`
}

// LoggingConfig represents logging configuration
type LoggingConfig struct {
	Level  string `yaml:"level"`
	Format string `yaml:"format"`
	File   string `yaml:"file"`
}

// DefaultConfig returns a default configuration
func DefaultConfig() *Config {
	homeDir, _ := os.UserHomeDir()
	closDir := filepath.Join(homeDir, ".clos")

	return &Config{
		Database: DatabaseConfig{
			Path:    filepath.Join(closDir, "registry.db"),
			Timeout: "30s",
		},
		Docker: DockerConfig{
			Host:            "unix:///var/run/docker.sock",
			ComposeVersion:  "3.8",
			NetworkName:     "clos-network",
			TemplatesDir:    filepath.Join(closDir, "templates"),
			ComposeFilesDir: filepath.Join(closDir, "compose"),
		},
		PortRanges: []PortRangeConfig{
			{Project: "core", StartPort: 5000, EndPort: 5999},
			{Project: "candlefish-frontend", StartPort: 3000, EndPort: 3099},
			{Project: "security-dashboard", StartPort: 3100, EndPort: 3199},
			{Project: "pkb", StartPort: 3200, EndPort: 3299},
			{Project: "apis", StartPort: 4000, EndPort: 4999},
		},
		Dashboard: DashboardConfig{
			Port:    8080,
			Host:    "localhost",
			Enabled: true,
		},
		Logging: LoggingConfig{
			Level:  "info",
			Format: "text",
			File:   filepath.Join(closDir, "clos.log"),
		},
	}
}

// LoadConfig loads configuration from file, creating default if it doesn't exist
func LoadConfig(configPath string) (*Config, error) {
	if configPath == "" {
		homeDir, err := os.UserHomeDir()
		if err != nil {
			return nil, fmt.Errorf("failed to get home directory: %w", err)
		}
		configPath = filepath.Join(homeDir, ".clos", "config.yaml")
	}

	// Create config directory if it doesn't exist
	configDir := filepath.Dir(configPath)
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create config directory: %w", err)
	}

	// If config file doesn't exist, create default
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		config := DefaultConfig()
		if err := config.Save(configPath); err != nil {
			return nil, fmt.Errorf("failed to save default config: %w", err)
		}
		return config, nil
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	config := &Config{}
	if err := yaml.Unmarshal(data, config); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	return config, nil
}

// Save saves the configuration to file
func (c *Config) Save(configPath string) error {
	data, err := yaml.Marshal(c)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	if err := os.WriteFile(configPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}

// GetPortRange returns the port range for a given project
func (c *Config) GetPortRange(project string) *PortRangeConfig {
	for _, pr := range c.PortRanges {
		if pr.Project == project {
			return &pr
		}
	}
	return nil
}

// GetServiceGroup returns the service group configuration for a given name
func (c *Config) GetServiceGroup(name string) *ServiceGroupConfig {
	for _, sg := range c.ServiceGroups {
		if sg.Name == name {
			return &sg
		}
	}
	return nil
}