import type { ApiResult } from "../api-result.types";
import type {
  CreateMaintenanceRequestInput,
  UpdateMaintenanceRequestInput
} from "./maintenance-request.types";
import type { MaintenancePriority, MaintenanceStatus } from "@hhousing/domain";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNonEmptyText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function asOptionalText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return asNonEmptyText(value);
}

const VALID_PRIORITIES: readonly MaintenancePriority[] = ["low", "medium", "high", "urgent"];
const VALID_STATUSES: readonly MaintenanceStatus[] = ["open", "in_progress", "resolved", "cancelled"];

function asPriority(value: unknown): MaintenancePriority | null {
  const text = asNonEmptyText(value);
  if (text === null) return null;
  return VALID_PRIORITIES.includes(text as MaintenancePriority)
    ? (text as MaintenancePriority)
    : null;
}

function asStatus(value: unknown): MaintenanceStatus | null {
  const text = asNonEmptyText(value);
  if (text === null) return null;
  return VALID_STATUSES.includes(text as MaintenanceStatus)
    ? (text as MaintenanceStatus)
    : null;
}

export function parseCreateMaintenanceRequestInput(
  input: unknown
): ApiResult<CreateMaintenanceRequestInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const organizationId = asNonEmptyText(input.organizationId);
  const unitId = asNonEmptyText(input.unitId);
  const title = asNonEmptyText(input.title);
  const description = asNonEmptyText(input.description);

  if (organizationId === null || unitId === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "organizationId and unitId are required" };
  }

  if (title === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "title is required" };
  }

  if (description === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "description is required" };
  }

  const priorityRaw = input.priority ?? "medium";
  const priority = asPriority(priorityRaw);
  if (priority === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "priority must be one of: low, medium, high, urgent"
    };
  }

  return {
    success: true,
    data: {
      organizationId,
      unitId,
      tenantId: asOptionalText(input.tenantId),
      title,
      description,
      priority
    }
  };
}

export function parseUpdateMaintenanceRequestInput(
  requestId: string,
  input: unknown,
  sessionOrganizationId: string
): ApiResult<UpdateMaintenanceRequestInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const hasStatus = Object.prototype.hasOwnProperty.call(input, "status");
  const hasAssigned = Object.prototype.hasOwnProperty.call(input, "assignedToName");
  const hasInternalNotes = Object.prototype.hasOwnProperty.call(input, "internalNotes");
  const hasResolutionNotes = Object.prototype.hasOwnProperty.call(input, "resolutionNotes");

  if (!hasStatus && !hasAssigned && !hasInternalNotes && !hasResolutionNotes) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "At least one field is required: status, assignedToName, internalNotes, resolutionNotes"
    };
  }

  let status: MaintenanceStatus | undefined;
  if (hasStatus) {
    const parsedStatus = asStatus(input.status);
    if (parsedStatus === null) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: "status must be one of: open, in_progress, resolved, cancelled"
      };
    }
    status = parsedStatus;
  }

  const assignedToName = hasAssigned ? asOptionalText(input.assignedToName) : undefined;
  if (hasAssigned && input.assignedToName !== null && assignedToName === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "assignedToName must be non-empty text or null"
    };
  }

  const internalNotes = hasInternalNotes ? asOptionalText(input.internalNotes) : undefined;
  if (hasInternalNotes && input.internalNotes !== null && internalNotes === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "internalNotes must be non-empty text or null"
    };
  }

  const resolutionNotes = hasResolutionNotes ? asOptionalText(input.resolutionNotes) : undefined;
  if (hasResolutionNotes && input.resolutionNotes !== null && resolutionNotes === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "resolutionNotes must be non-empty text or null"
    };
  }

  return {
    success: true,
    data: {
      requestId,
      organizationId: sessionOrganizationId,
      status,
      assignedToName,
      internalNotes,
      resolutionNotes
    }
  };
}
