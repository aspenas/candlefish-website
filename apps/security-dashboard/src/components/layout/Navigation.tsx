import React from 'react';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  Chip,
  Collapse,
  Badge,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Security as SecurityIcon,
  BugReport as VulnerabilityIcon,
  NotificationsActive as AlertsIcon,
  Inventory as AssetsIcon,
  Assignment as ComplianceIcon,
  Analytics as ReportsIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  ExpandLess,
  ExpandMore,
  Shield as KongIcon,
  Cloud as CloudIcon,
  Storage as DatabaseIcon,
  Public as NetworkIcon,
  Timeline as TrendsIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavigationProps {
  onItemClick?: () => void;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  badge?: number | string;
  color?: 'error' | 'warning' | 'success' | 'info';
  children?: NavigationItem[];
}

const navigationItems: NavigationItem[] = [
  {
    id: 'overview',
    label: 'Security Overview',
    icon: <DashboardIcon />,
    path: '/',
    badge: 'LIVE',
    color: 'success',
  },
  {
    id: 'kong-monitor',
    label: 'Kong Gateway Monitor',
    icon: <KongIcon />,
    path: '/kong',
    badge: 1,
    color: 'error',
  },

  // Monitoring Section
  {
    id: 'monitoring',
    label: 'Real-time Monitoring',
    icon: <SecurityIcon />,
    children: [
      {
        id: 'threats',
        label: 'Threat Detection',
        icon: <SecurityIcon />,
        path: '/threats',
        badge: 3,
        color: 'error',
      },
      {
        id: 'network',
        label: 'Network Security',
        icon: <NetworkIcon />,
        path: '/network',
      },
      {
        id: 'trends',
        label: 'Security Trends',
        icon: <TrendsIcon />,
        path: '/trends',
      },
    ],
  },

  // Assets & Vulnerabilities
  {
    id: 'assets',
    label: 'Asset Management',
    icon: <AssetsIcon />,
    children: [
      {
        id: 'all-assets',
        label: 'All Assets',
        icon: <AssetsIcon />,
        path: '/assets',
        badge: 247,
        color: 'info',
      },
      {
        id: 'cloud-assets',
        label: 'Cloud Resources',
        icon: <CloudIcon />,
        path: '/assets/cloud',
        badge: 89,
        color: 'info',
      },
      {
        id: 'databases',
        label: 'Databases',
        icon: <DatabaseIcon />,
        path: '/assets/databases',
        badge: 12,
        color: 'warning',
      },
    ],
  },

  {
    id: 'vulnerabilities',
    label: 'Vulnerabilities',
    icon: <VulnerabilityIcon />,
    path: '/vulnerabilities',
    badge: 42,
    color: 'error',
  },

  {
    id: 'alerts',
    label: 'Alerts & Incidents',
    icon: <AlertsIcon />,
    path: '/alerts',
    badge: 8,
    color: 'warning',
  },

  {
    id: 'compliance',
    label: 'Compliance',
    icon: <ComplianceIcon />,
    path: '/compliance',
    badge: '92%',
    color: 'success',
  },

  {
    id: 'reports',
    label: 'Reports & Analytics',
    icon: <ReportsIcon />,
    path: '/reports',
  },
];

const bottomNavigationItems: NavigationItem[] = [
  {
    id: 'settings',
    label: 'Settings',
    icon: <SettingsIcon />,
    path: '/settings',
  },
  {
    id: 'help',
    label: 'Help & Documentation',
    icon: <HelpIcon />,
    path: '/help',
  },
];

const Navigation: React.FC<NavigationProps> = ({ onItemClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = React.useState<string[]>(['monitoring', 'assets']);

  const handleItemClick = (item: NavigationItem) => {
    if (item.children) {
      // Toggle expanded state for parent items
      setExpandedItems(prev =>
        prev.includes(item.id)
          ? prev.filter(id => id !== item.id)
          : [...prev, item.id]
      );
    } else if (item.path) {
      // Navigate to page
      navigate(item.path);
      onItemClick?.();
    }
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path ||
           (path === '/' && location.pathname === '/');
  };

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const isItemActive = isActive(item.path);

    return (
      <React.Fragment key={item.id}>
        <ListItemButton
          onClick={() => handleItemClick(item)}
          selected={isItemActive}
          sx={{
            pl: 2 + level * 2,
            py: 1.5,
            borderRadius: 1,
            mx: 1,
            mb: 0.5,
            '&.Mui-selected': {
              background: 'linear-gradient(45deg, rgba(25, 118, 210, 0.15), rgba(66, 165, 245, 0.15))',
              border: '1px solid rgba(25, 118, 210, 0.3)',
              '&:hover': {
                background: 'linear-gradient(45deg, rgba(25, 118, 210, 0.2), rgba(66, 165, 245, 0.2))',
              },
            },
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 40,
              color: isItemActive ? 'primary.main' : 'text.secondary',
            }}
          >
            {item.badge && typeof item.badge === 'number' && item.badge > 0 ? (
              <Badge
                badgeContent={item.badge}
                color={item.color || 'error'}
                max={99}
              >
                {item.icon}
              </Badge>
            ) : (
              item.icon
            )}
          </ListItemIcon>

          <ListItemText
            primary={item.label}
            sx={{
              '& .MuiListItemText-primary': {
                fontSize: '0.9rem',
                fontWeight: isItemActive ? 600 : 400,
                color: isItemActive ? 'primary.main' : 'text.primary',
              },
            }}
          />

          {item.badge && typeof item.badge === 'string' && (
            <Chip
              label={item.badge}
              size="small"
              color={item.color}
              sx={{
                height: 20,
                fontSize: '0.7rem',
                fontWeight: 600,
              }}
            />
          )}

          {hasChildren && (
            isExpanded ? <ExpandLess /> : <ExpandMore />
          )}
        </ListItemButton>

        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map(child => renderNavigationItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Main navigation */}
      <List sx={{ flex: 1, pt: 2 }}>
        {navigationItems.map(item => renderNavigationItem(item))}
      </List>

      {/* Divider */}
      <Divider sx={{ mx: 2, my: 1, borderColor: '#333' }} />

      {/* System status indicator */}
      <Box sx={{ px: 3, py: 1 }}>
        <Typography variant="caption" color="text.secondary">
          System Status
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'success.main',
              mr: 1,
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.5 },
                '100%': { opacity: 1 },
              },
            }}
          />
          <Typography variant="caption" color="success.main">
            All systems operational
          </Typography>
        </Box>
      </Box>

      {/* Bottom navigation */}
      <List sx={{ pt: 0 }}>
        {bottomNavigationItems.map(item => renderNavigationItem(item))}
      </List>
    </Box>
  );
};

export default Navigation;
