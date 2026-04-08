import type { ApiResult } from "../api-result.types";
import type {
  SubmitListingApplicationInput,
  UpdateListingApplicationInput,
  UpsertListingInput
} from "./listing.types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNonEmptyText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function asOptionalText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return asNonEmptyText(value);
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asOptionalBoolean(value: unknown, fallback: boolean): boolean {
  return value === undefined ? fallback : asBoolean(value) ?? fallback;
}

function asOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);

  return normalized;
}

export function parseUpsertListingInput(input: unknown): ApiResult<UpsertListingInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const organizationId = asNonEmptyText(input.organizationId);
  const propertyId = asNonEmptyText(input.propertyId);
  const unitId = asNonEmptyText(input.unitId);
  const status = input.status === "draft" || input.status === "published" ? input.status : null;
  const galleryImageUrls = input.galleryImageUrls === undefined ? [] : asStringArray(input.galleryImageUrls);

  if (organizationId === null || propertyId === null || unitId === null || status === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "organizationId, propertyId, unitId, and status are required"
    };
  }

  if (galleryImageUrls === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "galleryImageUrls must be an array of strings"
    };
  }

  const coverImageUrl = asOptionalText(input.coverImageUrl);
  if (coverImageUrl === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "coverImageUrl is required"
    };
  }

  if (galleryImageUrls.length < 1) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "galleryImageUrls must contain at least one image"
    };
  }

  return {
    success: true,
    data: {
      organizationId,
      propertyId,
      unitId,
      status,
      marketingDescription: asOptionalText(input.marketingDescription),
      coverImageUrl,
      galleryImageUrls,
      youtubeUrl: asOptionalText(input.youtubeUrl),
      instagramUrl: asOptionalText(input.instagramUrl),
      contactEmail: asOptionalText(input.contactEmail),
      contactPhone: asOptionalText(input.contactPhone),
      isFeatured: asOptionalBoolean(input.isFeatured, false),
      showAddress: asOptionalBoolean(input.showAddress, false),
      showRent: asOptionalBoolean(input.showRent, true),
      showDeposit: asOptionalBoolean(input.showDeposit, true),
      showAmenities: asOptionalBoolean(input.showAmenities, true),
      showFeatures: asOptionalBoolean(input.showFeatures, true),
      showBedrooms: asOptionalBoolean(input.showBedrooms, true),
      showBathrooms: asOptionalBoolean(input.showBathrooms, true),
      showSizeSqm: asOptionalBoolean(input.showSizeSqm, true)
    }
  };
}

export function parseSubmitListingApplicationInput(input: unknown): ApiResult<SubmitListingApplicationInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const fullName = asNonEmptyText(input.fullName);
  const email = asNonEmptyText(input.email);
  const phone = asNonEmptyText(input.phone);
  const monthlyIncome = asOptionalNumber(input.monthlyIncome);

  if (fullName === null || email === null || phone === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "fullName, email, and phone are required"
    };
  }

  return {
    success: true,
    data: {
      fullName,
      email,
      phone,
      employmentInfo: asOptionalText(input.employmentInfo),
      monthlyIncome,
      notes: asOptionalText(input.notes)
    }
  };
}

export function parseUpdateListingApplicationInput(input: unknown): ApiResult<UpdateListingApplicationInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const organizationId = asNonEmptyText(input.organizationId);
  const status = input.status === "submitted"
    || input.status === "under_review"
    || input.status === "approved"
    || input.status === "rejected"
    || input.status === "needs_more_info"
    || input.status === "converted"
    ? input.status
    : null;

  if (organizationId === null || status === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "organizationId and status are required"
    };
  }

  return {
    success: true,
    data: {
      organizationId,
      status,
      screeningNotes: asOptionalText(input.screeningNotes),
      requestedInfoMessage: asOptionalText(input.requestedInfoMessage)
    }
  };
}