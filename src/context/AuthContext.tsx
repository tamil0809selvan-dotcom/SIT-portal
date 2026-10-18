// ──────────────────────────────────────────────
// Authentication Context
// ──────────────────────────────────────────────

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AuthState, StudentUser, FacultyUser, UserRole } from '../types';
import { DEMO_STUDENT, DEMO_FACULTY } from '../data/demoData';

interface AuthContextType extends AuthState {
  login: (id: string, password: string, role: UserRole) => { success: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_KEY = 'sit_portal_auth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(() => {
    try {
      const saved = localStorage.getItem(AUTH_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AuthState;
        if (parsed.isAuthenticated && parsed.user) return parsed;
      }
    } catch { /* ignore */ }
    return { isAuthenticated: false, user: null, role: null };
  });

  useEffect(() => {
    if (authState.isAuthenticated) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(authState));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  }, [authState]);

  const login = useCallback((id: string, password: string, role: UserRole): { success: boolean; error?: string } => {
    if (!id.trim()) return { success: false, error: 'Please enter your ID' };
    if (!password.trim()) return { success: false, error: 'Please enter your password' };

    if (role === 'student') {
      if (id === DEMO_STUDENT.id && password === DEMO_STUDENT.password) {
        setAuthState({ isAuthenticated: true, user: DEMO_STUDENT, role: 'student' });
        return { success: true };
      }
      return { success: false, error: 'Invalid Student ID or Password. Try: STU2024001 / student123' };
    }

    if (role === 'faculty') {
      if (id === DEMO_FACULTY.id && password === DEMO_FACULTY.password) {
        setAuthState({ isAuthenticated: true, user: DEMO_FACULTY, role: 'faculty' });
        return { success: true };
      }
      return { success: false, error: 'Invalid Faculty ID or Password. Try: FAC2020015 / faculty123' };
    }

    return { success: false, error: 'Unknown role' };
  }, []);

  const logout = useCallback(() => {
    setAuthState({ isAuthenticated: false, user: null, role: null });
    localStorage.removeItem(AUTH_KEY);
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
