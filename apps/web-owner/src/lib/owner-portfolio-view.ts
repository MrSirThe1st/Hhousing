import type { LeaseWithTenantView, PropertyWithUnitsView } from "@hhousing/api-contracts";
import type { Payment } from "@hhousing/domain";
import type { OwnerPortfolioBundle } from "./owner-portfolio";

export interface OwnerPortfolioPaymentRow {
  payment: Payment;
  lease: LeaseWithTenantView | null;
  property: PropertyWithUnitsView["property"] | null;
  propertyName: string;
  unitNumber: string | null;
}

export interface OwnerPortfolioPropertyRow {
  property: PropertyWithUnitsView["property"];
  units: PropertyWithUnitsView["units"];
  occupiedUnits: number;
  activeLeases: number;
  paidAmount: number;
  pendingAmount: number;
}

export interface OwnerPortfolioMonthRow {
  period: string;
  label: string;
  amount: number;
}

export interface OwnerPortfolioView {
  primaryCurrencyCode: string;
  propertyRows: OwnerPortfolioPropertyRow[];
  paymentRows: OwnerPortfolioPaymentRow[];
  monthlyIncomeRows: OwnerPortfolioMonthRow[];
  propertyCount: number;
  unitCount: number;
  occupiedUnitCount: number;
  activeLeaseCount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
}

function monthLabel(period: string): string {
  const [year, month] = period.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric"
  }).format(date);
}

export function buildOwnerPortfolioView(bundle: OwnerPortfolioBundle): OwnerPortfolioView {
  const leaseById = new Map(bundle.leases.map((lease) => [lease.id, lease]));
  const propertyByUnitId = new Map<string, PropertyWithUnitsView["property"]>();
  const unitNumberById = new Map<string, string>();
  for (const item of bundle.properties) {
    for (const unit of item.units) {
      propertyByUnitId.set(unit.id, item.property);
      unitNumberById.set(unit.id, unit.unitNumber);
    }
  }

  const paymentRows = [...bundle.payments]
    .sort((left, right) => right.dueDate.localeCompare(left.dueDate))
    .map((payment) => {
      const lease = leaseById.get(payment.leaseId) ?? null;
      const property = lease ? propertyByUnitId.get(lease.unitId) ?? null : null;
      return {
        payment,
        lease,
        property,
        propertyName: property?.name ?? "Bien non resolu",
        unitNumber: lease ? unitNumberById.get(lease.unitId) ?? null : null
      };
    });

  const propertyRows = bundle.properties
    .map((item) => {
      const unitIds = new Set(item.units.map((unit) => unit.id));
      const activeLeases = bundle.leases.filter(
        (lease) => lease.status === "active" && unitIds.has(lease.unitId)
      );
      const activeLeaseIds = new Set(activeLeases.map((lease) => lease.id));
      const relatedPayments = bundle.payments.filter((payment) => activeLeaseIds.has(payment.leaseId));

      return {
        property: item.property,
        units: item.units,
        occupiedUnits: item.units.filter((unit) => unit.status === "occupied").length,
        activeLeases: activeLeases.length,
        paidAmount: relatedPayments
          .filter((payment) => payment.status === "paid")
          .reduce((sum, payment) => sum + payment.amount, 0),
        pendingAmount: relatedPayments
          .filter((payment) => payment.status === "pending" || payment.status === "overdue")
          .reduce((sum, payment) => sum + payment.amount, 0)
      };
    })
    .sort((left, right) => left.property.name.localeCompare(right.property.name));

  const monthlyIncomeMap = new Map<string, number>();
  for (const payment of bundle.payments) {
    if (payment.status !== "paid") {
      continue;
    }

    const period = payment.chargePeriod ?? payment.dueDate.slice(0, 7);
    monthlyIncomeMap.set(period, (monthlyIncomeMap.get(period) ?? 0) + payment.amount);
  }

  const monthlyIncomeRows = [...monthlyIncomeMap.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([period, amount]) => ({
      period,
      label: monthLabel(period),
      amount
    }));

  const primaryCurrencyCode =
    bundle.payments[0]?.currencyCode ?? bundle.leases[0]?.currencyCode ?? bundle.properties[0]?.units[0]?.currencyCode ?? "USD";

  return {
    primaryCurrencyCode,
    propertyRows,
    paymentRows,
    monthlyIncomeRows,
    propertyCount: bundle.properties.length,
    unitCount: bundle.properties.reduce((sum, item) => sum + item.units.length, 0),
    occupiedUnitCount: bundle.properties.reduce(
      (sum, item) => sum + item.units.filter((unit) => unit.status === "occupied").length,
      0
    ),
    activeLeaseCount: bundle.leases.filter((lease) => lease.status === "active").length,
    paidAmount: bundle.payments
      .filter((payment) => payment.status === "paid")
      .reduce((sum, payment) => sum + payment.amount, 0),
    pendingAmount: bundle.payments
      .filter((payment) => payment.status === "pending")
      .reduce((sum, payment) => sum + payment.amount, 0),
    overdueAmount: bundle.payments
      .filter((payment) => payment.status === "overdue")
      .reduce((sum, payment) => sum + payment.amount, 0)
  };
}