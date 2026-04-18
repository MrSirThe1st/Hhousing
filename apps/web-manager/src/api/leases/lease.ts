import type {
  ApiResult,
  AuthSession,
  CreateLeaseOutput,
  CreateLeaseChargeInput,
  ListLeasesOutput
} from "@hhousing/api-contracts";
import { Permission, parseCreateLeaseInput } from "@hhousing/api-contracts";
import { calculateMonthlyProration } from "@hhousing/domain";
import type { PaymentRepository, TenantLeaseRepository } from "@hhousing/data-access";
import { requirePermission, type TeamPermissionRepository } from "../organizations/permissions";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../shared";
import { logOperatorAuditEvent } from "../audit-log";

export interface CreateLeaseRequest {
  body: unknown;
  session: AuthSession | null;
}

export interface CreateLeaseResponse {
  status: number;
  body: ApiResult<CreateLeaseOutput>;
}

export interface CreateLeaseDeps {
  repository: TenantLeaseRepository;
  paymentRepository: PaymentRepository;
  teamFunctionsRepository: TeamPermissionRepository;
  createId: () => string;
  createPaymentId: () => string;
}

function buildInitialCharges(
  chargeRecords: Array<CreateLeaseChargeInput & { id: string }>,
  startDate: string,
  monthlyRentAmount: number
): Array<{
  label: string;
  amount: number;
  dueDate: string;
  paymentKind: "rent" | "deposit" | "prorated_rent" | "fee" | "other";
  billingFrequency: "one_time" | "monthly" | "quarterly" | "annually";
  sourceLeaseChargeTemplateId: string | null;
}> {
  const initialCharges: Array<{
    label: string;
    amount: number;
    dueDate: string;
    paymentKind: "rent" | "deposit" | "prorated_rent" | "fee" | "other";
    billingFrequency: "one_time" | "monthly" | "quarterly" | "annually";
    sourceLeaseChargeTemplateId: string | null;
  }> = chargeRecords.flatMap((charge) => {
    if (charge.frequency !== "one_time") {
      return [];
    }

    const paymentKind: "rent" | "deposit" | "prorated_rent" | "fee" | "other" = charge.chargeType === "deposit"
      ? "deposit"
      : charge.chargeType === "prorated_rent"
        ? "prorated_rent"
        : charge.chargeType === "fee"
          ? "fee"
          : charge.chargeType === "rent"
            ? "rent"
            : "other";

    return [{
      label: charge.label,
      amount: charge.amount,
      dueDate: charge.startDate,
      paymentKind,
      billingFrequency: "one_time",
      sourceLeaseChargeTemplateId: charge.id
    }];
  });

  const hasProratedRent = initialCharges.some((charge) => charge.paymentKind === "prorated_rent");
  if (!hasProratedRent) {
    initialCharges.push({
      label: "Premier mois de loyer",
      amount: monthlyRentAmount,
      dueDate: startDate,
      paymentKind: "rent",
      billingFrequency: "monthly",
      sourceLeaseChargeTemplateId: null
    });
  }

  return initialCharges;
}

export async function createLease(
  request: CreateLeaseRequest,
  deps: CreateLeaseDeps
): Promise<CreateLeaseResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.CREATE_LEASE,
    deps.teamFunctionsRepository
  );
  if (!permissionResult.success) {
    return {
      status: mapErrorCodeToHttpStatus(permissionResult.code),
      body: permissionResult
    };
  }

  const parsed = parseCreateLeaseInput(request.body);
  if (!parsed.success) {
    return { status: mapErrorCodeToHttpStatus(parsed.code), body: parsed };
  }

  if (parsed.data.organizationId !== sessionResult.data.organizationId) {
    return {
      status: 403,
      body: { success: false, code: "FORBIDDEN", error: "Organization mismatch" }
    };
  }

  try {
    const proration = parsed.data.paymentFrequency === "monthly"
      ? calculateMonthlyProration({
        startDate: parsed.data.startDate,
        monthlyRentAmount: parsed.data.monthlyRentAmount
      })
      : null;

    const chargeRecords = (parsed.data.charges ?? []).map((charge) => ({
      id: deps.createId(),
      organizationId: parsed.data.organizationId,
      label: charge.label,
      chargeType: charge.chargeType,
      amount: charge.amount,
      currencyCode: charge.currencyCode,
      frequency: charge.frequency,
      startDate: charge.startDate,
      endDate: charge.endDate ?? null
    }));

    if (proration?.isProrated && !chargeRecords.some((charge) => charge.chargeType === "prorated_rent")) {
      chargeRecords.push({
        id: deps.createId(),
        organizationId: parsed.data.organizationId,
        label: proration.label,
        chargeType: "prorated_rent",
        amount: proration.proratedAmount,
        currencyCode: parsed.data.currencyCode,
        frequency: "one_time",
        startDate: parsed.data.startDate,
        endDate: null
      });
    }

    const effectivePaymentStartDate = proration?.isProrated
      ? proration.regularBillingStartDate
      : parsed.data.paymentStartDate ?? parsed.data.startDate;
    const effectiveDueDayOfMonth = proration?.isProrated
      ? Number(proration.regularBillingStartDate.substring(8, 10))
      : parsed.data.dueDayOfMonth ?? Number(effectivePaymentStartDate.substring(8, 10));

    const lease = await deps.repository.createLease({
      id: deps.createId(),
      organizationId: parsed.data.organizationId,
      unitId: parsed.data.unitId,
      tenantId: parsed.data.tenantId,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      monthlyRentAmount: parsed.data.monthlyRentAmount,
      currencyCode: parsed.data.currencyCode,
      termType: parsed.data.termType ?? (parsed.data.endDate === null ? "month_to_month" : "fixed"),
      fixedTermMonths: parsed.data.fixedTermMonths ?? null,
      autoRenewToMonthly: parsed.data.autoRenewToMonthly ?? false,
      paymentFrequency: parsed.data.paymentFrequency ?? "monthly",
      paymentStartDate: effectivePaymentStartDate,
      dueDayOfMonth: effectiveDueDayOfMonth,
      depositAmount: parsed.data.charges?.filter((charge) => charge.chargeType === "deposit").reduce((sum, charge) => sum + charge.amount, 0) ?? 0,
      status: "pending",
      charges: chargeRecords
    });

    const initialCharges = buildInitialCharges(
      chargeRecords,
      parsed.data.startDate,
      parsed.data.monthlyRentAmount
    );

    await Promise.all(initialCharges.map((charge) => deps.paymentRepository.createPayment({
      id: deps.createPaymentId(),
      organizationId: parsed.data.organizationId,
      leaseId: lease.id,
      tenantId: parsed.data.tenantId,
      amount: charge.amount,
      currencyCode: parsed.data.currencyCode,
      dueDate: charge.dueDate,
      note: charge.label,
      paymentKind: charge.paymentKind,
      billingFrequency: charge.billingFrequency,
      sourceLeaseChargeTemplateId: charge.sourceLeaseChargeTemplateId,
      isInitialCharge: true
    })));

    await logOperatorAuditEvent({
      session: sessionResult.data,
      actionKey: "operations.lease.created",
      entityType: "lease",
      entityId: lease.id,
      metadata: {
        unitId: lease.unitId,
        tenantId: lease.tenantId,
        startDate: lease.startDate,
        endDate: lease.endDate,
        monthlyRentAmount: lease.monthlyRentAmount,
        currencyCode: lease.currencyCode
      }
    });

    return { status: 201, body: { success: true, data: lease } };
  } catch (error) {
    if (error instanceof Error && error.message === "UNIT_NOT_AVAILABLE") {
      return {
        status: 400,
        body: {
          success: false,
          code: "VALIDATION_ERROR",
          error: "Unit must exist and be vacant before creating a lease"
        }
      };
    }

    return {
      status: 500,
      body: {
        success: false,
        code: "INTERNAL_ERROR",
        error: "Failed to create lease"
      }
    };
  }
}

export interface ListLeasesRequest {
  organizationId: string | null;
  session: AuthSession | null;
}

export interface ListLeasesResponse {
  status: number;
  body: ApiResult<ListLeasesOutput>;
}

export interface ListLeasesDeps {
  repository: TenantLeaseRepository;
  teamFunctionsRepository: TeamPermissionRepository;
}

export async function listLeases(
  request: ListLeasesRequest,
  deps: ListLeasesDeps
): Promise<ListLeasesResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.VIEW_LEASE,
    deps.teamFunctionsRepository
  );
  if (!permissionResult.success) {
    return {
      status: mapErrorCodeToHttpStatus(permissionResult.code),
      body: permissionResult
    };
  }

  const organizationId = request.organizationId ?? sessionResult.data.organizationId ?? "";

  if (organizationId !== sessionResult.data.organizationId) {
    return {
      status: 403,
      body: { success: false, code: "FORBIDDEN", error: "Organization mismatch" }
    };
  }

  const leases = await deps.repository.listLeasesByOrganization(organizationId);
  return { status: 200, body: { success: true, data: { leases } } };
}
