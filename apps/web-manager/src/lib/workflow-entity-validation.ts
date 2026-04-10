import type { AuthSession, LeaseWithTenantView } from "@hhousing/api-contracts";
import type { Tenant } from "@hhousing/domain";
import { getScopedPortfolioData } from "./operator-scope-portfolio";

export interface WorkflowEntitySelection {
  propertyId: string | null;
  unitId: string | null;
  leaseId: string | null;
  tenantId: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
}

export interface WorkflowEntityValidationResult {
  ok: boolean;
  status?: number;
  code?: string;
  error?: string;
}

export function createRelatedOptions(
  scopedPortfolio: Awaited<ReturnType<typeof getScopedPortfolioData>>,
  tenants: Tenant[]
): Array<{ type: "property" | "unit" | "lease" | "tenant"; id: string; label: string; propertyId?: string | null; unitId?: string | null; leaseId?: string | null; tenantId?: string | null }> {
  const propertyOptions = scopedPortfolio.properties.map((item) => ({
    type: "property" as const,
    id: item.property.id,
    label: item.property.name,
    propertyId: item.property.id
  }));

  const unitOptions = scopedPortfolio.properties.flatMap((item) =>
    item.units.map((unit) => ({
      type: "unit" as const,
      id: unit.id,
      label: `${item.property.name} · Unité ${unit.unitNumber}`,
      propertyId: item.property.id,
      unitId: unit.id
    }))
  );

  const leaseOptions = scopedPortfolio.leases.map((lease: LeaseWithTenantView) => ({
    type: "lease" as const,
    id: lease.id,
    label: `${lease.tenantFullName} · Bail ${lease.startDate}`,
    leaseId: lease.id,
    unitId: lease.unitId,
    tenantId: lease.tenantId
  }));

  const tenantOptions = tenants.map((tenant) => ({
    type: "tenant" as const,
    id: tenant.id,
    label: tenant.fullName,
    tenantId: tenant.id
  }));

  return [...propertyOptions, ...unitOptions, ...leaseOptions, ...tenantOptions];
}

export async function validateWorkflowEntitySelection(
  session: AuthSession,
  selection: WorkflowEntitySelection
): Promise<WorkflowEntityValidationResult> {
  const scopedPortfolio = await getScopedPortfolioData(session);

  if (selection.propertyId !== null && !scopedPortfolio.propertyIds.has(selection.propertyId)) {
    return { ok: false, status: 404, code: "NOT_FOUND", error: "Property not found" };
  }

  if (selection.unitId !== null) {
    if (selection.propertyId === null) {
      return { ok: false, status: 400, code: "VALIDATION_ERROR", error: "unitId requires propertyId" };
    }

    const propertyRecord = scopedPortfolio.properties.find((item) => item.property.id === selection.propertyId);
    const hasUnit = propertyRecord?.units.some((unit) => unit.id === selection.unitId) ?? false;
    if (!hasUnit) {
      return { ok: false, status: 404, code: "NOT_FOUND", error: "Unit not found" };
    }
  }

  if (selection.leaseId !== null && !scopedPortfolio.leaseIds.has(selection.leaseId)) {
    return { ok: false, status: 404, code: "NOT_FOUND", error: "Lease not found" };
  }

  if (selection.tenantId !== null && !scopedPortfolio.tenantIds.has(selection.tenantId)) {
    return { ok: false, status: 404, code: "NOT_FOUND", error: "Tenant not found" };
  }

  if (selection.relatedEntityType === null || selection.relatedEntityType === "custom") {
    return { ok: true };
  }

  if (selection.relatedEntityType === "property") {
    return selection.relatedEntityId === selection.propertyId
      ? { ok: true }
      : { ok: false, status: 400, code: "VALIDATION_ERROR", error: "relatedEntityId must match propertyId" };
  }

  if (selection.relatedEntityType === "unit") {
    return selection.relatedEntityId === selection.unitId
      ? { ok: true }
      : { ok: false, status: 400, code: "VALIDATION_ERROR", error: "relatedEntityId must match unitId" };
  }

  if (selection.relatedEntityType === "lease") {
    return selection.relatedEntityId === selection.leaseId
      ? { ok: true }
      : { ok: false, status: 400, code: "VALIDATION_ERROR", error: "relatedEntityId must match leaseId" };
  }

  if (selection.relatedEntityType === "tenant") {
    return selection.relatedEntityId === selection.tenantId
      ? { ok: true }
      : { ok: false, status: 400, code: "VALIDATION_ERROR", error: "relatedEntityId must match tenantId" };
  }

  return {
    ok: false,
    status: 400,
    code: "VALIDATION_ERROR",
    error: "Unsupported relatedEntityType for manual workflow items"
  };
}