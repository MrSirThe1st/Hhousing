"use client";

import type { FormEvent, ReactElement } from "react";
import { useState } from "react";
import {
  getSupabaseBrowserClientOrNull,
  SUPABASE_BROWSER_ENV_ERROR
} from "../lib/supabase-browser";

type ForgotPasswordState =
  | { mode: "idle" }
  | { mode: "ok"; message: string }
  | { mode: "err"; message: string };

export default function ForgotPasswordPage(): ReactElement {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<ForgotPasswordState>({ mode: "idle" });

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

      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

      if (error) {
        setState({ mode: "err", message: error.message });
        setBusy(false);
        return;
      }

      setState({
        mode: "ok",
        message: "Password reset email sent. Check your inbox and open the link."
      });
      setBusy(false);
    } catch (error: unknown) {
      setState({
        mode: "err",
        message: error instanceof Error ? error.message : "Failed to send reset email"
      });
      setBusy(false);
    }
  }

  return (
    <main className="stack">
      <section className="hero">
        <h1>Forgot Password</h1>
        <p>Request a password reset link by email.</p>
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

        <button disabled={busy} type="submit">
          {busy ? "Sending..." : "Send Reset Email"}
        </button>

        <p className="meta">
          Back to <a href="/login">Login</a>
        </p>

        {state.mode === "ok" ? <p className="notice ok">{state.message}</p> : null}
        {state.mode === "err" ? <p className="notice err">{state.message}</p> : null}
      </form>
    </main>
  );
}
