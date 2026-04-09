import Link from "next/link";
import type { FinanceFilters, FinancePropertyOption } from "../lib/finance-reporting.types";

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
  return (
    <form action={actionPath} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <label className="block flex-1 text-sm font-medium text-gray-700">
          <span className="mb-1.5 block">Propriété</span>
          <select
            name="propertyId"
            defaultValue={filters.propertyId ?? ""}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Toutes les propriétés</option>
            {propertyOptions.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-gray-700">
          <span className="mb-1.5 block">Du</span>
          <input
            type="date"
            name="from"
            defaultValue={filters.from}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          <span className="mb-1.5 block">Au</span>
          <input
            type="date"
            name="to"
            defaultValue={filters.to}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0]"
          >
            Appliquer
          </button>
          <Link
            href={actionPath}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Réinitialiser
          </Link>
        </div>
      </div>
    </form>
  );
}