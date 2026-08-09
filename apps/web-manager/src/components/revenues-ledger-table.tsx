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

export default function RevenuesLedgerTable({
  entries
}: {
  entries: RevenueLedgerEntry[];
}): React.ReactElement {
  return (
    <ResponsiveTable<RevenueLedgerEntry>
      keyExtractor={(entry) => entry.paymentId}
      data={entries}
      columns={[
        {
          header: "Payé le",
          render: (entry) => (
            <span className="text-gray-600">{new Date(entry.paidDate).toLocaleDateString("fr-FR")}</span>
          )
        },
        {
          header: "Propriété",
          render: (entry) => (
            <div>
              <p className="font-medium text-[#010a19]">{entry.propertyName}</p>
              <p className="text-xs text-gray-500">Logement {entry.unitNumber}</p>
            </div>
          )
        },
        {
          header: "Locataire",
          render: (entry) => <span className="text-gray-600">{entry.tenantName}</span>
        },
        {
          header: "Type",
          render: (entry) => (
            <span className="text-gray-600">{formatPaymentKind(entry.paymentKind)}</span>
          )
        },
        {
          header: "Montant",
          className: "text-right",
          render: (entry) => (
            <span className="font-semibold text-[#010a19]">
              {entry.amount.toLocaleString("fr-FR")} {entry.currencyCode}
            </span>
          )
        }
      ]}
      renderMobileCard={(entry) => (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#0063fe] bg-blue-50 px-2.5 py-0.5 rounded-full">
              {formatPaymentKind(entry.paymentKind)}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(entry.paidDate).toLocaleDateString("fr-FR")}
            </span>
          </div>
          <div>
            <p className="font-semibold text-[#010a19]">{entry.propertyName}</p>
            <p className="text-xs text-slate-500">
              Logement {entry.unitNumber} • {entry.tenantName}
            </p>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-400">Montant</span>
            <span className="font-bold text-emerald-600">
              {entry.amount.toLocaleString("fr-FR")} {entry.currencyCode}
            </span>
          </div>
        </div>
      )}
    />
  );
}
