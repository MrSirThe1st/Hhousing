import Link from "next/link";
import { notFound } from "next/navigation";
import { createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";
import AdminInvoiceActions from "../../../../../components/admin-invoice-actions";

function formatMoney(amount: number, currency: string): string {
  return `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("fr-FR");
}

function statusLabel(status: string): string {
  switch (status) {
    case "issued":
      return "Émise";
    case "pending_confirmation":
      return "En attente de confirmation";
    case "paid":
      return "Payée";
    case "void":
      return "Annulée";
    default:
      return status;
  }
}

export default async function AdminBillingInvoiceDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const repo = createPlatformBillingRepositoryFromEnv(process.env);
  const invoice = await repo.getInvoiceById(id);
  if (!invoice) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/billing" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Facturation
        </Link>
        <h2 className="mt-2 text-2xl font-semibold text-[#010a19] dark:text-white">
          Facture {invoice.period}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{invoice.id}</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Organisation</dt>
            <dd className="mt-1">
              <Link
                href={`/admin/organizations/${invoice.organizationId}`}
                className="font-medium text-[#0063fe] hover:underline"
              >
                {invoice.organizationName}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Statut</dt>
            <dd className="mt-1 font-medium text-[#010a19] dark:text-white">{statusLabel(invoice.status)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Montant</dt>
            <dd className="mt-1 text-xl font-semibold text-[#010a19] dark:text-white">
              {formatMoney(invoice.amountDue, invoice.currencyCode)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Usage</dt>
            <dd className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {invoice.propertyCount} biens · {invoice.unitCount} logements ×{" "}
              {formatMoney(invoice.pricePerUnitAmount, invoice.currencyCode)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Émise</dt>
            <dd className="mt-1 text-sm">{formatDate(invoice.issuedAtIso)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Échéance</dt>
            <dd className="mt-1 text-sm">{formatDate(invoice.dueAtIso)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Signalé par l&apos;opérateur</dt>
            <dd className="mt-1 text-sm">{formatDate(invoice.paymentReportedAtIso)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Note opérateur</dt>
            <dd className="mt-1 text-sm">{invoice.paymentNote ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Payée le</dt>
            <dd className="mt-1 text-sm">{formatDate(invoice.paidAtIso)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Raison d&apos;annulation</dt>
            <dd className="mt-1 text-sm">{invoice.voidReason ?? "—"}</dd>
          </div>
        </dl>

        <div className="mt-6">
          <AdminInvoiceActions invoiceId={invoice.id} status={invoice.status} />
        </div>
      </section>
    </div>
  );
}
