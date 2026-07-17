import { createPaymentRepo, createTenantLeaseRepo } from "../../../shared";
import {
  decryptWhatsAppFlowRequest,
  encryptWhatsAppFlowResponse,
  type WhatsAppFlowEncryptedRequest
} from "../../../../../lib/whatsapp/flows/encryption";
import {
  buildVoirMonLoyerScreenData,
  getTenantRentSummaryByPhone
} from "../../../../../lib/whatsapp/flows/voir-mon-loyer";

function readPrivateKeyFromEnv(): string | null {
  const raw = process.env.WHATSAPP_FLOW_PRIVATE_KEY?.trim();
  if (!raw) {
    return null;
  }

  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

function extractPhoneFromFlowToken(flowToken: string | undefined): string | null {
  if (!flowToken) {
    return null;
  }

  const trimmed = flowToken.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("phone:")) {
    return trimmed.slice("phone:".length);
  }

  return trimmed;
}

export async function POST(request: Request): Promise<Response> {
  const privateKey = readPrivateKeyFromEnv();
  if (!privateKey) {
    return new Response("Flow private key is not configured", { status: 500 });
  }

  let body: WhatsAppFlowEncryptedRequest;
  try {
    body = (await request.json()) as WhatsAppFlowEncryptedRequest;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  if (!body.encrypted_aes_key || !body.encrypted_flow_data || !body.initial_vector) {
    return new Response("Missing encrypted payload fields", { status: 400 });
  }

  let decryptedBody;
  let aesKeyBuffer: Buffer;
  let initialVectorBuffer: Buffer;

  try {
    const decrypted = decryptWhatsAppFlowRequest(
      body,
      privateKey,
      process.env.WHATSAPP_FLOW_PRIVATE_KEY_PASSPHRASE?.trim()
    );
    decryptedBody = decrypted.decryptedBody;
    aesKeyBuffer = decrypted.aesKeyBuffer;
    initialVectorBuffer = decrypted.initialVectorBuffer;
  } catch (error) {
    console.error("[whatsapp:flows] decrypt failed", error);
    return new Response("Unable to decrypt request", { status: 421 });
  }

  if (decryptedBody.action === "ping") {
    const encrypted = encryptWhatsAppFlowResponse(
      { data: { status: "active" } },
      aesKeyBuffer,
      initialVectorBuffer
    );
    return new Response(encrypted, {
      status: 200,
      headers: { "content-type": "text/plain" }
    });
  }

  const phone =
    extractPhoneFromFlowToken(decryptedBody.flow_token)
    ?? (typeof decryptedBody.data?.phone === "string" ? decryptedBody.data.phone : null);

  if (!phone) {
    const encrypted = encryptWhatsAppFlowResponse(
      {
        screen: "LOYER",
        data: {
          heading: "Votre loyer",
          tenant_name: "—",
          amount_label: "—",
          due_date_label: "—",
          status_label: "Compte introuvable",
          summary_text: "Impossible d'identifier votre compte."
        }
      },
      aesKeyBuffer,
      initialVectorBuffer
    );
    return new Response(encrypted, {
      status: 200,
      headers: { "content-type": "text/plain" }
    });
  }

  const summary = await getTenantRentSummaryByPhone({
    phone,
    tenantRepository: createTenantLeaseRepo(),
    paymentRepository: createPaymentRepo()
  });

  const screenPayload = summary
    ? buildVoirMonLoyerScreenData(summary)
    : {
        screen: "LOYER",
        data: {
          heading: "Votre loyer",
          tenant_name: "—",
          amount_label: "—",
          due_date_label: "—",
          status_label: "Compte introuvable",
          summary_text: "Aucun locataire trouvé pour ce numéro."
        }
      };

  const encrypted = encryptWhatsAppFlowResponse(screenPayload, aesKeyBuffer, initialVectorBuffer);
  return new Response(encrypted, {
    status: 200,
    headers: { "content-type": "text/plain" }
  });
}
