import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../../context/AuthContext';
import { ROUTES } from '../../../constants/routes';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem',
        color: '#6B7280'
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    // Save the location they were trying to access
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Component to redirect authenticated users away from auth pages
interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute = ({ children }: PublicRouteProps) => {
  const { user, loading } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem',
        color: '#6B7280'
      }}>
        Loading...
      </div>
    );
  }

  if (user) {
    // Redirect to the page they were trying to access, or dashboard
    const from = (location.state)?.from?.pathname || ROUTES.APP_ROOT;
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};

