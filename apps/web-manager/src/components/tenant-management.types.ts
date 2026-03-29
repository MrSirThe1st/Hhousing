import type { PropertyWithUnitsView, LeaseWithTenantView } from "@hhousing/api-contracts";
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
  organizationId: string;
  leases: LeaseWithTenantView[];
  tenants: Tenant[];
  properties: PropertyWithUnitsView[];
}

export interface LeaseFormState {
  tenantId: string;
  unitId: string;
  startDate: string;
  endDate: string;
  monthlyRentAmount: string;
  currencyCode: string;
}