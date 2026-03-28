"use client";

import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import type { ListingIntentSort, ListingIntentStatus } from "@hhousing/api-contracts";
import {
  type ReadListingIntentsQuery,
  readListingIntents
} from "./lib/listing-intents-api";
import { useAuthSession } from "./lib/use-auth-session";

interface FeedState {
  loading: boolean;
  error: string | null;
  items: Array<{
    id: string;
    title: string;
    purpose: "rent" | "sale";
    priceUsd: number;
    location: string;
    status: ListingIntentStatus;
    createdAtIso: string;
  }>;
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
}

const DEFAULT_PAGE_SIZE = 10;

function parseNumber(value: string): number | undefined {
  if (value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}

export default function HomePage(): ReactElement {
  const { token: sessionToken, sessionLoading, authConfigError } = useAuthSession({
    requireAuth: true
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [purpose, setPurpose] = useState<"" | "rent" | "sale">("");
  const [status, setStatus] = useState<"" | ListingIntentStatus>("");
  const [locationContains, setLocationContains] = useState("");
  const [minPriceUsd, setMinPriceUsd] = useState("");
  const [maxPriceUsd, setMaxPriceUsd] = useState("");
  const [sort, setSort] = useState<ListingIntentSort>("latest");

  const [feed, setFeed] = useState<FeedState>({
    loading: true,
    error: null,
    items: [],
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    hasNextPage: false
  });

  useEffect(() => {
    setPage(1);
  }, [sessionToken]);

  const query = useMemo<ReadListingIntentsQuery>(
    () => ({
      page,
      pageSize,
      purpose: purpose || undefined,
      status: status || undefined,
      locationContains: locationContains.trim().length > 0 ? locationContains : undefined,
      minPriceUsd: parseNumber(minPriceUsd),
      maxPriceUsd: parseNumber(maxPriceUsd),
      sort
    }),
    [
      page,
      pageSize,
      purpose,
      status,
      locationContains,
      minPriceUsd,
      maxPriceUsd,
      sort
    ]
  );

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      if (authConfigError !== null) {
        setFeed({
          loading: false,
          error: authConfigError,
          items: [],
          page,
          pageSize,
          total: 0,
          hasNextPage: false
        });
        return;
      }

      if (!sessionToken) {
        setFeed({
          loading: false,
          error: "Login required to load real data.",
          items: [],
          page,
          pageSize,
          total: 0,
          hasNextPage: false
        });
        return;
      }

      setFeed((prev) => ({ ...prev, loading: true, error: null }));

      const result = await readListingIntents(query, { accessToken: sessionToken });
      if (cancelled) {
        return;
      }

      if (result.data === null) {
        setFeed({
          loading: false,
          error: result.error ?? "Failed to load listings.",
          items: [],
          page,
          pageSize,
          total: 0,
          hasNextPage: false
        });
        return;
      }

      setFeed({
        loading: false,
        error: null,
        items: result.data.items,
        page: result.data.meta.page,
        pageSize: result.data.meta.pageSize,
        total: result.data.meta.total,
        hasNextPage: result.data.meta.hasNextPage
      });
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [authConfigError, sessionToken, query, page, pageSize]);

  function handleApplyFilters(): void {
    setPage(1);
  }

  const isPrevDisabled = feed.loading || feed.page <= 1;
  const isNextDisabled = feed.loading || !feed.hasNextPage;

  return (
    <main className="stack">
      <section className="hero">
        <h1>Your Listing Feed</h1>
        <p>Login-backed view of your real listing intents with filters, sort, and paging.</p>
      </section>

      <section className="card stack">
        <div className="grid">
          <label>
            Purpose
            <select
              value={purpose}
              onChange={(event) => {
                setPurpose(event.target.value as "" | "rent" | "sale");
                handleApplyFilters();
              }}
            >
              <option value="">Any</option>
              <option value="rent">Rent</option>
              <option value="sale">Sale</option>
            </select>
          </label>

          <label>
            Status
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as "" | ListingIntentStatus);
                handleApplyFilters();
              }}
            >
              <option value="">Any</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>

          <label>
            Sort
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as ListingIntentSort);
                handleApplyFilters();
              }}
            >
              <option value="latest">Latest</option>
              <option value="priceAsc">Price asc</option>
              <option value="priceDesc">Price desc</option>
            </select>
          </label>

          <label>
            Page Size
            <select
              value={pageSize}
              onChange={(event) => {
                const nextSize = Number(event.target.value);
                setPageSize(nextSize);
                setPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </label>
        </div>

        <div className="grid">
          <label>
            Location contains
            <input
              value={locationContains}
              onChange={(event) => {
                setLocationContains(event.target.value);
                handleApplyFilters();
              }}
              placeholder="e.g. Dubai"
            />
          </label>

          <label>
            Min price (USD)
            <input
              type="number"
              min={0}
              value={minPriceUsd}
              onChange={(event) => {
                setMinPriceUsd(event.target.value);
                handleApplyFilters();
              }}
            />
          </label>

          <label>
            Max price (USD)
            <input
              type="number"
              min={0}
              value={maxPriceUsd}
              onChange={(event) => {
                setMaxPriceUsd(event.target.value);
                handleApplyFilters();
              }}
            />
          </label>
        </div>
      </section>

      {sessionLoading ? <p className="meta">Checking session...</p> : null}
      {authConfigError ? <p className="notice err">{authConfigError}</p> : null}
      {!sessionLoading && sessionToken === null && authConfigError === null ? (
        <p className="notice err">Login first to view your real listing data.</p>
      ) : null}
      {feed.error ? <p className="notice err">{feed.error}</p> : null}

      <section className="stack">
        <div className="meta">
          Page {feed.page} · {feed.total} total listing{feed.total === 1 ? "" : "s"}
        </div>

        {feed.loading ? <p className="meta">Loading listings...</p> : null}

        {!feed.loading && feed.items.length === 0 && !feed.error ? (
          <p className="meta">No listings match your filters.</p>
        ) : null}

        <div className="grid">
          {feed.items.map((listing) => (
            <article className="card stack" key={listing.id}>
              <span className="badge">{listing.purpose}</span>
              <h2>{listing.title}</h2>
              <p className="price">${listing.priceUsd.toLocaleString()}</p>
              <p className="meta">{listing.location}</p>
              <p className="meta">{new Date(listing.createdAtIso).toLocaleString()}</p>
              <a href={`/listings/${listing.id}`}>Open details</a>
            </article>
          ))}
        </div>

        <div className="stack" style={{ gridTemplateColumns: "repeat(2, max-content)", alignItems: "center" }}>
          <button
            type="button"
            disabled={isPrevDisabled}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </button>
          <button type="button" disabled={isNextDisabled} onClick={() => setPage((current) => current + 1)}>
            Next
          </button>
        </div>
      </section>
    </main>
  );
}
