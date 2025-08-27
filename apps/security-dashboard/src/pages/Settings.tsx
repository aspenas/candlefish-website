import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

const Settings: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Settings - Candlefish Security Dashboard</title>
        <meta name="description" content="Configure dashboard settings and preferences" />
      </Helmet>
      
      <div className="space-y-6">
        <div className="text-center py-12">
          <Cog6ToothIcon className="w-16 h-16 text-soc-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Dashboard Settings
          </h2>
          <p className="text-soc-muted">
            Configuration and settings options will be available here
          </p>
        </div>
      </div>
    </>
  );
};

export default Settings;
