import React from 'react';
import CollaborationDashboard from '../components/CollaborationDashboard';
import { useAuth } from '../contexts/AuthContext';

const Collaboration: React.FC = () => {
  const { userRole, setUserRole } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Role Toggle for Demo */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Demo Mode - Switch between roles:
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setUserRole('owner')}
              className={`
                px-3 py-1 text-sm rounded-full font-medium
                ${userRole === 'owner'
                  ? 'bg-purple-100 text-purple-800 border border-purple-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
              `}
            >
              🏠 Owner
            </button>
            <button
              onClick={() => setUserRole('buyer')}
              className={`
                px-3 py-1 text-sm rounded-full font-medium
                ${userRole === 'buyer'
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
              `}
            >
              👤 Buyer
            </button>
          </div>
        </div>
      </div>

      <CollaborationDashboard userRole={userRole} />
    </div>
  );
};

export default Collaboration;
