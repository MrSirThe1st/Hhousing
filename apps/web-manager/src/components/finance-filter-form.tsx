"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FinanceFilters, FinancePropertyOption } from "../lib/finance-reporting.types";
import {
  FILTER_BAR_CLASS,
  FILTER_DATE_CLASS,
  FILTER_FIELD_ACTION_CLASS,
  FILTER_FIELD_DATE_CLASS,
  FILTER_FIELD_GROW_CLASS,
  FILTER_LABEL_CLASS,
  FILTER_RESET_BUTTON_CLASS,
  FILTER_SELECT_CLASS
} from "../lib/filter-field-classes";
import UniversalLoadingState from "./universal-loading-state";

const DATE_DEBOUNCE_MS = 350;

interface FinanceFilterFormProps {
  actionPath: string;
  filters: FinanceFilters;
  propertyOptions: FinancePropertyOption[];
}

function buildFinanceHref(
  actionPath: string,
  next: { propertyId: string; from: string; to: string }
): string {
  const params = new URLSearchParams();
  if (next.propertyId) params.set("propertyId", next.propertyId);
  if (next.from) params.set("from", next.from);
  if (next.to) params.set("to", next.to);
  const query = params.toString();
  return query.length > 0 ? `${actionPath}?${query}` : actionPath;
}

export default function FinanceFilterForm({
  actionPath,
  filters,
  propertyOptions
}: FinanceFilterFormProps): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [propertyId, setPropertyId] = useState(filters.propertyId ?? "");
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const dateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPropertyId(filters.propertyId ?? "");
    setFrom(filters.from);
    setTo(filters.to);
  }, [filters.propertyId, filters.from, filters.to]);

  useEffect(() => {
    return () => {
      if (dateDebounceRef.current) {
        clearTimeout(dateDebounceRef.current);
      }
    };
  }, []);

  function navigateTo(next: { propertyId: string; from: string; to: string }): void {
    startTransition(() => {
      router.push(buildFinanceHref(actionPath, next));
    });
  }

  function handlePropertyChange(nextPropertyId: string): void {
    setPropertyId(nextPropertyId);
    navigateTo({ propertyId: nextPropertyId, from, to });
  }

  function scheduleDateNavigation(nextFrom: string, nextTo: string): void {
    if (dateDebounceRef.current) {
      clearTimeout(dateDebounceRef.current);
    }
    dateDebounceRef.current = setTimeout(() => {
      navigateTo({ propertyId, from: nextFrom, to: nextTo });
    }, DATE_DEBOUNCE_MS);
  }

  function handleFromChange(nextFrom: string): void {
    setFrom(nextFrom);
    scheduleDateNavigation(nextFrom, to);
  }

  function handleToChange(nextTo: string): void {
    setTo(nextTo);
    scheduleDateNavigation(from, nextTo);
  }

  function handleReset(): void {
    if (dateDebounceRef.current) {
      clearTimeout(dateDebounceRef.current);
    }
    setPropertyId("");
    startTransition(() => {
      router.push(actionPath);
    });
  }

  return (
    <>
      {isPending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
      <div className={FILTER_BAR_CLASS}>
        <div className={FILTER_FIELD_GROW_CLASS}>
          <label className={FILTER_LABEL_CLASS} htmlFor="finance-property">
            Propriété
          </label>
          <select
            id="finance-property"
            value={propertyId}
            onChange={(event) => handlePropertyChange(event.target.value)}
            disabled={isPending}
            className={FILTER_SELECT_CLASS}
          >
            <option value="">Toutes les propriétés</option>
            {propertyOptions.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </div>

        <div className={FILTER_FIELD_DATE_CLASS}>
          <label className={FILTER_LABEL_CLASS} htmlFor="finance-from">
            Du
          </label>
          <input
            id="finance-from"
            type="date"
            value={from}
            onChange={(event) => handleFromChange(event.target.value)}
            disabled={isPending}
            className={FILTER_DATE_CLASS}
          />
        </div>

        <div className={FILTER_FIELD_DATE_CLASS}>
          <label className={FILTER_LABEL_CLASS} htmlFor="finance-to">
            Au
          </label>
          <input
            id="finance-to"
            type="date"
            value={to}
            onChange={(event) => handleToChange(event.target.value)}
            disabled={isPending}
            className={FILTER_DATE_CLASS}
          />
        </div>

        <div className={FILTER_FIELD_ACTION_CLASS}>
          <label className={`${FILTER_LABEL_CLASS} invisible`} aria-hidden>
            Actions
          </label>
          <button
            type="button"
            onClick={handleReset}
            disabled={isPending}
            className={`w-full ${FILTER_RESET_BUTTON_CLASS}`}
          >
            Réinitialiser
          </button>
        </div>
      </div>
    </>
  );
}
