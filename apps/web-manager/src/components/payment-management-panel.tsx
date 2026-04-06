"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Payment, PaymentKind, PaymentStatus } from "@hhousing/domain";
import type { GenerateRentChargesOutput, LeaseWithTenantView } from "@hhousing/api-contracts";
import { postWithAuth, patchWithAuth } from "../lib/api-client";

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
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
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
  const [generating, setGenerating] = useState(false);
  const [generatePeriod, setGeneratePeriod] = useState<string>(
    () => new Date().toISOString().substring(0, 7)
  );

  const leaseMap = useMemo(
    () => new Map(leases.map((lease) => [lease.id, lease])),
    [leases]
  );

  const activeLeases = useMemo(
    () => leases.filter(l => l.status === "active"),
    [leases]
  );

  const filteredPayments = useMemo(() => {
    if (statusFilter === "all") return payments;
    return payments.filter(p => p.status === statusFilter);
  }, [payments, statusFilter]);

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

  async function handleGenerateCharges(): Promise<void> {
    setGenerating(true);
    setError(null);
    setMessage(null);

    const result = await postWithAuth<GenerateRentChargesOutput>("/api/payments/generate", {
      period: generatePeriod
    });

    if (!result.success) {
      setError(result.error);
      setGenerating(false);
      return;
    }

    const { generated, period } = result.data;
    setMessage(
      generated === 0
        ? `Aucune nouvelle charge récurrente générée pour ${period} (déjà générées ou aucun bail actif).`
        : `${generated} charge(s) récurrente(s) générée(s) pour ${period}.`
    );
    setGenerating(false);
    router.refresh();
  }

  const canCreatePayment = activeLeases.length > 0;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#010a19]">Paiements</h1>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={generatePeriod}
            onChange={(e) => setGeneratePeriod(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={() => { void handleGenerateCharges(); }}
            disabled={generating || activeLeases.length === 0}
            className="rounded-lg border border-[#0063fe] px-4 py-2 text-sm font-medium text-[#0063fe] hover:bg-blue-50 disabled:opacity-60"
          >
            {generating ? "Génération..." : "Générer charges"}
          </button>
          {!canCreatePayment && (
            <p className="text-sm text-gray-500">Créez d&apos;abord un bail actif</p>
          )}
          <button
            onClick={() => setShowRecordForm(!showRecordForm)}
            className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
            disabled={!canCreatePayment}
          >
            {showRecordForm ? "Annuler" : "+ Enregistrer"}
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
            <input
              value={paymentForm.currencyCode}
              onChange={(e) => setPaymentForm(prev => ({ ...prev, currencyCode: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase"
              placeholder="Devise"
              maxLength={3}
              required
              disabled={!canCreatePayment}
            />
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
            {busy ? "Enregistrement..." : "Enregistrer le paiement"}
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
              Tous ({payments.length})
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                statusFilter === "pending"
                  ? "bg-yellow-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              En attente ({payments.filter(p => p.status === "pending").length})
            </button>
            <button
              onClick={() => setStatusFilter("overdue")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                statusFilter === "overdue"
                  ? "bg-red-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              En retard ({payments.filter(p => p.status === "overdue").length})
            </button>
            <button
              onClick={() => setStatusFilter("paid")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                statusFilter === "paid"
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              Payés ({payments.filter(p => p.status === "paid").length})
            </button>
            </div>

            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Nom</th>
                  <th className="px-4 py-3 text-left">Derniere echeance</th>
                  <th className="px-4 py-3 text-left">Solde ouvert</th>
                  <th className="px-4 py-3 text-left">En retard</th>
                  <th className="px-4 py-3 text-left">Lignes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenantPaymentGroups.map((group) => (
                  <tr
                    key={group.tenantId}
                    className={`cursor-pointer hover:bg-gray-50 ${selectedGroup?.tenantId === group.tenantId ? "bg-blue-50/60" : ""}`}
                    onClick={() => setSelectedTenantId(group.tenantId)}
                  >
                    <td className="px-4 py-3 font-medium text-[#010a19]">{group.tenantName}</td>
                    <td className="px-4 py-3 text-gray-600">{group.latestDueDate ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {group.outstandingAmount.toLocaleString("fr-FR")} {group.currencyCode}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{group.overdueCount}</td>
                    <td className="px-4 py-3 text-gray-600">{group.totalRecords}</td>
                  </tr>
                ))}
              </tbody>
            </table>

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
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Echeance</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Periode</th>
                    <th className="px-4 py-3 text-left">Montant</th>
                    <th className="px-4 py-3 text-left">Statut</th>
                    <th className="px-4 py-3 text-left">Note</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-4 py-3 text-gray-600">{payment.dueDate}</td>
                      <td className="px-4 py-3 text-gray-600">{PAYMENT_KIND_LABELS[payment.paymentKind] ?? payment.paymentKind}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {payment.chargePeriod ? (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {payment.chargePeriod}
                          </span>
                        ) : (
                          <span className="text-gray-400">Manuel</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#010a19]">
                        {payment.amount.toLocaleString("fr-FR")} {payment.currencyCode}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[payment.status] ?? "bg-gray-100 text-gray-500"}`}>
                          {STATUS_LABELS[payment.status] ?? payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{payment.note ?? "—"}</td>
                      <td className="px-4 py-3">
                        {(payment.status === "pending" || payment.status === "overdue") && (
                          <button
                            onClick={() => handleMarkPaid(payment.id)}
                            disabled={markingPaid === payment.id}
                            className="text-[#0063fe] hover:underline text-sm font-medium disabled:opacity-60"
                          >
                            {markingPaid === payment.id ? "..." : "Marquer payé"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
