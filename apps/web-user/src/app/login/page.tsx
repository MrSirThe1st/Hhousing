"use client";

import type { FormEvent, ReactElement } from "react";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getSupabaseBrowserClientOrNull,
  SUPABASE_BROWSER_ENV_ERROR
} from "../lib/supabase-browser";
import { useAuthSession } from "../lib/use-auth-session";

type LoginState =
  | { mode: "idle" }
  | { mode: "ok"; message: string }
  | { mode: "err"; message: string };

export default function LoginPage(): ReactElement {
  return (
    <Suspense fallback={<main className="stack"><p className="meta">Loading login...</p></main>}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent(): ReactElement {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";
  const { token } = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<LoginState>({ mode: "idle" });

  useEffect(() => {
    if (!token) {
      return;
    }

    window.location.href = nextPath;
  }, [nextPath, token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setState({ mode: "idle" });

    try {
      const supabase = getSupabaseBrowserClientOrNull();
      if (supabase === null) {
        setState({ mode: "err", message: SUPABASE_BROWSER_ENV_ERROR });
        setBusy(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setState({ mode: "err", message: error.message });
        setBusy(false);
        return;
      }

      setState({ mode: "ok", message: "Logged in. Redirecting to feed..." });
      window.location.href = nextPath;
    } catch (error: unknown) {
      setState({
        mode: "err",
        message: error instanceof Error ? error.message : "Login failed"
      });
      setBusy(false);
    }
  }

  return (
    <main className="stack">
      <section className="hero">
        <h1>Login</h1>
        <p>Use your Supabase user email and password to access real scoped data.</p>
      </section>

      <form className="card stack" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <button disabled={busy} type="submit">
          {busy ? "Logging in..." : "Login"}
        </button>

        <p className="meta">
          No account yet? <a href="/signup">Create one</a>
        </p>

        <p className="meta">
          Forgot password? <a href="/forgot-password">Reset it</a>
        </p>

        {state.mode === "ok" ? <p className="notice ok">{state.message}</p> : null}
        {state.mode === "err" ? <p className="notice err">{state.message}</p> : null}
      </form>
    </main>
  );
}
