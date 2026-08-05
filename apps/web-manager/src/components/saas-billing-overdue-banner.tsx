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
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 md:px-6 dark:border-amber-900/50 dark:bg-amber-950/40">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
            Abonnement en retard — facture {invoice.period}
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-200">
            {invoice.status === "pending_confirmation"
              ? "Paiement signalé, confirmation Haraka en attente."
              : `Montant dû : ${invoice.amountDue.toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} ${invoice.currencyCode} (échéance ${dueLabel}).`}{" "}
            Votre accès reste ouvert — régularisez dès que possible.
          </p>
        </div>
        <Link
          href="/dashboard/billing"
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-amber-900 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800 dark:bg-amber-200 dark:text-amber-950"
        >
          Voir la facturation
        </Link>
      </div>
    </div>
  );
}
