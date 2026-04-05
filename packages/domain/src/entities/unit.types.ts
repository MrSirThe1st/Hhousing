export type UnitStatus = "vacant" | "occupied" | "inactive";

export interface Unit {
  id: string;
  organizationId: string;
  propertyId: string;
  unitNumber: string;
  monthlyRentAmount: number;
  depositAmount: number;
  currencyCode: string;
  bedroomCount: number | null;
  bathroomCount: number | null;
  sizeSqm: number | null;
  amenities: string[];
  features: string[];
  status: UnitStatus;
  createdAtIso: string;
}
