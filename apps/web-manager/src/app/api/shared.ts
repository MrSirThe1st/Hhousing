import type { ApiResult } from "@hhousing/api-contracts";
import {
  createAuthRepositoryFromEnv,
  createOrganizationPropertyUnitRepositoryFromEnv,
  createTenantLeaseRepositoryFromEnv,
  createPaymentRepositoryFromEnv,
  createExpenseRepositoryFromEnv,
  createMaintenanceRequestRepositoryFromEnv,
  createDocumentRepositoryFromEnv,
  createEmailTemplateRepositoryFromEnv,
  createMessageRepositoryFromEnv,
  createListingRepositoryFromEnv,
  createTeamFunctionsRepositoryFromEnv,
  type AuthRepository,
  type OrganizationPropertyUnitRepository,
  type TenantLeaseRepository,
  type PaymentRepository,
  type ExpenseRepository,
  type MaintenanceRequestRepository,
  type DocumentRepository,
  type EmailTemplateRepository,
  type MessageRepository,
  type ListingRepository,
  TeamFunctionsRepository
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
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function parseJsonBody(request: Request): Promise<unknown> {
  return request.json();
}

export function createRepositoryFromEnv(): ApiResult<OrganizationPropertyUnitRepository> {
  return createOrganizationPropertyUnitRepositoryFromEnv(process.env);
}

export function createAuthRepo(): AuthRepository {
  return createAuthRepositoryFromEnv(process.env);
}

export function createTenantLeaseRepo(): TenantLeaseRepository {
  return createTenantLeaseRepositoryFromEnv(process.env);
}

export function createPaymentRepo(): PaymentRepository {
  return createPaymentRepositoryFromEnv(process.env);
}

export function createExpenseRepo(): ExpenseRepository {
  return createExpenseRepositoryFromEnv(process.env);
}

export function createMaintenanceRepo(): MaintenanceRequestRepository {
  return createMaintenanceRequestRepositoryFromEnv(process.env);
}

export function createDocumentRepo(): DocumentRepository {
  return createDocumentRepositoryFromEnv(process.env);
}

export function createEmailTemplateRepo(): EmailTemplateRepository {
  return createEmailTemplateRepositoryFromEnv(process.env);
}

export function createMessageRepo(): MessageRepository {
  return createMessageRepositoryFromEnv(process.env);
}

export function createListingRepo(): ListingRepository {
  return createListingRepositoryFromEnv(process.env);
}

export function createTeamFunctionsRepo(): TeamFunctionsRepository {
  return createTeamFunctionsRepositoryFromEnv(process.env);
}
