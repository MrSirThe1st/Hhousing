import type { Organization } from "@hhousing/domain";

type SendTenantInvitationEmailInput = {
  to: string;
  tenantFullName: string;
  activationLink: string;
  organization?: Organization | null;
};

type SendLeaseDraftEmailInput = {
  to: string;
  tenantFullName: string;
  organization?: Organization | null;
};

type SendTeamMemberInvitationEmailInput = {
  to: string;
  organizationName: string;
  activationLink: string;
};

type SendOwnerInvitationEmailInput = {
  to: string;
  ownerName: string;
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

export type OwnerInvitationEmailSender = (
  input: SendOwnerInvitationEmailInput
) => Promise<void>;

export interface ManagedEmailAttachmentInput {
  fileName: string;
  mimeType: string;
  fileUrl: string;
}

function buildOrganizationHeader(organization?: Organization | null): string {
  if (!organization) {
    return "";
  }

  const logo = organization.logoUrl
    ? `<div style="margin:0 0 16px;"><img src="${organization.logoUrl}" alt="${organization.name}" style="max-height:52px;max-width:180px;object-fit:contain;display:block;" /></div>`
    : "";

  const contactParts = [organization.contactEmail, organization.contactPhone, organization.contactWhatsapp]
    .filter((value): value is string => Boolean(value));
  const contactLine = contactParts.length > 0
    ? `<p style="margin:0 0 12px;color:#475569;font-size:13px;">${contactParts.join(" · ")}</p>`
    : "";

  return `${logo}<p style="margin:0 0 6px;color:#0f172a;font-size:16px;font-weight:600;">${organization.name}</p>${contactLine}`;
}

function buildOrganizationFooter(organization?: Organization | null): string {
  if (!organization) {
    return "";
  }

  const lines = [organization.emailSignature, organization.websiteUrl, organization.address]
    .filter((value): value is string => Boolean(value))
    .map((line) => `<p style="margin:0 0 8px;color:#64748b;font-size:13px;">${line}</p>`)
    .join("");

  return lines.length > 0
    ? `<div style="margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;">${lines}</div>`
    : "";
}

function buildManagedEmailHtml(body: string, organization?: Organization | null): string {
  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line, index, array) => line.length > 0 || (index > 0 && array[index - 1].length > 0));

  const htmlBody = lines
    .map((line) => (line.length === 0 ? "<div style=\"height:12px\"></div>" : `<p style=\"margin:0 0 12px;color:#334155;font-size:14px;\">${line}</p>`))
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
      ${buildOrganizationHeader(organization)}
      ${htmlBody}
      ${buildOrganizationFooter(organization)}
    </div>
  `;
}

function buildHtml(input: SendTenantInvitationEmailInput): string {
  const organizationLine = input.organization
    ? `<p style="margin:0 0 12px;color:#475569;font-size:14px;">Organisation: ${input.organization.name}</p>`
    : "";

  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
      ${buildOrganizationHeader(input.organization)}
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
      ${buildOrganizationFooter(input.organization)}
    </div>
  `;
}

function buildLeaseDraftHtml(input: SendLeaseDraftEmailInput): string {
  const organizationLine = input.organization
    ? `<p style="margin:0 0 12px;color:#475569;font-size:14px;">Organisation: ${input.organization.name}</p>`
    : "";

  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
      ${buildOrganizationHeader(input.organization)}
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;">Votre bail est pret</h1>
      <p style="margin:0 0 12px;color:#334155;font-size:14px;">Bonjour ${input.tenantFullName},</p>
      <p style="margin:0 0 12px;color:#334155;font-size:14px;">
        Votre bail vous a ete envoye pour verification et completion. La piece jointe ou le document final sera branche ici dans une prochaine iteration.
      </p>
      <p style="margin:0 0 12px;color:#334155;font-size:14px;">
        Pour le moment, cet email confirme simplement que votre dossier locatif a ete initialise par la gestion.
      </p>
      ${organizationLine}
      ${buildOrganizationFooter(input.organization)}
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
        Utilisez le lien ci-dessous pour activer votre acces avec votre propre compte. Si vous n'avez pas encore de compte, vous pourrez en creer un. Si vous en avez deja un, vous pourrez vous connecter puis rejoindre l'organisation.
      </p>
      <p style="margin:0 0 12px;color:#334155;font-size:14px;">
        Votre acces reste personnel. Ne partagez pas vos identifiants avec le gestionnaire qui vous a invite.
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

function buildOwnerInvitationHtml(input: SendOwnerInvitationEmailInput): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;">Invitation owner Hhousing</h1>
      <p style="margin:0 0 12px;color:#334155;font-size:14px;">
        Vous avez été invité à accéder au portail owner de ${input.organizationName} sur Hhousing.
      </p>
      <p style="margin:0 0 12px;color:#334155;font-size:14px;">
        Ce portail est réservé au suivi de votre portefeuille en lecture seule: propriétés, paiements et rapports.
      </p>
      <p style="margin:0 0 12px;color:#334155;font-size:14px;">
        Profil concerné: ${input.ownerName}
      </p>
      <p style="margin:24px 0;">
        <a href="${input.activationLink}" style="display:inline-block;background:#0063fe;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">
          Activer mon accès owner
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
  attachments?: Array<{ filename: string; content: string; type: string }>;
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
      html: params.html,
      attachments: params.attachments
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`RESEND_SEND_FAILED:${response.status}:${text}`);
  }
}

async function fetchAttachment(input: ManagedEmailAttachmentInput): Promise<{ filename: string; content: string; type: string }> {
  const response = await fetch(input.fileUrl);
  if (!response.ok) {
    throw new Error(`EMAIL_ATTACHMENT_FETCH_FAILED:${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  return {
    filename: input.fileName,
    content: buffer.toString("base64"),
    type: input.mimeType
  };
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

export function createOwnerInvitationEmailSenderFromEnv(): OwnerInvitationEmailSender {
  return async (input: SendOwnerInvitationEmailInput): Promise<void> => {
    await sendEmail({
      to: input.to,
      subject: "Votre invitation owner Hhousing",
      html: buildOwnerInvitationHtml(input)
    });
  };
}

export async function sendManagedEmailFromEnv(input: {
  to: string;
  subject: string;
  body: string;
  organization?: Organization | null;
  attachments?: ManagedEmailAttachmentInput[];
}): Promise<void> {
  const attachments = input.attachments
    ? await Promise.all(input.attachments.map(fetchAttachment))
    : undefined;

  await sendEmail({
    to: input.to,
    subject: input.subject,
    html: buildManagedEmailHtml(input.body, input.organization),
    attachments
  });
}