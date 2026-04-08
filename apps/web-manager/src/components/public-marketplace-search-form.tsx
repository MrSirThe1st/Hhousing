import Link from "next/link";
import type { PublicMarketplaceSearchParams } from "../app/public-site-data";

interface PublicMarketplaceSearchFormProps {
  action: string;
  values?: PublicMarketplaceSearchParams;
  submitLabel: string;
  resetHref?: string;
  compact?: boolean;
}

export default function PublicMarketplaceSearchForm({
  action,
  values,
  submitLabel,
  resetHref,
  compact = false
}: PublicMarketplaceSearchFormProps): React.ReactElement {
  return (
    <form action={action} method="get" className={`border border-slate-200 bg-white shadow-sm ${compact ? "rounded-3xl px-4 py-4" : "rounded-4xl px-5 py-5"}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <label className="block min-w-0 flex-1 text-sm font-medium text-slate-700">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-slate-400">Recherche</span>
          <input
            name="q"
            defaultValue={values?.q ?? ""}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="Ville, immeuble ou unité"
          />
        </label>
        <label className="block min-w-0 text-sm font-medium text-slate-700 lg:w-44">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-slate-400">Ville</span>
          <input
            name="city"
            defaultValue={values?.city ?? ""}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="Kinshasa"
          />
        </label>
        <label className="block min-w-0 text-sm font-medium text-slate-700 lg:w-44">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-slate-400">Type</span>
          <select name="propertyType" defaultValue={values?.propertyType ?? ""} className="w-full rounded-2xl border border-slate-300 px-4 py-3">
            <option value="">Tous</option>
            <option value="single_unit">Unité simple</option>
            <option value="multi_unit">Immeuble multi-unités</option>
          </select>
        </label>
        <label className="block min-w-0 text-sm font-medium text-slate-700 lg:w-36">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-slate-400">Loyer min</span>
          <input
            name="minRent"
            defaultValue={values?.minRent ?? ""}
            inputMode="decimal"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="0"
          />
        </label>
        <label className="block min-w-0 text-sm font-medium text-slate-700 lg:w-36">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-slate-400">Loyer max</span>
          <input
            name="maxRent"
            defaultValue={values?.maxRent ?? ""}
            inputMode="decimal"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="2500"
          />
        </label>
        <div className="flex gap-3 lg:pb-0.5">
          <button type="submit" className="rounded-full bg-[#0063fe] px-5 py-3 text-sm font-semibold text-white">
            {submitLabel}
          </button>
          {resetHref ? (
            <Link href={resetHref} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">
              Réinitialiser
            </Link>
          ) : null}
        </div>
      </div>
    </form>
  );
}