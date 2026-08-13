import { createMarketplaceRepo, createId, jsonResponse, parseJsonBody } from "../../shared";
import { extractUserIdFromRequest } from "../../../../auth/session-adapter";
import { mapErrorCodeToHttpStatus } from "../../../../api/shared";

export async function GET(request: Request): Promise<Response> {
  const userId = await extractUserIdFromRequest(request);
  if (!userId) {
    return jsonResponse(401, {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });
  }

  const repo = createMarketplaceRepo();
  let profile = await repo.getProfileByUserId(userId);
  if (!profile) {
    profile = await repo.upsertProfile({ userId });
  }
  const preferences = await repo.getMarketingPreferences(userId);

  return jsonResponse(200, {
    success: true,
    data: { profile, preferences }
  });
}

export async function POST(request: Request): Promise<Response> {
  const userId = await extractUserIdFromRequest(request);
  if (!userId) {
    return jsonResponse(401, {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await parseJsonBody(request)) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const repo = createMarketplaceRepo();
  const profile = await repo.upsertProfile({
    userId,
    fullName: typeof body.fullName === "string" ? body.fullName : null,
    phone: typeof body.phone === "string" ? body.phone : null,
    email: typeof body.email === "string" ? body.email : null
  });

  await repo.upsertMarketingPreferences({
    userId,
    emailNewListings: body.emailNewListings === true,
    emailHarakaNews: body.emailHarakaNews === true || body.emailNewListings === true
  });

  return jsonResponse(201, {
    success: true,
    data: { profile, id: createId("mp") }
  });
}

export async function PATCH(request: Request): Promise<Response> {
  const userId = await extractUserIdFromRequest(request);
  if (!userId) {
    return jsonResponse(401, {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await parseJsonBody(request)) as Record<string, unknown>;
  } catch {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be valid JSON"
    });
  }

  const repo = createMarketplaceRepo();
  await repo.upsertProfile({
    userId,
    fullName: typeof body.fullName === "string" ? body.fullName : undefined,
    phone: typeof body.phone === "string" ? body.phone : undefined,
    email: typeof body.email === "string" ? body.email : undefined
  });

  if (
    typeof body.emailNewListings === "boolean" ||
    typeof body.emailHarakaNews === "boolean" ||
    typeof body.whatsappNewListings === "boolean"
  ) {
    await repo.upsertMarketingPreferences({
      userId,
      emailNewListings: body.emailNewListings === true,
      emailHarakaNews: body.emailHarakaNews === true,
      whatsappNewListings: body.whatsappNewListings === true,
      whatsappPhone: typeof body.whatsappPhone === "string" ? body.whatsappPhone : null
    });
  }

  const profile = await repo.getProfileByUserId(userId);
  const preferences = await repo.getMarketingPreferences(userId);

  return jsonResponse(200, {
    success: true,
    data: { profile, preferences }
  });
}
