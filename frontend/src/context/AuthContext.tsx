import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../api/authService';
import { TOKEN_STORAGE_KEY } from '../api/axiosClient';
import type { AdminProfile, LoginRequest } from '../types/api';

interface AuthContextValue {
  admin: AdminProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setAdmin(null);
      setLoading(false);
      return;
    }

    try {
      const res = await authService.me();
      setAdmin(res.data);
    } catch {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const login = useCallback(async (payload: LoginRequest) => {
    const res = await authService.login(payload);
    localStorage.setItem(TOKEN_STORAGE_KEY, res.data.access_token);
    const meRes = await authService.me();
    setAdmin(meRes.data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAdmin(null);
  }, []);

  const contextValue = useMemo(
    () => ({
      admin,
      loading,
      isAuthenticated: Boolean(admin),
      login,
      logout,
      refreshProfile,
    }),
    [admin, loading, login, logout, refreshProfile]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
