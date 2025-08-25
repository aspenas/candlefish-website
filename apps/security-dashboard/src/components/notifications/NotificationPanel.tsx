import React from 'react';
import {
  Drawer,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Divider,
} from '@mui/material';
import { Close as CloseIcon, Notifications as NotificationIcon } from '@mui/icons-material';

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ open, onClose }) => {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 350, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Notifications</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        <List>
          <ListItem>
            <ListItemIcon>
              <NotificationIcon color="error" />
            </ListItemIcon>
            <ListItemText
              primary="Kong API Vulnerability"
              secondary="Critical security issue detected"
            />
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
};

export default NotificationPanel;