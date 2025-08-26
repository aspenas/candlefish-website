import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Badge,
  Button,
  Menu,
  MenuItem,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  MoreVert as MoreVertIcon,
  Notifications as NotificationsIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { getAlertStatusColor, getSeverityColor } from '@/theme/theme';
import { formatDistanceToNow } from 'date-fns';

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SUPPRESSED';
  createdAt: string;
  source: string;
  asset?: {
    name: string;
    platform: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

const RecentAlertsPanel: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      title: 'Kong Admin API HTTP Vulnerability',
      description: 'Kong Admin API is accessible over HTTP without encryption',
      severity: 'CRITICAL',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
      source: 'Kong Gateway Monitor',
      asset: {
        name: 'kong-gateway-prod',
        platform: 'Kubernetes',
      },
    },
    {
      id: '2',
      title: 'High CPU Usage on Database Server',
      description: 'PostgreSQL server showing sustained high CPU usage above 85%',
      severity: 'HIGH',
      status: 'ACKNOWLEDGED',
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
      source: 'Infrastructure Monitor',
      asset: {
        name: 'postgres-primary',
        platform: 'AWS RDS',
      },
      assignedTo: {
        id: 'user1',
        name: 'Sarah Chen',
        avatar: undefined,
      },
    },
    {
      id: '3',
      title: 'SSL Certificate Expiring',
      description: 'SSL certificate for api.candlefish.ai expires in 7 days',
      severity: 'MEDIUM',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      source: 'Certificate Monitor',
      asset: {
        name: 'api.candlefish.ai',
        platform: 'Netlify',
      },
    },
    {
      id: '4',
      title: 'Suspicious Login Attempt',
      description: 'Multiple failed login attempts from IP 192.168.1.100',
      severity: 'HIGH',
      status: 'RESOLVED',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
      source: 'Security Monitor',
    },
    {
      id: '5',
      title: 'Backup Verification Failed',
      description: 'Automated backup verification for production database failed',
      severity: 'MEDIUM',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
      source: 'Backup Monitor',
      asset: {
        name: 'prod-backup-system',
        platform: 'AWS S3',
      },
    },
  ]);

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, alert: Alert) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedAlert(alert);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedAlert(null);
  };

  const handleAcknowledge = () => {
    if (selectedAlert) {
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === selectedAlert.id
            ? { ...alert, status: 'ACKNOWLEDGED' as const }
            : alert
        )
      );
    }
    handleMenuClose();
  };

  const handleResolve = () => {
    if (selectedAlert) {
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === selectedAlert.id
            ? { ...alert, status: 'RESOLVED' as const }
            : alert
        )
      );
    }
    handleMenuClose();
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <ErrorIcon sx={{ color: getSeverityColor('CRITICAL') }} />;
      case 'HIGH':
        return <WarningIcon sx={{ color: getSeverityColor('HIGH') }} />;
      case 'MEDIUM':
        return <WarningIcon sx={{ color: getSeverityColor('MEDIUM') }} />;
      case 'LOW':
        return <InfoIcon sx={{ color: getSeverityColor('LOW') }} />;
      default:
        return <InfoIcon />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'error';
      case 'ACKNOWLEDGED':
        return 'warning';
      case 'RESOLVED':
        return 'success';
      case 'SUPPRESSED':
        return 'default';
      default:
        return 'default';
    }
  };

  const activeAlertsCount = alerts.filter(alert => alert.status === 'ACTIVE').length;

  return (
    <>
      <Card sx={{ height: 400 }}>
        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
              <Badge badgeContent={activeAlertsCount} color="error" sx={{ mr: 1 }}>
                <NotificationsIcon />
              </Badge>
              Recent Alerts
            </Typography>
            <Button variant="text" size="small">
              View All
            </Button>
          </Box>

          <List sx={{ flex: 1, overflow: 'auto', pt: 0 }}>
            {alerts.map((alert, index) => (
              <React.Fragment key={alert.id}>
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    px: 0,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 1,
                    },
                  }}
                >
                  <ListItemIcon sx={{ mt: 1 }}>
                    {getSeverityIcon(alert.severity)}
                  </ListItemIcon>

                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {alert.title}
                        </Typography>
                        <Chip
                          label={alert.status}
                          size="small"
                          color={getStatusColor(alert.status) as any}
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                        >
                          {alert.description}
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <ScheduleIcon sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                            </Typography>
                          </Box>

                          {alert.asset && (
                            <Typography variant="caption" color="text.secondary">
                              • {alert.asset.name} ({alert.asset.platform})
                            </Typography>
                          )}

                          {alert.assignedTo && (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <PersonIcon sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {alert.assignedTo.name}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    }
                  />

                  <ListItemSecondaryAction>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, alert)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>

                {index < alerts.length - 1 && <Divider sx={{ my: 1, opacity: 0.3 }} />}
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        {selectedAlert?.status === 'ACTIVE' && (
          <MenuItem onClick={handleAcknowledge}>
            <CheckIcon sx={{ mr: 1, fontSize: 20 }} />
            Acknowledge
          </MenuItem>
        )}
        {selectedAlert?.status !== 'RESOLVED' && (
          <MenuItem onClick={handleResolve}>
            <CheckIcon sx={{ mr: 1, fontSize: 20 }} />
            Resolve
          </MenuItem>
        )}
        <MenuItem onClick={handleMenuClose}>
          <PersonIcon sx={{ mr: 1, fontSize: 20 }} />
          Assign to Me
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose}>
          View Details
        </MenuItem>
      </Menu>
    </>
  );
};

export default RecentAlertsPanel;
