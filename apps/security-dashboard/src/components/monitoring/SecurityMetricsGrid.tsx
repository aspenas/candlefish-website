import React from 'react';
import { Grid, Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { Security, Cloud, Storage, NetworkCheck } from '@mui/icons-material';

const SecurityMetricsGrid: React.FC = () => {
  const metrics = [
    { label: 'Network Security', value: 'Protected', icon: <NetworkCheck />, color: 'success' },
    { label: 'Data Encryption', value: 'Active', icon: <Security />, color: 'success' },
    { label: 'Cloud Security', value: '3 Warnings', icon: <Cloud />, color: 'warning' },
    { label: 'Database Security', value: 'Monitoring', icon: <Storage />, color: 'info' },
  ];

  return (
    <Grid container spacing={2}>
      {metrics.map((metric, index) => (
        <Grid item xs={6} sm={3} key={index}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ mb: 1, color: `${metric.color}.main` }}>
                {metric.icon}
              </Box>
              <Typography variant="subtitle2" gutterBottom>
                {metric.label}
              </Typography>
              <Chip 
                label={metric.value} 
                size="small" 
                color={metric.color as any}
                variant="outlined"
              />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default SecurityMetricsGrid;