import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

/**
 * Route guard for unauthenticated visitors.
 * Bounces to /login if no user is in the store.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

/**
 * Route guard for already-logged-in users — pushes them to dashboard.
 */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/**
 * Permission-gated route. If the user lacks the permission key, render
 * fallback (default: 403 page) instead of children.
 */
export function RequirePermission({
  permission,
  children,
  fallback,
}: {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  if (!hasPermission(permission)) {
    return fallback ? <>{fallback}</> : <Navigate to="/forbidden" replace />;
  }
  return <>{children}</>;
}
