// src/app/hooks/useAuthInfo.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClientComponentClient, type Session } from "@supabase/auth-helpers-nextjs";


function getRole(meta: unknown): string | undefined {
  if (!meta || typeof meta !== "object") return undefined;
  const rec = meta as Record<string, unknown>;
  const r = rec.role;
  return typeof r === "string" ? r : undefined;
}

export function useAuthInfo() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [token, setToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const session: Session | null = data.session;
      setToken(session?.access_token ?? null);

      const role =
        getRole(session?.user?.app_metadata) ?? getRole(session?.user?.user_metadata);
      setIsGuest(role === "guest");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      setToken(s?.access_token ?? null);

      const role = getRole(s?.user?.app_metadata) ?? getRole(s?.user?.user_metadata);
      setIsGuest(role === "guest");
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  return { token, isGuest };
}
