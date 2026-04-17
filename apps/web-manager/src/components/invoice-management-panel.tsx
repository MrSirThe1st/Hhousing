"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { GetInvoiceDetailOutput, LeaseWithTenantView } from "@hhousing/api-contracts";
import type { Invoice, LeaseCreditBalance } from "@hhousing/domain";
import { getWithAuth, patchWithAuth } from "../lib/api-client";
import UniversalLoadingState from "./universal-loading-state";

type InvoiceManagementPanelProps = {
  invoices: Invoice[];
  leases: LeaseWithTenantView[];
  credits: LeaseCreditBalance[];
};

const STATUS_STYLES: Record<Invoice["status"], string> = {
  issued: "bg-yellow-100 text-yellow-700",
  partial: "bg-orange-100 text-orange-700",
  paid: "bg-green-100 text-green-700",
  void: "bg-gray-100 text-gray-600"
};

const STATUS_LABELS: Record<Invoice["status"], string> = {
  issued: "Issued",
  partial: "Partial",
  paid: "Paid",
  void: "Void"
};

const EMAIL_STYLES: Record<Invoice["emailStatus"], string> = {
  not_sent: "bg-gray-100 text-gray-600",
  queued: "bg-blue-100 text-blue-700",
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700"
};

const EMAIL_LABELS: Record<Invoice["emailStatus"], string> = {
  not_sent: "Not sent",
  queued: "Pending",
  sent: "Sent",
  failed: "Failed"
};

export default function InvoiceManagementPanel({
  invoices,
  leases,
  credits
}: InvoiceManagementPanelProps): React.ReactElement {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<Invoice["status"] | "all">("all");
  const [emailStatusFilter, setEmailStatusFilter] = useState<Invoice["emailStatus"] | "all">("all");
  const [leaseFilter, setLeaseFilter] = useState<string>("all");
  const [dueDateFrom, setDueDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");
  const [busyInvoiceId, setBusyInvoiceId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GetInvoiceDetailOutput | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const leaseMap = useMemo(
    () => new Map(leases.map((lease) => [lease.id, lease])),
    [leases]
  );

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("fr");

    return invoices.filter((invoice) => {
      if (statusFilter !== "all" && invoice.status !== statusFilter) {
        return false;
      }

      if (emailStatusFilter !== "all" && invoice.emailStatus !== emailStatusFilter) {
        return false;
      }

      if (leaseFilter !== "all" && invoice.leaseId !== leaseFilter) {
        return false;
      }

      if (dueDateFrom && invoice.dueDate < dueDateFrom) {
        return false;
      }

      if (dueDateTo && invoice.dueDate > dueDateTo) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const lease = leaseMap.get(invoice.leaseId);
      const searchable = [
        invoice.invoiceNumber,
        invoice.period,
        invoice.tenantId,
        invoice.leaseId,
        lease?.tenantFullName,
        lease?.id
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLocaleLowerCase("fr");

      return searchable.includes(normalizedSearch);
    });
  }, [dueDateFrom, dueDateTo, emailStatusFilter, invoices, leaseFilter, leaseMap, searchTerm, statusFilter]);

  const summary = useMemo(() => {
    const outstanding = filteredInvoices
      .filter((invoice) => invoice.status !== "void")
      .reduce((sum, invoice) => sum + Math.max(0, invoice.totalAmount - invoice.amountPaid), 0);
    const visibleLeaseIds = new Set(filteredInvoices.map((invoice) => invoice.leaseId));
    const creditTotal = credits
      .filter((credit) => visibleLeaseIds.has(credit.leaseId))
      .reduce((sum, credit) => sum + credit.creditAmount, 0);

    return {
      outstanding,
      creditTotal,
      netDue: Math.max(0, outstanding - creditTotal)
    };
  }, [credits, filteredInvoices]);

  function resetFilters(): void {
    setSearchTerm("");
    setStatusFilter("all");
    setEmailStatusFilter("all");
    setLeaseFilter("all");
    setDueDateFrom("");
    setDueDateTo("");
  }

  async function loadInvoiceDetail(invoiceId: string): Promise<void> {
    setSelectedInvoiceId(invoiceId);
    setDetailLoading(true);
    const result = await getWithAuth<GetInvoiceDetailOutput>(`/api/invoices/${invoiceId}`);
    if (!result.success) {
      setError(result.error);
      setDetail(null);
      setDetailLoading(false);
      return;
    }

    setDetail(result.data);
    setDetailLoading(false);
  }

  async function handleVoidInvoice(invoiceId: string): Promise<void> {
    const reason = voidReason.trim();
    if (reason.length < 3) {
      setError("Le motif d'annulation doit contenir au moins 3 caractères.");
      return;
    }

    setBusyInvoiceId(invoiceId);
    setError(null);
    setMessage(null);

    const result = await patchWithAuth<{ invoice: Invoice; creditAdjustedAmount: number }>(`/api/invoices/${invoiceId}`, {
      action: "void",
      reason
    });

    if (!result.success) {
      setError(result.error);
      setBusyInvoiceId(null);
      return;
    }

    setMessage(`Facture annulée. Ajustement crédit: ${result.data.creditAdjustedAmount.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}`);
    setVoidReason("");
    await loadInvoiceDetail(invoiceId);
    setBusyInvoiceId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6 p-8">
      {busyInvoiceId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Factures</h1>
        <p className="text-sm text-slate-500">Facturation par bail et période, indépendante des opérations de paiement.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_220px_220px] xl:items-end 2xl:grid-cols-[minmax(0,1.25fr)_220px_220px_220px_180px_180px_auto]">
        <div>
          <label className="mb-2 block text-sm font-medium text-[#010a19] whitespace-nowrap">Rechercher</label>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Numéro, locataire, période ou bail"
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
          <label className="mb-2 block text-sm font-medium text-[#010a19] whitespace-nowrap">Statut</label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as Invoice["status"] | "all")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
          >
            <option value="all">Tous</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[#010a19] whitespace-nowrap">Email</label>
          <select
            value={emailStatusFilter}
            onChange={(event) => setEmailStatusFilter(event.target.value as Invoice["emailStatus"] | "all")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
          >
            <option value="all">Tous</option>
            {Object.entries(EMAIL_LABELS).map(([value, label]) => (
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



      {message ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#010a19]">Journal des factures</h2>
        <p className="mt-1 text-sm text-gray-500">Suivi des statuts de facture et d'email.</p>

        {filteredInvoices.length === 0 ? (
          <p className="mt-5 text-sm text-gray-500">Aucune facture pour les filtres actifs.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-100 text-left text-xs uppercase tracking-[0.14em] text-gray-400">
                <tr>
                  <th className="pb-3">No</th>
                  <th className="pb-3">Lease</th>
                  <th className="pb-3">Period</th>
                  <th className="pb-3">Due</th>
                  <th className="pb-3 text-right">Total</th>
                  <th className="pb-3 text-right">Paid</th>
                  <th className="pb-3 text-right">Remaining</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.map((invoice) => {
                  const lease = leaseMap.get(invoice.leaseId);
                  const remaining = Math.max(0, invoice.totalAmount - invoice.amountPaid);

                  return (
                    <tr key={invoice.id}>
                      <td className="py-3 font-medium text-[#010a19]">{invoice.invoiceNumber}</td>
                      <td className="py-3 text-gray-600">
                        <div>{lease?.tenantFullName ?? invoice.tenantId}</div>
                        <div className="text-xs text-gray-400">{lease ? `Lease ${lease.id.slice(0, 8)}` : ""}</div>
                      </td>
                      <td className="py-3 text-gray-600">{invoice.period ?? "One-time"}</td>
                      <td className="py-3 text-gray-600">{invoice.dueDate}</td>
                      <td className="py-3 text-right font-medium text-[#010a19]">{invoice.totalAmount.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</td>
                      <td className="py-3 text-right text-gray-700">{invoice.amountPaid.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</td>
                      <td className="py-3 text-right text-gray-700">{remaining.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[invoice.status]}`}>{STATUS_LABELS[invoice.status]}</span>
                      </td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${EMAIL_STYLES[invoice.emailStatus]}`}>{EMAIL_LABELS[invoice.emailStatus]}</span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void loadInvoiceDetail(invoice.id)}
                            className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedInvoiceId ? (
        <div className="fixed inset-0 z-[60] bg-[#010a19]/45 p-4 md:p-8">
          <div className="ml-auto h-full w-full max-w-3xl overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#010a19]">Détail facture</h2>
                <p className="text-sm text-gray-500">Applications de paiements et contrôles de facture.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedInvoiceId(null);
                  setDetail(null);
                  setVoidReason("");
                }}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Fermer
              </button>
            </div>

            {detailLoading ? (
              <UniversalLoadingState minHeightClassName="min-h-56" size="compact" />
            ) : detail ? (
              <div className="space-y-6">
                <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <p className="text-sm text-gray-600"><span className="font-semibold text-[#010a19]">No:</span> {detail.invoice.invoiceNumber}</p>
                    <p className="text-sm text-gray-600"><span className="font-semibold text-[#010a19]">Period:</span> {detail.invoice.period ?? "One-time"}</p>
                    <p className="text-sm text-gray-600"><span className="font-semibold text-[#010a19]">Total:</span> {detail.invoice.totalAmount.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} {detail.invoice.currencyCode}</p>
                    <p className="text-sm text-gray-600"><span className="font-semibold text-[#010a19]">Paid:</span> {detail.invoice.amountPaid.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} {detail.invoice.currencyCode}</p>
                    <p className="text-sm text-gray-600"><span className="font-semibold text-[#010a19]">Status:</span> {STATUS_LABELS[detail.invoice.status]}</p>
                    <p className="text-sm text-gray-600"><span className="font-semibold text-[#010a19]">Email:</span> {EMAIL_LABELS[detail.invoice.emailStatus]}</p>
                  </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="text-base font-semibold text-[#010a19]">Void</h3>
                  <p className="mt-1 text-sm text-gray-600">Payments already applied will be adjusted automatically.</p>
                  {detail.invoice.status === "void" ? (
                    <p className="mt-3 text-sm text-gray-500">Facture déjà annulée{detail.invoice.voidReason ? ` · Motif: ${detail.invoice.voidReason}` : ""}.</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <textarea
                        value={voidReason}
                        onChange={(event) => setVoidReason(event.target.value)}
                        placeholder="Motif d'annulation"
                        className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => void handleVoidInvoice(detail.invoice.id)}
                        disabled={busyInvoiceId === detail.invoice.id}
                        className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        Void invoice
                      </button>
                    </div>
                  )}
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="text-base font-semibold text-[#010a19]">Applications paiements</h3>
                  {detail.applications.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-500">Aucune application.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {detail.applications.map((application) => (
                        <div key={application.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                          <span className="font-medium text-[#010a19]">{application.paymentId}</span>
                          {" · "}
                          {application.appliedAmount.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
                          {" · "}
                          {new Date(application.appliedAtIso).toLocaleString("fr-FR")}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

              </div>
            ) : (
              <p className="text-sm text-gray-500">Chargement du détail...</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
