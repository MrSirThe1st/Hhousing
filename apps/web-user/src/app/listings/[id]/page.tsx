"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ListingIntentView } from "@hhousing/api-contracts";
import {
  readListingIntentById,
  updateListingIntentStatus
} from "../../lib/listing-intents-api";
import { useAuthSession } from "../../lib/use-auth-session";

interface ListingDetailState {
  loading: boolean;
  error: string | null;
  listing: ListingIntentView | null;
}

export default function ListingDetailPage(): ReactElement {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";

  const { token, sessionLoading, authConfigError } = useAuthSession({ requireAuth: true });
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [state, setState] = useState<ListingDetailState>({
    loading: true,
    error: null,
    listing: null
  });

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (authConfigError !== null) {
        setState({ loading: false, error: authConfigError, listing: null });
        return;
      }

      if (!id) {
        setState({ loading: false, error: "Missing listing id.", listing: null });
        return;
      }

      if (!token) {
        setState({
          loading: false,
          error: "Login required to load real data.",
          listing: null
        });
        return;
      }

      setState((previous) => ({ ...previous, loading: true, error: null }));
      const result = await readListingIntentById(id, { accessToken: token });
      if (cancelled) {
        return;
      }

      if (result.data === null) {
        setState({
          loading: false,
          error: result.error ?? "Listing not found.",
          listing: null
        });
        return;
      }

      setState({ loading: false, error: null, listing: result.data });
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [authConfigError, id, token]);

  async function handleSubmitForReview(): Promise<void> {
    if (!token || !state.listing) {
      return;
    }

    setActionBusy(true);
    setActionMessage(null);

    const result = await updateListingIntentStatus(state.listing.id, "submitted", {
      accessToken: token
    });

    if (result.data === null) {
      setActionMessage(result.error ?? "Failed to submit listing for review.");
      setActionBusy(false);
      return;
    }

    setState((previous) => ({
      ...previous,
      listing: result.data
    }));
    setActionMessage("Listing submitted for review.");
    setActionBusy(false);
  }

  return (
    <main className="stack">
      <section className="hero">
        <h1>Listing Detail</h1>
        <p>Real user-scoped listing record loaded from authenticated API.</p>
      </section>

      {sessionLoading ? <p className="meta">Checking session...</p> : null}
      {authConfigError ? <p className="notice err">{authConfigError}</p> : null}
      {!sessionLoading && token === null && authConfigError === null ? (
        <p className="notice err">Login first to load listing detail.</p>
      ) : null}

      {state.loading ? <p className="meta">Loading listing...</p> : null}
      {state.error ? <p className="notice err">{state.error}</p> : null}

      {state.listing ? (
        <article className="card stack">
          <span className="badge">{state.listing.purpose}</span>
          <h2>{state.listing.title}</h2>
          <p className="price">${state.listing.priceUsd.toLocaleString()}</p>
          <p className="meta">Location: {state.listing.location}</p>
          <p className="meta">Status: {state.listing.status}</p>
          <p className="meta">Created: {new Date(state.listing.createdAtIso).toLocaleString()}</p>
          {state.listing.status === "draft" ? (
            <button type="button" disabled={actionBusy} onClick={handleSubmitForReview}>
              {actionBusy ? "Submitting..." : "Submit For Review"}
            </button>
          ) : null}
          {actionMessage ? <p className="meta">{actionMessage}</p> : null}
          <a href="/">Back to feed</a>
        </article>
      ) : null}
    </main>
  );
}
