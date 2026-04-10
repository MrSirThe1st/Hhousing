import { z } from "zod";
import type { ApiResult } from "../api-result.types";
import type { CreateCalendarEventInput, UpdateCalendarEventInput } from "./calendar-event.types";

const nullableText = z.string().trim().min(1).nullable();
const optionalNullableText = z.union([z.string().trim().min(1), z.null()]).optional();
const isoDateTimeSchema = z.string().datetime({ offset: true });
const eventTypeSchema = z.enum(["lease", "rent", "maintenance", "custom", "inspection", "reminder", "task"]);
const eventStatusSchema = z.enum(["scheduled", "in_progress", "done", "cancelled"]);
const workflowEntityTypeSchema = z.enum(["organization", "property", "unit", "lease", "tenant", "payment", "maintenance_request", "task", "custom"]);

const createCalendarEventInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: nullableText,
  startAtIso: isoDateTimeSchema,
  endAtIso: z.union([isoDateTimeSchema, z.null()]),
  eventType: eventTypeSchema,
  status: eventStatusSchema,
  assignedUserId: nullableText,
  relatedEntityType: workflowEntityTypeSchema.nullable(),
  relatedEntityId: nullableText,
  propertyId: nullableText,
  unitId: nullableText,
  leaseId: nullableText,
  tenantId: nullableText
}).superRefine((value, ctx) => {
  if (value.endAtIso !== null && value.endAtIso < value.startAtIso) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endAtIso"], message: "endAtIso must be after startAtIso" });
  }

  if (value.unitId !== null && value.propertyId === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["unitId"], message: "unitId requires propertyId" });
  }
});

const updateCalendarEventInputSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: optionalNullableText,
  startAtIso: isoDateTimeSchema.optional(),
  endAtIso: z.union([isoDateTimeSchema, z.null()]).optional(),
  eventType: eventTypeSchema.optional(),
  status: eventStatusSchema.optional(),
  assignedUserId: optionalNullableText,
  relatedEntityType: workflowEntityTypeSchema.nullable().optional(),
  relatedEntityId: optionalNullableText,
  propertyId: optionalNullableText,
  unitId: optionalNullableText,
  leaseId: optionalNullableText,
  tenantId: optionalNullableText
});

function toValidationError(error: z.ZodError): ApiResult<never> {
  return { success: false, code: "VALIDATION_ERROR", error: error.issues[0]?.message ?? "Invalid input" };
}

export function parseCreateCalendarEventInput(input: unknown): ApiResult<CreateCalendarEventInput> {
  const result = createCalendarEventInputSchema.safeParse(input);
  return result.success ? { success: true, data: result.data } : toValidationError(result.error);
}

export function parseUpdateCalendarEventInput(input: unknown): ApiResult<UpdateCalendarEventInput> {
  const result = updateCalendarEventInputSchema.safeParse(input);
  return result.success ? { success: true, data: result.data } : toValidationError(result.error);
}