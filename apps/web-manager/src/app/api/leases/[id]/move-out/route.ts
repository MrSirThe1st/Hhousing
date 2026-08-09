import {
  Permission,
  parseCreateMoveOutInput,
  type GetLeaseMoveOutOutput,
  type CreateMoveOutOutput
} from "@hhousing/api-contracts";
import {
  buildLeaseMoveOutView,
  createLeaseMoveOut,
  lazyApplyDueMoveOutsForLease
} from "../../../../../api/leases/move-out";
import { requirePermission } from "../../../../../api/organizations/permissions";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../../auth/session-adapter";
import { getScopedPortfolioData } from "../../../../../lib/operator-scope-portfolio";
import { createId, createPaymentRepo, createTeamFunctionsRepo, createTenantLeaseRepo, jsonResponse, parseJsonBody } from "../../../shared";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const access = requireOperatorSession(await extractAuthSessionFromCookies());

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const permissionResult = await requirePermission(
    access.data,
    Permission.VIEW_LEASE,
    createTeamFunctionsRepo()
  );
  if (!permissionResult.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(permissionResult.code), permissionResult);
  }

  const repository = createTenantLeaseRepo();
  const paymentRepository = createPaymentRepo();

  const [lease, scopedPortfolio] = await Promise.all([
    repository.getLeaseById(id, access.data.organizationId),
    getScopedPortfolioData(access.data)
  ]);

  if (!lease || !scopedPortfolio.leaseIds.has(id)) {
    return jsonResponse(404, { success: false, code: "NOT_FOUND", error: "Lease not found" });
  }

  await lazyApplyDueMoveOutsForLease(lease, repository);
  const refreshedLease = await repository.getLeaseById(id, access.data.organizationId);
  const data: GetLeaseMoveOutOutput = await buildLeaseMoveOutView(
    refreshedLease ?? lease,
    repository,
    paymentRepository
  );

  return jsonResponse(200, { success: true, data });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const access = requireOperatorSession(await extractAuthSessionFromCookies());

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const permissionResult = await requirePermission(
    access.data,
    Permission.EDIT_LEASE,
    createTeamFunctionsRepo()
  );
  if (!permissionResult.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(permissionResult.code), permissionResult);
  }

  let body: unknown;
  try {
    body = await parseJsonBody(request);
  } catch {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be valid JSON"
    });
  }

  const parsed = parseCreateMoveOutInput(body);
  if (!parsed.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(parsed.code), parsed);
  }

  const repository = createTenantLeaseRepo();
  const paymentRepository = createPaymentRepo();
  const [lease, scopedPortfolio] = await Promise.all([
    repository.getLeaseById(id, access.data.organizationId),
    getScopedPortfolioData(access.data)
  ]);

  if (!lease || !scopedPortfolio.leaseIds.has(id)) {
    return jsonResponse(404, { success: false, code: "NOT_FOUND", error: "Lease not found" });
  }

  try {
    const data: CreateMoveOutOutput = await createLeaseMoveOut(
      lease,
      parsed.data,
      access.data.userId,
      access.data.memberships.find((membership) => membership.organizationId === access.data.organizationId)?.id ?? null,
      repository,
      createId
    );

    const depositContext = (await buildLeaseMoveOutView(lease, repository, paymentRepository)).depositContext;

    return jsonResponse(200, {
      success: true,
      data: { moveOut: data.moveOut, depositContext }
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "MOVE_OUT_ALREADY_COMPLETED") {
        return jsonResponse(409, {
          success: false,
          code: "VALIDATION_ERROR",
          error: "Cette fin de location est déjà terminée."
        });
      }
      if (error.message === "MOVE_OUT_ALREADY_PLANNED") {
        return jsonResponse(409, {
          success: false,
          code: "VALIDATION_ERROR",
          error: "Une fin de location est déjà planifiée pour ce bail."
        });
      }
      if (error.message === "LEASE_NOT_ACTIVE") {
        return jsonResponse(400, {
          success: false,
          code: "VALIDATION_ERROR",
          error: "Le bail doit être actif."
        });
      }
    }

    console.error("Failed to create move-out", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Impossible d'enregistrer la fin de location"
    });
  }
}
