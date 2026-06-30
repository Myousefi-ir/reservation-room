'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, apiFetch, clearTokens, getAccessToken, getRefreshToken, setTokens } from './api';
import type { AuthResponse, User } from './types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (mobile: string, password: string) => Promise<User>;
  register: (input: {
    firstName: string;
    lastName: string;
    mobile: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.get<User>('/auth/me');
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(async (mobile: string, password: string) => {
    const res = await apiFetch<AuthResponse>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ mobile, password }) },
      false,
    );
    setTokens(res.accessToken, res.refreshToken);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (input: { firstName: string; lastName: string; mobile: string; password: string }) => {
      await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(input) }, false);
    },
    [],
  );

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await apiFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }, false);
      }
    } catch {
      /* ignore */
    }
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, logout, refreshUser: loadMe }),
    [user, loading, login, register, logout, loadMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
