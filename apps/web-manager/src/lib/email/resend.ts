type SendTenantInvitationEmailInput = {
  to: string;
  tenantFullName: string;
  activationLink: string;
  organizationName?: string | null;
};

type SendLeaseDraftEmailInput = {
  to: string;
  tenantFullName: string;
  organizationName?: string | null;
};

type SendTeamMemberInvitationEmailInput = {
  to: string;
  organizationName: string;
  activationLink: string;
};

export type TenantInvitationEmailSender = (
  input: SendTenantInvitationEmailInput
) => Promise<void>;

export type LeaseDraftEmailSender = (
  input: SendLeaseDraftEmailInput
) => Promise<void>;

export type TeamMemberInvitationEmailSender = (
  input: SendTeamMemberInvitationEmailInput
) => Promise<void>;

function buildHtml(input: SendTenantInvitationEmailInput): string {
  const organizationLine = input.organizationName
    ? `<p style="margin:0 0 12px;color:#475569;font-size:14px;">Organisation: ${input.organizationName}</p>`
    : "";

  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;">Bienvenue sur Hhousing</h1>
      <p style="margin:0 0 12px;color:#334155;font-size:14px;">Bonjour ${input.tenantFullName},</p>
      <p style="margin:0 0 12px;color:#334155;font-size:14px;">
        Votre dossier de location a ete cree. Utilisez le lien ci-dessous pour activer votre acces et consulter les informations qui vous ont ete partagees.
      </p>
      ${organizationLine}
      <p style="margin:24px 0;">
        <a href="${input.activationLink}" style="display:inline-block;background:#0063fe;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">
          Activer mon acces
        </a>
      </p>
      <p style="margin:0;color:#64748b;font-size:13px;word-break:break-all;">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur : ${input.activationLink}
      </p>
    </div>
  `;
}

function buildLeaseDraftHtml(input: SendLeaseDraftEmailInput): string {
  const organizationLine = input.organizationName
    ? `<p style="margin:0 0 12px;color:#475569;font-size:14px;">Organisation: ${input.organizationName}</p>`
    : "";

  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;">Votre bail est pret</h1>
      <p style="margin:0 0 12px;color:#334155;font-size:14px;">Bonjour ${input.tenantFullName},</p>
      <p style="margin:0 0 12px;color:#334155;font-size:14px;">
        Votre bail vous a ete envoye pour verification et completion. La piece jointe ou le document final sera branche ici dans une prochaine iteration.
      </p>
      <p style="margin:0 0 12px;color:#334155;font-size:14px;">
        Pour le moment, cet email confirme simplement que votre dossier locatif a ete initialise par la gestion.
      </p>
      ${organizationLine}
    </div>
  `;
}

function buildTeamMemberInvitationHtml(input: SendTeamMemberInvitationEmailInput): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;">Invitation equipe Hhousing</h1>
      <p style="margin:0 0 12px;color:#334155;font-size:14px;">
        Vous avez ete invite a rejoindre l'organisation ${input.organizationName} sur Hhousing.
      </p>
      <p style="margin:0 0 12px;color:#334155;font-size:14px;">
        Utilisez le lien ci-dessous pour definir votre mot de passe et activer votre acces operateur.
      </p>
      <p style="margin:24px 0;">
        <a href="${input.activationLink}" style="display:inline-block;background:#0063fe;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">
          Activer mon acces
        </a>
      </p>
      <p style="margin:0;color:#64748b;font-size:13px;word-break:break-all;">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur : ${input.activationLink}
      </p>
    </div>
  `;
}

function createResendClient(): { apiKey: string; fromEmail: string } {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    throw new Error("RESEND_EMAIL_NOT_CONFIGURED");
  }

  return { apiKey, fromEmail };
}

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const { apiKey, fromEmail } = createResendClient();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [params.to],
      subject: params.subject,
      html: params.html
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`RESEND_SEND_FAILED:${response.status}:${text}`);
  }
}

export function createTenantInvitationEmailSenderFromEnv(): TenantInvitationEmailSender {
  return async (input: SendTenantInvitationEmailInput): Promise<void> => {
    await sendEmail({
      to: input.to,
      subject: "Votre acces locataire Hhousing",
      html: buildHtml(input)
    });
  };
}

export function createLeaseDraftEmailSenderFromEnv(): LeaseDraftEmailSender {
  return async (input: SendLeaseDraftEmailInput): Promise<void> => {
    await sendEmail({
      to: input.to,
      subject: "Votre bail Hhousing",
      html: buildLeaseDraftHtml(input)
    });
  };
}

export function createTeamMemberInvitationEmailSenderFromEnv(): TeamMemberInvitationEmailSender {
  return async (input: SendTeamMemberInvitationEmailInput): Promise<void> => {
    await sendEmail({
      to: input.to,
      subject: "Votre invitation equipe Hhousing",
      html: buildTeamMemberInvitationHtml(input)
    });
  };
}