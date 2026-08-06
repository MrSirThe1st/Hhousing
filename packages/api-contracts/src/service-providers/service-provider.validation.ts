import { z } from "zod";

export const serviceProviderStatusSchema = z.enum(["active", "suspended"]);

export const createServiceProviderCategoryInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase kebab-case"),
  sortOrder: z.number().int().min(0).max(10_000).optional()
});

export const updateServiceProviderCategoryInputSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase kebab-case")
    .optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional()
});

export const createServiceProviderInputSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(5).max(40),
  whatsappPhone: z.string().trim().min(5).max(40).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  quartier: z.string().trim().max(200).nullable().optional(),
  isPlatform: z.boolean().optional(),
  isVerified: z.boolean().optional()
});

export const updateServiceProviderInputSchema = z.object({
  categoryId: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  phone: z.string().trim().min(5).max(40).optional(),
  whatsappPhone: z.string().trim().min(5).max(40).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  quartier: z.string().trim().max(200).nullable().optional(),
  isVerified: z.boolean().optional()
});

export const assignServiceProviderInputSchema = z.object({
  propertyId: z.string().min(1),
  serviceProviderId: z.string().min(1)
});

export const unassignServiceProviderInputSchema = assignServiceProviderInputSchema;

export const updateServiceProviderStatusInputSchema = z.object({
  status: serviceProviderStatusSchema
});

export function parseCreateServiceProviderCategoryInput(input: unknown) {
  return createServiceProviderCategoryInputSchema.safeParse(input);
}

export function parseUpdateServiceProviderCategoryInput(input: unknown) {
  return updateServiceProviderCategoryInputSchema.safeParse(input);
}

export function parseCreateServiceProviderInput(input: unknown) {
  return createServiceProviderInputSchema.safeParse(input);
}

export function parseUpdateServiceProviderInput(input: unknown) {
  return updateServiceProviderInputSchema.safeParse(input);
}

export function parseAssignServiceProviderInput(input: unknown) {
  return assignServiceProviderInputSchema.safeParse(input);
}

export function parseUnassignServiceProviderInput(input: unknown) {
  return unassignServiceProviderInputSchema.safeParse(input);
}

export function parseUpdateServiceProviderStatusInput(input: unknown) {
  return updateServiceProviderStatusInputSchema.safeParse(input);
}
