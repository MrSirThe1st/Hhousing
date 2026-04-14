import type { OwnerPortfolioView } from "./owner-portfolio-view";

export interface OwnerStatementRow {
  paymentId: string;
  period: string;
  dueDate: string;
  paidDate: string | null;
  status: "paid" | "pending" | "overdue" | "cancelled";
  propertyName: string;
  unitNumber: string | null;
  tenantName: string;
  amount: number;
  currencyCode: string;
}

export interface OwnerStatementSummary {
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  totalAmount: number;
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/\"/g, "\"\"")}"`;
  }
  return value;
}

export function buildOwnerStatementRows(
  view: OwnerPortfolioView,
  period: string | null
): OwnerStatementRow[] {
  return view.paymentRows
    .map((row) => {
      const rowPeriod = row.payment.chargePeriod ?? row.payment.dueDate.slice(0, 7);
      return {
        paymentId: row.payment.id,
        period: rowPeriod,
        dueDate: row.payment.dueDate,
        paidDate: row.payment.paidDate,
        status: row.payment.status,
        propertyName: row.propertyName,
        unitNumber: row.unitNumber,
        tenantName: row.lease?.tenantFullName ?? "Locataire non resolu",
        amount: row.payment.amount,
        currencyCode: row.payment.currencyCode
      };
    })
    .filter((row) => period === null || row.period === period)
    .sort((left, right) => right.dueDate.localeCompare(left.dueDate));
}

export function buildOwnerStatementSummary(rows: OwnerStatementRow[]): OwnerStatementSummary {
  const paidAmount = rows
    .filter((row) => row.status === "paid")
    .reduce((sum, row) => sum + row.amount, 0);
  const pendingAmount = rows
    .filter((row) => row.status === "pending")
    .reduce((sum, row) => sum + row.amount, 0);
  const overdueAmount = rows
    .filter((row) => row.status === "overdue")
    .reduce((sum, row) => sum + row.amount, 0);

  return {
    paidAmount,
    pendingAmount,
    overdueAmount,
    totalAmount: paidAmount + pendingAmount + overdueAmount
  };
}

export function buildOwnerStatementCsv(rows: OwnerStatementRow[]): string {
  const header = [
    "Paiement",
    "Periode",
    "Echeance",
    "Date de paiement",
    "Statut",
    "Bien",
    "Unite",
    "Locataire",
    "Montant",
    "Devise"
  ].join(",");

  const lines = rows.map((row) => [
    row.paymentId,
    row.period,
    row.dueDate,
    row.paidDate ?? "",
    row.status,
    row.propertyName,
    row.unitNumber ?? "",
    row.tenantName,
    row.amount.toString(),
    row.currencyCode
  ].map((value) => escapeCsv(value)).join(","));

  return [header, ...lines].join("\n");
}
