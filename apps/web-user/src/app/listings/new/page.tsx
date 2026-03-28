"use client";

import { useState, type FormEvent } from "react";
import type { ReactElement } from "react";
import { useAuthSession } from "../../lib/use-auth-session";

type SubmitState =
  | { mode: "idle" }
  | { mode: "ok"; message: string }
  | { mode: "err"; message: string };

export default function NewListingPage(): ReactElement {
  const { token, sessionLoading, authConfigError } = useAuthSession({ requireAuth: true });
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState<"rent" | "sale">("rent");
  const [priceUsd, setPriceUsd] = useState("1200");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<SubmitState>({ mode: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    setBusy(true);
    setState({ mode: "idle" });

    if (!token) {
      setState({
        mode: "err",
        message: "You must login first."
      });
      setBusy(false);
      return;
    }

    const response = await fetch("/api/listings/intents", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title,
        purpose,
        priceUsd: Number(priceUsd),
        location
      })
    });

    const payload = (await response.json()) as
      | { success: true; data: { listingId: string; status: string } }
      | { success: false; error: string; code: string };

    if (payload.success) {
      setState({
        mode: "ok",
        message: `Intent created: ${payload.data.listingId} (${payload.data.status})`
      });
      setTitle("");
      setLocation("");
    } else {
      setState({
        mode: "err",
        message: `${payload.code}: ${payload.error}`
      });
    }

    setBusy(false);
  }

  return (
    <main className="stack">
      <section className="hero">
        <h1>Create Listing Intent</h1>
        <p>
          Submit listing payload using your active logged-in Supabase session.
        </p>
      </section>

      {sessionLoading ? <p className="meta">Checking session...</p> : null}
      {authConfigError ? <p className="notice err">{authConfigError}</p> : null}

      <form className="card stack" onSubmit={handleSubmit}>
        <label>
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>

        <label>
          Purpose
          <select
            value={purpose}
            onChange={(event) => setPurpose(event.target.value as "rent" | "sale")}
          >
            <option value="rent">Rent</option>
            <option value="sale">Sale</option>
          </select>
        </label>

        <label>
          Price (USD)
          <input
            type="number"
            min={1}
            value={priceUsd}
            onChange={(event) => setPriceUsd(event.target.value)}
            required
          />
        </label>

        <label>
          Location
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            required
          />
        </label>

        <button disabled={busy} type="submit">
          {busy ? "Submitting..." : "Create Intent"}
        </button>

        {state.mode === "ok" ? <p className="notice ok">{state.message}</p> : null}
        {state.mode === "err" ? <p className="notice err">{state.message}</p> : null}
      </form>
    </main>
  );
}
