"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FinanceFilters, FinancePropertyOption } from "../lib/finance-reporting.types";
import UniversalLoadingState from "./universal-loading-state";

interface FinanceFilterFormProps {
  actionPath: string;
  filters: FinanceFilters;
  propertyOptions: FinancePropertyOption[];
}

export default function FinanceFilterForm({
  actionPath,
  filters,
  propertyOptions
}: FinanceFilterFormProps): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      if (value) params.set(key, String(value));
    }
    startTransition(() => {
      router.push(`${actionPath}?${params.toString()}`);
    });
  }

  return (
    <>
    {isPending ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
        <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
      </div>
    ) : null}
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end">
      <label className="block flex-1 text-sm">
        <span className="mb-1.5 block font-medium text-slate-700">Propriété</span>
        <select
          name="propertyId"
          defaultValue={filters.propertyId ?? ""}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
        >
          <option value="">Toutes les propriétés</option>
          {propertyOptions.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-slate-700">Du</span>
        <input
          type="date"
          name="from"
          defaultValue={filters.from}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-slate-700">Au</span>
        <input
          type="date"
          name="to"
          defaultValue={filters.to}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
        />
      </label>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4] disabled:opacity-60"
        >
          Appliquer
        </button>
        <Link
          href={actionPath}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Réinitialiser
        </Link>
      </div>
    </form>
    </>
  );
}