// src/app/hooks/useAuthInfo.ts
"use client";
import { useEffect, useState } from "react";
import { useSupabaseClient, useSession, useUser } from "@supabase/auth-helpers-react";

function getRole(meta: unknown): string | undefined {
  if (!meta || typeof meta !== "object") return undefined;
  const rec = meta as Record<string, unknown>;
  const r = rec.role;
  return typeof r === "string" ? r : undefined;
}

export function useAuthInfo() {
  const supabase = useSupabaseClient();
  const session = useSession(); 
  const user = useUser();       
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

    const { data: authListener } = supabase.auth.onAuthStateChange((_e, s) => {
      if (mounted) setToken(s?.access_token ?? null);
    });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [session, supabase]);

  const role = getRole(user?.app_metadata) ?? getRole(user?.user_metadata);
  const isGuest = role === "guest";

  return { token, isGuest };
}

