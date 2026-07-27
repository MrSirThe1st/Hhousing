"use client";

import ResponsiveTable from "./responsive-table";

export type OverduePaymentRow = {
  paymentId: string;
  tenantName: string;
  unitLabel: string;
  amount: number;
  currencyCode: string;
  daysLate: number;
  dueDate: string;
};

function formatIsoDate(isoDate: string): string {
  const year = Number(isoDate.slice(0, 4));
  const monthIndex = Number(isoDate.slice(5, 7)) - 1;
  const day = Number(isoDate.slice(8, 10));

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, monthIndex, day)));
}

export default function DashboardOverduePaymentsTable({
  rows
}: {
  rows: OverduePaymentRow[];
}): React.ReactElement {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">Aucun paiement en retard pour le moment.</p>;
  }

  return (
    <ResponsiveTable<OverduePaymentRow>
      paginate={false}
      keyExtractor={(row) => row.paymentId}
      data={rows}
      columns={[
        {
          header: "Locataire",
          render: (row) => (
            <div>
              <p className="font-medium text-[#010a19]">{row.tenantName}</p>
              <p className="text-xs text-slate-500">Échéance: {formatIsoDate(row.dueDate)}</p>
            </div>
          )
        },
        {
          header: "Logement",
          render: (row) => <span className="text-slate-700">{row.unitLabel}</span>
        },
        {
          header: "Montant",
          className: "text-right",
          render: (row) => (
            <span className="font-medium text-[#010a19]">
              {row.amount.toLocaleString("fr-FR")} {row.currencyCode}
            </span>
          )
        },
        {
          header: "Jours retard",
          className: "text-right",
          render: (row) => (
            <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800">
              {row.daysLate} j
            </span>
          )
        }
      ]}
      renderMobileCard={(row) => (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-[#010a19]">{row.tenantName}</p>
            <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
              {row.daysLate} j
            </span>
          </div>
          <div className="text-xs text-slate-500 flex justify-between">
            <span>Logement: {row.unitLabel}</span>
            <span>Échéance: {formatIsoDate(row.dueDate)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-400">Montant</span>
            <span className="font-semibold text-rose-600">
              {row.amount.toLocaleString("fr-FR")} {row.currencyCode}
            </span>
          </div>
        </div>
      )}
    />
  );
}
