"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrganizationMembership, TeamMemberInvitation } from "@hhousing/domain";
import { postWithAuth } from "../lib/api-client";

type TeamManagementPanelProps = {
  organizationId: string;
  members: OrganizationMembership[];
  invitations: TeamMemberInvitation[];
};

export default function TeamManagementPanel({
  organizationId,
  members,
  invitations
}: TeamManagementPanelProps): React.ReactElement {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [canOwnProperties, setCanOwnProperties] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleInvite(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const result = await postWithAuth<{ invitationId: string }>("/api/organizations/members", {
        email: email.trim(),
        canOwnProperties
      });

      if (!result.success) {
        setError(result.error);
        setBusy(false);
        return;
      }

      setMessage("Invitation envoyee.");
      setEmail("");
      setCanOwnProperties(false);
      setBusy(false);
      router.refresh();
    } catch {
      setError("Erreur lors de l'invitation");
      setBusy(false);
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#010a19]">Équipe</h1>
        <p className="text-sm text-gray-600 mt-1">
          Organisation: {organizationId}
        </p>
      </div>

      <form onSubmit={handleInvite} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-base font-semibold text-[#010a19]">Inviter un membre</h2>
        <p className="text-sm text-gray-500">
          Entrez l&apos;adresse email. Le membre definira ensuite son mot de passe depuis le lien recu par email.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="email@example.com"
            type="email"
            required
          />
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={canOwnProperties}
            onChange={(event) => setCanOwnProperties(event.target.checked)}
          />
          Peut posseder des proprietes
        </label>

        <button
          type="submit"
          disabled={busy || email.trim().length === 0}
          className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
        >
          {busy ? "Invitation..." : "Inviter"}
        </button>

        {message && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{message}</p>
        )}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}
      </form>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-base font-semibold text-[#010a19]">Invitations en attente ({invitations.length})</h2>
        </div>

        {invitations.length === 0 ? (
          <div className="px-4 py-8 text-sm text-gray-400">Aucune invitation en attente.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Capabilities</th>
                <th className="px-4 py-3 text-left">Expiration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invitations.map((invitation) => (
                <tr key={invitation.id}>
                  <td className="px-4 py-3">{invitation.email}</td>
                  <td className="px-4 py-3">{invitation.role}</td>
                  <td className="px-4 py-3">{invitation.canOwnProperties ? "canOwnProperties" : "-"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(invitation.expiresAtIso).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-base font-semibold text-[#010a19]">Membres ({members.length})</h2>
        </div>

        {members.length === 0 ? (
          <div className="px-4 py-8 text-sm text-gray-400">Aucun membre.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">User ID</th>
                <th className="px-4 py-3 text-left">Rôle</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Capabilities</th>
                <th className="px-4 py-3 text-left">Ajouté le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((membership) => (
                <tr key={membership.id}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{membership.userId}</td>
                  <td className="px-4 py-3">{membership.role}</td>
                  <td className="px-4 py-3">{membership.status}</td>
                  <td className="px-4 py-3">{membership.capabilities.canOwnProperties ? "canOwnProperties" : "-"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(membership.createdAtIso).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
