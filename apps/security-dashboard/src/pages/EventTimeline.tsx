import React from 'react';
import { Helmet } from 'react-helmet-async';
import SecurityEventTimeline from '../components/events/SecurityEventTimeline';

const EventTimeline: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Security Events - Candlefish Security Dashboard</title>
        <meta name="description" content="Real-time security event timeline with filtering and search capabilities" />
      </Helmet>
      
      <SecurityEventTimeline />
    </>
  );
};

export default EventTimeline;