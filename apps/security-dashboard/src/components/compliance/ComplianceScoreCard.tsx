import React from 'react';
import { Card, CardContent, Typography, Box, LinearProgress, Chip } from '@mui/material';
import { Assignment as ComplianceIcon } from '@mui/icons-material';

const ComplianceScoreCard: React.FC = () => {
  const complianceScore = 92;
  const frameworks = [
    { name: 'SOC 2', score: 95 },
    { name: 'ISO 27001', score: 88 },
    { name: 'GDPR', score: 94 },
  ];

  return (
    <Card sx={{ height: 300 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <ComplianceIcon sx={{ mr: 1, color: 'success.main' }} />
          <Typography variant="h6">Compliance Status</Typography>
        </Box>

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h2" sx={{ color: 'success.main', mb: 1 }}>
            {complianceScore}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Overall Compliance Score
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={complianceScore}
          sx={{ height: 8, borderRadius: 4, mb: 3 }}
        />

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Framework Breakdown
          </Typography>
          {frameworks.map((framework) => (
            <Box key={framework.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2">{framework.name}</Typography>
              <Chip
                label={`${framework.score}%`}
                size="small"
                color={framework.score >= 90 ? 'success' : framework.score >= 80 ? 'warning' : 'error'}
              />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default ComplianceScoreCard;
