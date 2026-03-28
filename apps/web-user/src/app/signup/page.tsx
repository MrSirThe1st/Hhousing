"use client";

import type { FormEvent, ReactElement } from "react";
import { useEffect, useState } from "react";
import {
  getSupabaseBrowserClientOrNull,
  SUPABASE_BROWSER_ENV_ERROR
} from "../lib/supabase-browser";
import { useAuthSession } from "../lib/use-auth-session";

type SignupState =
  | { mode: "idle" }
  | { mode: "ok"; message: string }
  | { mode: "err"; message: string };

export default function SignupPage(): ReactElement {
  const { token } = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<SignupState>({ mode: "idle" });

  useEffect(() => {
    if (!token) {
      return;
    }

    window.location.href = "/";
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setState({ mode: "idle" });

    if (password !== confirmPassword) {
      setState({ mode: "err", message: "Passwords do not match." });
      setBusy(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClientOrNull();
      if (supabase === null) {
        setState({ mode: "err", message: SUPABASE_BROWSER_ENV_ERROR });
        setBusy(false);
        return;
      }

      const emailRedirectTo = `${window.location.origin}/auth/confirm`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo }
      });
      if (error) {
        setState({ mode: "err", message: error.message });
        setBusy(false);
        return;
      }

      if (data.session) {
        setState({ mode: "ok", message: "Signup successful. Redirecting to feed..." });
        window.location.href = "/";
        return;
      }

      setState({
        mode: "ok",
        message: "Signup successful. Check your email to confirm your account, then login."
      });
      setBusy(false);
    } catch (error: unknown) {
      setState({
        mode: "err",
        message: error instanceof Error ? error.message : "Signup failed"
      });
      setBusy(false);
    }
  }

  return (
    <main className="stack">
      <section className="hero">
        <h1>Sign Up</h1>
        <p>Create a new account to manage your listing intents.</p>
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
            minLength={6}
          />
        </label>

        <label>
          Confirm Password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={6}
          />
        </label>

        <button disabled={busy} type="submit">
          {busy ? "Creating account..." : "Create Account"}
        </button>

        <p className="meta">
          Already have an account? <a href="/login">Login</a>
        </p>

        {state.mode === "ok" ? <p className="notice ok">{state.message}</p> : null}
        {state.mode === "err" ? <p className="notice err">{state.message}</p> : null}
      </form>
    </main>
  );
}
