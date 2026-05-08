"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { GetInvoiceDetailOutput, LeaseWithTenantView } from "@hhousing/api-contracts";
import type { Invoice, LeaseCreditBalance, Organization } from "@hhousing/domain";
import { getWithAuth, patchWithAuth } from "../lib/api-client";
import UniversalLoadingState from "./universal-loading-state";
import ActionMenu from "./action-menu";
import { buildInvoiceDocumentContext, buildInvoiceDocumentHtml } from "../lib/invoices/invoice-document";

type InvoiceManagementPanelProps = {
  invoices: Invoice[];
  leases: LeaseWithTenantView[];
  credits: LeaseCreditBalance[];
  organization: Organization | null;
};

const STATUS_STYLES: Record<Invoice["status"], string> = {
  issued: "bg-yellow-100 text-yellow-700",
  partial: "bg-orange-100 text-orange-700",
  paid: "bg-green-100 text-green-700",
  void: "bg-gray-100 text-gray-600"
};

const STATUS_LABELS: Record<Invoice["status"], string> = {
  issued: "Émise",
  partial: "Partielle",
  paid: "Payée",
  void: "Annulée"
};

const EMAIL_STYLES: Record<Invoice["emailStatus"], string> = {
  not_sent: "bg-gray-100 text-gray-600",
  queued: "bg-blue-100 text-blue-700",
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700"
};

const EMAIL_LABELS: Record<Invoice["emailStatus"], string> = {
  not_sent: "Non envoyé",
  queued: "En attente",
  sent: "Envoyé",
  failed: "Échec"
};

export default function InvoiceManagementPanel({
  invoices,
  leases,
  credits,
  organization
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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  }

  function getCompanyName(): string {
    return organization?.name ?? "Votre organisation";
  }

  function getTenantName(invoice: Invoice): string {
    return leaseMap.get(invoice.leaseId)?.tenantFullName ?? "Locataire";
  }

  function downloadInvoiceDocument(invoice: Invoice): void {
    const lease = leaseMap.get(invoice.leaseId);
    const context = buildInvoiceDocumentContext({
      invoice,
      lease,
      organization,
      formatDate
    });
    const documentHtml = buildInvoiceDocumentHtml(context);

    const popup = window.open("", "_blank", "noopener,noreferrer,width=980,height=760");
    if (!popup) {
      setError("Impossible d'ouvrir la fenêtre d'impression. Vérifiez le bloqueur de pop-up.");
      return;
    }
    popup.document.open();
    popup.document.write(documentHtml);
    popup.document.close();
    popup.onload = () => {
      popup.focus();
      popup.print();
    };
  }

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

  async function handleVoidInvoice(invoiceId: string, reasonInput: string): Promise<void> {
    const reason = reasonInput.trim();
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
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <p className="text-slate-500">Encours</p>
            <p className="font-semibold text-[#010a19]">{summary.outstanding.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <p className="text-slate-500">Avoirs</p>
            <p className="font-semibold text-[#010a19]">{summary.creditTotal.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <p className="text-slate-500">Net à encaisser</p>
            <p className="font-semibold text-[#010a19]">{summary.netDue.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <p className="mt-5 text-sm text-gray-500">Aucune facture pour les filtres actifs.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-100 text-left text-xs uppercase tracking-[0.14em] text-gray-400">
                <tr>
                  <th className="pb-3">N°</th>
                  <th className="pb-3">Locataire</th>
                  <th className="pb-3">Période</th>
                  <th className="pb-3">Échéance</th>
                  <th className="pb-3 text-right">Total</th>
                  <th className="pb-3 text-right">Payé</th>
                  <th className="pb-3 text-right">Solde</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.map((invoice) => {
                  const lease = leaseMap.get(invoice.leaseId);
                  const remaining = Math.max(0, invoice.totalAmount - invoice.amountPaid);

                  return (
                    <tr
                      key={invoice.id}
                      className="cursor-pointer hover:bg-gray-50"
                      tabIndex={0}
                      onClick={() => {
                        void loadInvoiceDetail(invoice.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          void loadInvoiceDetail(invoice.id);
                        }
                      }}
                    >
                      <td className="py-3 font-medium text-[#010a19]">{invoice.invoiceNumber}</td>
                      <td className="py-3 text-gray-600">
                        <div>{lease?.tenantFullName ?? "—"}</div>
                      </td>
                      <td className="py-3 text-gray-600">{invoice.period ?? "Ponctuelle"}</td>
                      <td className="py-3 text-gray-600">{formatDate(invoice.dueDate)}</td>
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
                        <div className="flex items-center justify-end" onClick={(event) => event.stopPropagation()}>
                          <ActionMenu
                            items={[
                              {
                                label: "Télécharger",
                                onSelect: () => {
                                  downloadInvoiceDocument(invoice);
                                }
                              },
                              {
                                label: busyInvoiceId === invoice.id ? "Annulation..." : "Annuler la facture",
                                tone: "danger",
                                disabled: invoice.status === "void" || busyInvoiceId === invoice.id,
                                onSelect: () => {
                                  const reason = window.prompt("Motif d'annulation");
                                  if (reason) {
                                    void handleVoidInvoice(invoice.id, reason);
                                  }
                                }
                              }
                            ]}
                          />
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
        <div className="fixed inset-0 z-60 bg-[#010a19]/45 p-4 md:p-8">
          <div className="ml-auto h-full w-full max-w-3xl overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#010a19]">Détail facture</h2>
                  <p className="text-sm text-gray-500">{leaseMap.get(detail?.invoice.leaseId ?? "")?.tenantFullName ?? ""}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedInvoiceId(null);
                  setDetail(null);
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
                <section className="rounded-xl border border-gray-300 bg-[#f4f5f7] p-4">
                  <article className="mx-auto w-full max-w-215 border border-gray-300 bg-white p-6">
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <h3 className="text-3xl font-semibold tracking-[-0.02em] text-[#121826]">Invoice</h3>
                      {organization?.logoUrl ? (
                        <img
                          src={organization.logoUrl}
                          alt={organization.name}
                          className="h-14 w-auto max-w-48 object-contain"
                        />
                      ) : (
                        <div className="text-right">
                          <p className="text-lg font-semibold text-[#3a40f6]">{getCompanyName()}</p>
                        </div>
                      )}
                    </div>

                    <div className="mb-4 grid grid-cols-1 gap-6 text-xs text-gray-600 md:grid-cols-2">
                      <div>
                        <p>{getCompanyName()}</p>
                        {organization?.address ? <p>{organization.address}</p> : null}
                        {organization?.contactEmail ? <p>{organization.contactEmail}</p> : null}
                        {organization?.contactPhone ? <p>{organization.contactPhone}</p> : null}
                        <p className="mt-3 font-semibold text-[#121826]">Bill To</p>
                        <p>{getTenantName(detail.invoice)}</p>
                        {leaseMap.get(detail.invoice.leaseId)?.tenantEmail ? <p>{leaseMap.get(detail.invoice.leaseId)?.tenantEmail}</p> : null}
                      </div>

                      <div className="space-y-1 text-right">
                        <p><span className="text-gray-500">Invoice No. :</span> <span className="font-semibold text-[#121826]">{detail.invoice.invoiceNumber}</span></p>
                        <p><span className="text-gray-500">Issue Date :</span> <span className="font-semibold text-[#121826]">{formatDate(detail.invoice.issueDate)}</span></p>
                        <p><span className="text-gray-500">Due Date :</span> <span className="font-semibold text-[#121826]">{formatDate(detail.invoice.dueDate)}</span></p>
                        <p><span className="text-gray-500">Reference :</span> <span className="font-semibold text-[#121826]">{detail.invoice.id.slice(0, 8).toUpperCase()}</span></p>
                      </div>
                    </div>

                    <div className="mb-3 grid grid-cols-2 overflow-hidden border border-gray-400 text-xs md:grid-cols-4">
                      <div className="bg-[#5f5ff6] p-2 text-white">
                        <p className="text-[10px] uppercase tracking-[0.06em] text-blue-100">Invoice No.</p>
                        <p className="font-semibold">{detail.invoice.invoiceNumber}</p>
                      </div>
                      <div className="bg-[#5f5ff6] p-2 text-white">
                        <p className="text-[10px] uppercase tracking-[0.06em] text-blue-100">Issue date</p>
                        <p className="font-semibold">{formatDate(detail.invoice.issueDate)}</p>
                      </div>
                      <div className="bg-[#5f5ff6] p-2 text-white">
                        <p className="text-[10px] uppercase tracking-[0.06em] text-blue-100">Due date</p>
                        <p className="font-semibold">{formatDate(detail.invoice.dueDate)}</p>
                      </div>
                      <div className="bg-[#2b2f38] p-2 text-white">
                        <p className="text-[10px] uppercase tracking-[0.06em] text-gray-300">Total</p>
                        <p className="font-semibold">{detail.invoice.totalAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {detail.invoice.currencyCode}</p>
                      </div>
                    </div>

                    <table className="w-full border border-gray-400 text-xs">
                      <thead className="bg-[#2b2f38] text-white">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Description</th>
                          <th className="px-3 py-2 text-left font-medium">Quantity</th>
                          <th className="px-3 py-2 text-left font-medium">Unit price</th>
                          <th className="px-3 py-2 text-right font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-300">
                          <td className="px-3 py-2">{detail.invoice.period ?? "Facture ponctuelle"}</td>
                          <td className="px-3 py-2">1</td>
                          <td className="px-3 py-2">{detail.invoice.totalAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-right">{detail.invoice.totalAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        {detail.invoice.amountPaid > 0 ? (
                          <tr className="border-b border-gray-300">
                            <td className="px-3 py-2">Montant déjà payé</td>
                            <td className="px-3 py-2">1</td>
                            <td className="px-3 py-2">- {detail.invoice.amountPaid.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 text-right">- {detail.invoice.amountPaid.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        ) : null}
                        <tr>
                          <td className="px-3 py-2 text-right font-semibold" colSpan={3}>Total ({detail.invoice.currencyCode})</td>
                          <td className="px-3 py-2 text-right font-semibold">{Math.max(0, detail.invoice.totalAmount - detail.invoice.amountPaid).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
                      <p>Statut facture: <span className="font-semibold text-[#121826]">{STATUS_LABELS[detail.invoice.status]}</span></p>
                      <p>Statut email: <span className="font-semibold text-[#121826]">{EMAIL_LABELS[detail.invoice.emailStatus]}</span></p>
                      {detail.invoice.paidAt ? <p>Payée le: <span className="font-semibold text-[#121826]">{formatDate(detail.invoice.paidAt)}</span></p> : null}
                    </div>
                  </article>
                  <div className="mt-4 flex justify-end" onClick={(event) => event.stopPropagation()}>
                    <ActionMenu
                      items={[
                        {
                          label: "Télécharger",
                          onSelect: () => {
                            downloadInvoiceDocument(detail.invoice);
                          }
                        },
                        {
                          label: busyInvoiceId === detail.invoice.id ? "Annulation..." : "Annuler la facture",
                          tone: "danger",
                          disabled: detail.invoice.status === "void" || busyInvoiceId === detail.invoice.id,
                          onSelect: () => {
                            const reason = window.prompt("Motif d'annulation");
                            if (reason) {
                              void handleVoidInvoice(detail.invoice.id, reason);
                            }
                          }
                        }
                      ]}
                    />
                  </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="text-base font-semibold text-[#010a19]">Paiements appliqués</h3>
                  {detail.applications.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-500">Aucune application.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {detail.applications.map((application) => (
                        <div key={application.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                          <span className="font-medium text-[#010a19]">{application.appliedAmount.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} {detail.invoice.currencyCode}</span>
                          {" · "}
                          {formatDate(application.appliedAtIso)}
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
