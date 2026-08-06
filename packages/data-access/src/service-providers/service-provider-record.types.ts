import type {
  ServiceProvider,
  ServiceProviderCategory,
  ServiceProviderStatus
} from "@hhousing/domain";
import type { ServiceProviderWithCategory } from "@hhousing/api-contracts";

export interface CreateServiceProviderCategoryRecordInput {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface UpdateServiceProviderCategoryRecordInput {
  id: string;
  name?: string;
  slug?: string;
  sortOrder?: number;
}

export interface CreateServiceProviderRecordInput {
  id: string;
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
  createdByOrganizationId: string | null;
}

export interface UpdateServiceProviderRecordInput {
  id: string;
  /** When set, restricts update to this org's private providers. Omit for admin. */
  organizationId?: string | null;
  categoryId?: string;
  name?: string;
  phone?: string;
  whatsappPhone?: string | null;
  description?: string | null;
  city?: string | null;
  quartier?: string | null;
  isVerified?: boolean;
}

export interface ListServiceProvidersRecordFilter {
  organizationId?: string | null;
  platformOnly?: boolean;
  includePlatform?: boolean;
  categoryId?: string;
  status?: ServiceProviderStatus;
  search?: string;
  verifiedOnly?: boolean;
  landlordOnly?: boolean;
}

export interface AssignServiceProviderRecordInput {
  propertyId: string;
  serviceProviderId: string;
  organizationId: string;
}

export type ServiceProviderAdminListItem = ServiceProviderWithCategory & {
  organizationName: string | null;
};

export interface ServiceProviderVisibilityStats {
  landlordCount: number;
  propertyCount: number;
}

export interface ServiceProviderCategoryWithCount extends ServiceProviderCategory {
  providerCount: number;
}

export interface ServiceProviderRepository {
  listCategories(): Promise<ServiceProviderCategory[]>;
  listCategoriesWithCounts(): Promise<ServiceProviderCategoryWithCount[]>;
  getCategoryById(id: string): Promise<ServiceProviderCategory | null>;
  createCategory(input: CreateServiceProviderCategoryRecordInput): Promise<ServiceProviderCategory>;
  updateCategory(input: UpdateServiceProviderCategoryRecordInput): Promise<ServiceProviderCategory | null>;
  deleteCategory(id: string): Promise<boolean>;

  listProviders(filter: ListServiceProvidersRecordFilter): Promise<ServiceProviderAdminListItem[]>;
  getProviderById(id: string): Promise<ServiceProviderAdminListItem | null>;
  getProviderVisibilityStats(providerId: string): Promise<ServiceProviderVisibilityStats>;
  createProvider(input: CreateServiceProviderRecordInput): Promise<ServiceProvider>;
  updateProvider(input: UpdateServiceProviderRecordInput): Promise<ServiceProvider | null>;
  setProviderStatus(id: string, status: ServiceProviderStatus): Promise<ServiceProvider | null>;
  promoteProvider(id: string): Promise<ServiceProvider | null>;
  deleteProvider(id: string, organizationId?: string): Promise<boolean>;

  listAssignedProviderIdsForProperty(propertyId: string): Promise<string[]>;
  listActiveProvidersForProperty(propertyId: string): Promise<ServiceProviderWithCategory[]>;
  listAssignmentsForOrganization(organizationId: string): Promise<
    Array<{ propertyId: string; serviceProviderId: string; createdAtIso: string }>
  >;
  assignProvider(input: AssignServiceProviderRecordInput): Promise<void>;
  unassignProvider(propertyId: string, serviceProviderId: string, organizationId: string): Promise<boolean>;
}
