"use client";

import type { PaymentKind } from "@hhousing/domain";
import type { RevenueLedgerEntry } from "../lib/finance-reporting.types";
import ResponsiveTable from "./responsive-table";

function formatPaymentKind(paymentKind: PaymentKind): string {
  switch (paymentKind) {
    case "rent":
      return "Loyer";
    case "deposit":
      return "Caution";
    case "prorated_rent":
      return "Loyer partiel";
    case "fee":
      return "Frais";
    case "other":
      return "Autre";
    default:
      return paymentKind;
  }
}

/** Default rows per page when the property list size is unknown. */
const DEFAULT_LEDGER_PAGE_SIZE = 6;

export default function RevenuesLedgerTable({
  entries,
  pageSize = DEFAULT_LEDGER_PAGE_SIZE
}: {
  entries: RevenueLedgerEntry[];
  pageSize?: number;
}): React.ReactElement {
  return (
    <ResponsiveTable<RevenueLedgerEntry>
      keyExtractor={(entry) => entry.paymentId}
      data={entries}
      paginate
      defaultPageSize={pageSize}
      framed={false}
      columns={[
        {
          header: "Payé le",
          render: (entry) => (
            <span className="text-slate-600">{new Date(entry.paidDate).toLocaleDateString("fr-FR")}</span>
          )
        },
        {
          header: "Propriété",
          render: (entry) => (
            <div>
              <p className="font-medium text-[#010a19]">{entry.propertyName}</p>
              <p className="text-xs text-slate-500">Logement {entry.unitNumber}</p>
            </div>
          )
        },
        {
          header: "Locataire",
          render: (entry) => <span className="text-slate-600">{entry.tenantName}</span>
        },
        {
          header: "Type",
          render: (entry) => (
            <span className="text-slate-600">{formatPaymentKind(entry.paymentKind)}</span>
          )
        },
        {
          header: "Montant",
          className: "text-right",
          render: (entry) => (
            <div className="text-right">
              <p className="font-semibold tabular-nums text-[#010a19]">
                {entry.amount.toLocaleString("fr-FR")}
              </p>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {entry.currencyCode}
              </p>
            </div>
          )
        }
      ]}
      renderMobileCard={(entry) => (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
              {formatPaymentKind(entry.paymentKind)}
            </span>
            <span className="text-xs text-slate-500">
              {new Date(entry.paidDate).toLocaleDateString("fr-FR")}
            </span>
          </div>
          <div>
            <p className="font-semibold text-[#010a19]">{entry.propertyName}</p>
            <p className="text-xs text-slate-500">
              Logement {entry.unitNumber} • {entry.tenantName}
            </p>
          </div>
          <div className="flex items-end justify-between gap-3 border-t border-slate-100 pt-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">{entry.currencyCode}</span>
            <span className="font-semibold tabular-nums text-[#010a19]">
              {entry.amount.toLocaleString("fr-FR")}
            </span>
          </div>
        </div>
      )}
    />
  );
}
