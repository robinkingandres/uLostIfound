import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { ReactNode } from 'react';
import type { UserRole } from '../types/user';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const normalizedRole = String(user?.role ?? '').trim().toLowerCase();
  const normalizedAllowedRoles = allowedRoles?.map((role) => String(role).trim().toLowerCase());

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // RBAC Check
  if (normalizedAllowedRoles && !normalizedAllowedRoles.includes(normalizedRole)) {
    // Redirect to appropriate dashboard based on role if they try to access unauthorized page
    if (normalizedRole === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (normalizedRole === 'guidance') {
      return <Navigate to="/guidance/dashboard" replace />;
    } else if (normalizedRole === 'teacher' || normalizedRole === 'student') {
      return <Navigate to="/home" replace />;
    } else {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  }

  return <>{children}</>;
}
