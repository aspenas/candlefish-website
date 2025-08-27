import React from 'react';
import { Helmet } from 'react-helmet-async';
import ThreatDetectionPanel from '../components/threats/ThreatDetectionPanel';

const ThreatDetection: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Threat Detection - Candlefish Security Dashboard</title>
        <meta name="description" content="Advanced threat detection with severity indicators and real-time monitoring" />
      </Helmet>
      
      <ThreatDetectionPanel showCharts={true} />
    </>
  );
};

export default ThreatDetection;