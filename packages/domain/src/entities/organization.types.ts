export type OrganizationStatus = "active" | "suspended";

export interface Organization {
  id: string;
  name: string;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  websiteUrl: string | null;
  address: string | null;
  emailSignature: string | null;
  status: OrganizationStatus;
  createdAtIso: string;
  registrationNumber?: string | null;
  vatNumber?: string | null;
  capital?: string | null;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}
