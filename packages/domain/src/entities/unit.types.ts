export type UnitStatus = "vacant" | "occupied" | "inactive";

export interface Unit {
  id: string;
  organizationId: string;
  propertyId: string;
  unitNumber: string;
  monthlyRentAmount: number;
  currencyCode: string;
  status: UnitStatus;
  createdAtIso: string;
}
