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
    default:
      return entityType;
  }
}
