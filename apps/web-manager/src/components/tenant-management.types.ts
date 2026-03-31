import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import type { Tenant } from "@hhousing/domain";

export interface TenantManagementPanelProps {
  organizationId: string;
  tenants: Tenant[];
}

export interface TenantFormState {
  fullName: string;
  email: string;
  phone: string;
}

export interface LeaseManagementPanelProps {
  leases: LeaseWithTenantView[];
}