"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrganizationMembership } from "@hhousing/domain";
import { TeamFunctionCode, type TeamFunction, type TeamInviteRole } from "@hhousing/api-contracts";
import { postWithAuth } from "../lib/api-client";

export interface TeamMemberRow {
  membership: OrganizationMembership;
  functions: TeamFunction[];
}

type TeamManagementPanelProps = {
  organizationId: string;
  inviterRole: "landlord" | "property_manager";
  members: TeamMemberRow[];
  availableFunctions: TeamFunction[];
  functionsUnavailable: boolean;
};

export default function TeamManagementPanel({
  organizationId,
  inviterRole,
  members,
  availableFunctions,
  functionsUnavailable
}: TeamManagementPanelProps): React.ReactElement {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<TeamInviteRole>("property_manager");
  const [selectedFunctions, setSelectedFunctions] = useState<TeamFunctionCode[]>([]);
  const [canOwnProperties, setCanOwnProperties] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assignableFunctions = availableFunctions.filter((teamFunction) => {
    if (inviterRole === "landlord") {
      return true;
    }

    return teamFunction.functionCode !== TeamFunctionCode.ADMIN;
  });

  function handleFunctionToggle(functionCode: TeamFunctionCode): void {
    setSelectedFunctions((current) =>
      current.includes(functionCode)
        ? current.filter((value) => value !== functionCode)
        : [...current, functionCode]
    );
  }

  function handleRoleChange(nextRole: TeamInviteRole): void {
    setRole(nextRole);
    if (nextRole === "landlord") {
      setSelectedFunctions([]);
    }
  }

  async function handleInvite(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);

    const result = await postWithAuth<OrganizationMembership>("/api/organizations/members", {
      userId: userId.trim(),
      role,
      canOwnProperties,
      functions: role === "property_manager" ? selectedFunctions : undefined
    });

    if (!result.success) {
      setError(result.error);
      setBusy(false);
      return;
    }

    setMessage("Membre ajouté à votre organisation.");
    setUserId("");
    setRole("property_manager");
    setSelectedFunctions([]);
    setCanOwnProperties(false);
    setBusy(false);
    router.refresh();
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
          Entrez l&apos;ID utilisateur Supabase, choisissez un rôle système puis assignez les fonctions de travail.
        </p>

        {functionsUnavailable ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Les tables de permissions ne sont pas encore disponibles dans la base de données. Appliquez les migrations 0009 et 0010 puis rechargez la page.
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="user_id"
            required
          />
          <select
            value={role}
            onChange={(event) => handleRoleChange(event.target.value as TeamInviteRole)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="property_manager">property_manager</option>
            {inviterRole === "landlord" ? (
              <option value="landlord">landlord</option>
            ) : null}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={canOwnProperties}
              onChange={(event) => setCanOwnProperties(event.target.checked)}
            />
            Peut posséder des propriétés
          </label>
        </div>

        {role === "property_manager" ? (
          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div>
              <h3 className="text-sm font-semibold text-[#010a19]">Fonctions</h3>
              <p className="text-sm text-gray-500">
                Sélectionnez au moins une fonction pour définir ce que ce membre peut faire.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {assignableFunctions.map((teamFunction) => {
                const checked = selectedFunctions.includes(teamFunction.functionCode);

                return (
                  <label
                    key={teamFunction.id}
                    className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleFunctionToggle(teamFunction.functionCode)}
                    />
                    <span>
                      <span className="block font-medium text-[#010a19]">{teamFunction.displayName}</span>
                      {teamFunction.description ? (
                        <span className="block text-xs text-gray-500 mt-1">{teamFunction.description}</span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Un membre avec le rôle <span className="font-medium">landlord</span> a déjà l&apos;accès complet de l&apos;organisation.
          </div>
        )}

        <button
          type="submit"
          disabled={
            busy ||
            userId.trim().length === 0 ||
            (role === "property_manager" && (functionsUnavailable || selectedFunctions.length === 0))
          }
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
                <th className="px-4 py-3 text-left">Fonctions</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Capabilities</th>
                <th className="px-4 py-3 text-left">Ajouté le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map(({ membership, functions }) => (
                <tr key={membership.id}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{membership.userId}</td>
                  <td className="px-4 py-3">{membership.role}</td>
                  <td className="px-4 py-3">
                    {functions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {functions.map((teamFunction) => (
                          <span
                            key={teamFunction.id}
                            className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
                          >
                            {teamFunction.displayName}
                          </span>
                        ))}
                      </div>
                    ) : membership.role === "landlord" ? (
                      <span className="text-xs text-gray-500">Accès complet</span>
                    ) : (
                      <span className="text-xs text-gray-500">Aucune fonction assignée</span>
                    )}
                  </td>
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
