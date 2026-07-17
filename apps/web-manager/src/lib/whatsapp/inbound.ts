import type { PaymentRepository, TenantLeaseRepository } from "@hhousing/data-access";
import { createWhatsAppClientFromEnv, isWhatsAppConfigured } from "./meta";
import { getTenantRentSummaryByPhone } from "./flows/voir-mon-loyer";

const MENU_TRIGGER_PATTERN = /^(menu|bonjour|bonsoir|salut|hi|hello|aide|help)\b/i;
const VOIR_LOYER_PATTERN = /(voir\s+mon\s+loyer|mon\s+loyer|loyer)/i;

type IncomingWhatsAppMessage = {
  from?: string;
  type?: string;
  text?: { body?: string };
  interactive?: {
    type?: string;
    list_reply?: { id?: string; title?: string };
    button_reply?: { id?: string; title?: string };
  };
};

function normalizeIncomingText(message: IncomingWhatsAppMessage): string {
  if (message.type === "text") {
    return message.text?.body?.trim() ?? "";
  }

  if (message.type === "interactive") {
    return (
      message.interactive?.list_reply?.id
      ?? message.interactive?.button_reply?.id
      ?? message.interactive?.list_reply?.title
      ?? message.interactive?.button_reply?.title
      ?? ""
    ).trim();
  }

  return "";
}

function isVoirMonLoyerIntent(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return (
    normalized === "voir_mon_loyer"
    || normalized === "voir mon loyer"
    || VOIR_LOYER_PATTERN.test(normalized)
  );
}

function isMenuIntent(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return normalized === "menu" || MENU_TRIGGER_PATTERN.test(normalized);
}

async function replyVoirMonLoyer(params: {
  to: string;
  tenantRepository: TenantLeaseRepository;
  paymentRepository: PaymentRepository;
}): Promise<void> {
  if (!isWhatsAppConfigured()) {
    return;
  }

  const client = createWhatsAppClientFromEnv();
  const flowId = process.env.WHATSAPP_FLOW_VOIR_LOYER_ID?.trim();

  if (flowId) {
    await client.sendFlowMessage({
      to: params.to,
      bodyText: "Consultez le détail de votre loyer.",
      flowId,
      flowCta: "Voir mon loyer",
      flowToken: `phone:${params.to}`
    });
    return;
  }

  const summary = await getTenantRentSummaryByPhone({
    phone: params.to,
    tenantRepository: params.tenantRepository,
    paymentRepository: params.paymentRepository
  });

  if (!summary) {
    await client.sendTextMessage({
      to: params.to,
      body: "Nous n'avons pas trouvé de compte locataire pour ce numéro. Contactez votre gestionnaire."
    });
    return;
  }

  await client.sendTextMessage({
    to: params.to,
    body: [
      `Bonjour ${summary.tenantFullName},`,
      "",
      `Montant : ${summary.amountLabel}`,
      `Échéance : ${summary.dueDateLabel}`,
      `Statut : ${summary.statusLabel}`
    ].join("\n")
  });
}

async function replyMenu(to: string): Promise<void> {
  if (!isWhatsAppConfigured()) {
    return;
  }

  const client = createWhatsAppClientFromEnv();
  await client.sendInteractiveListMessage({
    to,
    bodyText: "Que souhaitez-vous faire ?",
    buttonText: "Options",
    sections: [
      {
        title: "Mon compte",
        rows: [
          {
            id: "voir_mon_loyer",
            title: "Voir mon loyer",
            description: "Montant, échéance et statut"
          }
          // Payer will be added later
        ]
      }
    ]
  });
}

export async function handleIncomingWhatsAppMessages(params: {
  messages: IncomingWhatsAppMessage[];
  tenantRepository: TenantLeaseRepository;
  paymentRepository: PaymentRepository;
}): Promise<number> {
  let handled = 0;

  for (const message of params.messages) {
    const from = message.from?.trim();
    if (!from) {
      continue;
    }

    const text = normalizeIncomingText(message);
    if (!text) {
      continue;
    }

    try {
      if (isVoirMonLoyerIntent(text)) {
        await replyVoirMonLoyer({
          to: from,
          tenantRepository: params.tenantRepository,
          paymentRepository: params.paymentRepository
        });
        handled += 1;
        continue;
      }

      if (isMenuIntent(text)) {
        await replyMenu(from);
        handled += 1;
      }
    } catch (error) {
      console.error("[whatsapp:inbound] failed to handle message", { from, text, error });
    }
  }

  return handled;
}
