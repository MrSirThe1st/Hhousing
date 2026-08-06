"use client";

import Link from "next/link";
import type { ExpenseCategory } from "@hhousing/domain";
import type { ExpenseLedgerEntry } from "../lib/finance-reporting.types";
import ExpenseDeleteButton from "./expense-delete-button";
import ResponsiveTable from "./responsive-table";

type ExpenseLedgerRow = ExpenseLedgerEntry & {
  editHref: string;
};

function formatExpenseCategory(category: ExpenseCategory): string {
  switch (category) {
    case "maintenance":
      return "Réparations";
    case "utilities":
      return "Utilités";
    case "taxes":
      return "Taxes";
    case "insurance":
      return "Assurance";
    case "supplies":
      return "Fournitures";
    case "payroll":
      return "Paie";
    case "cleaning":
      return "Nettoyage";
    case "security":
      return "Sécurité";
    case "legal":
      return "Juridique";
    case "marketing":
      return "Marketing";
    case "admin":
      return "Administration";
    case "other":
      return "Autre";
    default:
      return category;
  }
}

export default function ExpensesLedgerTable({
  entries,
  redirectHref
}: {
  entries: ExpenseLedgerRow[];
  redirectHref: string;
}): React.ReactElement {
  return (
    <ResponsiveTable<ExpenseLedgerRow>
      keyExtractor={(entry) => entry.expenseId}
      data={entries}
      columns={[
        {
          header: "Date",
          render: (entry) => (
            <span className="text-gray-600">
              {new Date(entry.expenseDate).toLocaleDateString("fr-FR")}
            </span>
          )
        },
        {
          header: "Libellé",
          render: (entry) => (
            <div>
              <p className="font-medium text-[#010a19]">{entry.title}</p>
              {entry.vendorName ? (
                <p className="text-xs text-gray-500">Fournisseur: {entry.vendorName}</p>
              ) : null}
              {entry.payeeName ? (
                <p className="text-xs text-gray-500">Payé à: {entry.payeeName}</p>
              ) : null}
              {entry.note ? <p className="text-xs text-gray-500">{entry.note}</p> : null}
            </div>
          )
        },
        {
          header: "Propriété",
          render: (entry) => <span className="text-gray-600">{entry.propertyName}</span>
        },
        {
          header: "Unité",
          render: (entry) => (
            <span className="text-gray-600">{entry.unitLabel ?? "Toute la propriété"}</span>
          )
        },
        {
          header: "Catégorie",
          render: (entry) => (
            <span className="text-gray-600">{formatExpenseCategory(entry.category)}</span>
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
        },
        {
          header: "Actions",
          className: "text-right",
          render: (entry) => (
            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
              <Link
                href={entry.editHref}
                className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Modifier
              </Link>
              <ExpenseDeleteButton expenseId={entry.expenseId} redirectHref={redirectHref} />
            </div>
          )
        }
      ]}
      renderMobileCard={(entry) => (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full">
              {formatExpenseCategory(entry.category)}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(entry.expenseDate).toLocaleDateString("fr-FR")}
            </span>
          </div>
          <div>
            <p className="font-semibold text-[#010a19]">{entry.title}</p>
            <p className="text-xs text-slate-500">
              {entry.propertyName} • {entry.unitLabel ?? "Toute la propriété"}
            </p>
            {entry.vendorName && (
              <p className="text-xs text-gray-500">Fournisseur: {entry.vendorName}</p>
            )}
            {entry.payeeName && (
              <p className="text-xs text-gray-500">Payé à: {entry.payeeName}</p>
            )}
          </div>
          {entry.note && (
            <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-md italic">
              Note: {entry.note}
            </p>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 min-h-[44px]" onClick={(e) => e.stopPropagation()}>
              <Link
                href={entry.editHref}
                className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Modifier
              </Link>
              <ExpenseDeleteButton expenseId={entry.expenseId} redirectHref={redirectHref} />
            </div>
            <span className="font-bold text-rose-600">
              {entry.amount.toLocaleString("fr-FR")} {entry.currencyCode}
            </span>
          </div>
        </div>
      )}
    />
  );
}
