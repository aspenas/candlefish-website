package docker

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/candlefish-ai/clos/pkg/config"
	"github.com/candlefish-ai/clos/pkg/types"
	"github.com/sirupsen/logrus"
	"gopkg.in/yaml.v3"
)

// Manager handles Docker Compose operations
type Manager struct {
	config    config.DockerConfig
	logger    *logrus.Logger
	processes map[string]*exec.Cmd
	mu        sync.RWMutex
}

// New creates a new Docker Compose manager
func New(cfg config.DockerConfig) *Manager {
	logger := logrus.New()
	logger.SetLevel(logrus.InfoLevel)
	
	return &Manager{
		config:    cfg,
		logger:    logger,
		processes: make(map[string]*exec.Cmd),
	}
}

// StartGroup starts all services in a service group
func (m *Manager) StartGroup(groupName string) error {
	m.logger.Infof("Starting service group: %s", groupName)
	
	composeFile := filepath.Join(m.config.ComposeFilesDir, fmt.Sprintf("%s.yml", groupName))
	
	// Check if compose file exists
	if _, err := os.Stat(composeFile); os.IsNotExist(err) {
		// Try to generate from template
		if err := m.generateComposeFile(groupName); err != nil {
			return fmt.Errorf("compose file not found and failed to generate: %w", err)
		}
	}

	// Start services using docker-compose
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx, "docker-compose", "-f", composeFile, "up", "-d")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	m.mu.Lock()
	m.processes[groupName] = cmd
	m.mu.Unlock()

	err := cmd.Run()
	
	m.mu.Lock()
	delete(m.processes, groupName)
	m.mu.Unlock()

	if err != nil {
		return fmt.Errorf("failed to start group %s: %w", groupName, err)
	}

	// Wait a moment for services to start
	time.Sleep(2 * time.Second)

	// Verify services are healthy
	return m.verifyGroupHealth(groupName, composeFile)
}

// StopGroup stops all services in a service group
func (m *Manager) StopGroup(groupName string) error {
	m.logger.Infof("Stopping service group: %s", groupName)

	composeFile := filepath.Join(m.config.ComposeFilesDir, fmt.Sprintf("%s.yml", groupName))
	
	if _, err := os.Stat(composeFile); os.IsNotExist(err) {
		return fmt.Errorf("compose file not found: %s", composeFile)
	}

	// Stop services using docker-compose
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx, "docker-compose", "-f", composeFile, "down")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to stop group %s: %w", groupName, err)
	}

	return nil
}

// ShowLogs displays logs for a service or all services in a group
func (m *Manager) ShowLogs(serviceName string) error {
	if serviceName == "" {
		// Show logs for all running containers
		cmd := exec.Command("docker", "logs", "--tail", "50", "--follow", "--timestamps")
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		return cmd.Run()
	}

	// Show logs for specific service
	cmd := exec.Command("docker", "logs", "--tail", "50", "--follow", "--timestamps", serviceName)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

// GetServiceStatus returns the status of services in a group
func (m *Manager) GetServiceStatus(groupName string) (map[string]string, error) {
	composeFile := filepath.Join(m.config.ComposeFilesDir, fmt.Sprintf("%s.yml", groupName))
	
	if _, err := os.Stat(composeFile); os.IsNotExist(err) {
		return nil, fmt.Errorf("compose file not found: %s", composeFile)
	}

	cmd := exec.Command("docker-compose", "-f", composeFile, "ps", "--format", "json")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to get service status: %w", err)
	}

	// Parse the JSON output (simplified - would need proper JSON parsing)
	status := make(map[string]string)
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if strings.TrimSpace(line) != "" {
			// This would need proper JSON parsing in a real implementation
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				status[parts[0]] = parts[1]
			}
		}
	}

	return status, nil
}

// generateComposeFile generates a Docker Compose file from a template
func (m *Manager) generateComposeFile(groupName string) error {
	templatePath := filepath.Join(m.config.TemplatesDir, fmt.Sprintf("%s.template.yml", groupName))
	
	if _, err := os.Stat(templatePath); os.IsNotExist(err) {
		// Create a basic template if none exists
		return m.createDefaultTemplate(groupName)
	}

	// Read template
	templateData, err := os.ReadFile(templatePath)
	if err != nil {
		return fmt.Errorf("failed to read template: %w", err)
	}

	// For now, just copy the template - in a real implementation, you'd do templating
	composeFile := filepath.Join(m.config.ComposeFilesDir, fmt.Sprintf("%s.yml", groupName))
	
	if err := os.WriteFile(composeFile, templateData, 0644); err != nil {
		return fmt.Errorf("failed to write compose file: %w", err)
	}

	m.logger.Infof("Generated compose file: %s", composeFile)
	return nil
}

// createDefaultTemplate creates a default Docker Compose template for a group
func (m *Manager) createDefaultTemplate(groupName string) error {
	template := m.getDefaultTemplate(groupName)
	
	templatePath := filepath.Join(m.config.TemplatesDir, fmt.Sprintf("%s.template.yml", groupName))
	composeFile := filepath.Join(m.config.ComposeFilesDir, fmt.Sprintf("%s.yml", groupName))

	// Create templates directory if it doesn't exist
	if err := os.MkdirAll(m.config.TemplatesDir, 0755); err != nil {
		return fmt.Errorf("failed to create templates directory: %w", err)
	}

	// Create compose files directory if it doesn't exist
	if err := os.MkdirAll(m.config.ComposeFilesDir, 0755); err != nil {
		return fmt.Errorf("failed to create compose files directory: %w", err)
	}

	// Write template
	if err := os.WriteFile(templatePath, []byte(template), 0644); err != nil {
		return fmt.Errorf("failed to write template: %w", err)
	}

	// Write compose file
	if err := os.WriteFile(composeFile, []byte(template), 0644); err != nil {
		return fmt.Errorf("failed to write compose file: %w", err)
	}

	m.logger.Infof("Created default template and compose file for group: %s", groupName)
	return nil
}

// getDefaultTemplate returns a default Docker Compose template based on the group name
func (m *Manager) getDefaultTemplate(groupName string) string {
	basePort := m.getBasePortForGroup(groupName)
	
	template := fmt.Sprintf(`version: '%s'
services:
  %s-api:
    image: %s-api:latest
    ports:
      - "%d:3000"
    environment:
      - NODE_ENV=development
      - PORT=3000
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - %s

  %s-frontend:
    image: %s-frontend:latest
    ports:
      - "%d:80"
    depends_on:
      - %s-api
    networks:
      - %s

networks:
  %s:
    driver: bridge
`, m.config.ComposeVersion, groupName, groupName, basePort, m.config.NetworkName,
   groupName, groupName, basePort+1, groupName, m.config.NetworkName, m.config.NetworkName)

	return template
}

// getBasePortForGroup returns the base port for a service group based on naming conventions
func (m *Manager) getBasePortForGroup(groupName string) int {
	switch {
	case strings.Contains(groupName, "candlefish"):
		return 3000
	case strings.Contains(groupName, "security"):
		return 3100
	case strings.Contains(groupName, "pkb"):
		return 3200
	case strings.Contains(groupName, "api"):
		return 4000
	default:
		return 5000
	}
}

// verifyGroupHealth checks if all services in a group are healthy
func (m *Manager) verifyGroupHealth(groupName, composeFile string) error {
	m.logger.Infof("Verifying health for group: %s", groupName)

	// Parse the compose file to get service definitions
	compose, err := m.parseComposeFile(composeFile)
	if err != nil {
		return fmt.Errorf("failed to parse compose file: %w", err)
	}

	// Check each service
	for serviceName := range compose.Services {
		if err := m.checkServiceHealth(serviceName, 30*time.Second); err != nil {
			m.logger.Warnf("Service %s health check failed: %v", serviceName, err)
			// Don't fail the whole group for health check failures
		} else {
			m.logger.Infof("Service %s is healthy", serviceName)
		}
	}

	return nil
}

// parseComposeFile parses a Docker Compose file
func (m *Manager) parseComposeFile(composeFile string) (*types.ComposeConfig, error) {
	data, err := os.ReadFile(composeFile)
	if err != nil {
		return nil, err
	}

	var compose types.ComposeConfig
	if err := yaml.Unmarshal(data, &compose); err != nil {
		return nil, err
	}

	return &compose, nil
}

// checkServiceHealth checks if a specific service is healthy
func (m *Manager) checkServiceHealth(serviceName string, timeout time.Duration) error {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return fmt.Errorf("health check timeout for service %s", serviceName)
		case <-ticker.C:
			// Check if container is running
			cmd := exec.CommandContext(ctx, "docker", "ps", "--filter", fmt.Sprintf("name=%s", serviceName), "--format", "{{.Status}}")
			output, err := cmd.Output()
			if err != nil {
				continue
			}

			status := strings.TrimSpace(string(output))
			if strings.Contains(status, "Up") {
				// Container is running, check if it's healthy
				if strings.Contains(status, "healthy") || !strings.Contains(status, "health") {
					return nil // Healthy or no health check defined
				}
			}
		}
	}
}

// CreateNetwork ensures the CLOS network exists
func (m *Manager) CreateNetwork() error {
	cmd := exec.Command("docker", "network", "ls", "--filter", fmt.Sprintf("name=%s", m.config.NetworkName), "--format", "{{.Name}}")
	output, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("failed to check network: %w", err)
	}

	if strings.TrimSpace(string(output)) == "" {
		// Network doesn't exist, create it
		cmd = exec.Command("docker", "network", "create", m.config.NetworkName)
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("failed to create network: %w", err)
		}
		m.logger.Infof("Created Docker network: %s", m.config.NetworkName)
	}

	return nil
}

// Cleanup removes stopped containers and unused networks
func (m *Manager) Cleanup() error {
	// Remove stopped containers
	cmd := exec.Command("docker", "container", "prune", "-f")
	if err := cmd.Run(); err != nil {
		m.logger.Warnf("Failed to prune containers: %v", err)
	}

	// Remove unused networks
	cmd = exec.Command("docker", "network", "prune", "-f")
	if err := cmd.Run(); err != nil {
		m.logger.Warnf("Failed to prune networks: %v", err)
	}

	m.logger.Info("Docker cleanup completed")
	return nil
}

// GetLogs returns logs for a specific service
func (m *Manager) GetLogs(serviceName string, lines int) (io.Reader, error) {
	cmd := exec.Command("docker", "logs", "--tail", fmt.Sprintf("%d", lines), serviceName)
	return cmd.StdoutPipe()
}