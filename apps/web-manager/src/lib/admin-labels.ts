export function getPlatformAuditActionLabel(actionKey: string): string {
  switch (actionKey) {
    case "user.suspend":
      return "Utilisateur suspendu";
    case "user.activate":
      return "Utilisateur réactivé";
    case "organization.suspend":
      return "Organisation suspendue";
    case "organization.activate":
      return "Organisation réactivée";
    case "platform_admin.grant":
      return "Admin plateforme accordé";
    case "platform_admin.revoke":
      return "Admin plateforme révoqué";
    case "billing.settings.update":
      return "Paramètres facturation mis à jour";
    case "billing.payment_method.create":
      return "Moyen de paiement ajouté";
    case "billing.payment_method.update":
      return "Moyen de paiement modifié";
    case "billing.payment_method.delete":
      return "Moyen de paiement supprimé";
    case "billing.invoices.generate":
      return "Factures SaaS générées";
    case "billing.invoice.paid":
      return "Facture SaaS confirmée payée";
    case "billing.invoice.void":
      return "Facture SaaS annulée";
    default:
      return actionKey;
  }
}

export function getPlatformEntityTypeLabel(entityType: string): string {
  switch (entityType) {
    case "user":
      return "Utilisateur";
    case "organization":
      return "Organisation";
    case "platform_admin":
      return "Admin plateforme";
    case "billing_settings":
      return "Paramètres facturation";
    case "payment_method":
      return "Moyen de paiement";
    case "saas_invoice":
      return "Facture SaaS";
    case "saas_invoice_batch":
      return "Lot de factures SaaS";
    default:
      return entityType;
  }
}
