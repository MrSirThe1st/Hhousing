"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrganizationMembership } from "@hhousing/domain";
import { TeamFunctionCode, type TeamFunction, type TeamInviteRole } from "@hhousing/api-contracts";
import { postWithAuth, patchWithAuth } from "../lib/api-client";

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
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<TeamInviteRole>("property_manager");
  const [selectedFunctions, setSelectedFunctions] = useState<TeamFunctionCode[]>([]);
  const [canOwnProperties, setCanOwnProperties] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Edit-functions state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editFunctions, setEditFunctions] = useState<TeamFunctionCode[]>([]);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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

    try {
      // Step 1: If userId not yet resolved, look it up from email
      let resolvedUserId = userId;
      if (!resolvedUserId) {
        const lookupResult = await postWithAuth<{ userId: string; email: string }>(
          "/api/organizations/members/lookup",
          { email: email.trim() }
        );

        if (!lookupResult.success) {
          setError(lookupResult.error);
          setBusy(false);
          return;
        }

        resolvedUserId = lookupResult.data.userId;
        setUserId(resolvedUserId);
      }

      // Step 2: Invite with resolved userId
      const result = await postWithAuth<OrganizationMembership>("/api/organizations/members", {
        userId: resolvedUserId,
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
      setEmail("");
      setUserId(null);
      setRole("property_manager");
      setSelectedFunctions([]);
      setCanOwnProperties(false);
      setBusy(false);
      router.refresh();
    } catch (err) {
      setError("Erreur lors de l'invitation");
      setBusy(false);
    }
  }

  function openEditFunctions(memberId: string, currentFunctions: TeamFunction[]): void {
    setEditingMemberId(memberId);
    setEditFunctions(currentFunctions.map((f) => f.functionCode as TeamFunctionCode));
    setEditError(null);
  }

  function handleEditFunctionToggle(functionCode: TeamFunctionCode): void {
    setEditFunctions((current) =>
      current.includes(functionCode)
        ? current.filter((v) => v !== functionCode)
        : [...current, functionCode]
    );
  }

  async function handleSaveFunctions(memberId: string): Promise<void> {
    setEditBusy(true);
    setEditError(null);

    const result = await patchWithAuth<{ functions: TeamFunction[] }>(
      `/api/organizations/members/${memberId}/functions`,
      { functions: editFunctions }
    );

    if (!result.success) {
      setEditError(result.error);
      setEditBusy(false);
      return;
    }

    setEditingMemberId(null);
    setEditFunctions([]);
    setEditBusy(false);
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
          Entrez l&apos;adresse email du membre, choisissez un rôle système puis assignez les fonctions de travail.
        </p>

        {functionsUnavailable ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Les tables de permissions ne sont pas encore disponibles dans la base de données. Appliquez les migrations 0009 et 0010 puis rechargez la page.
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="email@example.com"
            type="email"
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
            email.trim().length === 0 ||
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
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map(({ membership, functions }) => (
                <tr key={membership.id}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{membership.userId}</td>
                  <td className="px-4 py-3">{membership.role}</td>
                  <td className="px-4 py-3">
                    {editingMemberId === membership.id ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {assignableFunctions.map((teamFunction) => {
                            const checked = editFunctions.includes(teamFunction.functionCode);
                            return (
                              <label
                                key={teamFunction.id}
                                className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => handleEditFunctionToggle(teamFunction.functionCode)}
                                />
                                {teamFunction.displayName}
                              </label>
                            );
                          })}
                        </div>
                        {editError ? (
                          <p className="text-xs text-red-600">{editError}</p>
                        ) : null}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={editBusy || editFunctions.length === 0}
                            onClick={() => handleSaveFunctions(membership.id)}
                            className="rounded bg-[#0063fe] px-2.5 py-1 text-xs font-medium text-white disabled:opacity-60"
                          >
                            {editBusy ? "..." : "Enregistrer"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingMemberId(null)}
                            className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-600"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : functions.length > 0 ? (
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
                  <td className="px-4 py-3">
                    {membership.role === "property_manager" && !functionsUnavailable && editingMemberId !== membership.id ? (
                      <button
                        type="button"
                        onClick={() => openEditFunctions(membership.id, functions)}
                        className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        Éditer
                      </button>
                    ) : null}
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
