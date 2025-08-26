package models

import (
	"time"
	"github.com/google/uuid"
)

// ThreatLevel represents the severity of a security threat
type ThreatLevel string

const (
	ThreatLevelLow      ThreatLevel = "LOW"
	ThreatLevelMedium   ThreatLevel = "MEDIUM"
	ThreatLevelHigh     ThreatLevel = "HIGH"
	ThreatLevelCritical ThreatLevel = "CRITICAL"
)

// AssetType represents different types of assets being monitored
type AssetType string

const (
	AssetTypeApplication AssetType = "APPLICATION"
	AssetTypeDatabase    AssetType = "DATABASE"
	AssetTypeAPI         AssetType = "API"
	AssetTypeWebsite     AssetType = "WEBSITE"
)

// Environment represents the deployment environment
type Environment string

const (
	EnvironmentDevelopment Environment = "DEVELOPMENT"
	EnvironmentStaging     Environment = "STAGING"
	EnvironmentProduction  Environment = "PRODUCTION"
)

// Platform represents the hosting platform
type Platform string

const (
	PlatformKubernetes Platform = "KUBERNETES"
	PlatformAWS        Platform = "AWS"
	PlatformGCP        Platform = "GCP"
	PlatformAzure      Platform = "AZURE"
	PlatformOnPremise  Platform = "ON_PREMISE"
)

// Asset represents a monitored security asset
type Asset struct {
	ID             uuid.UUID   `json:"id" db:"id"`
	OrganizationID uuid.UUID   `json:"organization_id" db:"organization_id"`
	Name           string      `json:"name" db:"name" validate:"required,min=1,max=255"`
	AssetType      AssetType   `json:"asset_type" db:"asset_type" validate:"required"`
	Environment    Environment `json:"environment" db:"environment" validate:"required"`
	Platform       Platform    `json:"platform" db:"platform" validate:"required"`
	URL            *string     `json:"url,omitempty" db:"url"`
	Description    *string     `json:"description,omitempty" db:"description"`
	CreatedAt      time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at" db:"updated_at"`
}

// Vulnerability represents a security vulnerability
type Vulnerability struct {
	ID          uuid.UUID   `json:"id" db:"id"`
	AssetID     uuid.UUID   `json:"asset_id" db:"asset_id"`
	CVEID       *string     `json:"cve_id,omitempty" db:"cve_id"`
	Title       string      `json:"title" db:"title" validate:"required,min=1,max=500"`
	Description string      `json:"description" db:"description" validate:"required"`
	Severity    ThreatLevel `json:"severity" db:"severity" validate:"required"`
	Status      string      `json:"status" db:"status" validate:"required"`
	DetectedAt  time.Time   `json:"detected_at" db:"detected_at"`
	ResolvedAt  *time.Time  `json:"resolved_at,omitempty" db:"resolved_at"`
	CreatedAt   time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at" db:"updated_at"`
}

// SecurityEvent represents a security-related event
type SecurityEvent struct {
	ID             uuid.UUID   `json:"id" db:"id"`
	AssetID        uuid.UUID   `json:"asset_id" db:"asset_id"`
	OrganizationID uuid.UUID   `json:"organization_id" db:"organization_id"`
	EventType      string      `json:"event_type" db:"event_type" validate:"required"`
	Severity       ThreatLevel `json:"severity" db:"severity" validate:"required"`
	Title          string      `json:"title" db:"title" validate:"required,min=1,max=255"`
	Description    string      `json:"description" db:"description" validate:"required"`
	Metadata       *string     `json:"metadata,omitempty" db:"metadata"`
	IPAddress      *string     `json:"ip_address,omitempty" db:"ip_address"`
	UserAgent      *string     `json:"user_agent,omitempty" db:"user_agent"`
	Acknowledged   bool        `json:"acknowledged" db:"acknowledged"`
	CreatedAt      time.Time   `json:"created_at" db:"created_at"`
}

// Alert represents a security alert
type Alert struct {
	ID             uuid.UUID   `json:"id" db:"id"`
	AssetID        *uuid.UUID  `json:"asset_id,omitempty" db:"asset_id"`
	OrganizationID uuid.UUID   `json:"organization_id" db:"organization_id"`
	Title          string      `json:"title" db:"title" validate:"required,min=1,max=255"`
	Description    string      `json:"description" db:"description" validate:"required"`
	Severity       ThreatLevel `json:"severity" db:"severity" validate:"required"`
	Status         string      `json:"status" db:"status" validate:"required"`
	RuleID         *string     `json:"rule_id,omitempty" db:"rule_id"`
	TriggeredAt    time.Time   `json:"triggered_at" db:"triggered_at"`
	ResolvedAt     *time.Time  `json:"resolved_at,omitempty" db:"resolved_at"`
	AssignedTo     *uuid.UUID  `json:"assigned_to,omitempty" db:"assigned_to"`
	CreatedAt      time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at" db:"updated_at"`
}

// KongAPIStatus represents Kong API Gateway status
type KongAPIStatus struct {
	ID                         uuid.UUID    `json:"id" db:"id"`
	IsSecure                   bool         `json:"is_secure" db:"is_secure"`
	Protocol                   string       `json:"protocol" db:"protocol"`
	IsVulnerable               bool         `json:"is_vulnerable" db:"is_vulnerable"`
	VulnerabilityDescription   *string      `json:"vulnerability_description,omitempty" db:"vulnerability_description"`
	RiskLevel                  ThreatLevel  `json:"risk_level" db:"risk_level"`
	RecommendedActions         []string     `json:"recommended_actions" db:"recommended_actions"`
	LastChecked                time.Time    `json:"last_checked" db:"last_checked"`
	CreatedAt                  time.Time    `json:"created_at" db:"created_at"`
}

// SecurityOverview provides a high-level security status overview
type SecurityOverview struct {
	TotalAssets              int                        `json:"total_assets"`
	CriticalVulnerabilities  int                        `json:"critical_vulnerabilities"`
	ActiveAlerts             int                        `json:"active_alerts"`
	ComplianceScore          float64                    `json:"compliance_score"`
	ThreatLevel              ThreatLevel                `json:"threat_level"`
	KongAdminAPIVulnerability *KongAdminAPIVulnerability `json:"kong_admin_api_vulnerability,omitempty"`
	VulnerabilitiesBySeverity []VulnerabilitySeverityCount `json:"vulnerabilities_by_severity"`
}

// KongAdminAPIVulnerability represents Kong Admin API vulnerability status
type KongAdminAPIVulnerability struct {
	IsVulnerable       bool        `json:"is_vulnerable"`
	RiskLevel          ThreatLevel `json:"risk_level"`
	RecommendedActions []string    `json:"recommended_actions"`
}

// VulnerabilitySeverityCount represents count of vulnerabilities by severity
type VulnerabilitySeverityCount struct {
	Severity ThreatLevel `json:"severity"`
	Count    int         `json:"count"`
}

// CreateAssetRequest represents a request to create a new asset
type CreateAssetRequest struct {
	Name        string      `json:"name" validate:"required,min=1,max=255"`
	AssetType   AssetType   `json:"asset_type" validate:"required"`
	Environment Environment `json:"environment" validate:"required"`
	Platform    Platform    `json:"platform" validate:"required"`
	URL         *string     `json:"url,omitempty"`
	Description *string     `json:"description,omitempty"`
}

// UpdateAssetRequest represents a request to update an asset
type UpdateAssetRequest struct {
	Name        *string      `json:"name,omitempty" validate:"omitempty,min=1,max=255"`
	AssetType   *AssetType   `json:"asset_type,omitempty"`
	Environment *Environment `json:"environment,omitempty"`
	Platform    *Platform    `json:"platform,omitempty"`
	URL         *string      `json:"url,omitempty"`
	Description *string      `json:"description,omitempty"`
}
