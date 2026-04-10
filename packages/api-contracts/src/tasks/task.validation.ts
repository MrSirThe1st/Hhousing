import { z } from "zod";
import type { ApiResult } from "../api-result.types";
import type { CreateTaskInput, UpdateTaskInput } from "./task.types";

const nullableText = z.string().trim().min(1).nullable();
const optionalNullableText = z.union([z.string().trim().min(1), z.null()]).optional();
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const taskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
const taskStatusSchema = z.enum(["open", "in_progress", "done", "cancelled"]);
const workflowEntityTypeSchema = z.enum(["organization", "property", "unit", "lease", "tenant", "payment", "maintenance_request", "task", "custom"]);

const createTaskInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: nullableText,
  priority: taskPrioritySchema,
  dueDate: isoDateSchema,
  assignedUserId: nullableText,
  relatedEntityType: workflowEntityTypeSchema.nullable(),
  relatedEntityId: nullableText,
  propertyId: nullableText,
  unitId: nullableText,
  leaseId: nullableText,
  tenantId: nullableText
}).superRefine((value, ctx) => {
  if (value.unitId !== null && value.propertyId === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["unitId"], message: "unitId requires propertyId" });
  }
});

const updateTaskInputSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: optionalNullableText,
  priority: taskPrioritySchema.optional(),
  dueDate: isoDateSchema.optional(),
  status: taskStatusSchema.optional(),
  assignedUserId: optionalNullableText,
  relatedEntityType: workflowEntityTypeSchema.nullable().optional(),
  relatedEntityId: optionalNullableText,
  propertyId: optionalNullableText,
  unitId: optionalNullableText,
  leaseId: optionalNullableText,
  tenantId: optionalNullableText
}).superRefine((value, ctx) => {
  if (value.unitId !== undefined && value.unitId !== null && value.propertyId === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["unitId"], message: "unitId requires propertyId" });
  }
});

function toValidationError(error: z.ZodError): ApiResult<never> {
  return { success: false, code: "VALIDATION_ERROR", error: error.issues[0]?.message ?? "Invalid input" };
}

export function parseCreateTaskInput(input: unknown): ApiResult<CreateTaskInput> {
  const result = createTaskInputSchema.safeParse(input);
  return result.success ? { success: true, data: result.data } : toValidationError(result.error);
}

export function parseUpdateTaskInput(input: unknown): ApiResult<UpdateTaskInput> {
  const result = updateTaskInputSchema.safeParse(input);
  return result.success ? { success: true, data: result.data } : toValidationError(result.error);
}