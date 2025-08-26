import React, { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  Chip,
  IconButton,
  Button,
  LinearProgress,
  Skeleton,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Refresh as RefreshIcon,
  Shield as KongIcon,
} from '@mui/icons-material';

import { useQuery, useSubscription } from '@apollo/client';
import { getSeverityColor, getKongStatusColor } from '@/theme/theme';
import SecurityMetricsGrid from '@/components/monitoring/SecurityMetricsGrid';
import ThreatActivityChart from '@/components/charts/ThreatActivityChart';
import VulnerabilityTrendsChart from '@/components/charts/VulnerabilityTrendsChart';
import RecentAlertsPanel from '@/components/alerts/RecentAlertsPanel';
import KongSecurityStatus from '@/components/monitoring/KongSecurityStatus';
import ComplianceScoreCard from '@/components/compliance/ComplianceScoreCard';

// Mock GraphQL queries for now - replace with actual generated types
const SECURITY_OVERVIEW_QUERY = `
  query SecurityOverview($organizationId: ID!) {
    securityOverview(organizationId: $organizationId) {
      totalAssets
      criticalVulnerabilities
      activeAlerts
      complianceScore
      threatLevel
      kongAdminApiVulnerability {
        isVulnerable
        riskLevel
        recommendedActions
        lastChecked
      }
      vulnerabilitiesBySeverity {
        severity
        count
      }
      alertsByStatus {
        status
        count
      }
    }
  }
`;

const SECURITY_METRICS_SUBSCRIPTION = `
  subscription SecurityMetricsUpdated($organizationId: ID!) {
    securityMetricsUpdated(organizationId: $organizationId) {
      timestamp
      metrics {
        totalAssets
        criticalVulnerabilities
        activeAlerts
        complianceScore
        threatLevel
      }
      changes {
        field
        oldValue
        newValue
        changeType
      }
    }
  }
`;

interface SecurityOverviewData {
  totalAssets: number;
  criticalVulnerabilities: number;
  activeAlerts: number;
  complianceScore: number;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  kongAdminApiVulnerability: {
    isVulnerable: boolean;
    riskLevel: string;
    recommendedActions: string[];
    lastChecked: string;
  };
}

const SecurityOverview: React.FC = () => {
  const [organizationId] = useState('org-123'); // Replace with real org ID
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [realtimeUpdates, setRealtimeUpdates] = useState(0);

  // Mock data for development - replace with actual GraphQL hooks
  const [securityData, setSecurityData] = useState<SecurityOverviewData>({
    totalAssets: 247,
    criticalVulnerabilities: 12,
    activeAlerts: 8,
    complianceScore: 92,
    threatLevel: 'MEDIUM',
    kongAdminApiVulnerability: {
      isVulnerable: true,
      riskLevel: 'CRITICAL',
      recommendedActions: [
        'Enable HTTPS for Kong Admin API',
        'Restrict Admin API access to internal networks',
        'Implement API key authentication',
      ],
      lastChecked: new Date().toISOString(),
    },
  });

  const [loading, setLoading] = useState(false);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRealtimeUpdates(prev => prev + 1);
      // Simulate minor data changes
      setSecurityData(prev => ({
        ...prev,
        activeAlerts: prev.activeAlerts + (Math.random() > 0.7 ? 1 : 0),
        criticalVulnerabilities: Math.max(0, prev.criticalVulnerabilities + (Math.random() > 0.8 ? 1 : -1)),
      }));
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    setLastRefresh(new Date());
    // Simulate API call delay
    setTimeout(() => setLoading(false), 1000);
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'error';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'success';
      default: return 'info';
    }
  };

  const getThreatLevelIcon = (level: string) => {
    switch (level) {
      case 'CRITICAL': return <ErrorIcon />;
      case 'HIGH': return <WarningIcon />;
      case 'MEDIUM': return <WarningIcon />;
      case 'LOW': return <CheckCircleIcon />;
      default: return <SecurityIcon />;
    }
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Security Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last updated: {lastRefresh.toLocaleTimeString()} • {realtimeUpdates} real-time updates
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={loading ? <LinearProgress sx={{ width: 20 }} /> : <RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Critical Kong Alert */}
      {securityData.kongAdminApiVulnerability.isVulnerable && (
        <Alert
          severity="error"
          icon={<KongIcon />}
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small">
              Fix Now
            </Button>
          }
        >
          <strong>CRITICAL VULNERABILITY:</strong> Kong Admin API is using HTTP protocol.
          This exposes your API gateway to security risks.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Key Metrics Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SecurityIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6">Total Assets</Typography>
              </Box>
              <Typography variant="h3" sx={{ mb: 1 }}>
                {securityData.totalAssets}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon sx={{ color: 'success.main', fontSize: 16, mr: 0.5 }} />
                <Typography variant="caption" color="success.main">
                  +5 this week
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #2a1a1a, #3a2a2a)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ErrorIcon sx={{ color: 'error.main', mr: 1 }} />
                <Typography variant="h6">Critical Vulnerabilities</Typography>
              </Box>
              <Typography variant="h3" sx={{ mb: 1, color: 'error.main' }}>
                {securityData.criticalVulnerabilities}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingDownIcon sx={{ color: 'success.main', fontSize: 16, mr: 0.5 }} />
                <Typography variant="caption" color="success.main">
                  -3 resolved
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #2a1a1a, #3a2a2a)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WarningIcon sx={{ color: 'warning.main', mr: 1 }} />
                <Typography variant="h6">Active Alerts</Typography>
              </Box>
              <Typography variant="h3" sx={{ mb: 1, color: 'warning.main' }}>
                {securityData.activeAlerts}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon sx={{ color: 'error.main', fontSize: 16, mr: 0.5 }} />
                <Typography variant="caption" color="error.main">
                  +2 new
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #1a2a1a, #2a3a2a)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="h6">Compliance Score</Typography>
              </Box>
              <Typography variant="h3" sx={{ mb: 1, color: 'success.main' }}>
                {securityData.complianceScore}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={securityData.complianceScore}
                sx={{ mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                Above target (85%)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Threat Level Status */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 300 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current Threat Level
              </Typography>
              <Box sx={{ textAlign: 'center', mt: 4 }}>
                <Box sx={{ mb: 2 }}>
                  {getThreatLevelIcon(securityData.threatLevel)}
                </Box>
                <Chip
                  label={securityData.threatLevel}
                  color={getThreatLevelColor(securityData.threatLevel) as any}
                  size="large"
                  sx={{ fontSize: '1.1rem', fontWeight: 600, mb: 2 }}
                />
                <Typography variant="body2" color="text.secondary">
                  Based on active threats and vulnerabilities
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Kong Security Status */}
        <Grid item xs={12} md={8}>
          <KongSecurityStatus />
        </Grid>

        {/* Vulnerability Trends Chart */}
        <Grid item xs={12} md={8}>
          <VulnerabilityTrendsChart />
        </Grid>

        {/* Recent Alerts */}
        <Grid item xs={12} md={4}>
          <RecentAlertsPanel />
        </Grid>

        {/* Threat Activity Chart */}
        <Grid item xs={12} md={6}>
          <ThreatActivityChart />
        </Grid>

        {/* Compliance Score Card */}
        <Grid item xs={12} md={6}>
          <ComplianceScoreCard />
        </Grid>

        {/* Security Metrics Grid */}
        <Grid item xs={12}>
          <SecurityMetricsGrid />
        </Grid>
      </Grid>
    </Box>
  );
};

export default SecurityOverview;
