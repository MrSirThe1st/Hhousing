import type { AuthSession, ListingApplicationView, ManagerConversationListItem } from "@hhousing/api-contracts";
import type { MaintenanceRequest, Payment } from "@hhousing/domain";
import { createRepositoryFromEnv, createListingRepo, createMaintenanceRepo, createMessageRepo, createPaymentRepo, createTenantLeaseRepo } from "../app/api/shared";

export interface SidebarBadgeCounts {
  listings: number;
  payments: number;
  maintenance: number;
  messages: number;
}

function createEmptyCounts(): SidebarBadgeCounts {
  return {
    listings: 0,
    payments: 0,
    maintenance: 0,
    messages: 0
  };
}

function isPaymentOverdue(payment: Payment, todayIsoDate: string): boolean {
  return payment.status === "overdue" || (payment.status === "pending" && payment.dueDate < todayIsoDate);
}

function isActiveMaintenanceRequest(request: MaintenanceRequest): boolean {
  return request.status === "open" || request.status === "in_progress";
}

export async function getSidebarBadgeCounts(session: AuthSession): Promise<SidebarBadgeCounts> {
  if (!session.organizationId) {
    return createEmptyCounts();
  }

  const propertyRepoResult = createRepositoryFromEnv();
  if (!propertyRepoResult.success) {
    return createEmptyCounts();
  }

  const listingRepo = createListingRepo();
  const paymentRepo = createPaymentRepo();
  const maintenanceRepo = createMaintenanceRepo();
  const messageRepo = createMessageRepo();
  const tenantLeaseRepo = createTenantLeaseRepo();

  try {
    const [properties, leases, applicationsResult, paymentsResult, maintenanceResult, conversationsResult] = await Promise.all([
      propertyRepoResult.data.listPropertiesWithUnits(session.organizationId),
      tenantLeaseRepo.listLeasesByOrganization(session.organizationId),
      listingRepo.listApplications(session.organizationId),
      paymentRepo.listPayments({ organizationId: session.organizationId }),
      maintenanceRepo.listMaintenanceRequests({ organizationId: session.organizationId }),
      messageRepo.listManagerConversations({ organizationId: session.organizationId })
    ]);

    const propertyIds = new Set(properties.map((item) => item.property.id));
    const unitIds = new Set(properties.flatMap((item) => item.units.map((unit) => unit.id)));
    const leaseIds = new Set(
      leases
        .filter((lease) => unitIds.has(lease.unitId))
        .map((lease) => lease.id)
    );
    const todayIsoDate = new Date().toISOString().slice(0, 10);

    const listings = (applicationsResult as ListingApplicationView[]).filter(
      (item) => item.application.status !== "converted"
    ).length;
    const payments = (paymentsResult as Payment[]).filter(
      (payment) => leaseIds.has(payment.leaseId) && isPaymentOverdue(payment, todayIsoDate)
    ).length;
    const maintenance = (maintenanceResult as MaintenanceRequest[]).filter(
      (request) => unitIds.has(request.unitId) && isActiveMaintenanceRequest(request)
    ).length;
    const messages = (conversationsResult as ManagerConversationListItem[])
      .filter((conversation) => propertyIds.has(conversation.propertyId))
      .reduce((total, conversation) => total + conversation.unreadCount, 0);

    return {
      listings,
      payments,
      maintenance,
      messages
    };
  } catch {
    return createEmptyCounts();
  }
}