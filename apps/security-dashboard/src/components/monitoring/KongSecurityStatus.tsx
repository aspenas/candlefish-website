import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Shield as KongIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Launch as LaunchIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  SecurityUpdate as SecurityUpdateIcon,
  NetworkCheck as NetworkCheckIcon,
  VpnLock as VpnLockIcon,
} from '@mui/icons-material';
import { getKongStatusColor } from '@/theme/theme';

interface KongStatus {
  isSecure: boolean;
  isVulnerable: boolean;
  protocol: string;
  endpoint: string;
  port: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  lastChecked: string;
  recommendedActions: string[];
  vulnerabilityDescription?: string;
}

const KongSecurityStatus: React.FC = () => {
  const [kongStatus, setKongStatus] = useState<KongStatus>({
    isSecure: false,
    isVulnerable: true,
    protocol: 'HTTP',
    endpoint: 'admin-api.kong.local',
    port: 8001,
    riskLevel: 'CRITICAL',
    lastChecked: new Date().toISOString(),
    recommendedActions: [
      'Enable HTTPS for Kong Admin API immediately',
      'Restrict Admin API access to internal networks only',
      'Implement API key authentication for admin endpoints',
      'Enable request rate limiting on admin routes',
      'Set up IP allowlisting for admin access',
    ],
    vulnerabilityDescription: 'Kong Admin API is accessible over HTTP without encryption, exposing sensitive configuration data and management operations.',
  });

  const [loading, setLoading] = useState(false);
  const [fixDialogOpen, setFixDialogOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Simulate real-time status updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRefreshStatus = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLastUpdate(new Date());
      setLoading(false);
    }, 1000);
  };

  const handleOpenFixDialog = () => {
    setFixDialogOpen(true);
  };

  const handleCloseFixDialog = () => {
    setFixDialogOpen(false);
  };

  const handleApplySecurityFix = async () => {
    setLoading(true);
    // Simulate applying security fix
    setTimeout(() => {
      setKongStatus(prev => ({
        ...prev,
        isSecure: true,
        isVulnerable: false,
        protocol: 'HTTPS',
        riskLevel: 'LOW',
        lastChecked: new Date().toISOString(),
      }));
      setLoading(false);
      setFixDialogOpen(false);
    }, 3000);
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      case 'HIGH':
        return <WarningIcon sx={{ color: 'error.main' }} />;
      case 'MEDIUM':
        return <WarningIcon sx={{ color: 'warning.main' }} />;
      case 'LOW':
        return <CheckIcon sx={{ color: 'success.main' }} />;
      default:
        return <KongIcon />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
      case 'HIGH':
        return 'error';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
        return 'success';
      default:
        return 'info';
    }
  };

  return (
    <>
      <Card sx={{ height: 300 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
              <KongIcon sx={{ mr: 1, color: getKongStatusColor(kongStatus.isVulnerable, kongStatus.isSecure) }} />
              Kong Gateway Status
            </Typography>
            <Box>
              <Tooltip title="Open Kong Admin">
                <IconButton size="small" sx={{ mr: 1 }}>
                  <LaunchIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Refresh Status">
                <IconButton size="small" onClick={handleRefreshStatus} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {loading && <LinearProgress sx={{ mb: 2 }} />}

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Admin API Endpoint: {kongStatus.protocol.toLowerCase()}://{kongStatus.endpoint}:{kongStatus.port}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Last checked: {new Date(kongStatus.lastChecked).toLocaleString()}
            </Typography>
          </Box>

          {kongStatus.isVulnerable ? (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={handleOpenFixDialog}>
                  Fix Now
                </Button>
              }
            >
              <strong>CRITICAL:</strong> {kongStatus.vulnerabilityDescription}
            </Alert>
          ) : (
            <Alert severity="success" sx={{ mb: 2 }}>
              Kong Admin API is properly secured with HTTPS and access controls.
            </Alert>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {getRiskIcon(kongStatus.riskLevel)}
              <Typography variant="body2" sx={{ ml: 1 }}>
                Risk Level:
              </Typography>
            </Box>
            <Chip
              label={kongStatus.riskLevel}
              color={getRiskColor(kongStatus.riskLevel) as any}
              size="small"
              variant="filled"
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`Protocol: ${kongStatus.protocol}`}
              size="small"
              color={kongStatus.protocol === 'HTTPS' ? 'success' : 'error'}
              variant="outlined"
            />
            <Chip
              label={kongStatus.isSecure ? 'Secured' : 'Unsecured'}
              size="small"
              color={kongStatus.isSecure ? 'success' : 'error'}
              variant="outlined"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Security Fix Dialog */}
      <Dialog
        open={fixDialogOpen}
        onClose={handleCloseFixDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SecurityUpdateIcon sx={{ mr: 1 }} />
            Kong Security Configuration
          </Box>
          <IconButton onClick={handleCloseFixDialog}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body2" paragraph>
            Apply the following security measures to secure your Kong Admin API:
          </Typography>

          <List>
            {kongStatus.recommendedActions.map((action, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  {index === 0 ? <VpnLockIcon color="error" /> : 
                   index === 1 ? <NetworkCheckIcon color="warning" /> : 
                   <SecurityUpdateIcon color="info" />}
                </ListItemIcon>
                <ListItemText 
                  primary={action}
                  secondary={index === 0 ? 'Critical - Apply immediately' : 
                           index === 1 ? 'High priority' : 'Recommended'}
                />
              </ListItem>
            ))}
          </List>

          {loading && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Applying security configuration...
              </Typography>
              <LinearProgress />
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseFixDialog}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleApplySecurityFix}
            disabled={loading}
            startIcon={<SecurityUpdateIcon />}
          >
            Apply Security Fixes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default KongSecurityStatus;