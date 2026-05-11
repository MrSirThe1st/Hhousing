import { createOrganizationPropertyUnitRepositoryFromEnv, createPaymentRepositoryFromEnv, createTenantLeaseRepositoryFromEnv } from "@hhousing/data-access";
import type { LeaseWithTenantView, PropertyWithUnitsView } from "@hhousing/api-contracts";
import type { Owner, Payment } from "@hhousing/domain";
import type { OwnerPortalSession } from "./server-session";

export interface OwnerPortfolioBundle {
  owners: Owner[];
  properties: PropertyWithUnitsView[];
  leases: LeaseWithTenantView[];
  payments: Payment[];
}

export async function loadOwnerPortfolio(session: OwnerPortalSession): Promise<OwnerPortfolioBundle> {
  const propertyRepositoryResult = createOrganizationPropertyUnitRepositoryFromEnv(process.env);
  if (!propertyRepositoryResult.success) {
    throw new Error(propertyRepositoryResult.error);
  }

  const propertyRepository = propertyRepositoryResult.data;
  const leaseRepository = createTenantLeaseRepositoryFromEnv(process.env);
  const paymentRepository = createPaymentRepositoryFromEnv(process.env);

  const ownerEntries = await Promise.all(
    session.accesses.map(async (access) => {
      const owner = await propertyRepository.getOwnerById(access.ownerId, access.organizationId);
      if (!owner) {
        return null;
      }

      const properties = await propertyRepository.listPropertiesWithUnits(access.organizationId, {
        ownerId: access.ownerId
      });

      const unitIds = new Set(properties.flatMap((item) => item.units.map((unit) => unit.id)));
      const leases = leaseRepository.listLeasesByOrganizationAndUnitIds
        ? await leaseRepository.listLeasesByOrganizationAndUnitIds(access.organizationId, [...unitIds])
        : (await leaseRepository.listLeasesByOrganization(access.organizationId)).filter((lease) => unitIds.has(lease.unitId));
      const leaseIds = new Set(leases.map((lease) => lease.id));
      const payments = paymentRepository.listPaymentsByOrganizationAndLeaseIds
        ? await paymentRepository.listPaymentsByOrganizationAndLeaseIds(access.organizationId, [...leaseIds])
        : (await paymentRepository.listPayments({ organizationId: access.organizationId })).filter((payment) => leaseIds.has(payment.leaseId));

      return {
        owner,
        properties,
        leases,
        payments
      };
    })
  );

  const existingEntries = ownerEntries.filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return {
    owners: existingEntries.map((entry) => entry.owner),
    properties: existingEntries.flatMap((entry) => entry.properties),
    leases: existingEntries.flatMap((entry) => entry.leases),
    payments: existingEntries.flatMap((entry) => entry.payments)
  };
}
