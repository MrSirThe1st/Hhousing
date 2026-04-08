import { Permission, parseFinalizeLeaseInput, type ApiResult } from "@hhousing/api-contracts";
import { createTenantInvitation } from "../../../../api";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { createTenantInvitationEmailSenderFromEnv, sendManagedEmailFromEnv } from "../../../../lib/email/resend";
import { getBuiltinTemplateByScenario, renderTemplateText } from "../../../../lib/email/template-catalog";
import { getScopedPortfolioData } from "../../../../lib/operator-scope-portfolio";
import { requirePermission } from "../../../../api/organizations/permissions";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../api/shared";
import { createDocumentRepo, createId, createPaymentRepo, createTeamFunctionsRepo, createTenantLeaseRepo, jsonResponse, parseJsonBody } from "../../shared";

type PatchLeaseBody = {
  endDate: string | null;
  status: "active" | "ended" | "pending";
  signedAt?: string | null;
  signingMethod?: "physical" | "scanned" | "email_confirmation" | null;
};

type SendDraftEmailBody = {
  action: "send_draft_email";
  documentIds?: string[];
};

function validatePatchLeaseBody(input: unknown): ApiResult<PatchLeaseBody> {
  if (typeof input !== "object" || input === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be an object"
    };
  }

  const payload = input as Record<string, unknown>;
  const rawEndDate = payload.endDate;
  let endDate: string | null = null;

  if (rawEndDate !== null && rawEndDate !== undefined) {
    if (typeof rawEndDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(rawEndDate.trim())) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: "endDate must be YYYY-MM-DD or null"
      };
    }
    endDate = rawEndDate.trim();
  }

  if (typeof payload.status !== "string" || !["active", "ended", "pending"].includes(payload.status)) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "status must be one of: active, ended, pending"
    };
  }

  const signedAt = payload.signedAt === undefined || payload.signedAt === null
    ? null
    : typeof payload.signedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payload.signedAt.trim())
      ? payload.signedAt.trim()
      : null;
  const signingMethod = payload.signingMethod === undefined || payload.signingMethod === null
    ? null
    : payload.signingMethod === "physical" || payload.signingMethod === "scanned" || payload.signingMethod === "email_confirmation"
      ? payload.signingMethod
      : null;

  if (payload.signedAt !== undefined && payload.signedAt !== null && signedAt === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "signedAt must be YYYY-MM-DD or null"
    };
  }

  if (payload.signingMethod !== undefined && payload.signingMethod !== null && signingMethod === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "signingMethod must be physical, scanned, or email_confirmation"
    };
  }

  return {
    success: true,
    data: {
      endDate,
      status: payload.status as "active" | "ended" | "pending",
      signedAt,
      signingMethod
    }
  };
}

function parseSendDraftEmailBody(input: unknown): ApiResult<SendDraftEmailBody> {
  if (typeof input !== "object" || input === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be an object"
    };
  }

  const payload = input as Record<string, unknown>;
  if (payload.action !== "send_draft_email") {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "action must be send_draft_email"
    };
  }

  return {
    success: true,
    data: {
      action: "send_draft_email",
      documentIds: Array.isArray(payload.documentIds)
        ? payload.documentIds.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : undefined
    }
  };
}

function mapDraftEmailErrorToResponse(error: unknown): { status: number; body: ApiResult<never> } {
  if (error instanceof Error && error.message === "RESEND_EMAIL_NOT_CONFIGURED") {
    return {
      status: 400,
      body: {
        success: false,
        code: "VALIDATION_ERROR",
        error: "L'envoi d'email n'est pas configuré pour cet environnement"
      }
    };
  }

  return {
    status: 500,
    body: {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to send draft email"
    }
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const access = requireOperatorSession(await extractAuthSessionFromCookies());

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const permissionResult = await requirePermission(
    access.data,
    Permission.VIEW_LEASE,
    createTeamFunctionsRepo()
  );
  if (!permissionResult.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(permissionResult.code), permissionResult);
  }

  const repository = createTenantLeaseRepo();

  try {
    const lease = await repository.getLeaseById(id, access.data.organizationId);

    if (!lease) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Lease not found"
      });
    }

    const scopedPortfolio = await getScopedPortfolioData(access.data);
    if (!scopedPortfolio.unitIds.has(lease.unitId)) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Lease not found"
      });
    }

    return jsonResponse(200, {
      success: true,
      data: lease
    });
  } catch (error) {
    console.error("Failed to fetch lease", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to fetch lease"
    });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const access = requireOperatorSession(await extractAuthSessionFromCookies());

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const permissionResult = await requirePermission(
    access.data,
    Permission.EDIT_LEASE,
    createTeamFunctionsRepo()
  );
  if (!permissionResult.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(permissionResult.code), permissionResult);
  }

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

  const repository = createTenantLeaseRepo();

  if (typeof body === "object" && body !== null && (body as Record<string, unknown>).action === "send_draft_email") {
    const parsedSendDraftEmail = parseSendDraftEmailBody(body);
    if (!parsedSendDraftEmail.success) {
      return jsonResponse(mapErrorCodeToHttpStatus(parsedSendDraftEmail.code), parsedSendDraftEmail);
    }

    try {
      const scopedPortfolio = await getScopedPortfolioData(access.data);
      if (!scopedPortfolio.leaseIds.has(id)) {
        return jsonResponse(404, { success: false, code: "NOT_FOUND", error: "Lease not found" });
      }

      const lease = await repository.getLeaseById(id, access.data.organizationId);
      if (!lease) {
        return jsonResponse(404, { success: false, code: "NOT_FOUND", error: "Lease not found" });
      }

      if (lease.status !== "pending") {
        return jsonResponse(400, {
          success: false,
          code: "VALIDATION_ERROR",
          error: "Only pending move-ins can send draft email"
        });
      }

      if (!lease.tenantEmail) {
        return jsonResponse(400, {
          success: false,
          code: "VALIDATION_ERROR",
          error: "Tenant email is required before sending the draft"
        });
      }

      const documentIds = parsedSendDraftEmail.data.documentIds ?? [];
      if (documentIds.length === 0) {
        return jsonResponse(400, {
          success: false,
          code: "VALIDATION_ERROR",
          error: "Sélectionnez au moins un document avant d'envoyer le brouillon"
        });
      }

      const documentRepository = createDocumentRepo();
      const selectedDocuments = await Promise.all(
        documentIds.map((documentId) => documentRepository.getDocumentById(documentId, access.data.organizationId))
      );

      if (selectedDocuments.some((document) => document === null)) {
        return jsonResponse(404, {
          success: false,
          code: "NOT_FOUND",
          error: "Document not found"
        });
      }

      const resolvedDocuments = selectedDocuments.filter((document): document is NonNullable<typeof document> => document !== null);

      const propertyRecord = scopedPortfolio.properties.find((propertyItem) =>
        propertyItem.units.some((unit) => unit.id === lease.unitId)
      ) ?? null;
      const unitRecord = propertyRecord?.units.find((unit) => unit.id === lease.unitId) ?? null;
      const tenantRecord = await repository.getTenantById(lease.tenantId, access.data.organizationId);
      const draftTemplate = getBuiltinTemplateByScenario("lease_draft");

      if (!draftTemplate) {
        return jsonResponse(500, {
          success: false,
          code: "INTERNAL_ERROR",
          error: "Lease draft template is missing"
        });
      }

      await sendManagedEmailFromEnv({
        to: lease.tenantEmail,
        subject: renderTemplateText(draftTemplate.subject, {
          property: propertyRecord?.property ?? null,
          unit: unitRecord,
          lease,
          tenant: tenantRecord,
          today: new Date().toISOString().substring(0, 10)
        }),
        body: renderTemplateText(draftTemplate.body, {
          property: propertyRecord?.property ?? null,
          unit: unitRecord,
          lease,
          tenant: tenantRecord,
          today: new Date().toISOString().substring(0, 10)
        }),
        attachments: resolvedDocuments.map((document) => ({
          fileName: document.fileName,
          mimeType: document.mimeType,
          fileUrl: document.fileUrl
        }))
      });

      return jsonResponse(200, {
        success: true,
        data: lease
      });
    } catch (error) {
      console.error("Failed to send draft lease email", error);
      const mappedError = mapDraftEmailErrorToResponse(error);
      return jsonResponse(mappedError.status, mappedError.body);
    }
  }

  if (typeof body === "object" && body !== null && (body as Record<string, unknown>).action === "finalize") {
    const paymentRepository = createPaymentRepo();
    const finalized = parseFinalizeLeaseInput(body);
    if (!finalized.success) {
      return jsonResponse(mapErrorCodeToHttpStatus(finalized.code), finalized);
    }

    if (finalized.data.organizationId !== access.data.organizationId) {
      return jsonResponse(403, {
        success: false,
        code: "FORBIDDEN",
        error: "Organization mismatch"
      });
    }

    try {
      const scopedPortfolio = await getScopedPortfolioData(access.data);
      if (!scopedPortfolio.leaseIds.has(id)) {
        return jsonResponse(404, { success: false, code: "NOT_FOUND", error: "Lease not found" });
      }

      const lease = await repository.getLeaseById(id, access.data.organizationId);
      if (!lease) {
        return jsonResponse(404, { success: false, code: "NOT_FOUND", error: "Lease not found" });
      }

      if (lease.status !== "pending") {
        return jsonResponse(400, {
          success: false,
          code: "VALIDATION_ERROR",
          error: "Only pending move-ins can be finalized"
        });
      }

      const initialPayments = (await paymentRepository.listPayments({
        organizationId: access.data.organizationId,
        leaseId: id
      })).filter((payment) => payment.isInitialCharge);

      if (initialPayments.length === 0) {
        return jsonResponse(400, {
          success: false,
          code: "VALIDATION_ERROR",
          error: "Initial move-in charges must exist before finalization"
        });
      }

      const unpaidInitialPayments = initialPayments.filter((payment) => payment.status !== "paid");
      if (unpaidInitialPayments.length > 0) {
        return jsonResponse(400, {
          success: false,
          code: "VALIDATION_ERROR",
          error: "All initial move-in charges must be marked as paid before finalization"
        });
      }

      if (!lease.tenantEmail) {
        return jsonResponse(400, {
          success: false,
          code: "VALIDATION_ERROR",
          error: "Tenant email is required before activation"
        });
      }

      const tenant = await repository.getTenantById(lease.tenantId, access.data.organizationId);
      if (!tenant || tenant.authUserId) {
        return jsonResponse(400, {
          success: false,
          code: "VALIDATION_ERROR",
          error: tenant?.authUserId ? "Tenant already has login access" : "Tenant not found"
        });
      }

      const inviteLinkBaseUrl = process.env.MOBILE_TENANT_INVITE_URL_BASE?.trim() || "hhousing-tenant://accept-invite";
      const invitationResult = await createTenantInvitation(
        {
          tenantId: lease.tenantId,
          session: access.data
        },
        {
          repository,
          createId: () => createId("tin"),
          inviteLinkBaseUrl,
          sendInvitationEmail: createTenantInvitationEmailSenderFromEnv()
        }
      );

      if (!invitationResult.body.success) {
        return jsonResponse(invitationResult.status, invitationResult.body);
      }

      const updatedLease = await repository.updateLease({
        id,
        organizationId: access.data.organizationId,
        endDate: lease.endDate,
        status: "active",
        signedAt: finalized.data.signedAt,
        signingMethod: finalized.data.signingMethod
      });

      if (!updatedLease) {
        return jsonResponse(404, { success: false, code: "NOT_FOUND", error: "Lease not found" });
      }

      return jsonResponse(200, { success: true, data: updatedLease });
    } catch (error) {
      console.error("Failed to finalize lease", error);
      return jsonResponse(500, {
        success: false,
        code: "INTERNAL_ERROR",
        error: "Failed to finalize lease"
      });
    }
  }

  const parsed = validatePatchLeaseBody(body);
  if (!parsed.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(parsed.code), parsed);
  }

  try {
    const scopedPortfolio = await getScopedPortfolioData(access.data);
    if (!scopedPortfolio.leaseIds.has(id)) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Lease not found"
      });
    }

    const lease = await repository.updateLease({
      id,
      organizationId: access.data.organizationId,
      endDate: parsed.data.endDate,
      status: parsed.data.status,
      signedAt: parsed.data.signedAt,
      signingMethod: parsed.data.signingMethod
    });

    if (!lease) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Lease not found"
      });
    }

    return jsonResponse(200, {
      success: true,
      data: lease
    });
  } catch (error) {
    console.error("Failed to update lease", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to update lease"
    });
  }
}
