import {
  parseCreateListingIntentInput,
  type ApiResult,
  type AuthSession,
  type CreateListingIntentOutput,
  type UserRole
} from "@hhousing/api-contracts";
import type { ListingIntentRepository } from "@hhousing/data-access";
import { createListingIntentDraft } from "@hhousing/domain";

const ALLOWED_ROLES: readonly UserRole[] = ["manager", "owner", "admin"];

export interface CreateListingIntentServiceDeps {
  createId: () => string;
  repository: ListingIntentRepository;
}

function canCreateListingIntent(role: UserRole): boolean {
  return ALLOWED_ROLES.includes(role);
}

export async function createListingIntent(
  rawInput: unknown,
  session: AuthSession | null,
  deps: CreateListingIntentServiceDeps
): Promise<ApiResult<CreateListingIntentOutput>> {
  if (session === null) {
    return {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    };
  }

  if (!canCreateListingIntent(session.role)) {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "Role cannot create listing intent"
    };
  }

  const parsedInput = parseCreateListingIntentInput(rawInput);
  if (!parsedInput.success) {
    return parsedInput;
  }

  const draftResult = createListingIntentDraft({
    id: deps.createId(),
    title: parsedInput.data.title,
    purpose: parsedInput.data.purpose,
    priceUsd: parsedInput.data.priceUsd,
    location: parsedInput.data.location,
    createdByUserId: session.userId
  });

  if (!draftResult.ok) {
    return {
      success: false,
      code: "DOMAIN_INVALID",
      error: draftResult.reason
    };
  }

  const record = await deps.repository.create(draftResult.value);

  return {
    success: true,
    data: {
      listingId: record.id,
      status: record.status
    }
  };
}
