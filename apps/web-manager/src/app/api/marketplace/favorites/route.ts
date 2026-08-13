import { createId, createListingRepo, createMarketplaceRepo, jsonResponse } from "../../shared";
import { extractUserIdFromRequest } from "../../../../auth/session-adapter";

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
  await repo.upsertProfile({ userId });
  const items = await repo.listSavedListings(userId);
  const ids = items.map((item) => item.saved.listingId);

  return jsonResponse(200, {
    success: true,
    data: { items, ids }
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

  let listingId: string | null = null;
  try {
    const body = (await request.json()) as { listingId?: string };
    listingId = typeof body.listingId === "string" ? body.listingId : null;
  } catch {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be valid JSON"
    });
  }

  if (!listingId) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "listingId is required"
    });
  }

  const listingRepo = createListingRepo();
  const listing = await listingRepo.getPublicListingById(listingId);
  if (!listing) {
    return jsonResponse(404, {
      success: false,
      code: "NOT_FOUND",
      error: "Listing not found or unavailable"
    });
  }

  const repo = createMarketplaceRepo();
  await repo.upsertProfile({ userId });
  const saved = await repo.saveListing(createId("saved"), userId, listingId);

  return jsonResponse(201, {
    success: true,
    data: saved
  });
}

export async function DELETE(request: Request): Promise<Response> {
  const userId = await extractUserIdFromRequest(request);
  if (!userId) {
    return jsonResponse(401, {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });
  }

  const url = new URL(request.url);
  const listingId = url.searchParams.get("listingId");
  if (!listingId) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "listingId is required"
    });
  }

  const repo = createMarketplaceRepo();
  const removed = await repo.unsaveListing(userId, listingId);

  return jsonResponse(200, {
    success: true,
    data: { removed }
  });
}
