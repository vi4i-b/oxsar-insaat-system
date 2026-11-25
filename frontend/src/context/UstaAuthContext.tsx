import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ustaService } from '../api/ustaService';
import { USTA_TOKEN_STORAGE_KEY } from '../api/ustaAxiosClient';
import type { UstaLoginRequest, UstaProfile } from '../types/usta';

interface UstaAuthContextValue {
  usta: UstaProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: UstaLoginRequest) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const UstaAuthContext = createContext<UstaAuthContextValue | null>(null);

export const UstaAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usta, setUsta] = useState<UstaProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem(USTA_TOKEN_STORAGE_KEY);
    if (!token) {
      setUsta(null);
      setLoading(false);
      return;
    }

    try {
      const res = await ustaService.me();
      setUsta(res.data);
    } catch {
      localStorage.removeItem(USTA_TOKEN_STORAGE_KEY);
      setUsta(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const login = useCallback(async (payload: UstaLoginRequest) => {
    const res = await ustaService.login(payload);
    localStorage.setItem(USTA_TOKEN_STORAGE_KEY, res.data.access_token);
    setUsta(res.data.usta);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(USTA_TOKEN_STORAGE_KEY);
    setUsta(null);
  }, []);

  const contextValue = useMemo(
    () => ({
      usta,
      loading,
      isAuthenticated: Boolean(usta),
      login,
      logout,
      refreshProfile,
    }),
    [usta, loading, login, logout, refreshProfile]
  );

  return (
    <UstaAuthContext.Provider value={contextValue}>
      {children}
    </UstaAuthContext.Provider>
  );
};

export function useUstaAuth(): UstaAuthContextValue {
  const ctx = useContext(UstaAuthContext);
  if (!ctx) {
    throw new Error('useUstaAuth must be used inside UstaAuthProvider');
  }
  return ctx;
}
