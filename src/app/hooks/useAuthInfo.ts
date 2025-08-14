// src/app/hooks/useAuthInfo.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClientComponentClient, type Session } from "@supabase/auth-helpers-nextjs";

/** any を使わず安全に role を取り出す */
function getRole(meta: unknown): string | undefined {
  if (!meta || typeof meta !== "object") return undefined;
  const rec = meta as Record<string, unknown>;
  const r = rec.role;
  return typeof r === "string" ? r : undefined;
}

export function useAuthInfo() {
  // Provider不要のクライアント（App Router推奨）
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [token, setToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    let mounted = true;

    // 初期取得
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const session: Session | null = data.session;
      setToken(session?.access_token ?? null);

      const role =
        getRole(session?.user?.app_metadata) ?? getRole(session?.user?.user_metadata);
      setIsGuest(role === "guest");
    });

    // 変更を購読
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
