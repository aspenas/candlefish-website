import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { Error as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';

interface ErrorFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        p: 4,
        textAlign: 'center',
      }}
    >
      <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
      
      <Typography variant="h4" component="h1" gutterBottom>
        Something went wrong
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600 }}>
        We encountered an unexpected error in the security dashboard. 
        Our team has been notified and is working to resolve the issue.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, maxWidth: 600 }}>
          <Typography variant="body2">
            Error: {error.message}
          </Typography>
        </Alert>
      )}

      <Button
        variant="contained"
        startIcon={<RefreshIcon />}
        onClick={resetErrorBoundary}
        size="large"
      >
        Try Again
      </Button>
    </Box>
  );
};

export default ErrorFallback;