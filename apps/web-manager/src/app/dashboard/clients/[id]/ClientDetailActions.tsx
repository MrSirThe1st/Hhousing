"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ActionMenu from "../../../../components/action-menu";
import { deleteWithAuth } from "../../../../lib/api-client";

interface ClientDetailActionsProps {
  clientId: string;
}

export default function ClientDetailActions({ clientId }: ClientDetailActionsProps): React.ReactElement {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(): Promise<void> {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce propriétaire ? Cette action est irréversible et déliera ses propriétés.")) {
      return;
    }

    setDeleting(true);
    setError(null);

    const result = await deleteWithAuth(`/api/owners/${clientId}`);
    if (!result.success) {
      setError(result.error);
      alert(result.error || "Une erreur est survenue lors de la suppression.");
      setDeleting(false);
      return;
    }

    router.push("/dashboard/clients");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <ActionMenu
        triggerLabel="Actions"
        items={[
          { label: "Modifier le client", href: `/dashboard/clients/${clientId}/edit` },
          { label: "Affecter un bien / Inviter", href: `/dashboard/clients/${clientId}/assign` },
          {
            label: deleting ? "Suppression..." : "Supprimer le client",
            onSelect: handleDelete,
            tone: "danger",
            disabled: deleting
          }
        ]}
      />
      {error ? <p className="text-xs text-red-600 mt-1">{error}</p> : null}
    </div>
  );
}
