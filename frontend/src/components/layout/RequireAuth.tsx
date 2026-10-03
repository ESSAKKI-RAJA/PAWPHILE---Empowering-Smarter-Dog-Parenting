import { Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import type { ReactNode } from 'react';

/** Gates the authenticated application shell. Public routes (/welcome,
 *  /auth, and the root alias /) live outside this wrapper and are never
 *  affected. Logged-out visits to protected routes land on /auth; after
 *  sign-in, Auth sends the user to /dashboard. No loops by construction:
 *  this wrapper never renders on /auth or / itself. */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="pw-page flex items-center justify-center min-h-screen">
        <p className="text-sm font-bold" style={{ color: 'var(--text-2)' }}>
          Loading PAWPHILE…
        </p>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
