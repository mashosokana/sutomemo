//src/app/hooks/useAdminRouteGuard.ts
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./useAuth";

export function useAdminRouteGuard() {
  const router = useRouter();
  const { session, role, loading, status } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    setReady(false);

    if (!session || status === 401 || status === 403) {
      router.replace("/login");
      return;
    }

    if (role !== "ADMIN") {
      router.replace("/");
      return;
    }

    setReady(true);
  }, [loading, role, router, session, status]);

  return ready;
}
