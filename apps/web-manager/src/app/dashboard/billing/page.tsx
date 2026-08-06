import { createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";
import ContactBillingSupportButton from "../../../components/contact-billing-support-button";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";

function formatMoney(amount: number, currency: string): string {
  return `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("fr-FR");
}

function statusLabel(status: string): string {
  switch (status) {
    case "issued":
      return "À payer";
    case "paid":
      return "Payée";
    case "void":
      return "Annulée";
    default:
      return status;
  }
}

export default async function DashboardBillingPage(): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("billing");
  const repo = createPlatformBillingRepositoryFromEnv(process.env);

  const [estimate, invoices, overdueInvoice] = await Promise.all([
    repo.estimateOrganizationBilling(session.organizationId),
    repo.listInvoicesForOrganization(session.organizationId, 24),
    repo.getOpenOverdueInvoiceForOrganization(session.organizationId)
  ]);

  const openInvoice = invoices.find((invoice) => invoice.status === "issued") ?? null;
  const breakdownSource = openInvoice ?? estimate;
  const isOverdue = overdueInvoice !== null;
  const currency = estimate?.currencyCode ?? openInvoice?.currencyCode ?? "USD";

  return (
    <div className="space-y-6 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#010a19] dark:text-white">Facturation</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Votre offre, ce que vous devez, comment payer, et l&apos;état de vos paiements.
        </p>
      </div>

      {/* 1. What is my plan? */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Votre offre</p>
        <h2 className="mt-1 text-lg font-semibold text-[#010a19] dark:text-white">Quel est mon plan&nbsp;?</h2>
        {estimate ? (
          <>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Facturation à l&apos;usage&nbsp;: gratuit sous {estimate.freePropertyThreshold} biens, puis{" "}
              <span className="font-semibold text-[#010a19] dark:text-white">
                {formatMoney(estimate.pricePerUnitAmount, estimate.currencyCode)}
              </span>{" "}
              par logement et par mois.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">Biens actuels</p>
                <p className="mt-1 text-2xl font-semibold text-[#010a19] dark:text-white">{estimate.propertyCount}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Logements</p>
                <p className="mt-1 text-2xl font-semibold text-[#010a19] dark:text-white">{estimate.unitCount}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Statut offre</p>
                <p className="mt-1 text-lg font-semibold text-[#010a19] dark:text-white">
                  {estimate.isFreeTier ? "Gratuit" : "Payant (usage)"}
                </p>
              </div>
            </div>
            {estimate.isFreeTier ? (
              <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                Moins de {estimate.freePropertyThreshold} biens — aucune facturation n&apos;est due tant que ce
                seuil n&apos;est pas atteint.
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Impossible de charger votre offre pour le moment.</p>
        )}
      </section>

      {/* 2. How much do I owe? */}
      <section
        className={`rounded-xl border bg-white p-5 dark:bg-[#0d1526] ${
          isOverdue
            ? "border-amber-300 dark:border-amber-800"
            : openInvoice
              ? "border-[#0063fe]/30 dark:border-[#0063fe]/40"
              : "border-slate-200 dark:border-slate-800"
        }`}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Montant dû</p>
        <h2 className="mt-1 text-lg font-semibold text-[#010a19] dark:text-white">Combien dois-je&nbsp;?</h2>
        {openInvoice ? (
          <div className="mt-4">
            <p className="text-3xl font-semibold text-[#010a19] dark:text-white">
              {formatMoney(openInvoice.amountDue, openInvoice.currencyCode)}
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Facture {openInvoice.period} · {isOverdue ? "En retard depuis le" : "À payer avant le"}{" "}
              <span className="font-medium">{formatDate(openInvoice.dueAtIso)}</span>
            </p>
            {isOverdue ? (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                Cette facture est en retard. Votre accès reste ouvert — régularisez dès que possible.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">
            Rien à payer pour le moment — aucune facture émise en attente.
          </p>
        )}
        {estimate && !estimate.isFreeTier ? (
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Estimation période en cours (pas une facture)&nbsp;:{" "}
            {formatMoney(estimate.amountDue, estimate.currencyCode)} pour {estimate.unitCount} logements.
          </p>
        ) : null}
      </section>

      {/* 3. Why this amount? */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Détail du calcul</p>
        <h2 className="mt-1 text-lg font-semibold text-[#010a19] dark:text-white">Pourquoi ce montant&nbsp;?</h2>
        {breakdownSource ? (
          <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {"period" in breakdownSource && breakdownSource.period ? (
              <p>
                Période facturée&nbsp;: <span className="font-medium text-[#010a19] dark:text-white">{breakdownSource.period}</span>
              </p>
            ) : (
              <p>Basé sur votre usage actuel (estimation).</p>
            )}
            <p className="rounded-lg bg-slate-50 px-3 py-3 font-medium text-[#010a19] dark:bg-slate-800/60 dark:text-white">
              {breakdownSource.unitCount} logements ×{" "}
              {formatMoney(breakdownSource.pricePerUnitAmount, currency)} ={" "}
              {formatMoney(
                "isFreeTier" in breakdownSource && breakdownSource.isFreeTier
                  ? 0
                  : breakdownSource.amountDue,
                currency
              )}
            </p>
            <p className="text-xs text-slate-500">
              {breakdownSource.propertyCount} biens comptabilisés
              {"isFreeTier" in breakdownSource && breakdownSource.isFreeTier
                ? ` — sous le seuil gratuit de ${breakdownSource.freePropertyThreshold} biens.`
                : "."}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Aucun détail disponible.</p>
        )}
      </section>

      {/* 4. How do I pay? */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Comment payer</p>
        <h2 className="mt-1 text-lg font-semibold text-[#010a19] dark:text-white">Comment puis-je payer&nbsp;?</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>Contactez le support Haraka pour recevoir les instructions de paiement (Mobile Money ou autre).</li>
          <li>Effectuez le paiement en indiquant votre organisation et la période de facture.</li>
          <li>Haraka confirme la réception et marque la facture comme payée — vous le verrez ci-dessous.</li>
        </ol>
        <div className="mt-4">
          <ContactBillingSupportButton />
        </div>
      </section>

      {/* 5. Did you receive my payment? */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Paiements reçus</p>
        <h2 className="mt-1 text-lg font-semibold text-[#010a19] dark:text-white">
          Avez-vous reçu mon paiement&nbsp;?
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Une facture «&nbsp;Payée&nbsp;» avec date de confirmation signifie que Haraka a bien enregistré le paiement.
        </p>
        {invoices.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Aucune facture pour le moment.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {invoices.map((invoice) => (
              <li
                key={invoice.id}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-[#010a19] dark:text-white">{invoice.period}</p>
                  <p className="text-xs text-slate-500">
                    {invoice.propertyCount} biens · {invoice.unitCount} logements
                    {invoice.status === "paid" && invoice.paidAtIso
                      ? ` · confirmé le ${formatDate(invoice.paidAtIso)}`
                      : ` · échéance ${formatDate(invoice.dueAtIso)}`}
                  </p>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  {formatMoney(invoice.amountDue, invoice.currencyCode)} · {statusLabel(invoice.status)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 6. What if I don't pay? */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">En cas de retard</p>
        <h2 className="mt-1 text-lg font-semibold text-[#010a19] dark:text-white">
          Que se passe-t-il si je ne paie pas&nbsp;?
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li>
            <span className="font-medium text-[#010a19] dark:text-white">Votre accès reste ouvert</span> — nous ne
            bloquons pas votre espace pour une facture en retard.
          </li>
          <li>Un bandeau d&apos;alerte apparaît sur le tableau de bord tant qu&apos;une facture est échue.</li>
          <li>Régularisez dès que possible via le support pour éviter tout suivi commercial.</li>
        </ul>
        {overdueInvoice ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            Montant actuellement en retard&nbsp;:{" "}
            <span className="font-semibold">
              {formatMoney(overdueInvoice.amountDue, overdueInvoice.currencyCode)}
            </span>{" "}
            (facture {overdueInvoice.period}, échéance {formatDate(overdueInvoice.dueAtIso)}).
          </p>
        ) : (
          <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-300">
            Aucune facture en retard pour le moment.
          </p>
        )}
      </section>
    </div>
  );
}
