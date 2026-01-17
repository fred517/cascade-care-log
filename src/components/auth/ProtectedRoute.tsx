import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

type AppRole = 'operator' | 'supervisor' | 'admin';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, role, isAdmin, isSupervisor, isOperator, isApproved, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login, preserving the intended destination
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check if user is approved
  if (!isApproved && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⏳</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Account Pending Approval</h1>
          <p className="text-muted-foreground mb-6">
            Your account has been created successfully, but it's waiting for administrator approval. 
            You'll receive access once an admin approves your account.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            If you believe this is taking too long, please contact your administrator.
          </p>
          <button 
            onClick={() => signOut()}
            className="btn-secondary"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Check role-based access if required
  if (requiredRole) {
    let hasAccess = false;
    
    switch (requiredRole) {
      case 'admin':
        hasAccess = isAdmin;
        break;
      case 'supervisor':
        hasAccess = isSupervisor;
        break;
      case 'operator':
        hasAccess = isOperator;
        break;
    }

    if (!hasAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center max-w-md p-8">
            <div className="w-16 h-16 rounded-full bg-status-critical/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔒</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">
              You need {requiredRole} permissions to access this page.
              Your current role is: <span className="font-medium text-foreground">{role || 'none'}</span>
            </p>
            <a href="/" className="btn-primary inline-block">
              Go to Dashboard
            </a>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
