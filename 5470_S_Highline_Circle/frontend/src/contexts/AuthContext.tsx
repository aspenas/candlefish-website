import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole } from '../types';

interface AuthContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  isAuthenticated: boolean;
  canEdit: boolean;
  canViewPrivate: boolean;
  login: (role: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [userRole, setUserRole] = useState<UserRole>('buyer');
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Simplified for demo

  const login = (role: UserRole) => {
    setUserRole(role);
    setIsAuthenticated(true);
    localStorage.setItem('userRole', role);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserRole('buyer');
    localStorage.removeItem('userRole');
  };

  // Load role from localStorage on mount
  React.useEffect(() => {
    const savedRole = localStorage.getItem('userRole') as UserRole;
    if (savedRole && (savedRole === 'owner' || savedRole === 'buyer')) {
      setUserRole(savedRole);
    }
  }, []);

  const contextValue: AuthContextType = {
    userRole,
    setUserRole,
    isAuthenticated,
    canEdit: userRole === 'owner',
    canViewPrivate: userRole === 'owner',
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// HOC for role-based access control
export const withAuth = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  allowedRoles: UserRole[] = ['owner', 'buyer']
) => {
  return (props: P) => {
    const { userRole, isAuthenticated } = useAuth();

    if (!isAuthenticated || !allowedRoles.includes(userRole)) {
      return (
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">
              You don't have permission to view this content.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Required role: {allowedRoles.join(' or ')}
            </p>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
};

// Helper hook for conditional rendering based on role
export const useRoleAccess = () => {
  const { userRole, canEdit, canViewPrivate } = useAuth();

  const hasRole = (role: UserRole) => userRole === role;
  const hasAnyRole = (roles: UserRole[]) => roles.includes(userRole);

  return {
    userRole,
    canEdit,
    canViewPrivate,
    hasRole,
    hasAnyRole,
    isOwner: userRole === 'owner',
    isBuyer: userRole === 'buyer',
  };
};
