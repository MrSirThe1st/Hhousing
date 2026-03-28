"use client";

import type { FormEvent, ReactElement } from "react";
import { useEffect, useState } from "react";
import {
  getSupabaseBrowserClientOrNull,
  SUPABASE_BROWSER_ENV_ERROR
} from "../lib/supabase-browser";

type ResetPasswordState =
  | { mode: "idle" }
  | { mode: "ok"; message: string }
  | { mode: "err"; message: string };

export default function ResetPasswordPage(): ReactElement {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<ResetPasswordState>({ mode: "idle" });

  useEffect(() => {
    const supabase = getSupabaseBrowserClientOrNull();
    if (supabase === null) {
      setState({ mode: "err", message: SUPABASE_BROWSER_ENV_ERROR });
      return;
    }

    // Required for links that return access token in the URL hash.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setReady(true);
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session?.user) {
        setReady(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setState({ mode: "idle" });

    if (!ready) {
      setState({ mode: "err", message: "Open this page from your reset email link." });
      return;
    }

    if (password !== confirmPassword) {
      setState({ mode: "err", message: "Passwords do not match." });
      return;
    }

    setBusy(true);

    try {
      const supabase = getSupabaseBrowserClientOrNull();
      if (supabase === null) {
        setState({ mode: "err", message: SUPABASE_BROWSER_ENV_ERROR });
        setBusy(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setState({ mode: "err", message: error.message });
        setBusy(false);
        return;
      }

      setState({ mode: "ok", message: "Password updated. Redirecting to login..." });
      window.setTimeout(() => {
        window.location.href = "/login";
      }, 800);
    } catch (error: unknown) {
      setState({
        mode: "err",
        message: error instanceof Error ? error.message : "Password reset failed"
      });
      setBusy(false);
    }
  }

  return (
    <main className="stack">
      <section className="hero">
        <h1>Reset Password</h1>
        <p>Set a new password after opening your password reset email link.</p>
      </section>

      {!ready ? <p className="meta">Waiting for recovery session...</p> : null}

      <form className="card stack" onSubmit={handleSubmit}>
        <label>
          New Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />
        </label>

        <label>
          Confirm New Password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={6}
          />
        </label>

        <button disabled={busy} type="submit">
          {busy ? "Updating..." : "Update Password"}
        </button>

        {state.mode === "ok" ? <p className="notice ok">{state.message}</p> : null}
        {state.mode === "err" ? <p className="notice err">{state.message}</p> : null}
      </form>
    </main>
  );
}
