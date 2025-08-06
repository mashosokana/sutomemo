// src/app/hooks/useSupabaseSession.ts

'use client'


import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js"

export const useSupabaseSession = () => {
  const [session, setSession] =useState<Session | null | undefined>(undefined)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      const fetchSession = async () => {
        const { data, error } = await supabase.auth.getSession()
        console.log("遅延後のセッション取得:", data.session, error)
        setSession(data.session)
        setToken(data.session?.access_token || null)
        setIsLoading(false)
      }

      fetchSession()
    }, 100)


    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("onAuthStateChange:", session)
      setSession(session)
      setToken(session?.access_token || null)
      setIsLoading(false)
    })

    return () => {
      clearTimeout(timer)
      listener.subscription.unsubscribe()
    }
  }, [])

  return { session, token, isLoading }
}