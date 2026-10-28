import { Navigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, token } = useAppContext();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/pos" replace />;
  }

  if (!user) {
    return <div className="flex min-h-screen items-center justify-center text-lg font-semibold text-slate-600">Loading...</div>;
  }

  return children;
};

export default ProtectedRoute;
