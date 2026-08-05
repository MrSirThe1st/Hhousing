"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import posthog from "posthog-js";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const identifiedUserId = useRef<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  const identify = useCallback((authenticatedSession: Session) => {
    const { user } = authenticatedSession;

    if (identifiedUserId.current === user.id) {
      return;
    }

    if (identifiedUserId.current !== null) {
      posthog.reset();
    }

    const fullName = user.user_metadata.full_name;
    posthog.identify(user.id, {
      email: user.email,
      ...(typeof fullName === "string" ? { name: fullName } : {}),
    });
    identifiedUserId.current = user.id;
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        identify(data.session);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);

      if (nextSession) {
        identify(nextSession);
      } else if (event === "SIGNED_OUT") {
        posthog.reset();
        identifiedUserId.current = null;
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [identify, supabase]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      posthog.reset();
      identifiedUserId.current = null;
      return;
    }

    const normalizedMessage = error.message.toLowerCase();
    if (normalizedMessage.includes("session") && normalizedMessage.includes("not found")) {
      posthog.reset();
      identifiedUserId.current = null;
      return;
    }

    if (normalizedMessage.includes("session") && normalizedMessage.includes("missing")) {
      posthog.reset();
      identifiedUserId.current = null;
      return;
    }

    throw error;
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
