import { extractAuthSessionFromRequest } from "../../../../auth/session-adapter";
import { mapErrorCodeToHttpStatus, requireTenantSession } from "../../../../api/shared";
import { createId, createMaintenanceRepo, createTenantLeaseRepo, jsonResponse, parseJsonBody } from "../../shared";

export async function GET(request: Request): Promise<Response> {
  const access = requireTenantSession(await extractAuthSessionFromRequest(request));

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const repository = createMaintenanceRepo();

  try {
    const requests = await repository.listMaintenanceRequestsByTenantAuthUserId(
      access.data.userId,
      access.data.organizationId
    );

    return jsonResponse(200, {
      success: true,
      data: { requests }
    });
  } catch (error) {
    console.error("Failed to fetch tenant maintenance requests", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to fetch maintenance requests"
    });
  }
}

interface SubmitMaintenanceBody {
  title: string;
  description: string;
  priority: string;
  photoUrls: string[];
}

function parseSubmitBody(
  raw: unknown
): { success: true; data: SubmitMaintenanceBody } | { success: false; error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { success: false, error: "Body must be an object" };
  }
  const obj = raw as Record<string, unknown>;
  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  const description = typeof obj.description === "string" ? obj.description.trim() : "";
  if (!title) return { success: false, error: "title is required" };
  if (!description) return { success: false, error: "description is required" };
  const rawPriority = typeof obj.priority === "string" ? obj.priority : "medium";
  const validPriorities = ["low", "medium", "high", "urgent"];
  const priority = validPriorities.includes(rawPriority) ? rawPriority : "medium";
  const rawPhotos = Array.isArray(obj.photoUrls) ? obj.photoUrls : [];
  const photoUrls = rawPhotos.filter((u): u is string => typeof u === "string").slice(0, 10);
  return { success: true, data: { title, description, priority, photoUrls } };
}

export async function POST(request: Request): Promise<Response> {
  const access = requireTenantSession(await extractAuthSessionFromRequest(request));

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const raw = await parseJsonBody(request);
  const parsed = parseSubmitBody(raw);

  if (!parsed.success) {
    return jsonResponse(400, { success: false, code: "VALIDATION_ERROR", error: parsed.error });
  }

  const leaseRepo = createTenantLeaseRepo();
  const lease = await leaseRepo.getCurrentLeaseByTenantAuthUserId(
    access.data.userId,
    access.data.organizationId
  );

  if (!lease) {
    return jsonResponse(422, {
      success: false,
      code: "NOT_FOUND",
      error: "No active lease found for this tenant"
    });
  }

  const repo = createMaintenanceRepo();

  try {
    const newRequest = await repo.createMaintenanceRequest({
      id: createId("mnt"),
      organizationId: access.data.organizationId,
      unitId: lease.unitId,
      tenantId: lease.tenantId,
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      photoUrls: parsed.data.photoUrls
    });

    return jsonResponse(201, {
      success: true,
      data: { request: newRequest }
    });
  } catch (error) {
    console.error("Failed to create maintenance request", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to create maintenance request"
    });
  }
}
