import { parseSubmitListingApplicationInput } from "@hhousing/api-contracts";
import { createId, createListingRepo, jsonResponse, parseJsonBody } from "../../../../shared";
import { mapErrorCodeToHttpStatus } from "../../../../../../api/shared";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
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

  const parsed = parseSubmitListingApplicationInput(body);
  if (!parsed.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(parsed.code), parsed);
  }

  const { id } = await context.params;
  const listingRepo = createListingRepo();
  const listing = await listingRepo.getPublicListingById(id);

  if (!listing) {
    return jsonResponse(404, {
      success: false,
      code: "NOT_FOUND",
      error: "Listing not found"
    });
  }

  const application = await listingRepo.createApplication({
    id: createId("app"),
    listingId: listing.listing.id,
    organizationId: listing.listing.organizationId,
    fullName: parsed.data.fullName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    employmentInfo: parsed.data.employmentInfo ?? null,
    monthlyIncome: parsed.data.monthlyIncome ?? null,
    notes: parsed.data.notes ?? null
  });

  return jsonResponse(201, {
    success: true,
    data: application
  });
}