"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import {
  getSupabaseBrowserClientOrNull,
  SUPABASE_BROWSER_ENV_ERROR
} from "../lib/supabase-browser";

interface AuthViewState {
  loading: boolean;
  email: string | null;
  configError: string | null;
}

export function AuthStatus(): ReactElement {
  const [state, setState] = useState<AuthViewState>({
    loading: true,
    email: null,
    configError: null
  });

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseBrowserClientOrNull();

    if (supabase === null) {
      setState({
        loading: false,
        email: null,
        configError: SUPABASE_BROWSER_ENV_ERROR
      });
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }

      setState({
        loading: false,
        email: data.session?.user.email ?? null,
        configError: null
      });
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) {
        return;
      }

      setState({
        loading: false,
        email: session?.user.email ?? null,
        configError: null
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout(): Promise<void> {
    const supabase = getSupabaseBrowserClientOrNull();
    if (supabase === null) {
      return;
    }

    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (state.configError !== null) {
    return <div className="meta">Auth not configured</div>;
  }

  if (state.loading) {
    return <div className="meta">Checking session...</div>;
  }

  if (state.email === null) {
    return (
      <div className="stack" style={{ justifyItems: "end" }}>
        <div className="meta">Not logged in</div>
        <a href="/login">Login</a>
      </div>
    );
  }

  return (
    <div className="stack" style={{ justifyItems: "end" }}>
      <div className="meta">{state.email}</div>
      <button type="button" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}
