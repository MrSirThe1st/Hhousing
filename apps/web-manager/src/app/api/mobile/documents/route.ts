import { extractAuthSessionFromRequest } from "../../../../auth/session-adapter";
import { mapErrorCodeToHttpStatus, requireTenantSession } from "../../../../api/shared";
import { createDocumentRepo, createTenantLeaseRepo, jsonResponse } from "../../shared";

export async function GET(request: Request): Promise<Response> {
  const access = requireTenantSession(await extractAuthSessionFromRequest(request));

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const leaseRepo = createTenantLeaseRepo();
  const documentRepo = createDocumentRepo();

  try {
    const lease = await leaseRepo.getCurrentLeaseByTenantAuthUserId(
      access.data.userId,
      access.data.organizationId
    );

    if (!lease) {
      return jsonResponse(200, {
        success: true,
        data: { documents: [] }
      });
    }

    const [leaseDocuments, tenantDocuments] = await Promise.all([
      documentRepo.listDocuments({
        organizationId: access.data.organizationId,
        attachmentType: "lease",
        attachmentId: lease.id
      }),
      documentRepo.listDocuments({
        organizationId: access.data.organizationId,
        attachmentType: "tenant",
        attachmentId: lease.tenantId
      })
    ]);

    const documents = [...leaseDocuments, ...tenantDocuments]
      .filter((document, index, allDocuments) => {
        return allDocuments.findIndex((candidate) => candidate.id === document.id) === index;
      })
      .sort((left, right) => right.createdAtIso.localeCompare(left.createdAtIso));

    return jsonResponse(200, {
      success: true,
      data: { documents }
    });
  } catch (error) {
    console.error("Failed to fetch tenant documents", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to fetch documents"
    });
  }
}