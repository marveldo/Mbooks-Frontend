"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { api, type User } from "./api";

interface AuthState {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  /** Re-read the user from the server (after a profile change). */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** The session is an httpOnly cookie; we only ever hold the (non-secret) user object in memory. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const toast = useToast();
  const hadUser = useRef(false);
  useEffect(() => { hadUser.current = !!user; }, [user]);

  const channel = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    // The cookie is the source of truth, so ask the server who we are: on load, whenever this
    // tab comes back into view, and whenever another tab logs in or out.
    const sync = () => api.session().then(setUser).catch(() => setUser(null)).finally(() => setReady(true));
    sync();

    const onVisible = () => { if (document.visibilityState === "visible") sync(); };
    const onUnauthorized = () => {
      if (hadUser.current) toast.error("Your session ended", "Log in again to carry on.");
      setUser(null);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", sync);
    window.addEventListener("mbooks:unauthorized", onUnauthorized);
    if ("BroadcastChannel" in window) {
      channel.current = new BroadcastChannel("mbooks-auth");
      channel.current.onmessage = sync;
    }
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", sync);
      window.removeEventListener("mbooks:unauthorized", onUnauthorized);
      channel.current?.close();
    };
  }, [toast]);

  const login = useCallback(async (email: string, password: string) => {
    const u = await api.login(email, password);
    setUser(u);
    channel.current?.postMessage("changed");
    return u;
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => {});
    setUser(null);
    channel.current?.postMessage("changed");
  }, []);

  const refresh = useCallback(async () => {
    const u = await api.refreshSession().catch(() => null);
    if (u) setUser(u);
    channel.current?.postMessage("changed");
  }, []);

  return <AuthContext.Provider value={{ user, ready, login, logout, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function canEdit(user: User | null, ownerId: string | null) {
  return !!user && (user.role === "ADMIN" || user.id === ownerId);
}
