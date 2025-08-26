import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useMediaQuery,
  useTheme,
  Tooltip,
  Alert,
  Collapse,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

import { useTheme as useCustomTheme } from '@/providers/ThemeProvider';
import Navigation from './Navigation';
import NotificationPanel from '../notifications/NotificationPanel';
import UserMenu from '../user/UserMenu';
import { ConnectionStatus } from '@/hooks/useConnectionStatus';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const DRAWER_WIDTH = 280;

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title = 'Security Dashboard'
}) => {
  const theme = useTheme();
  const { isDarkMode, toggleTheme } = useCustomTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

  // State management
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: true,
    reconnecting: false,
  });
  const [showKongAlert, setShowKongAlert] = useState(false);

  // Mock connection status - replace with real implementation
  useEffect(() => {
    const checkConnection = () => {
      setConnectionStatus({
        connected: navigator.onLine,
        reconnecting: false,
      });
    };

    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);

    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
    };
  }, []);

  // Mock Kong vulnerability alert - replace with real data
  useEffect(() => {
    // Simulate Kong vulnerability detection
    const timer = setTimeout(() => {
      setShowKongAlert(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleNotificationsToggle = () => {
    setNotificationsOpen(!notificationsOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'linear-gradient(90deg, #1a1a1a 0%, #2a2a2a 100%)',
          borderBottom: '1px solid #333',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          {/* Left side */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              aria-label="toggle navigation"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { lg: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            <SecurityIcon sx={{ mr: 1, color: '#1976d2' }} />
            <Typography
              variant="h6"
              component="h1"
              sx={{
                fontWeight: 600,
                background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {title}
            </Typography>

            {/* Connection status indicator */}
            {!connectionStatus.connected && (
              <Box sx={{ ml: 2 }}>
                <Tooltip title="Connection lost - working offline">
                  <WarningIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                </Tooltip>
              </Box>
            )}

            {connectionStatus.reconnecting && (
              <Box sx={{ ml: 2 }}>
                <Typography variant="caption" color="warning.main">
                  Reconnecting...
                </Typography>
              </Box>
            )}
          </Box>

          {/* Right side */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Theme toggle */}
            <Tooltip title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
              <IconButton color="inherit" onClick={toggleTheme}>
                {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton color="inherit" onClick={handleNotificationsToggle}>
                <Badge badgeContent={5} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Settings */}
            <Tooltip title="Settings">
              <IconButton color="inherit">
                <SettingsIcon />
              </IconButton>
            </Tooltip>

            {/* User menu */}
            <Tooltip title="User account">
              <IconButton
                color="inherit"
                onClick={handleUserMenuOpen}
                aria-label="user account"
              >
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  <AccountIcon />
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>

        {/* Kong vulnerability alert */}
        <Collapse in={showKongAlert}>
          <Alert
            severity="error"
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setShowKongAlert(false)}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
            sx={{
              borderRadius: 0,
              borderBottom: '1px solid #333',
            }}
          >
            <strong>CRITICAL:</strong> Kong Admin API vulnerability detected - HTTP protocol in use.
            Immediate action required to secure your API gateway.
          </Alert>
        </Collapse>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { lg: DRAWER_WIDTH }, flexShrink: { lg: 0 } }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRight: '1px solid #333',
              background: 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)',
            },
          }}
        >
          <Toolbar /> {/* Spacer for AppBar */}
          <Navigation onItemClick={() => isMobile && setMobileOpen(false)} />
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          pt: 2,
          width: { lg: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
          position: 'relative',
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        {children}
      </Box>

      {/* User Menu */}
      <UserMenu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
      />

      {/* Notifications Panel */}
      <NotificationPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </Box>
  );
};

export default DashboardLayout;
