import type { AuthSession, LeaseWithTenantView, ManagerConversationListItem } from "@hhousing/api-contracts";
import {
  createOrganizationPropertyUnitRepositoryFromEnv,
  createTenantLeaseRepositoryFromEnv,
  type PropertyWithUnitsRecord
} from "@hhousing/data-access";
import type { Document, MaintenanceRequest, Payment, Tenant } from "@hhousing/domain";
import { getServerOperatorContext } from "./operator-context";
import type { OperatorScope } from "./operator-context.types";

export interface ScopedPortfolioData {
  currentScope: OperatorScope;
  properties: PropertyWithUnitsRecord[];
  propertyIds: Set<string>;
  unitIds: Set<string>;
  leases: LeaseWithTenantView[];
  leaseIds: Set<string>;
  tenantIds: Set<string>;
}

export async function getScopedPortfolioData(session: AuthSession): Promise<ScopedPortfolioData> {
  const operatorContext = await getServerOperatorContext(session);
  const propertyRepository = createOrganizationPropertyUnitRepositoryFromEnv(process.env);

  if (!propertyRepository.success) {
    throw new Error(propertyRepository.error);
  }

  const leaseRepository = createTenantLeaseRepositoryFromEnv(process.env);

  const [properties, allLeases] = await Promise.all([
    propertyRepository.data.listPropertiesWithUnits(session.organizationId, operatorContext.currentScope),
    leaseRepository.listLeasesByOrganization(session.organizationId)
  ]);

  const propertyIds = new Set(properties.map((item) => item.property.id));
  const unitIds = new Set(properties.flatMap((item) => item.units.map((unit) => unit.id)));
  const leases = allLeases.filter((lease) => unitIds.has(lease.unitId));
  const leaseIds = new Set(leases.map((lease) => lease.id));
  const tenantIds = new Set(leases.map((lease) => lease.tenantId));

  return {
    currentScope: operatorContext.currentScope,
    properties,
    propertyIds,
    unitIds,
    leases,
    leaseIds,
    tenantIds
  };
}

export function filterTenantsByScope(tenants: Tenant[], scoped: ScopedPortfolioData): Tenant[] {
  return tenants.filter((tenant) => scoped.tenantIds.has(tenant.id));
}

export function filterLeasesByScope(leases: LeaseWithTenantView[], scoped: ScopedPortfolioData): LeaseWithTenantView[] {
  return leases.filter((lease) => scoped.unitIds.has(lease.unitId));
}

export function filterPaymentsByScope(payments: Payment[], scoped: ScopedPortfolioData): Payment[] {
  return payments.filter((payment) => scoped.leaseIds.has(payment.leaseId));
}

export function filterMaintenanceRequestsByScope(
  requests: MaintenanceRequest[],
  scoped: ScopedPortfolioData
): MaintenanceRequest[] {
  return requests.filter((request) => scoped.unitIds.has(request.unitId));
}

export function filterManagerConversationsByScope(
  conversations: ManagerConversationListItem[],
  scoped: ScopedPortfolioData
): ManagerConversationListItem[] {
  return conversations.filter((conversation) => scoped.propertyIds.has(conversation.propertyId));
}

export function filterDocumentsByScope(documents: Document[], scoped: ScopedPortfolioData): Document[] {
  return documents.filter((document) => {
    if (document.attachmentType === null || document.attachmentId === null) {
      return true;
    }

    if (document.attachmentType === "property") {
      return scoped.propertyIds.has(document.attachmentId);
    }

    if (document.attachmentType === "unit") {
      return scoped.unitIds.has(document.attachmentId);
    }

    if (document.attachmentType === "lease") {
      return scoped.leaseIds.has(document.attachmentId);
    }

    if (document.attachmentType === "tenant") {
      return scoped.tenantIds.has(document.attachmentId);
    }

    return false;
  });
}

export function isDocumentAttachmentInScope(
  attachmentType: Document["attachmentType"],
  attachmentId: string | null,
  scoped: ScopedPortfolioData
): boolean {
  if (attachmentType === null || attachmentId === null) {
    return true;
  }

  if (attachmentType === "property") {
    return scoped.propertyIds.has(attachmentId);
  }

  if (attachmentType === "unit") {
    return scoped.unitIds.has(attachmentId);
  }

  if (attachmentType === "lease") {
    return scoped.leaseIds.has(attachmentId);
  }

  return scoped.tenantIds.has(attachmentId);
}