export type ServiceProviderStatus = "active" | "suspended";

export interface ServiceProviderCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  createdAtIso: string;
}

export interface ServiceProvider {
  id: string;
  /** null = platform provider available to all landlords */
  organizationId: string | null;
  categoryId: string;
  name: string;
  phone: string;
  whatsappPhone: string | null;
  description: string | null;
  city: string | null;
  quartier: string | null;
  status: ServiceProviderStatus;
  isVerified: boolean;
  /** Org that originally created this provider (audit trail after promote) */
  createdByOrganizationId: string | null;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface PropertyServiceProvider {
  propertyId: string;
  serviceProviderId: string;
  organizationId: string;
  createdAtIso: string;
}
