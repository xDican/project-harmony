import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { getCurrentUserWithRole } from '../lib/api';
import { switchActiveOrganization } from '../lib/api.supabase';
import { supabase } from '../lib/supabaseClient';
import type { CurrentUser, UserRole } from '../types/user';
import type { Session } from '@supabase/supabase-js';

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
  isAdminDoctor: boolean;
  adminView: 'doctor' | 'admin';
  setAdminView: (v: 'doctor' | 'admin') => void;
  isDoctorView: boolean;
  organizationId: string | null;
  switchOrganization: ((newOrgId: string) => Promise<void>) | null;
  /** True when authenticated but has no organization yet (new user in onboarding) */
  isNewUser: boolean;
  /** Onboarding status of the active org: 'setup_in_progress' | 'ready_to_activate' | 'active' | null */
  onboardingStatus: string | null;
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
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<string | null>(null);

  const handleUserFetch = useCallback((currentUser: CurrentUser | null) => {
    if (currentUser) {
      setUser(currentUser);
      setIsNewUser(false);
      setOnboardingStatus((currentUser as any).onboardingStatus ?? 'active');
    } else {
      setUser(null);
      setIsNewUser(true);
      setOnboardingStatus(null);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);

        // Fetch user with role when session changes
        if (session?.user) {
          getCurrentUserWithRole()
            .then(handleUserFetch)
            .catch((error) => {
              console.error('Error fetching current user:', error);
              setUser(null);
              setIsNewUser(false);
              setOnboardingStatus(null);
            })
            .finally(() => {
              setLoading(false);
            });
        } else {
          setUser(null);
          setIsNewUser(false);
          setOnboardingStatus(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);

      if (session?.user) {
        getCurrentUserWithRole()
          .then(handleUserFetch)
          .catch((error) => {
            console.error('Error fetching current user:', error);
            setUser(null);
            setIsNewUser(false);
            setOnboardingStatus(null);
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [handleUserFetch]);

  /**
   * Switch the active organization.
   * Calls the edge function, then re-fetches user data to update role/orgId.
   */
  const switchOrganization = useCallback(async (newOrgId: string) => {
    // Call edge function to switch active org in DB
    await switchActiveOrganization(newOrgId);

    // Re-fetch user with updated org context
    const updatedUser = await getCurrentUserWithRole();
    setUser(updatedUser);
  }, []);

  // Calculate role flags based on user.role
  const isAdmin = user?.role === 'admin';
  const isSecretary = user?.role === 'secretary';
  const isDoctor = user?.role === 'doctor';
  const isAdminOrSecretary = isAdmin || isSecretary;
  const isAdminDoctor = isAdmin && !!user?.doctorId;

  const ADMIN_VIEW_KEY = 'admin_view_preference';
  const [adminView, setAdminViewState] = useState<'doctor' | 'admin'>(() =>
    (localStorage.getItem(ADMIN_VIEW_KEY) as 'doctor' | 'admin') ?? 'doctor'
  );
  const setAdminView = (v: 'doctor' | 'admin') => {
    localStorage.setItem(ADMIN_VIEW_KEY, v);
    setAdminViewState(v);
  };

  // True when the user should experience the app as a doctor:
  // either they ARE a doctor, or they're an admin-doctor in Vista Médico
  const isDoctorView = isDoctor || (isAdminDoctor && adminView === 'doctor');

  const organizationId = user?.organizationId ?? null;

  const value: UserContextValue = {
    user,
    loading,
    isAdmin,
    isSecretary,
    isDoctor,
    isAdminOrSecretary,
    isAdminDoctor,
    adminView,
    setAdminView,
    isDoctorView,
    organizationId,
    switchOrganization: user ? switchOrganization : null,
    isNewUser,
    onboardingStatus,
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
