// ──────────────────────────────────────────────
// Authentication Context (Integrated with Supabase Auth)
// ──────────────────────────────────────────────

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AuthState, StudentUser, FacultyUser, UserRole } from '../types';
import { DEMO_STUDENT, DEMO_FACULTY } from '../data/demoData';
import { supabase } from '../supabase';

interface AuthContextType extends AuthState {
  login: (id: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Resolves roll numbers or staff codes to their corresponding Supabase email.
 * If user enters email directly, uses that email.
 */
export const resolveLoginEmail = (id: string, _role: UserRole): string => {
  const trimmed = id.trim();
  if (trimmed.includes('@')) return trimmed.toLowerCase();

  const upper = trimmed.toUpperCase();
  if (upper === 'STU2024001') return 'karthick.rajan@sit.edu';
  if (upper === 'FAC2020015') return 'priya.dharshini@sit.edu';

  return `${trimmed.toLowerCase()}@sit.edu`;
};

/**
 * Fetches user profile from user_profiles table and links it to role & student details.
 */
const fetchUserProfileAndDetails = async (
  userId: string,
  expectedRole?: UserRole
): Promise<{ user: StudentUser | FacultyUser; role: UserRole } | null> => {
  try {
    const { data: profile, error: profErr } = await supabase
      .from('user_profiles')
      .select('user_id, role, student_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (profErr || !profile) {
      console.warn('[AuthContext] user_profile not found for user_id:', userId, profErr?.message);
      return null;
    }

    const role = profile.role as UserRole;
    if (expectedRole && role !== expectedRole) {
      console.warn(`[AuthContext] Role mismatch: user is "${role}", expected "${expectedRole}"`);
      return null;
    }

    if (role === 'student') {
      const studentId = profile.student_id || 'STU2024001';
      const { data: stuRow } = await supabase
        .from('students')
        .select('sno, student_id, name, department')
        .eq('student_id', studentId)
        .maybeSingle();

      const studentUser: StudentUser = {
        ...DEMO_STUDENT,
        id: stuRow?.student_id || studentId,
        name: stuRow?.name || DEMO_STUDENT.name,
        department: stuRow?.department || DEMO_STUDENT.department,
        role: 'student',
      };
      return { user: studentUser, role: 'student' };
    } else {
      const facultyUser: FacultyUser = {
        ...DEMO_FACULTY,
        role: 'faculty',
      };
      return { user: facultyUser, role: 'faculty' };
    }
  } catch (err) {
    console.error('[AuthContext] Error fetching profile details:', err);
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    role: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session?.user) {
          if (isMounted) {
            setAuthState({ isAuthenticated: false, user: null, role: null, loading: false });
          }
          return;
        }

        const res = await fetchUserProfileAndDetails(session.user.id);
        if (isMounted) {
          if (res) {
            setAuthState({ isAuthenticated: true, user: res.user, role: res.role, loading: false });
          } else {
            setAuthState({ isAuthenticated: false, user: null, role: null, loading: false });
          }
        }
      } catch (err) {
        if (isMounted) {
          setAuthState({ isAuthenticated: false, user: null, role: null, loading: false });
        }
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setAuthState({ isAuthenticated: false, user: null, role: null, loading: false });
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const res = await fetchUserProfileAndDetails(session.user.id);
        if (res) {
          setAuthState({ isAuthenticated: true, user: res.user, role: res.role, loading: false });
        } else {
          setAuthState({ isAuthenticated: false, user: null, role: null, loading: false });
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(
    async (
      id: string,
      password: string,
      role: UserRole
    ): Promise<{ success: boolean; error?: string }> => {
      if (!id.trim()) return { success: false, error: 'Please enter your ID or Email' };
      if (!password.trim()) return { success: false, error: 'Please enter your password' };

      setAuthState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const email = resolveLoginEmail(id, role);
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          let msg = error.message;
          const lower = error.message.toLowerCase();
          if (lower.includes('email not confirmed')) {
            msg =
              'Email confirmation is pending for this user in Supabase. Please confirm the email or disable "Confirm email" in the Supabase Authentication dashboard.';
          } else if (lower.includes('invalid login credentials')) {
            msg = `Invalid credentials for ${role} login. Please verify your ID/Email and password.`;
          }
          setAuthState((prev) => ({ ...prev, loading: false, error: msg }));
          return { success: false, error: msg };
        }

        if (!data.user) {
          setAuthState((prev) => ({ ...prev, loading: false, error: 'Login failed: No user returned.' }));
          return { success: false, error: 'Login failed: No user returned.' };
        }

        const res = await fetchUserProfileAndDetails(data.user.id, role);
        if (!res) {
          await supabase.auth.signOut();
          const errMsg = `Access denied: No linked "${role}" profile found in user_profiles for UID "${data.user.id}". Please link this account in user_profiles.`;
          setAuthState({
            isAuthenticated: false,
            user: null,
            role: null,
            loading: false,
            error: errMsg,
          });
          return { success: false, error: errMsg };
        }

        setAuthState({
          isAuthenticated: true,
          user: res.user,
          role: res.role,
          loading: false,
          error: null,
        });
        return { success: true };
      } catch (err: any) {
        const errMsg = err?.message || 'Login encountered an unexpected error.';
        setAuthState((prev) => ({ ...prev, loading: false, error: errMsg }));
        return { success: false, error: errMsg };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[AuthContext] Error signing out from Supabase:', err);
    } finally {
      setAuthState({ isAuthenticated: false, user: null, role: null, loading: false, error: null });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
