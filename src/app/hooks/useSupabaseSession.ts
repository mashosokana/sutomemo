// src/app/hooks/useSupabaseSession.ts

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js"

export const useSupabaseSession = () => {
  const [session, setSession] =useState<Session | null | undefined>(undefined)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    const fetchSession = async () => {
      const { data, error } = await supabase.auth.getSession()
      console.log("初回セッション取得:", data.session, error)
      setSession(data.session)
      setIsLoading(false)
    }

    fetchSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setToken(session?.access_token || null)
      setIsLoading(false)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  return { session, token, isLoading }
}