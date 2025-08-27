import React from 'react';
import { Helmet } from 'react-helmet-async';
import IncidentManagementBoard from '../components/incidents/IncidentManagementBoard';

const IncidentManagement: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Incident Management - Candlefish Security Dashboard</title>
        <meta name="description" content="Security incident management with workflow automation and real-time collaboration" />
      </Helmet>
      
      <IncidentManagementBoard />
    </>
  );
};

export default IncidentManagement;