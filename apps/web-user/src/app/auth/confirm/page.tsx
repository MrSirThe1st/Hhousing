"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import type { ReactElement } from "react";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getSupabaseBrowserClientOrNull,
  SUPABASE_BROWSER_ENV_ERROR
} from "../../lib/supabase-browser";

type ConfirmState =
  | { mode: "loading"; message: string }
  | { mode: "ok"; message: string }
  | { mode: "err"; message: string };

export default function ConfirmEmailPage(): ReactElement {
  return (
    <Suspense fallback={<main className="stack"><p className="meta">Loading confirmation...</p></main>}>
      <ConfirmEmailPageContent />
    </Suspense>
  );
}

function ConfirmEmailPageContent(): ReactElement {
  const searchParams = useSearchParams();
  const [state, setState] = useState<ConfirmState>({
    mode: "loading",
    message: "Confirming email..."
  });

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    async function confirm(): Promise<void> {
      const supabase = getSupabaseBrowserClientOrNull();
      if (supabase === null) {
        setState({ mode: "err", message: SUPABASE_BROWSER_ENV_ERROR });
        return;
      }

      if (!tokenHash || !type) {
        setState({ mode: "err", message: "Missing confirmation parameters in URL." });
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as EmailOtpType
      });

      if (error) {
        setState({ mode: "err", message: error.message });
        return;
      }

      setState({ mode: "ok", message: "Email confirmed. Redirecting to feed..." });
      window.setTimeout(() => {
        window.location.href = "/";
      }, 800);
    }

    void confirm();
  }, [searchParams]);

  return (
    <main className="stack">
      <section className="hero">
        <h1>Email Confirmation</h1>
        <p>Finalizing your account verification.</p>
      </section>

      {state.mode === "loading" ? <p className="meta">{state.message}</p> : null}
      {state.mode === "ok" ? <p className="notice ok">{state.message}</p> : null}
      {state.mode === "err" ? <p className="notice err">{state.message}</p> : null}
    </main>
  );
}
