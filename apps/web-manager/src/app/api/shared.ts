import type { ApiResult } from "@hhousing/api-contracts";
import {
  createOrganizationPropertyUnitRepositoryFromEnv,
  createTenantLeaseRepositoryFromEnv,
  type OrganizationPropertyUnitRepository,
  type TenantLeaseRepository
} from "@hhousing/data-access";

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}

export function createId(prefix: string): string {
  return `${prefix}_${Date.now()}`;
}

export function parseJsonBody(request: Request): Promise<unknown> {
  return request.json();
}

export function createRepositoryFromEnv(): ApiResult<OrganizationPropertyUnitRepository> {
  return createOrganizationPropertyUnitRepositoryFromEnv(process.env);
}

export function createTenantLeaseRepo(): TenantLeaseRepository {
  return createTenantLeaseRepositoryFromEnv(process.env);
}
