import type { PropertyWithUnitsView } from "@hhousing/api-contracts";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import type { Tenant } from "@hhousing/domain";
import { buildLeasePropertyLabel } from "../whatsapp/lease-documents";

export function resolveDocumentCommunicationPropertyLabel(input: {
  lease: LeaseWithTenantView | null;
  properties: PropertyWithUnitsView[];
}): string {
  if (!input.lease) {
    return "Votre logement";
  }

  const propertyRecord = input.properties.find((propertyItem) =>
    propertyItem.units.some((unit) => unit.id === input.lease?.unitId)
  );
  const unitRecord = propertyRecord?.units.find((unit) => unit.id === input.lease?.unitId) ?? null;

  return buildLeasePropertyLabel({
    propertyName: propertyRecord?.property.name,
    unitNumber: unitRecord?.unitNumber
  });
}

export function resolveDocumentCommunicationTenant(input: {
  tenant: Tenant | null;
  lease: LeaseWithTenantView | null;
  recipientEmail: string;
}): {
  tenantId: string | null;
  tenantFullName: string;
  tenantPhone: string | null;
  tenantWhatsappNumber: string | null;
  tenantWhatsappOptIn: boolean;
} {
  if (input.tenant) {
    return {
      tenantId: input.tenant.id,
      tenantFullName: input.tenant.fullName,
      tenantPhone: input.tenant.phone,
      tenantWhatsappNumber: input.tenant.whatsappNumber,
      tenantWhatsappOptIn: input.tenant.whatsappOptIn
    };
  }

  if (input.lease) {
    return {
      tenantId: input.lease.tenantId,
      tenantFullName: input.lease.tenantFullName,
      tenantPhone: null,
      tenantWhatsappNumber: null,
      tenantWhatsappOptIn: false
    };
  }

  return {
    tenantId: null,
    tenantFullName: input.recipientEmail,
    tenantPhone: null,
    tenantWhatsappNumber: null,
    tenantWhatsappOptIn: false
  };
}
