import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren): React.ReactElement {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function bootstrap(): Promise<void> {
      try {
        const {
          data: { session: currentSession },
          error
        } = await supabase.auth.getSession();

        if (error) {
          console.warn("Auth session bootstrap error, clearing storage:", error.message);
          try {
            await supabase.auth.signOut();
          } catch (signOutErr) {
            console.error("Failed to sign out on bootstrap error:", signOutErr);
          }
        }

        if (mounted) {
          setSession(error ? null : currentSession);
        }
      } catch (err) {
        console.error("Error bootstrapping auth session:", err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, updatedSession) => {
      if (mounted) {
        setSession(updatedSession);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      signIn: async (email: string, password: string): Promise<string | null> => {
        const result = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (result.error) {
          return result.error.message;
        }

        return null;
      },
      signOut: async (): Promise<void> => {
        await supabase.auth.signOut();
      }
    }),
    [isLoading, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
