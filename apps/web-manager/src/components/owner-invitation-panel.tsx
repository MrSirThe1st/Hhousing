"use client";

import { useState } from "react";
import type { CreateOwnerInvitationOutput } from "@hhousing/api-contracts";
import { postWithAuth } from "../lib/api-client";

interface OwnerInvitationPanelProps {
  ownerId: string;
  ownerName: string;
}

export default function OwnerInvitationPanel({ ownerId, ownerName }: OwnerInvitationPanelProps): React.ReactElement {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);

    const result = await postWithAuth<CreateOwnerInvitationOutput>(`/api/owners/${ownerId}/invite`, {
      email: email.trim()
    });

    if (!result.success) {
      setError(result.error);
      setBusy(false);
      return;
    }

    setMessage(`Invitation envoyée à ${result.data.email}. Expire le ${new Date(result.data.expiresAtIso).toLocaleDateString("fr-FR")}.`);
    setBusy(false);
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[#010a19]">Inviter cet owner</h2>
      <p className="mt-1 text-sm text-gray-500">
        Envoyez un lien d'activation au propriétaire {ownerName}. Il pourra créer son mot de passe puis accéder à son portail en lecture seule.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
        <label className="block flex-1 text-sm font-medium text-gray-700">
          <span className="mb-1.5 block">Email de l'owner</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="owner@example.com"
            required
          />
        </label>
        <button
          type="submit"
          disabled={busy || email.trim().length === 0}
          className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
        >
          {busy ? "Envoi..." : "Envoyer l'invitation"}
        </button>
      </form>

      {message ? (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </section>
  );
}
