"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LeaseWithTenantView, PropertyWithUnitsView } from "@hhousing/api-contracts";
import type { Tenant, Unit, LeaseStatus } from "@hhousing/domain";
import { postWithAuth } from "../lib/api-client";
import type {
  LeaseFormState,
  LeaseManagementPanelProps
} from "./tenant-management.types";

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  ended: "Terminé",
  pending: "En attente"
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  ended: "bg-gray-100 text-gray-500",
  pending: "bg-yellow-100 text-yellow-700"
};

interface UnitOption {
  id: string;
  label: string;
  monthlyRentAmount: number;
  currencyCode: string;
}

function buildUnitOptions(properties: PropertyWithUnitsView[]): UnitOption[] {
  return properties.flatMap(({ property, units }) =>
    units.map((unit) => ({
      id: unit.id,
      label: `${property.name} · ${unit.unitNumber}`,
      monthlyRentAmount: unit.monthlyRentAmount,
      currencyCode: unit.currencyCode
    }))
  );
}

function createInitialLeaseForm(tenants: Tenant[], unitOptions: UnitOption[]): LeaseFormState {
  const firstUnit = unitOptions[0];
  return {
    tenantId: tenants[0]?.id ?? "",
    unitId: firstUnit?.id ?? "",
    startDate: "",
    endDate: "",
    monthlyRentAmount: firstUnit ? String(firstUnit.monthlyRentAmount) : "",
    currencyCode: firstUnit?.currencyCode ?? "CDF"
  };
}

export default function LeaseManagementPanel({
  organizationId,
  leases,
  tenants,
  properties
}: LeaseManagementPanelProps): React.ReactElement {
  const router = useRouter();
  const unitOptions = useMemo(() => buildUnitOptions(properties), [properties]);
  const [leaseForm, setLeaseForm] = useState<LeaseFormState>(() => createInitialLeaseForm(tenants, unitOptions));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<LeaseStatus | "all">("all");

  const filteredLeases = useMemo(() => {
    if (statusFilter === "all") return leases;
    return leases.filter(lease => lease.status === statusFilter);
  }, [leases, statusFilter]);

  function handleUnitChange(unitId: string): void {
    const selectedUnit = unitOptions.find((unit) => unit.id === unitId);
    setLeaseForm((prev) => ({
      ...prev,
      unitId,
      monthlyRentAmount: selectedUnit ? String(selectedUnit.monthlyRentAmount) : prev.monthlyRentAmount,
      currencyCode: selectedUnit?.currencyCode ?? prev.currencyCode
    }));
  }

  async function handleCreateLease(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);

    const amount = Number(leaseForm.monthlyRentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Le loyer mensuel doit être un nombre positif.");
      setBusy(false);
      return;
    }

    const result = await postWithAuth<LeaseWithTenantView>("/api/leases", {
      organizationId,
      unitId: leaseForm.unitId,
      tenantId: leaseForm.tenantId,
      startDate: leaseForm.startDate,
      endDate: leaseForm.endDate || null,
      monthlyRentAmount: amount,
      currencyCode: leaseForm.currencyCode.trim().toUpperCase()
    });

    if (!result.success) {
      setError(result.error);
      setBusy(false);
      return;
    }

    setLeaseForm(createInitialLeaseForm(tenants, unitOptions));
    setMessage("Bail créé avec succès.");
    setBusy(false);
    router.refresh();
  }

  const canCreateLease = tenants.length > 0 && unitOptions.length > 0;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#010a19]">Baux</h1>
      </div>

      {message ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleCreateLease} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#010a19]">Créer un bail</h2>
            <p className="text-sm text-gray-500">Sélectionnez un locataire et une unité disponible.</p>
          </div>
          {!canCreateLease ? (
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
              Ajoutez d&apos;abord des locataires et des unités
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            value={leaseForm.tenantId}
            onChange={(event) => setLeaseForm((prev) => ({ ...prev, tenantId: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            required
            disabled={!canCreateLease}
          >
            <option value="">Sélectionner un locataire</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.fullName}
              </option>
            ))}
          </select>

          <select
            value={leaseForm.unitId}
            onChange={(event) => handleUnitChange(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            required
            disabled={!canCreateLease}
          >
            <option value="">Sélectionner une unité</option>
            {unitOptions.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            value={leaseForm.startDate}
            onChange={(event) => setLeaseForm((prev) => ({ ...prev, startDate: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            type="date"
            required
            disabled={!canCreateLease}
          />
          <input
            value={leaseForm.endDate}
            onChange={(event) => setLeaseForm((prev) => ({ ...prev, endDate: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            type="date"
            disabled={!canCreateLease}
          />
          <input
            value={leaseForm.monthlyRentAmount}
            onChange={(event) => setLeaseForm((prev) => ({ ...prev, monthlyRentAmount: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Loyer mensuel"
            inputMode="decimal"
            required
            disabled={!canCreateLease}
          />
          <input
            value={leaseForm.currencyCode}
            onChange={(event) => setLeaseForm((prev) => ({ ...prev, currencyCode: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase"
            placeholder="Devise"
            maxLength={3}
            required
            disabled={!canCreateLease}
          />
        </div>

        <button
          type="submit"
          disabled={busy || !canCreateLease}
          className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
        >
          {busy ? "Création..." : "Créer le bail"}
        </button>
      </form>

      {leases.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 text-sm text-gray-400">
          Aucun bail pour l&apos;instant.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                statusFilter === "all"
                  ? "bg-[#0063fe] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              Tous ({leases.length})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                statusFilter === "active"
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              Actifs ({leases.filter(l => l.status === "active").length})
            </button>
            <button
              onClick={() => setStatusFilter("ended")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                statusFilter === "ended"
                  ? "bg-gray-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              Terminés ({leases.filter(l => l.status === "ended").length})
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                statusFilter === "pending"
                  ? "bg-yellow-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              En attente ({leases.filter(l => l.status === "pending").length})
            </button>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Locataire</th>
                <th className="px-4 py-3 text-left">Début</th>
                <th className="px-4 py-3 text-left">Fin</th>
                <th className="px-4 py-3 text-left">Loyer</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeases.map((lease) => (
                <tr key={lease.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[#010a19]">{lease.tenantFullName}</td>
                  <td className="px-4 py-3 text-gray-600">{lease.startDate}</td>
                  <td className="px-4 py-3 text-gray-600">{lease.endDate ?? "Ouvert"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {lease.monthlyRentAmount.toLocaleString("fr-FR")} {lease.currencyCode}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[lease.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABELS[lease.status] ?? lease.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/leases/${lease.id}`}
                      className="text-[#0063fe] hover:underline text-sm font-medium"
                    >
                      Voir détails
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLeases.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Aucun bail dans cette catégorie.
            </div>
          )}
        </div>
      )}
    </div>
  );
}