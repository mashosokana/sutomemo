// src/app/hooks/useAuthInfo.ts
"use client";
import { useEffect, useState } from "react";
import { useSupabaseClient, useSession, useUser } from "@supabase/auth-helpers-react";

export function useAuthInfo() {
  const supabase = useSupabaseClient();
  const session = useSession();             // Session | null
  const user = useUser();                   // User | null
  const [token, setToken] = useState<string | null>(session?.access_token ?? null);

  useEffect(() => {
    let mounted = true;

    if (!session) {
      supabase.auth.getSession().then(({ data }) => {
        if (mounted) setToken(data.session?.access_token ?? null);
      });
    } else {
      setToken(session.access_token ?? null);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (mounted) setToken(s?.access_token ?? null);
    });

    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, [session, supabase]);

  const isGuest =
    (user?.app_metadata as any)?.role === "guest" ||
    (user?.user_metadata as any)?.role === "guest" ||
    false;

  return { token, isGuest };
}
