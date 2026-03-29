import type { PropertyWithUnitsView } from "@hhousing/api-contracts";

export interface PropertyManagementPanelProps {
  organizationId: string;
  items: PropertyWithUnitsView[];
}

export interface PropertyFormState {
  name: string;
  address: string;
  city: string;
  countryCode: string;
}

export interface UnitFormState {
  propertyId: string;
  unitNumber: string;
  monthlyRentAmount: string;
  currencyCode: string;
}
