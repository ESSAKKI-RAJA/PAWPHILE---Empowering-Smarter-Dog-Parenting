/**
 * clerkAuthService.ts
 * 
 * Provides utility functions around Clerk's authentication flows.
 * The primary UI components (<SignIn />, <SignUp />, <UserButton />) 
 * handle most of the flow natively, but this service provides programmatic access if needed.
 */
import { useAuth, useUser, useClerk } from '@clerk/clerk-react';

export function useClerkAuth() {
  const { isLoaded, userId, sessionId, getToken } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();

  const signOut = () => clerk.signOut();
  const openUserProfile = () => clerk.openUserProfile();
  
  return {
    isLoaded,
    isSignedIn: !!userId,
    userId,
    sessionId,
    user,
    getToken,
    signOut,
    openUserProfile
  };
}
