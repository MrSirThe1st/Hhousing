import { z } from "zod";
import type { ApiResult } from "../api-result.types";
import type { CreateOrganizationInput, CreatePropertyInput, CreateUnitInput, UpdateOrganizationInput } from "./organization-property-unit.types";

const nonEmptyText = z.string().trim().min(1);
const positiveNumber = z.number().finite().positive();
const nonNegativeNumber = z.number().finite().min(0);
const optionalWholeNumber = z.number().int().min(0).nullable().optional();
const optionalDecimalNumber = z.number().finite().min(0).nullable().optional();
const textList = z.array(nonEmptyText).max(32);

const createOrganizationSchema = z.object({
  name: nonEmptyText
});

const optionalTrimmedText = z.string().trim().nullable().optional().transform((value) => {
  if (value === undefined || value === null) {
    return value ?? null;
  }

  return value.length === 0 ? null : value;
});

const optionalUrl = z.union([z.string().trim().url(), z.literal(""), z.null()]).optional()
  .transform((value) => value === undefined || value === "" ? null : value);

const optionalEmail = z.union([z.string().trim().email(), z.literal(""), z.null()]).optional()
  .transform((value) => value === undefined || value === "" ? null : value);

const updateOrganizationSchema = z.object({
  name: nonEmptyText,
  logoUrl: optionalUrl,
  contactEmail: optionalEmail,
  contactPhone: optionalTrimmedText,
  contactWhatsapp: optionalTrimmedText,
  websiteUrl: optionalUrl,
  address: optionalTrimmedText,
  emailSignature: optionalTrimmedText
});

const createPropertyUnitTemplateSchema = z.object({
  monthlyRentAmount: positiveNumber,
  depositAmount: nonNegativeNumber,
  currencyCode: nonEmptyText,
  bedroomCount: optionalWholeNumber,
  bathroomCount: optionalDecimalNumber,
  sizeSqm: optionalDecimalNumber.refine((value) => value === undefined || value === null || value > 0, {
    message: "sizeSqm must be greater than 0"
  }),
  amenities: textList.optional(),
  features: textList.optional(),
  unitCount: z.number().int().min(1).max(200).optional()
});

const createPropertySchema = z.object({
  organizationId: nonEmptyText,
  name: nonEmptyText,
  address: nonEmptyText,
  city: nonEmptyText,
  countryCode: nonEmptyText,
  managementContext: z.enum(["owned", "managed"]),
  propertyType: z.enum(["single_unit", "multi_unit"]),
  yearBuilt: z.number().int().min(1800).max(2200).nullable().optional(),
  photoUrls: z.array(nonEmptyText).max(20).optional(),
  clientId: nonEmptyText.nullable().optional(),
  unitTemplate: createPropertyUnitTemplateSchema.optional()
}).superRefine((value, context) => {
  if (value.propertyType === "single_unit") {
    if (!value.unitTemplate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "unitTemplate is required",
        path: ["unitTemplate"]
      });
      return;
    }

    if (value.unitTemplate.unitCount !== undefined && value.unitTemplate.unitCount !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "unitCount must be 1 for single_unit properties",
        path: ["unitTemplate", "unitCount"]
      });
    }
  }

  if (value.propertyType === "multi_unit") {
    if (!value.unitTemplate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "unitTemplate is required",
        path: ["unitTemplate"]
      });
      return;
    }

    if ((value.unitTemplate.unitCount ?? 0) < 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "unitCount is required for multi_unit properties",
        path: ["unitTemplate", "unitCount"]
      });
    }
  }
});

const createUnitSchema = z.object({
  organizationId: nonEmptyText,
  propertyId: nonEmptyText,
  unitNumber: nonEmptyText,
  monthlyRentAmount: positiveNumber,
  depositAmount: nonNegativeNumber.optional(),
  currencyCode: nonEmptyText,
  bedroomCount: optionalWholeNumber,
  bathroomCount: optionalDecimalNumber,
  sizeSqm: optionalDecimalNumber.refine((value) => value === undefined || value === null || value > 0, {
    message: "sizeSqm must be greater than 0"
  }),
  amenities: textList.optional(),
  features: textList.optional()
});

function mapZodError(error: z.ZodError): ApiResult<never> {
  return {
    success: false,
    code: "VALIDATION_ERROR",
    error: error.issues[0]?.message ?? "Invalid input"
  };
}

export function parseCreateOrganizationInput(input: unknown): ApiResult<CreateOrganizationInput> {
  const parsed = createOrganizationSchema.safeParse(input);
  if (!parsed.success) {
    return mapZodError(parsed.error);
  }

  return { success: true, data: parsed.data };
}

export function parseUpdateOrganizationInput(input: unknown): ApiResult<UpdateOrganizationInput> {
  const parsed = updateOrganizationSchema.safeParse(input);
  if (!parsed.success) {
    return mapZodError(parsed.error);
  }

  return { success: true, data: parsed.data };
}

export function parseCreatePropertyInput(input: unknown): ApiResult<CreatePropertyInput> {
  const parsed = createPropertySchema.safeParse(input);
  if (!parsed.success) {
    return mapZodError(parsed.error);
  }

  return { success: true, data: parsed.data };
}

export function parseCreateUnitInput(input: unknown): ApiResult<CreateUnitInput> {
  const parsed = createUnitSchema.safeParse(input);
  if (!parsed.success) {
    return mapZodError(parsed.error);
  }

  return { success: true, data: parsed.data };
}
