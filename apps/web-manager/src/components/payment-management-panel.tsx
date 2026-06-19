"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Payment, PaymentKind, PaymentStatus } from "@hhousing/domain";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import { postWithAuth, patchWithAuth } from "../lib/api-client";
import UniversalLoadingState from "./universal-loading-state";
import ResponsiveTable from "./responsive-table";

const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "En attente",
  paid: "Payé",
  overdue: "En retard",
  cancelled: "Annulé"
};

const STATUS_STYLES: Record<PaymentStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500"
};

const PAYMENT_KIND_LABELS: Record<PaymentKind, string> = {
  rent: "Loyer",
  deposit: "Depot",
  prorated_rent: "Loyer prorata",
  fee: "Frais",
  other: "Autre"
};

type PaymentFormState = {
  leaseId: string;
  amount: string;
  currencyCode: string;
  dueDate: string;
  note: string;
};

type PaymentManagementPanelProps = {
  organizationId: string;
  payments: Payment[];
  leases: LeaseWithTenantView[];
};

export default function PaymentManagementPanel({
  organizationId,
  payments,
  leases
}: PaymentManagementPanelProps): React.ReactElement {
  const router = useRouter();
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [kindFilter, setKindFilter] = useState<PaymentKind | "all">("all");
  const [leaseFilter, setLeaseFilter] = useState<string>("all");
  const [dueDateFrom, setDueDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    leaseId: "",
    amount: "",
    currencyCode: "CDF",
    dueDate: new Date().toISOString().substring(0, 10),
    note: ""
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("add") === "true") {
        setShowRecordForm(true);
      }
    }
  }, []);

  const leaseMap = useMemo(
    () => new Map(leases.map((lease) => [lease.id, lease])),
    [leases]
  );

  const activeLeases = useMemo(
    () => leases.filter(l => l.status === "active"),
    [leases]
  );

  const baseFilteredPayments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("fr");

    return payments.filter((payment) => {
      if (kindFilter !== "all" && payment.paymentKind !== kindFilter) {
        return false;
      }

      if (leaseFilter !== "all" && payment.leaseId !== leaseFilter) {
        return false;
      }

      if (dueDateFrom && payment.dueDate < dueDateFrom) {
        return false;
      }

      if (dueDateTo && payment.dueDate > dueDateTo) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const lease = leaseMap.get(payment.leaseId);
      const searchable = [
        payment.id,
        payment.tenantId,
        payment.leaseId,
        payment.chargePeriod,
        payment.note,
        lease?.tenantFullName,
        lease?.id
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLocaleLowerCase("fr");

      return searchable.includes(normalizedSearch);
    });
  }, [dueDateFrom, dueDateTo, kindFilter, leaseFilter, leaseMap, payments, searchTerm]);

  const filteredPayments = useMemo(() => {
    if (statusFilter === "all") {
      return baseFilteredPayments;
    }

    return baseFilteredPayments.filter((payment) => payment.status === statusFilter);
  }, [baseFilteredPayments, statusFilter]);

  const tenantPaymentGroups = useMemo(() => {
    const groups = new Map<string, {
      tenantId: string;
      tenantName: string;
      currencyCode: string;
      payments: Payment[];
      outstandingAmount: number;
      overdueCount: number;
      totalRecords: number;
      latestDueDate: string | null;
    }>();

    for (const payment of filteredPayments) {
      const lease = leaseMap.get(payment.leaseId);
      const tenantName = lease?.tenantFullName ?? `Locataire ${payment.tenantId}`;
      const existing = groups.get(payment.tenantId);

      if (!existing) {
        groups.set(payment.tenantId, {
          tenantId: payment.tenantId,
          tenantName,
          currencyCode: payment.currencyCode,
          payments: [payment],
          outstandingAmount: payment.status === "pending" || payment.status === "overdue" ? payment.amount : 0,
          overdueCount: payment.status === "overdue" ? 1 : 0,
          totalRecords: 1,
          latestDueDate: payment.dueDate
        });
        continue;
      }

      existing.payments.push(payment);
      existing.totalRecords += 1;
      existing.outstandingAmount += payment.status === "pending" || payment.status === "overdue" ? payment.amount : 0;
      existing.overdueCount += payment.status === "overdue" ? 1 : 0;
      existing.latestDueDate = existing.latestDueDate && existing.latestDueDate > payment.dueDate
        ? existing.latestDueDate
        : payment.dueDate;
    }

    return Array.from(groups.values()).sort((left, right) => left.tenantName.localeCompare(right.tenantName, "fr"));
  }, [filteredPayments, leaseMap]);

  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const selectedGroup = useMemo(() => {
    if (tenantPaymentGroups.length === 0) {
      return null;
    }
    return tenantPaymentGroups.find((group) => group.tenantId === selectedTenantId) ?? tenantPaymentGroups[0];
  }, [selectedTenantId, tenantPaymentGroups]);

  const selectedPayments = useMemo(() => {
    if (!selectedGroup) {
      return [];
    }

    return [...selectedGroup.payments].sort((left, right) => {
      if (left.dueDate === right.dueDate) {
        return left.createdAtIso.localeCompare(right.createdAtIso);
      }
      return left.dueDate.localeCompare(right.dueDate);
    });
  }, [selectedGroup]);

  function handleLeaseChange(leaseId: string): void {
    const selectedLease = leases.find(l => l.id === leaseId);
    setPaymentForm(prev => ({
      ...prev,
      leaseId,
      amount: selectedLease ? String(selectedLease.monthlyRentAmount) : prev.amount,
      currencyCode: selectedLease?.currencyCode ?? prev.currencyCode
    }));
  }

  async function handleCreatePayment(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);

    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Le montant doit être un nombre positif.");
      setBusy(false);
      return;
    }

    const selectedLease = leases.find(l => l.id === paymentForm.leaseId);
    if (!selectedLease) {
      setError("Bail introuvable.");
      setBusy(false);
      return;
    }

    const result = await postWithAuth<Payment>("/api/payments", {
      organizationId,
      leaseId: paymentForm.leaseId,
      tenantId: selectedLease.tenantId,
      amount,
      currencyCode: paymentForm.currencyCode.trim().toUpperCase(),
      dueDate: paymentForm.dueDate,
      note: paymentForm.note.trim() || null
    });

    if (!result.success) {
      setError(result.error);
      setBusy(false);
      return;
    }

    setPaymentForm({
      leaseId: "",
      amount: "",
      currencyCode: "CDF",
      dueDate: new Date().toISOString().substring(0, 10),
      note: ""
    });
    setShowRecordForm(false);
    setMessage("Paiement enregistré avec succès.");
    setBusy(false);
    router.refresh();
  }

  async function handleMarkPaid(paymentId: string): Promise<void> {
    setMarkingPaid(paymentId);
    setError(null);

    const result = await patchWithAuth<Payment>(`/api/payments/${paymentId}`, {
      paidDate: new Date().toISOString().substring(0, 10)
    });

    if (!result.success) {
      setError(result.error);
      setMarkingPaid(null);
      return;
    }

    setMessage("Paiement marqué comme payé.");
    setMarkingPaid(null);
    router.refresh();
  }

  const canCreatePayment = activeLeases.length > 0;
  const pendingCount = useMemo(() => baseFilteredPayments.filter((payment) => payment.status === "pending").length, [baseFilteredPayments]);
  const overdueCount = useMemo(() => baseFilteredPayments.filter((payment) => payment.status === "overdue").length, [baseFilteredPayments]);
  const paidCount = useMemo(() => baseFilteredPayments.filter((payment) => payment.status === "paid").length, [baseFilteredPayments]);
  const sideOperationBusy = busy || markingPaid !== null;

  function resetFilters(): void {
    setSearchTerm("");
    setStatusFilter("all");
    setKindFilter("all");
    setLeaseFilter("all");
    setDueDateFrom("");
    setDueDateTo("");
  }

  return (
    <div className="space-y-6 p-8">
      {sideOperationBusy ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Paiements</h1>
          <p className="mt-2 text-sm text-slate-500">{payments.length} paiement(s), {overdueCount} en retard.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowRecordForm(!showRecordForm)}
            className="rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4] disabled:opacity-60"
            disabled={!canCreatePayment}
          >
            {showRecordForm ? "Annuler" : "+ Enregistrer"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_220px] xl:items-end 2xl:grid-cols-[minmax(0,1.35fr)_220px_220px_180px_180px_auto]">
        <div>
          <label className="mb-2 block text-sm font-medium text-[#010a19] whitespace-nowrap">Rechercher</label>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Locataire, note, période ou bail"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[#010a19] whitespace-nowrap">Bail</label>
          <select
            value={leaseFilter}
            onChange={(event) => setLeaseFilter(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
          >
            <option value="all">Tous les baux</option>
            {leases.map((lease) => (
              <option key={lease.id} value={lease.id}>
                {lease.tenantFullName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[#010a19] whitespace-nowrap">Type</label>
          <select
            value={kindFilter}
            onChange={(event) => setKindFilter(event.target.value as PaymentKind | "all")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
          >
            <option value="all">Tous</option>
            {Object.entries(PAYMENT_KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[#010a19] whitespace-nowrap">Du</label>
          <input
            value={dueDateFrom}
            onChange={(event) => setDueDateFrom(event.target.value)}
            type="date"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[#010a19] whitespace-nowrap">Au</label>
          <input
            value={dueDateTo}
            onChange={(event) => setDueDateTo(event.target.value)}
            type="date"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-transparent whitespace-nowrap">Actions</label>
          <button
            type="button"
            onClick={resetFilters}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Réinitialiser
          </button>
        </div>
      </div>

     

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showRecordForm && (
        <form onSubmit={handleCreatePayment} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#010a19]">Enregistrer un paiement</h2>
              <p className="text-sm text-gray-500">Sélectionnez un bail actif et renseignez les détails.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              value={paymentForm.leaseId}
              onChange={(e) => handleLeaseChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
              disabled={!canCreatePayment}
            >
              <option value="">Sélectionner un bail</option>
              {activeLeases.map((lease) => (
                <option key={lease.id} value={lease.id}>
                  {lease.tenantFullName} - {lease.monthlyRentAmount.toLocaleString()} {lease.currencyCode}
                </option>
              ))}
            </select>

            <input
              value={paymentForm.dueDate}
              onChange={(e) => setPaymentForm(prev => ({ ...prev, dueDate: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              type="date"
              required
              disabled={!canCreatePayment}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Montant"
              inputMode="decimal"
              required
              disabled={!canCreatePayment}
            />
            <select
              value={paymentForm.currencyCode}
              onChange={(e) => setPaymentForm(prev => ({ ...prev, currencyCode: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              required
              disabled={!canCreatePayment}
            >
              <option value="CDF">CDF (Franc Congolais)</option>
              <option value="USD">USD (Dollar Américain)</option>
            </select>
            <input
              value={paymentForm.note}
              onChange={(e) => setPaymentForm(prev => ({ ...prev, note: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Note (optionnel)"
              disabled={!canCreatePayment}
            />
          </div>

          <button
            type="submit"
            disabled={busy || !canCreatePayment}
            className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
          >
            {"Enregistrer le paiement"}
          </button>
        </form>
      )}

      {payments.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 text-sm text-gray-400">
          Aucun paiement pour l&apos;instant.
        </div>
      ) : (
        <div className="space-y-6">
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
              Tous ({baseFilteredPayments.length})
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                statusFilter === "pending"
                  ? "bg-yellow-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              En attente ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter("overdue")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                statusFilter === "overdue"
                  ? "bg-red-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              En retard ({overdueCount})
            </button>
            <button
              onClick={() => setStatusFilter("paid")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                statusFilter === "paid"
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              Payés ({paidCount})
            </button>
            </div>

            <ResponsiveTable
              keyExtractor={(group) => group.tenantId}
              data={tenantPaymentGroups}
              onRowClick={(group) => setSelectedTenantId(group.tenantId)}
              rowClassName={(group) => selectedGroup?.tenantId === group.tenantId ? "bg-blue-50/60" : ""}
              columns={[
                {
                  header: "Nom",
                  render: (group) => <span className="font-semibold text-[#010a19]">{group.tenantName}</span>
                },
                {
                  header: "Derniere echeance",
                  render: (group) => <span className="text-gray-600">{group.latestDueDate ?? "—"}</span>
                },
                {
                  header: "Solde ouvert",
                  render: (group) => (
                    <span className="text-gray-600">
                      {group.outstandingAmount.toLocaleString("fr-FR")} {group.currencyCode}
                    </span>
                  )
                },
                {
                  header: "En retard",
                  render: (group) => <span className="text-gray-600">{group.overdueCount}</span>
                },
                {
                  header: "Lignes",
                  render: (group) => <span className="text-gray-600">{group.totalRecords}</span>
                }
              ]}
              renderMobileCard={(group) => (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[#010a19]">{group.tenantName}</h3>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      group.overdueCount > 0 ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600"
                    }`}>
                      {group.overdueCount > 0 ? `${group.overdueCount} en retard` : "À jour"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <div>Échéance: {group.latestDueDate ?? "—"}</div>
                    <div className="text-right">Fiches: {group.totalRecords}</div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-400">Solde ouvert</span>
                    <span className="font-bold text-[#010a19]">
                      {group.outstandingAmount.toLocaleString("fr-FR")} {group.currencyCode}
                    </span>
                  </div>
                </div>
              )}
            />

            {tenantPaymentGroups.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                Aucun paiement dans cette catégorie.
              </div>
            )}
          </div>

          {selectedGroup ? (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-gray-200 px-4 py-4">
                <h2 className="text-base font-semibold text-[#010a19]">Historique de {selectedGroup.tenantName}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Charges affichees chronologiquement pour garder un dossier de paiement lisible.
                </p>
              </div>
              <ResponsiveTable<Payment>
                keyExtractor={(payment) => payment.id}
                data={selectedPayments}
                columns={[
                  {
                    header: "Echeance",
                    render: (payment) => <span className="text-gray-600">{payment.dueDate}</span>
                  },
                  {
                    header: "Type",
                    render: (payment) => <span className="text-gray-600">{PAYMENT_KIND_LABELS[payment.paymentKind] ?? payment.paymentKind}</span>
                  },
                  {
                    header: "Periode",
                    render: (payment) => (
                      <span className="text-gray-500 text-xs">
                        {payment.chargePeriod ? (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {payment.chargePeriod}
                          </span>
                        ) : (
                          <span className="text-gray-400">Manuel</span>
                        )}
                      </span>
                    )
                  },
                  {
                    header: "Montant",
                    render: (payment) => (
                      <span className="font-semibold text-[#010a19]">
                        {payment.amount.toLocaleString("fr-FR")} {payment.currencyCode}
                      </span>
                    )
                  },
                  {
                    header: "Statut",
                    render: (payment) => (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[payment.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {STATUS_LABELS[payment.status] ?? payment.status}
                      </span>
                    )
                  },
                  {
                    header: "Note",
                    render: (payment) => <span className="text-gray-500">{payment.note ?? "—"}</span>
                  },
                  {
                    header: "Actions",
                    render: (payment) => (
                      <>
                        {(payment.status === "pending" || payment.status === "overdue") && (
                          <button
                            onClick={() => handleMarkPaid(payment.id)}
                            disabled={sideOperationBusy}
                            className="text-[#0063fe] hover:underline text-sm font-medium disabled:opacity-60"
                          >
                            Marquer payé
                          </button>
                        )}
                      </>
                    )
                  }
                ]}
                renderMobileCard={(payment) => (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#0063fe] bg-blue-50 px-2 py-0.5 rounded-full">
                        {PAYMENT_KIND_LABELS[payment.paymentKind] ?? payment.paymentKind}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[payment.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {STATUS_LABELS[payment.status] ?? payment.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                      <div>Échéance: {payment.dueDate}</div>
                      <div className="text-right">Période: {payment.chargePeriod || "Manuel"}</div>
                    </div>
                    {payment.note && (
                      <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-md italic">
                        Note: {payment.note}
                      </p>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <div className="min-h-[44px] flex items-center">
                        {(payment.status === "pending" || payment.status === "overdue") && (
                          <button
                            onClick={() => handleMarkPaid(payment.id)}
                            disabled={sideOperationBusy}
                            className="text-[#0063fe] hover:underline text-sm font-semibold disabled:opacity-60"
                          >
                            Marquer payé
                          </button>
                        )}
                      </div>
                      <span className="font-bold text-[#010a19]">
                        {payment.amount.toLocaleString("fr-FR")} {payment.currencyCode}
                      </span>
                    </div>
                  </div>
                )}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
