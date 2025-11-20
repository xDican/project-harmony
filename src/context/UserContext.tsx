import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getCurrentUserWithRole } from '../lib/api';
import type { CurrentUser, UserRole } from '../types/user';

/**
 * User context value type
 */
export interface UserContextValue {
  user: CurrentUser | null;
  loading: boolean;
  isAdmin: boolean;
  isSecretary: boolean;
  isDoctor: boolean;
  isAdminOrSecretary: boolean;
}

/**
 * User context
 */
const UserContext = createContext<UserContextValue | undefined>(undefined);

/**
 * User provider props
 */
interface UserProviderProps {
  children: ReactNode;
}

/**
 * User provider component
 * Fetches the current user on mount and provides user state and role flags
 */
export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch current user with role on mount
    getCurrentUserWithRole()
      .then((currentUser) => {
        setUser(currentUser);
      })
      .catch((error) => {
        console.error('Error fetching current user:', error);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Calculate role flags based on user.role
  const isAdmin = user?.role === 'admin';
  const isSecretary = user?.role === 'secretary';
  const isDoctor = user?.role === 'doctor';
  const isAdminOrSecretary = isAdmin || isSecretary;

  const value: UserContextValue = {
    user,
    loading,
    isAdmin,
    isSecretary,
    isDoctor,
    isAdminOrSecretary,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

/**
 * Hook to access the current user context
 * Throws an error if used outside of UserProvider
 */
export function useCurrentUser(): UserContextValue {
  const context = useContext(UserContext);
  
  if (context === undefined) {
    throw new Error('useCurrentUser must be used within a UserProvider');
  }
  
  return context;
}
