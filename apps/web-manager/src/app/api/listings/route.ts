import { parseUpsertListingInput } from "@hhousing/api-contracts";
import { logOperatorAuditEvent } from "../../../api/audit-log";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import { createId, createListingRepo, createRepositoryFromEnv, jsonResponse, parseJsonBody } from "../shared";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../api/shared";

export async function POST(request: Request): Promise<Response> {
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

  const sessionResult = requireOperatorSession(await extractAuthSessionFromCookies());
  if (!sessionResult.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(sessionResult.code), sessionResult);
  }

  const parsed = parseUpsertListingInput(body);
  if (!parsed.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(parsed.code), parsed);
  }

  if (parsed.data.organizationId !== sessionResult.data.organizationId) {
    return jsonResponse(403, {
      success: false,
      code: "FORBIDDEN",
      error: "Organization mismatch"
    });
  }

  const propertyRepoResult = createRepositoryFromEnv();
  if (!propertyRepoResult.success) {
    return jsonResponse(500, propertyRepoResult);
  }

  const property = await propertyRepoResult.data.getPropertyById(
    parsed.data.propertyId,
    parsed.data.organizationId
  );
  const unit = await propertyRepoResult.data.getUnitById(parsed.data.unitId, parsed.data.organizationId);

  if (!property || !unit || unit.propertyId !== property.id) {
    return jsonResponse(404, {
      success: false,
      code: "NOT_FOUND",
      error: "Property or unit not found"
    });
  }

  if (parsed.data.status === "published" && unit.status !== "vacant") {
    return jsonResponse(422, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Only vacant units can be published"
    });
  }

  const listingRepo = createListingRepo();
  const existing = await listingRepo.getListingByUnitId(parsed.data.unitId, parsed.data.organizationId);
  const nowIso = new Date().toISOString();
  const listing = await listingRepo.upsertListing({
    id: existing?.id ?? createId("lst"),
    organizationId: parsed.data.organizationId,
    propertyId: parsed.data.propertyId,
    unitId: parsed.data.unitId,
    status: parsed.data.status,
    marketingDescription: parsed.data.marketingDescription ?? null,
    coverImageUrl: parsed.data.coverImageUrl ?? null,
    galleryImageUrls: parsed.data.galleryImageUrls ?? [],
    youtubeUrl: parsed.data.youtubeUrl ?? null,
    instagramUrl: parsed.data.instagramUrl ?? null,
    contactEmail: parsed.data.contactEmail ?? null,
    contactPhone: parsed.data.contactPhone ?? null,
    isFeatured: false,
    showAddress: parsed.data.showAddress ?? false,
    showRent: parsed.data.showRent ?? true,
    showDeposit: parsed.data.showDeposit ?? true,
    showAmenities: parsed.data.showAmenities ?? true,
    showFeatures: parsed.data.showFeatures ?? true,
    showBedrooms: parsed.data.showBedrooms ?? true,
    showBathrooms: parsed.data.showBathrooms ?? true,
    showSizeSqm: parsed.data.showSizeSqm ?? true,
    publishedAtIso: parsed.data.status === "published"
      ? existing?.publishedAtIso ?? nowIso
      : null,
    createdByUserId: existing?.createdByUserId ?? sessionResult.data.userId,
    updatedByUserId: sessionResult.data.userId
  });

  await logOperatorAuditEvent({
    organizationId: sessionResult.data.organizationId,
    actorMemberId: sessionResult.data.memberships.find((membership) => membership.organizationId === sessionResult.data.organizationId)?.id ?? null,
    actionKey: existing ? "operations.listing.updated" : "operations.listing.created",
    entityType: "listing",
    entityId: listing.id,
    metadata: {
      propertyId: listing.propertyId,
      unitId: listing.unitId,
      status: listing.status
    }
  });

  return jsonResponse(existing ? 200 : 201, {
    success: true,
    data: listing
  });
}