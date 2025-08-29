package types

import (
	"time"
)

// ServiceStatus represents the current status of a service
type ServiceStatus string

const (
	StatusRunning ServiceStatus = "running"
	StatusStopped ServiceStatus = "stopped"
	StatusFailed  ServiceStatus = "failed"
	StatusStarting ServiceStatus = "starting"
	StatusStopping ServiceStatus = "stopping"
)

// Service represents a service in the CLOS system
type Service struct {
	ID          string            `json:"id" db:"id"`
	Name        string            `json:"name" db:"name"`
	Group       string            `json:"group" db:"group_name"`
	Port        int               `json:"port" db:"port"`
	Status      ServiceStatus     `json:"status" db:"status"`
	StartedAt   *time.Time        `json:"started_at,omitempty" db:"started_at"`
	StoppedAt   *time.Time        `json:"stopped_at,omitempty" db:"stopped_at"`
	HealthURL   string            `json:"health_url,omitempty" db:"health_url"`
	Environment map[string]string `json:"environment,omitempty"`
	Tags        []string          `json:"tags,omitempty"`
	CreatedAt   time.Time         `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at" db:"updated_at"`
}

// ServiceGroup represents a group of related services
type ServiceGroup struct {
	Name         string     `json:"name"`
	Services     []*Service `json:"services"`
	Dependencies []string   `json:"dependencies,omitempty"`
	StartOrder   int        `json:"start_order"`
}

// PortRange defines a range of ports allocated to a project
type PortRange struct {
	Project   string `json:"project"`
	StartPort int    `json:"start_port"`
	EndPort   int    `json:"end_port"`
	Usage     int    `json:"usage"`
}

// PortConflict represents a detected port conflict
type PortConflict struct {
	Port         int      `json:"port"`
	Services     []string `json:"services"`
	ProcessName  string   `json:"process_name,omitempty"`
	PID          int      `json:"pid,omitempty"`
	Resolution   string   `json:"resolution,omitempty"`
}

// HealthCheck represents a health check configuration
type HealthCheck struct {
	URL             string        `json:"url"`
	Interval        time.Duration `json:"interval"`
	Timeout         time.Duration `json:"timeout"`
	Retries         int           `json:"retries"`
	StartPeriod     time.Duration `json:"start_period"`
	ExpectedStatus  int           `json:"expected_status"`
}

// ComposeConfig represents Docker Compose configuration for a service
type ComposeConfig struct {
	Version  string                 `yaml:"version"`
	Services map[string]interface{} `yaml:"services"`
	Networks map[string]interface{} `yaml:"networks,omitempty"`
	Volumes  map[string]interface{} `yaml:"volumes,omitempty"`
}