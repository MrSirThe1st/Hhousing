import { LEGAL_CONTACT_EMAIL } from "../../../lib/legal/site-legal";
import { jsonResponse } from "../shared";

type DemoRequestBody = {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  unitsCount: string;
  message: string;
};

function readString(value: unknown, max: number): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, max);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseDemoRequest(body: unknown): DemoRequestBody | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const record = body as Record<string, unknown>;
  const fullName = readString(record.fullName, 120);
  const email = readString(record.email, 200);
  const phone = readString(record.phone, 40);
  const company = readString(record.company, 160);
  const unitsCount = readString(record.unitsCount, 40);
  const message = readString(record.message, 2000);

  if (fullName.length < 2 || !isValidEmail(email) || phone.length < 8) {
    return null;
  }

  return { fullName, email, phone, company, unitsCount, message };
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, {
      success: false,
      error: "Requête invalide.",
      code: "INVALID_JSON"
    });
  }

  const data = parseDemoRequest(body);
  if (!data) {
    return jsonResponse(400, {
      success: false,
      error: "Vérifiez les champs du formulaire.",
      code: "VALIDATION_ERROR"
    });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  const toEmail = LEGAL_CONTACT_EMAIL;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
      <h1 style="margin:0 0 16px;font-size:20px;">Nouvelle demande de démo</h1>
      <p style="margin:0 0 8px;"><strong>Nom :</strong> ${escapeHtml(data.fullName)}</p>
      <p style="margin:0 0 8px;"><strong>E-mail :</strong> ${escapeHtml(data.email)}</p>
      <p style="margin:0 0 8px;"><strong>Téléphone :</strong> ${escapeHtml(data.phone)}</p>
      <p style="margin:0 0 8px;"><strong>Organisation :</strong> ${escapeHtml(data.company || "—")}</p>
      <p style="margin:0 0 8px;"><strong>Logements :</strong> ${escapeHtml(data.unitsCount || "—")}</p>
      <p style="margin:16px 0 8px;"><strong>Message :</strong></p>
      <p style="margin:0;white-space:pre-wrap;color:#334155;">${escapeHtml(data.message || "—")}</p>
    </div>
  `;

  if (!apiKey || !fromEmail) {
    console.info("[demo-requests] Resend not configured; request logged:", {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      company: data.company,
      unitsCount: data.unitsCount
    });
    return jsonResponse(200, { success: true, data: { queued: false, logged: true } });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: data.email,
        subject: `Demande de démo — ${data.fullName}`,
        html
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[demo-requests] Resend failed:", response.status, text);
      return jsonResponse(502, {
        success: false,
        error: "Envoi impossible pour le moment. Contactez-nous sur WhatsApp.",
        code: "EMAIL_SEND_FAILED"
      });
    }
  } catch (error) {
    console.error("[demo-requests] Unexpected error:", error);
    return jsonResponse(502, {
      success: false,
      error: "Envoi impossible pour le moment. Contactez-nous sur WhatsApp.",
      code: "EMAIL_SEND_FAILED"
    });
  }

  return jsonResponse(200, { success: true, data: { queued: true } });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
