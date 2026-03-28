"use client";

import type { ListingIntentView } from "@hhousing/api-contracts";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  readListingIntents,
  updateListingIntentStatus
} from "../lib/listing-intents-api";
import { useAuthSession } from "../lib/use-auth-session";

interface ReviewState {
  loading: boolean;
  error: string | null;
  items: ListingIntentView[];
}

export default function ReviewQueuePage(): ReactElement {
  const { token, sessionLoading, authConfigError } = useAuthSession({ requireAuth: true });
  const [state, setState] = useState<ReviewState>({
    loading: true,
    error: null,
    items: []
  });
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const submittedItems = useMemo(
    () => state.items.filter((item) => item.status === "submitted"),
    [state.items]
  );

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (authConfigError !== null) {
        setState({ loading: false, error: authConfigError, items: [] });
        return;
      }

      if (!token) {
        setState({
          loading: false,
          error: "Login required to access review queue.",
          items: []
        });
        return;
      }

      setState((previous) => ({ ...previous, loading: true, error: null }));

      const result = await readListingIntents(
        {
          scope: "review",
          status: "submitted",
          sort: "latest",
          page: 1,
          pageSize: 50
        },
        { accessToken: token }
      );

      if (cancelled) {
        return;
      }

      if (result.data === null) {
        setState({
          loading: false,
          error: result.error ?? "Failed to load review queue.",
          items: []
        });
        return;
      }

      setState({ loading: false, error: null, items: result.data.items });
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [authConfigError, token]);

  async function handleDecision(id: string, nextStatus: "approved" | "rejected"): Promise<void> {
    if (!token) {
      return;
    }

    setActionBusyId(id);
    const result = await updateListingIntentStatus(id, nextStatus, {
      accessToken: token
    });

    if (result.data === null) {
      setState((previous) => ({
        ...previous,
        error: result.error ?? "Failed to update listing status."
      }));
      setActionBusyId(null);
      return;
    }

    setState((previous) => ({
      ...previous,
      error: null,
      items: previous.items.map((item) =>
        item.id === id
          ? result.data ?? item
          : item
      )
    }));
    setActionBusyId(null);
  }

  return (
    <main className="stack">
      <section className="hero">
        <h1>Manager Review Queue</h1>
        <p>Review submitted listing intents and approve or reject with one click.</p>
      </section>

      {sessionLoading ? <p className="meta">Checking session...</p> : null}
      {authConfigError ? <p className="notice err">{authConfigError}</p> : null}
      {state.error ? <p className="notice err">{state.error}</p> : null}
      {state.loading ? <p className="meta">Loading submitted listings...</p> : null}

      {!state.loading && submittedItems.length === 0 && !state.error ? (
        <p className="meta">No submitted listings in queue.</p>
      ) : null}

      <div className="grid">
        {submittedItems.map((listing) => (
          <article className="card stack" key={listing.id}>
            <span className="badge">{listing.purpose}</span>
            <h2>{listing.title}</h2>
            <p className="price">${listing.priceUsd.toLocaleString()}</p>
            <p className="meta">{listing.location}</p>
            <p className="meta">Status: {listing.status}</p>
            <p className="meta">Created: {new Date(listing.createdAtIso).toLocaleString()}</p>
            <div className="stack" style={{ gridTemplateColumns: "repeat(2, max-content)", gap: "0.5rem" }}>
              <button
                type="button"
                disabled={actionBusyId === listing.id}
                onClick={() => void handleDecision(listing.id, "approved")}
              >
                Approve
              </button>
              <button
                type="button"
                disabled={actionBusyId === listing.id}
                onClick={() => void handleDecision(listing.id, "rejected")}
              >
                Reject
              </button>
            </div>
            <a href={`/listings/${listing.id}`}>Open details</a>
          </article>
        ))}
      </div>
    </main>
  );
}
