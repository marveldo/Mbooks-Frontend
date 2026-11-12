"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user) router.replace(`/login?next=${encodeURIComponent(pathname ?? "/")}`);
  }, [ready, user, router, pathname]);

  if (!ready || !user) return <div className="mx-auto max-w-[1200px] px-6 py-24 text-on-surface-muted">Loading…</div>;
  return <>{children}</>;
}
