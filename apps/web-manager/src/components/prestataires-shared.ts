import type { ServiceProviderWithCategory } from "@hhousing/api-contracts";

export type PrestatairesPropertyOption = { id: string; name: string };

export type PrestatairesAssignment = {
  propertyId: string;
  serviceProviderId: string;
  createdAtIso: string;
};

export function isPlatformVerified(provider: ServiceProviderWithCategory): boolean {
  return provider.isVerified || provider.organizationId === null;
}

export function assignedIdsForProperty(
  assignments: PrestatairesAssignment[],
  propertyId: string
): Set<string> {
  return new Set(
    assignments
      .filter((item) => item.propertyId === propertyId)
      .map((item) => item.serviceProviderId)
  );
}
