export type PropertyStatus = "active" | "archived";

export interface Property {
  id: string;
  organizationId: string;
  name: string;
  address: string;
  city: string;
  countryCode: string;
  status: PropertyStatus;
  createdAtIso: string;
}
