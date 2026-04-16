import { getInvoiceDetail, queueInvoiceEmail, voidInvoice } from "../../../../api";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { createId, createInvoiceRepo, createTeamFunctionsRepo, jsonResponse, parseJsonBody } from "../../shared";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  void request;
  const { id } = await params;
  const session = await extractAuthSessionFromCookies();

  const result = await getInvoiceDetail(
    {
      invoiceId: id,
      session
    },
    {
      repository: createInvoiceRepo(),
      teamFunctionsRepository: createTeamFunctionsRepo()
    }
  );

  return jsonResponse(result.status, result.body);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await extractAuthSessionFromCookies();

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

  const action = typeof body === "object" && body !== null
    ? (body as Record<string, unknown>).action
    : undefined;

  if (action === "send" || action === "resend") {
    const result = await queueInvoiceEmail(
      {
        invoiceId: id,
        body,
        session
      },
      {
        repository: createInvoiceRepo(),
        createId: () => createId("iej"),
        teamFunctionsRepository: createTeamFunctionsRepo()
      }
    );

    return jsonResponse(result.status, result.body);
  }

  if (action === "void") {
    const result = await voidInvoice(
      {
        invoiceId: id,
        body,
        session
      },
      {
        repository: createInvoiceRepo(),
        teamFunctionsRepository: createTeamFunctionsRepo()
      }
    );

    return jsonResponse(result.status, result.body);
  }

  return jsonResponse(400, {
    success: false,
    code: "VALIDATION_ERROR",
    error: "action must be send, resend, or void"
  });
}
