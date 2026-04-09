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
}
