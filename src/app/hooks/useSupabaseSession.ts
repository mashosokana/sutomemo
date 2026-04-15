// src/app/hooks/useSupabaseSession.ts

'use client'

import { useAuth } from "./useAuth";

export const useSupabaseSession = () => {
  const { session, token, loading, role, isGuest } = useAuth();
  return {
    session,
    token,
    role,
    isGuest,
    isLoading: loading,
  };
}
