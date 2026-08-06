import type {
  PropertyServiceProvider,
  ServiceProvider,
  ServiceProviderCategory,
  ServiceProviderStatus
} from "@hhousing/domain";

export interface CreateServiceProviderCategoryInput {
  name: string;
  slug: string;
  sortOrder?: number;
}

export interface UpdateServiceProviderCategoryInput {
  name?: string;
  slug?: string;
  sortOrder?: number;
}

export interface CreateServiceProviderInput {
  categoryId: string;
  name: string;
  phone: string;
  whatsappPhone?: string | null;
  description?: string | null;
  city?: string | null;
  quartier?: string | null;
  /** Admin-only: create as platform provider */
  isPlatform?: boolean;
  isVerified?: boolean;
}

export interface UpdateServiceProviderInput {
  categoryId?: string;
  name?: string;
  phone?: string;
  whatsappPhone?: string | null;
  description?: string | null;
  city?: string | null;
  quartier?: string | null;
  isVerified?: boolean;
}

export interface ListServiceProvidersFilter {
  organizationId?: string | null;
  platformOnly?: boolean;
  includePlatform?: boolean;
  categoryId?: string;
  status?: ServiceProviderStatus;
}

export interface AssignServiceProviderInput {
  propertyId: string;
  serviceProviderId: string;
}

export type UnassignServiceProviderInput = AssignServiceProviderInput;

export type ServiceProviderWithCategory = ServiceProvider & {
  categoryName: string;
  categorySlug: string;
};

export type ListServiceProviderCategoriesOutput = ServiceProviderCategory[];
export type ListServiceProvidersOutput = ServiceProviderWithCategory[];
export type CreateServiceProviderOutput = ServiceProvider;
export type UpdateServiceProviderOutput = ServiceProvider;
export type GetServiceProviderOutput = ServiceProviderWithCategory;
export type { PropertyServiceProvider, ServiceProvider, ServiceProviderCategory, ServiceProviderStatus };
