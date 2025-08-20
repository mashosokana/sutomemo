//src/app/admin/layout.tsx
"use client";
import { useAdminRouteGuard } from "@/app/hooks/useAdminRouteGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const ok = useAdminRouteGuard();
  if (!ok) return <div className="p-6 text-sm text-gray-500">Checking permission…</div>;
  return <>{children}</>;
}

