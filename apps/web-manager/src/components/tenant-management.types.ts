import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import type { Tenant } from "@hhousing/domain";

export interface TenantListItem {
  tenant: Tenant;
  hasLease: boolean;
}

export interface TenantManagementPanelProps {
  organizationId: string;
  tenants: TenantListItem[];
}

export interface TenantFormState {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  employmentStatus: string;
  jobTitle: string;
  monthlyIncome: string;
  numberOfOccupants: string;
}

export interface LeaseManagementPanelProps {
  leases: LeaseWithTenantView[];
}