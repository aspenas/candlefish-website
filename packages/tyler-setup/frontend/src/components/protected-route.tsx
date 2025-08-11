import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'ADMIN' | 'USER' | 'CONTRACTOR';
  requiredPermission?: {
    resource: string;
    action: string;
  };
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, hasRole, canAccess } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Checking authentication..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  // Check role-based access
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-destructive">Access Denied</h2>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-muted-foreground">
            Required role: {requiredRole} | Your role: {user?.role}
          </p>
        </div>
      </div>
    );
  }

  // Check permission-based access
  if (requiredPermission && !canAccess(requiredPermission.resource, requiredPermission.action)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-destructive">Access Denied</h2>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to perform this action.
          </p>
          <p className="text-sm text-muted-foreground">
            Required: {requiredPermission.action} on {requiredPermission.resource}
          </p>
        </div>
      </div>
    );
  }

  // Check if user account is active
  if (user?.status !== 'ACTIVE') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-destructive">Account Inactive</h2>
          <p className="mt-2 text-muted-foreground">
            Your account is currently {user?.status.toLowerCase()}. Please contact an administrator.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
