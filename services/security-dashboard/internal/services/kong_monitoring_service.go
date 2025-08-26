package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/candlefish-ai/security-dashboard/internal/config"
	"github.com/candlefish-ai/security-dashboard/internal/models"
	"go.uber.org/zap"
)

// KongMonitoringService handles Kong API Gateway monitoring
type KongMonitoringService struct {
	config     config.KongConfig
	httpClient *http.Client
	logger     *zap.Logger
}

// KongInfo represents Kong gateway information
type KongInfo struct {
	Version    string `json:"version"`
	NodeID     string `json:"node_id"`
	Hostname   string `json:"hostname"`
	Tagline    string `json:"tagline"`
	LuaVersion string `json:"lua_version"`
}

// KongService represents a Kong service
type KongService struct {
	ID        string            `json:"id"`
	Name      string            `json:"name"`
	Protocol  string            `json:"protocol"`
	Host      string            `json:"host"`
	Port      int               `json:"port"`
	Path      string            `json:"path,omitempty"`
	Tags      []string          `json:"tags,omitempty"`
	CreatedAt int64             `json:"created_at"`
	UpdatedAt int64             `json:"updated_at"`
	Enabled   bool              `json:"enabled"`
}

// KongServicesResponse represents Kong services API response
type KongServicesResponse struct {
	Data []KongService `json:"data"`
	Next string        `json:"next,omitempty"`
}

// KongRoute represents a Kong route
type KongRoute struct {
	ID           string            `json:"id"`
	Name         string            `json:"name"`
	Protocols    []string          `json:"protocols"`
	Methods      []string          `json:"methods,omitempty"`
	Hosts        []string          `json:"hosts,omitempty"`
	Paths        []string          `json:"paths,omitempty"`
	Headers      map[string]string `json:"headers,omitempty"`
	HTTPSRedirect bool             `json:"https_redirect_status_code,omitempty"`
	Service      KongService       `json:"service"`
	CreatedAt    int64             `json:"created_at"`
	UpdatedAt    int64             `json:"updated_at"`
}

// KongRoutesResponse represents Kong routes API response
type KongRoutesResponse struct {
	Data []KongRoute `json:"data"`
	Next string      `json:"next,omitempty"`
}

// NewKongMonitoringService creates a new Kong monitoring service
func NewKongMonitoringService(config config.KongConfig, logger *zap.Logger) *KongMonitoringService {
	return &KongMonitoringService{
		config: config,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		logger: logger,
	}
}

// GetAdminAPIStatus checks Kong Admin API security status
func (k *KongMonitoringService) GetAdminAPIStatus(ctx context.Context) (*models.KongAPIStatus, error) {
	// Check if Admin API is accessible over HTTP (vulnerability)
	isVulnerable, protocol, err := k.checkAdminAPIProtocol(ctx)
	if err != nil {
		k.logger.Error("Failed to check Kong Admin API protocol", zap.Error(err))
		return nil, fmt.Errorf("failed to check Kong Admin API protocol: %w", err)
	}

	// Determine risk level based on protocol and accessibility
	riskLevel := models.ThreatLevelLow
	vulnerabilityDescription := ""
	recommendedActions := []string{}

	if isVulnerable {
		riskLevel = models.ThreatLevelCritical
		vulnerabilityDescription = "Kong Admin API is accessible over HTTP protocol, exposing sensitive configuration and allowing unauthorized access"
		recommendedActions = []string{
			"Immediately restrict Admin API access to internal networks only",
			"Configure Admin API to use HTTPS with valid SSL certificates",
			"Implement IP allowlisting for Admin API access",
			"Enable Admin API authentication (basic auth, key auth, or mTLS)",
			"Consider using Kong Manager UI over HTTPS instead of direct API access",
			"Monitor Admin API access logs for suspicious activity",
		}
	} else {
		recommendedActions = []string{
			"Continue monitoring Admin API access patterns",
			"Regularly review Admin API authentication methods",
			"Keep Kong version updated to latest security patches",
		}
	}

	status := &models.KongAPIStatus{
		IsSecure:                   !isVulnerable,
		Protocol:                   protocol,
		IsVulnerable:               isVulnerable,
		VulnerabilityDescription:   &vulnerabilityDescription,
		RiskLevel:                  riskLevel,
		RecommendedActions:         recommendedActions,
		LastChecked:                time.Now(),
		CreatedAt:                  time.Now(),
	}

	return status, nil
}

// GetKongInfo retrieves Kong gateway information
func (k *KongMonitoringService) GetKongInfo(ctx context.Context) (*KongInfo, error) {
	url := strings.TrimRight(k.config.AdminURL, "/") + "/"

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	k.addAuthHeaders(req)

	resp, err := k.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request to Kong Admin API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Kong Admin API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var info KongInfo
	if err := json.Unmarshal(body, &info); err != nil {
		return nil, fmt.Errorf("failed to unmarshal Kong info: %w", err)
	}

	return &info, nil
}

// GetServices retrieves all Kong services
func (k *KongMonitoringService) GetServices(ctx context.Context) ([]KongService, error) {
	url := strings.TrimRight(k.config.AdminURL, "/") + "/services"

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	k.addAuthHeaders(req)

	resp, err := k.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request to Kong Admin API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Kong Admin API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var response KongServicesResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("failed to unmarshal Kong services: %w", err)
	}

	return response.Data, nil
}

// GetRoutes retrieves all Kong routes
func (k *KongMonitoringService) GetRoutes(ctx context.Context) ([]KongRoute, error) {
	url := strings.TrimRight(k.config.AdminURL, "/") + "/routes"

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	k.addAuthHeaders(req)

	resp, err := k.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request to Kong Admin API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Kong Admin API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var response KongRoutesResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("failed to unmarshal Kong routes: %w", err)
	}

	return response.Data, nil
}

// CheckInsecureRoutes identifies routes that may have security issues
func (k *KongMonitoringService) CheckInsecureRoutes(ctx context.Context) ([]KongRoute, error) {
	routes, err := k.GetRoutes(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get routes: %w", err)
	}

	var insecureRoutes []KongRoute

	for _, route := range routes {
		// Check if route allows HTTP protocol
		if k.containsProtocol(route.Protocols, "http") {
			insecureRoutes = append(insecureRoutes, route)
		}

		// Check if HTTPS redirect is disabled for HTTP routes
		if k.containsProtocol(route.Protocols, "http") && !route.HTTPSRedirect {
			// This route is already in insecureRoutes, but we could add additional metadata
			k.logger.Warn("Route allows HTTP without HTTPS redirect",
				zap.String("route_id", route.ID),
				zap.String("route_name", route.Name))
		}
	}

	return insecureRoutes, nil
}

// MonitorContinuously starts continuous monitoring of Kong gateway
func (k *KongMonitoringService) MonitorContinuously(ctx context.Context, interval time.Duration, callback func(*models.KongAPIStatus)) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// Initial check
	status, err := k.GetAdminAPIStatus(ctx)
	if err != nil {
		k.logger.Error("Failed initial Kong Admin API check", zap.Error(err))
	} else {
		callback(status)
	}

	for {
		select {
		case <-ctx.Done():
			k.logger.Info("Kong monitoring stopped")
			return
		case <-ticker.C:
			status, err := k.GetAdminAPIStatus(ctx)
			if err != nil {
				k.logger.Error("Kong Admin API check failed", zap.Error(err))
				continue
			}
			callback(status)
		}
	}
}

// Private helper methods

func (k *KongMonitoringService) checkAdminAPIProtocol(ctx context.Context) (isVulnerable bool, protocol string, err error) {
	// Try to determine protocol from URL
	if strings.HasPrefix(k.config.AdminURL, "http://") {
		// Definitely vulnerable - HTTP protocol
		return true, "HTTP", nil
	}

	if strings.HasPrefix(k.config.AdminURL, "https://") {
		// Likely secure - HTTPS protocol
		// But let's verify the connection actually works
		_, err := k.GetKongInfo(ctx)
		if err != nil {
			return false, "HTTPS", fmt.Errorf("HTTPS connection failed: %w", err)
		}
		return false, "HTTPS", nil
	}

	// URL doesn't specify protocol clearly, try to determine by testing connection
	// First try HTTPS
	httpsURL := "https://" + strings.TrimPrefix(strings.TrimPrefix(k.config.AdminURL, "http://"), "https://")
	k.config.AdminURL = httpsURL

	_, err = k.GetKongInfo(ctx)
	if err == nil {
		return false, "HTTPS", nil
	}

	// HTTPS failed, try HTTP
	httpURL := "http://" + strings.TrimPrefix(strings.TrimPrefix(k.config.AdminURL, "http://"), "https://")
	k.config.AdminURL = httpURL

	_, err = k.GetKongInfo(ctx)
	if err == nil {
		return true, "HTTP", nil
	}

	return false, "UNKNOWN", fmt.Errorf("failed to connect via both HTTP and HTTPS: %w", err)
}

func (k *KongMonitoringService) addAuthHeaders(req *http.Request) {
	if k.config.Username != "" && k.config.Password != "" {
		req.SetBasicAuth(k.config.Username, k.config.Password)
	}
}

func (k *KongMonitoringService) containsProtocol(protocols []string, target string) bool {
	for _, protocol := range protocols {
		if strings.EqualFold(protocol, target) {
			return true
		}
	}
	return false
}
