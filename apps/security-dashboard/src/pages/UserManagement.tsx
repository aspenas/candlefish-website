import React from 'react';
import { Helmet } from 'react-helmet-async';
import { UsersIcon } from '@heroicons/react/24/outline';

const UserManagement: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>User Management - Candlefish Security Dashboard</title>
        <meta name="description" content="Manage users, roles, and permissions for the security dashboard" />
      </Helmet>
      
      <div className="space-y-6">
        <div className="text-center py-12">
          <UsersIcon className="w-16 h-16 text-soc-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            User Management
          </h2>
          <p className="text-soc-muted">
            User management and RBAC features will be available here
          </p>
        </div>
      </div>
    </>
  );
};

export default UserManagement;