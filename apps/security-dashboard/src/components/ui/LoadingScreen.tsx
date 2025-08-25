import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Security as SecurityIcon } from '@mui/icons-material';

const LoadingScreen: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        p: 4,
      }}
      role="status"
      aria-label="Loading security dashboard"
    >
      <SecurityIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
      
      <CircularProgress 
        size={40} 
        thickness={4}
        sx={{ mb: 2 }}
      />
      
      <Typography variant="h6" color="text.secondary">
        Loading Security Dashboard...
      </Typography>
    </Box>
  );
};

export default LoadingScreen;