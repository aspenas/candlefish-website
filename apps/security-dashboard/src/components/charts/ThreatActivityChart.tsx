import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const mockData = [
  { name: '00:00', blocked: 45, allowed: 120, investigated: 8 },
  { name: '04:00', blocked: 52, allowed: 98, investigated: 12 },
  { name: '08:00', blocked: 78, allowed: 156, investigated: 15 },
  { name: '12:00', blocked: 93, allowed: 201, investigated: 22 },
  { name: '16:00', blocked: 67, allowed: 178, investigated: 18 },
  { name: '20:00', blocked: 84, allowed: 189, investigated: 25 },
];

const ThreatActivityChart: React.FC = () => {
  return (
    <Card sx={{ height: 300 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Threat Activity (24h)
        </Typography>
        <Box sx={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="blocked" stroke="#d32f2f" strokeWidth={2} />
              <Line type="monotone" dataKey="allowed" stroke="#2e7d32" strokeWidth={2} />
              <Line type="monotone" dataKey="investigated" stroke="#f57c00" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ThreatActivityChart;
