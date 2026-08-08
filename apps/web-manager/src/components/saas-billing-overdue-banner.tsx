import Link from "next/link";
import type { PlatformSubscriptionInvoice } from "@hhousing/domain";

export default function SaasBillingOverdueBanner({
  invoice
}: {
  invoice: PlatformSubscriptionInvoice;
}): React.ReactElement {
  const due = new Date(invoice.dueAtIso);
  const dueLabel = Number.isNaN(due.getTime())
    ? invoice.dueAtIso
    : due.toLocaleDateString("fr-FR");

  return (
    <div className="border-b border-red-200 bg-red-50 px-4 py-3 md:px-6 dark:border-red-900/50 dark:bg-red-950/40">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-red-950 dark:text-red-100">
            Paiement en retard — facture {invoice.invoiceNumber ?? invoice.period}
          </p>
          <p className="text-xs text-red-800 dark:text-red-200">
            Montant dû :{" "}
            {invoice.amountDue.toLocaleString("fr-FR", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2
            })}{" "}
            {invoice.currencyCode} (échéance {dueLabel}). Votre accès reste ouvert — régularisez dès que
            possible via la facturation.
          </p>
        </div>
        <Link
          href="/dashboard/billing"
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-red-900 px-3 py-2 text-xs font-semibold text-white hover:bg-red-800 dark:bg-red-200 dark:text-red-950"
        >
          Payer maintenant
        </Link>
      </div>
    </div>
  );
}
