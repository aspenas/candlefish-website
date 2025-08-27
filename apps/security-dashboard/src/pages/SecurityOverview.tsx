import React from 'react';
import { Helmet } from 'react-helmet-async';
import SecurityDashboard from '../components/dashboard/SecurityDashboard';

const SecurityOverview: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Security Overview - Candlefish Security Dashboard</title>
        <meta name="description" content="Real-time security monitoring dashboard with threat detection and incident management" />
      </Helmet>
      
      <SecurityDashboard />
    </>
  );
};

export default SecurityOverview;
