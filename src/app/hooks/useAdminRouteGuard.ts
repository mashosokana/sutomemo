//src/app/hooks/useAdminRouteGuard.ts
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function useAdminRouteGuard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    let cancel = false;

    const redirectTo = (path: string) => {
      if (!cancel) router.replace(path);
    };

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) { redirectTo("/login"); return; }

        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: ac.signal,
        });
        if (!res.ok) { redirectTo("/login"); return; }

        const { role } = await res.json();
        if (role !== "ADMIN") { router.replace("/"); return; }

        if (!cancel && !ac.signal.aborted) setReady(true);
      } catch {
        redirectTo("/login");
      }
    })();

    return () => { cancel = true; ac.abort(); };
  }, [router]);

  return ready;
}
