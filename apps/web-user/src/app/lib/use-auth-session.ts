"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getSupabaseBrowserClientOrNull,
  SUPABASE_BROWSER_ENV_ERROR
} from "./supabase-browser";

export interface AuthSessionState {
  token: string | null;
  sessionLoading: boolean;
  authConfigError: string | null;
}

export interface UseAuthSessionOptions {
  requireAuth?: boolean;
}

export function useAuthSession(options?: UseAuthSessionOptions): AuthSessionState {
  const requireAuth = options?.requireAuth ?? false;
  const router = useRouter();
  const pathname = usePathname();

  const [token, setToken] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [authConfigError, setAuthConfigError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseBrowserClientOrNull();

    if (supabase === null) {
      setAuthConfigError(SUPABASE_BROWSER_ENV_ERROR);
      setSessionLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }

      setAuthConfigError(null);
      setToken(data.session?.access_token ?? null);
      setSessionLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) {
        return;
      }

      setAuthConfigError(null);
      setToken(session?.access_token ?? null);
      setSessionLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!requireAuth) {
      return;
    }

    if (sessionLoading || authConfigError !== null || token !== null) {
      return;
    }

    const next = encodeURIComponent(pathname || "/");
    router.replace(`/login?next=${next}`);
  }, [authConfigError, pathname, requireAuth, router, sessionLoading, token]);

  return {
    token,
    sessionLoading,
    authConfigError
  };
}