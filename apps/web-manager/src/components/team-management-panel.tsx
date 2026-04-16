"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TeamFunctionCode, type TeamFunction } from "@hhousing/api-contracts";
import type { OrganizationMembership, TeamMemberInvitation } from "@hhousing/domain";
import { deleteWithAuth, patchWithAuth, postWithAuth } from "../lib/api-client";
import UniversalLoadingState from "./universal-loading-state";

type TeamDashboardMember = OrganizationMembership & {
  displayName: string;
  email: string | null;
  functions: TeamFunction[];
};

type TeamTab = "roles" | "properties";

type TeamManagementPanelProps = {
  members: TeamDashboardMember[];
  invitations: TeamMemberInvitation[];
  availableFunctions: TeamFunction[];
  accountOwner: TeamDashboardMember | null;
  currentUserId: string;
  canAssignAdmin: boolean;
  inviteAuthority: boolean;
  canManageTeam: boolean;
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatStatus(value: OrganizationMembership["status"]): string {
  if (value === "active") {
    return "Actif";
  }

  if (value === "inactive") {
    return "Inactif";
  }

  return "Invite";
}

function countPermissions(teamFunction: TeamFunction): number {
  if (teamFunction.permissions.includes("*")) {
    return 19;
  }

  return teamFunction.permissions.length;
}

function isAdminFunction(teamFunction: TeamFunction): boolean {
  return teamFunction.functionCode === TeamFunctionCode.ADMIN;
}

function statusClasses(value: OrganizationMembership["status"]): string {
  if (value === "active") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  }

  if (value === "inactive") {
    return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  }

  return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
}

function getMemberSubtitle(member: TeamDashboardMember): string {
  if (member.email && member.email !== member.displayName) {
    return member.email;
  }

  return `Ajoute le ${formatDate(member.createdAtIso)}`;
}

function getMemberInitials(name: string): string {
  const parts = name
    .split(" ")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 2);

  if (parts.length === 0) {
    return "MM";
  }

  return parts.map((item) => item[0]?.toUpperCase() ?? "").join("");
}

function getRoleSummary(teamFunction: TeamFunction): string {
  if (teamFunction.functionCode === TeamFunctionCode.LEASING_AGENT) {
    return "Biens, baux, locataires et documents.";
  }

  if (teamFunction.functionCode === TeamFunctionCode.ACCOUNTANT) {
    return "Paiements, encaissements et reporting.";
  }

  if (teamFunction.functionCode === TeamFunctionCode.MAINTENANCE_MANAGER) {
    return "Demandes, suivi terrain et prestataires.";
  }

  if (teamFunction.functionCode === TeamFunctionCode.ADMIN) {
    return "Acces complet sur l'espace manager.";
  }

  return teamFunction.description ?? `${countPermissions(teamFunction)} permissions associees.`;
}

function getPrimaryRoleLabel(member: TeamDashboardMember): string {
  if (member.role === "landlord") {
    return "Administrateur";
  }

  if (member.functions.some((teamFunction) => isAdminFunction(teamFunction))) {
    return "Administrateur";
  }

  return member.functions[0]?.displayName ?? "Aucun role";
}

function getPropertyAccessLabel(canOwnProperties: boolean): string {
  return canOwnProperties
    ? "Peut etre rattache a des proprietes"
    : "Aucun rattachement proprietaire";
}

function matchesMemberSearch(member: TeamDashboardMember, searchTerm: string): boolean {
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  if (normalizedSearchTerm.length === 0) {
    return true;
  }

  return [
    member.displayName,
    member.email ?? "",
    member.role,
    ...member.functions.map((teamFunction) => teamFunction.displayName)
  ].some((value) => value.toLowerCase().includes(normalizedSearchTerm));
}

function matchesInvitationSearch(invitation: TeamMemberInvitation, searchTerm: string): boolean {
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  if (normalizedSearchTerm.length === 0) {
    return true;
  }

  return invitation.email.toLowerCase().includes(normalizedSearchTerm);
}

function createFunctionDrafts(members: TeamDashboardMember[]): Record<string, string[]> {
  return members.reduce<Record<string, string[]>>((accumulator, member) => {
    accumulator[member.id] = member.functions.map((teamFunction) => teamFunction.functionCode);
    return accumulator;
  }, {});
}

export default function TeamManagementPanel({
  members,
  invitations,
  availableFunctions,
  accountOwner,
  currentUserId,
  canAssignAdmin,
  inviteAuthority,
  canManageTeam
}: TeamManagementPanelProps): React.ReactElement {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TeamTab>("roles");
  const [searchTerm, setSearchTerm] = useState("");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCanOwnProperties, setInviteCanOwnProperties] = useState(false);
  const [busyInvite, setBusyInvite] = useState(false);
  const [busyInvitationId, setBusyInvitationId] = useState<string | null>(null);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [functionDrafts, setFunctionDrafts] = useState<Record<string, string[]>>(() =>
    createFunctionDrafts(members)
  );

  useEffect(() => {
    setFunctionDrafts(createFunctionDrafts(members));
  }, [members]);

  useEffect(() => {
    if (expandedMemberId !== null) {
      return;
    }

    const firstAssignableMember = members.find(
      (member) => member.id !== accountOwner?.id && member.role !== "landlord"
    );

    if (firstAssignableMember) {
      setExpandedMemberId(firstAssignableMember.id);
    }
  }, [accountOwner?.id, expandedMemberId, members]);

  const adminFunctionCount = availableFunctions.filter((teamFunction) => isAdminFunction(teamFunction)).length;
  const filteredMembers = members.filter((member) => matchesMemberSearch(member, searchTerm));
  const filteredInvitations = invitations.filter((invitation) =>
    matchesInvitationSearch(invitation, searchTerm)
  );
  const assignableMembers = filteredMembers.filter(
    (member) => member.id !== accountOwner?.id && member.role !== "landlord"
  );
  const isActionBusy = busyInvite || busyInvitationId !== null || busyMemberId !== null;

  async function handleInvite(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!inviteAuthority) {
      setError("Seul le proprietaire du compte ou un admin peut envoyer des invitations.");
      return;
    }

    setBusyInvite(true);
    setMessage(null);
    setError(null);

    try {
      const result = await postWithAuth<{ invitationId: string }>("/api/organizations/members", {
        email: inviteEmail.trim(),
        canOwnProperties: inviteCanOwnProperties
      });

      if (!result.success) {
        setError(result.error);
        setBusyInvite(false);
        return;
      }

      setMessage("Invitation envoyee.");
      setInviteEmail("");
      setInviteCanOwnProperties(false);
      setInviteModalOpen(false);
      setBusyInvite(false);
      router.refresh();
    } catch {
      setError("Erreur lors de l'invitation");
      setBusyInvite(false);
    }
  }

  async function handleResend(invitationId: string): Promise<void> {
    setBusyInvitationId(invitationId);
    setMessage(null);
    setError(null);

    try {
      const result = await postWithAuth<{ invitationId: string }>(
        `/api/organizations/invitations/${invitationId}`,
        {}
      );

      if (!result.success) {
        setError(result.error);
        setBusyInvitationId(null);
        return;
      }

      setMessage("Invitation renvoyee.");
      setBusyInvitationId(null);
      router.refresh();
    } catch {
      setError("Erreur lors du renvoi de l'invitation");
      setBusyInvitationId(null);
    }
  }

  async function handleRevoke(invitationId: string): Promise<void> {
    setBusyInvitationId(invitationId);
    setMessage(null);
    setError(null);

    try {
      const result = await deleteWithAuth<{ invitationId: string }>(
        `/api/organizations/invitations/${invitationId}`
      );

      if (!result.success) {
        setError(result.error);
        setBusyInvitationId(null);
        return;
      }

      setMessage("Invitation annulee.");
      setBusyInvitationId(null);
      router.refresh();
    } catch {
      setError("Erreur lors de l'annulation de l'invitation");
      setBusyInvitationId(null);
    }
  }

  function handleToggleFunction(memberId: string, functionCode: string): void {
    setFunctionDrafts((currentDrafts) => {
      const nextDraft = currentDrafts[memberId] ?? [];
      const hasFunction = nextDraft.includes(functionCode);

      return {
        ...currentDrafts,
        [memberId]: hasFunction
          ? nextDraft.filter((item) => item !== functionCode)
          : [...nextDraft, functionCode]
      };
    });
  }

  async function handleSaveFunctions(memberId: string): Promise<void> {
    setBusyMemberId(memberId);
    setMessage(null);
    setError(null);

    try {
      const result = await patchWithAuth<{ functions: TeamFunction[] }>(
        `/api/organizations/members/${memberId}/functions`,
        {
          functions: functionDrafts[memberId] ?? []
        }
      );

      if (!result.success) {
        setError(result.error);
        setBusyMemberId(null);
        return;
      }

      setMessage("Roles applicatifs mis a jour.");
      setBusyMemberId(null);
      router.refresh();
    } catch {
      setError("Erreur lors de la mise a jour des roles applicatifs");
      setBusyMemberId(null);
    }
  }

  function toggleMemberEditor(memberId: string): void {
    setExpandedMemberId((current) => (current === memberId ? null : memberId));
    setMessage(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Gestion d'equipe</h1>
          <p className="mt-1 text-sm text-slate-600">Inviter, attribuer les roles et suivre l'acces des membres</p>
        </div>
        <button
          type="button"
          onClick={() => setInviteModalOpen(true)}
          disabled={!inviteAuthority}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Inviter un membre
        </button>
      </div>

      <div className="flex items-center gap-8 border-b border-slate-200 pb-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Membres</p>
          <p className="text-xl font-semibold text-slate-900">{members.length}</p>
        </div>
        <div className="h-6 w-px bg-slate-200" />
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">En attente</p>
          <p className="text-xl font-semibold text-slate-900">{invitations.length}</p>
        </div>
        <div className="h-6 w-px bg-slate-200" />
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Roles admin</p>
          <p className="text-xl font-semibold text-slate-900">{adminFunctionCount}</p>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          {[
            { id: "roles" as const, label: "Roles et permissions" },
            { id: "properties" as const, label: "Permissions par propriete" }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-1 py-3 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "border-[#0063fe] text-slate-900"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full max-w-xs">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
              placeholder="Rechercher..."
            />
          </label>
        </div>

        {message ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>
        ) : null}
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        ) : null}

        {activeTab === "roles" ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Comment ca fonctionne</h2>
              <p className="mt-1 text-sm text-slate-600">
                Le compte principal a deja l'acces complet. Les roles ne se donnent qu'aux membres invites, une fois leur compte active. Invite un membre, attends qu'il accepte, puis configure ses roles.
              </p>
            </div>

            {accountOwner ? (
              <div className="rounded-lg border border-slate-200 bg-white">
                <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0063fe] text-sm font-semibold text-white">
                      {getMemberInitials(accountOwner.displayName)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold text-slate-900">{accountOwner.displayName}</p>
                        {accountOwner.userId === currentUserId ? (
                          <span className="text-xs font-medium text-slate-600">(vous)</span>
                        ) : null}
                      </div>
                      <p className="truncate text-sm text-slate-500">{getMemberSubtitle(accountOwner)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 lg:items-end">
                    <span className="text-sm font-semibold text-[#0063fe]">Administrateur</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Compte principal
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {assignableMembers.length === 0 ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-slate-900">Aucun membre a configurer</p>
                <p className="mt-2 max-w-lg text-sm text-slate-600">
                  Invitez un membre d'equipe pour commencer. Une fois son compte active, vous pourrez lui attribuer des roles.
                </p>
              </div>
            ) : (
              assignableMembers.map((member) => {
                const selectedFunctions = functionDrafts[member.id] ?? [];
                const memberBusy = busyMemberId === member.id;
                const isExpanded = expandedMemberId === member.id;

                return (
                  <div key={member.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-600 text-sm font-semibold text-white">
                          {getMemberInitials(member.displayName)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-base font-semibold text-slate-900">{member.displayName}</p>
                            {member.userId === currentUserId ? (
                              <span className="text-xs font-medium text-slate-600">(vous)</span>
                            ) : null}
                          </div>
                          <p className="truncate text-sm text-slate-500">{getMemberSubtitle(member)}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 lg:min-w-[320px] lg:items-end">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(member.status)}`}>
                            {formatStatus(member.status)}
                          </span>
                          <span className={`text-sm font-semibold ${getPrimaryRoleLabel(member) === "Administrateur" ? "text-[#0063fe]" : "text-slate-700"}`}>
                            {getPrimaryRoleLabel(member)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 lg:justify-end">
                          {member.functions.length > 1
                            ? member.functions.slice(1).map((teamFunction) => (
                                <span key={teamFunction.id} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                  {teamFunction.displayName}
                                </span>
                              ))
                            : null}
                        </div>
                        {canManageTeam ? (
                          <button
                            type="button"
                            onClick={() => toggleMemberEditor(member.id)}
                            className="text-sm font-semibold text-[#0063fe] transition hover:text-[#0052d4]"
                          >
                            {isExpanded ? "Masquer" : "Configurer"}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="border-t border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="mb-4 grid gap-2 md:grid-cols-2">
                          {availableFunctions.map((teamFunction) => {
                            const disabled = memberBusy || (isAdminFunction(teamFunction) && !canAssignAdmin);

                            return (
                              <label
                                key={teamFunction.id}
                                className={`flex gap-3 rounded-lg border px-3 py-2.5 ${disabled ? "border-slate-200 bg-slate-100 text-slate-400" : "border-slate-200 bg-white text-slate-700 cursor-pointer hover:border-slate-300"}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedFunctions.includes(teamFunction.functionCode)}
                                  onChange={() => handleToggleFunction(member.id, teamFunction.functionCode)}
                                  disabled={disabled}
                                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0063fe] focus:ring-[#0063fe]"
                                />
                                <span className="flex-1">
                                  <span className="block text-sm font-semibold text-slate-900">{teamFunction.displayName}</span>
                                  <span className="mt-0.5 block text-xs text-slate-500">{getRoleSummary(teamFunction)}</span>
                                  {isAdminFunction(teamFunction) && !canAssignAdmin ? (
                                    <span className="mt-1 block text-xs text-amber-600">Landlord uniquement</span>
                                  ) : null}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleSaveFunctions(member.id)}
                            disabled={memberBusy}
                            className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0052d4] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {memberBusy ? "Sauvegarde..." : "Enregistrer"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}

            {filteredInvitations.length > 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-4 py-3">
                  <h2 className="text-base font-semibold text-slate-900">Invitations en attente</h2>
                </div>
                <div className="divide-y divide-slate-200">
                  {filteredInvitations.map((invitation) => {
                    const invitationBusy = busyInvitationId === invitation.id;

                    return (
                      <div key={invitation.id} className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{invitation.email}</p>
                          <p className="mt-0.5 text-xs text-slate-500">Expire le {formatDate(invitation.expiresAtIso)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
                            En attente
                          </span>
                          {inviteAuthority ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleResend(invitation.id)}
                                disabled={invitationBusy}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                              >
                                {invitationBusy ? "Envoi..." : "Renvoyer"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRevoke(invitation.id)}
                                disabled={invitationBusy}
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                              >
                                Annuler
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMembers.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
                Aucun membre ne correspond a cette recherche
              </div>
            ) : (
              filteredMembers.map((member) => (
                <div key={member.id} className="rounded-lg border border-slate-200 bg-white px-4 py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-600 text-sm font-semibold text-white">
                        {getMemberInitials(member.displayName)}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-slate-900">{member.displayName}</p>
                        <p className="mt-0.5 text-sm text-slate-500">{getMemberSubtitle(member)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 lg:items-end">
                      <span className="text-sm font-medium text-slate-700">{getPropertyAccessLabel(member.capabilities.canOwnProperties)}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {member.capabilities.canOwnProperties ? "Acces proprietes active" : "Organisation uniquement"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}

            {filteredInvitations.length > 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-4 py-3">
                  <h2 className="text-base font-semibold text-slate-900">Invitations en attente</h2>
                </div>
                <div className="divide-y divide-slate-200">
                  {filteredInvitations.map((invitation) => (
                    <div key={invitation.id} className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{invitation.email}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{getPropertyAccessLabel(invitation.canOwnProperties)}</p>
                      </div>
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
                        En attente
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {inviteModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setInviteModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Inviter un nouveau membre"
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Inviter un nouveau membre</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Les roles seront attribues apres activation du compte
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Fermer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-5 px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Email *</span>
                  <input
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
                    type="email"
                    placeholder="membre@entreprise.com"
                    required
                    disabled={busyInvite || !inviteAuthority}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Acces proprietes</span>
                  <select
                    value={inviteCanOwnProperties ? "enabled" : "disabled"}
                    onChange={(event) => setInviteCanOwnProperties(event.target.value === "enabled")}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
                    disabled={busyInvite || !inviteAuthority}
                  >
                    <option value="disabled">Organisation uniquement</option>
                    <option value="enabled">Peut etre attache aux proprietes</option>
                  </select>
                </label>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <p className="font-medium">Note importante</p>
                <p className="mt-1 text-blue-600">Les champs nom, telephone et role detaille ne sont pas encore supportes. Cette fenetre reste fonctionnelle sur les donnees disponibles.</p>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!inviteAuthority || busyInvite || inviteEmail.trim().length === 0}
                  className="rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyInvite ? "Envoi..." : "Envoyer l'invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isActionBusy ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
    </div>
  );
}
