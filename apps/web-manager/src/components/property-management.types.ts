import type { Owner } from "@hhousing/domain";
import type { PropertyWithUnitsView } from "@hhousing/api-contracts";

export interface PropertyManagementPanelProps {
  organizationId: string;
  items: PropertyWithUnitsView[];
}

export interface PropertyOwnerOption extends Owner {
  isDefault?: boolean;
}

export interface PropertyFormState {
  name: string;
  address: string;
  city: string;
  countryCode: string;
  clientId: string;
  propertyType: "single_unit" | "multi_unit";
  yearBuilt: string;
  monthlyRentAmount: string;
  depositAmount: string;
  currencyCode: string;
  bedroomCount: string;
  bathroomCount: string;
  sizeSqm: string;
  unitCount: string;
  amenities: string[];
  features: string[];
}

export interface UnitFormState {
  propertyId: string;
  unitNumber: string;
  monthlyRentAmount: string;
  depositAmount: string;
  currencyCode: string;
  bedroomCount: string;
  bathroomCount: string;
  sizeSqm: string;
  unitCount: string;
  amenities: string[];
  features: string[];
}
