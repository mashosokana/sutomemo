// src/hooks/useAuthMe.ts
'use client';
import { useAuth } from './useAuth';

export type AuthMe = { role: 'USER' | 'ADMIN'; isGuest: boolean };

export function useAuthMe() {
  const { role, isGuest, error, loading, status } = useAuth();

  const data: AuthMe | null = role ? { role, isGuest } : null;

  return { data, error, loading, status };
}
