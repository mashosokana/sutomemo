//src/app/guest-posts/layout.tsx
"use client";

import { useAdminRouteGuard } from "@/app/hooks/useAdminRouteGuard";

export default function GuestPostsLayout({ children }: { children: React.ReactNode }) {
  const ok = useAdminRouteGuard();
  if (!ok) return null; // 任意で Loading 表示でもOK
  return <>{children}</>;
}
