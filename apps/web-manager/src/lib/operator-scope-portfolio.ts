import type { AuthSession, LeaseWithTenantView, ManagerConversationListItem } from "@hhousing/api-contracts";
import {
  createOrganizationPropertyUnitRepositoryFromEnv,
  createTenantLeaseRepositoryFromEnv,
  type PropertyWithUnitsRecord
} from "@hhousing/data-access";
import type { CalendarEvent, Document, Expense, MaintenanceRequest, Payment, Task, Tenant } from "@hhousing/domain";

export interface ScopedPortfolioData {
  properties: PropertyWithUnitsRecord[];
  propertyIds: Set<string>;
  ownerIds: Set<string>;
  unitIds: Set<string>;
  leases: LeaseWithTenantView[];
  leaseIds: Set<string>;
  tenantIds: Set<string>;
}

export async function getScopedPortfolioData(session: AuthSession): Promise<ScopedPortfolioData> {
  const propertyRepository = createOrganizationPropertyUnitRepositoryFromEnv(process.env);

  if (!propertyRepository.success) {
    throw new Error(propertyRepository.error);
  }

  const leaseRepository = createTenantLeaseRepositoryFromEnv(process.env);

  const [properties, owners, allLeases] = await Promise.all([
    propertyRepository.data.listPropertiesWithUnits(session.organizationId),
    propertyRepository.data.listOwners(session.organizationId),
    leaseRepository.listLeasesByOrganization(session.organizationId)
  ]);

  const propertyIds = new Set(properties.map((item) => item.property.id));
  const ownerIds = new Set(owners.map((owner) => owner.id));
  const unitIds = new Set(properties.flatMap((item) => item.units.map((unit) => unit.id)));
  const leases = allLeases.filter((lease) => unitIds.has(lease.unitId));
  const leaseIds = new Set(leases.map((lease) => lease.id));
  const tenantIds = new Set(leases.map((lease) => lease.tenantId));

  return {
    properties,
    propertyIds,
    ownerIds,
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

export function filterExpensesByScope(expenses: Expense[], scoped: ScopedPortfolioData): Expense[] {
  return expenses.filter((expense) => {
    if (expense.propertyId !== null && !scoped.propertyIds.has(expense.propertyId)) {
      return false;
    }

    if (expense.unitId !== null && !scoped.unitIds.has(expense.unitId)) {
      return false;
    }

    return true;
  });
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

    if (document.attachmentType === "owner") {
      return scoped.ownerIds.has(document.attachmentId);
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

  if (attachmentType === "owner") {
    return scoped.ownerIds.has(attachmentId);
  }

  return scoped.tenantIds.has(attachmentId);
}

function isWorkflowRecordInScope(
  record: { propertyId: string | null; unitId: string | null; leaseId: string | null; tenantId: string | null },
  scoped: ScopedPortfolioData
): boolean {
  if (record.propertyId !== null) {
    return scoped.propertyIds.has(record.propertyId);
  }

  if (record.unitId !== null) {
    return scoped.unitIds.has(record.unitId);
  }

  if (record.leaseId !== null) {
    return scoped.leaseIds.has(record.leaseId);
  }

  if (record.tenantId !== null) {
    return scoped.tenantIds.has(record.tenantId);
  }

  return true;
}

export function filterTasksByScope(tasks: Task[], scoped: ScopedPortfolioData): Task[] {
  return tasks.filter((task) => isWorkflowRecordInScope(task, scoped));
}

export function filterCalendarEventsByScope(events: CalendarEvent[], scoped: ScopedPortfolioData): CalendarEvent[] {
  return events.filter((event) => isWorkflowRecordInScope(event, scoped));
}