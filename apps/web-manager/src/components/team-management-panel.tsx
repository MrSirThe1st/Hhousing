"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TeamFunctionCode, type TeamFunction } from "@hhousing/api-contracts";
import type { OrganizationMembership, TeamMemberInvitation } from "@hhousing/domain";
import { deleteWithAuth, patchWithAuth, postWithAuth } from "../lib/api-client";

type TeamDashboardMember = OrganizationMembership & {
  functions: TeamFunction[];
};

type TeamActivityItem = {
  id: string;
  occurredAtIso: string;
  title: string;
  detail: string;
  tone: "blue" | "emerald" | "amber" | "slate";
};

type TeamManagementPanelProps = {
  organizationId: string;
  members: TeamDashboardMember[];
  invitations: TeamMemberInvitation[];
  availableFunctions: TeamFunction[];
  teamActivity: TeamActivityItem[];
  accountOwner: OrganizationMembership | null;
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

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatRole(value: OrganizationMembership["role"]): string {
  if (value === "landlord") {
    return "Compte principal";
  }

  if (value === "property_manager") {
    return "Membre d'equipe";
  }

  return value;
}

function formatOwnerTitle(membership: OrganizationMembership | null): string {
  if (!membership) {
    return "Compte principal";
  }

  return membership.role === "landlord" ? "Account Owner" : "Gestionnaire fondateur";
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

function shortId(value: string): string {
  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
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

function toneClasses(tone: TeamActivityItem["tone"]): string {
  if (tone === "emerald") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (tone === "amber") {
    return "bg-amber-100 text-amber-700";
  }

  if (tone === "blue") {
    return "bg-[#d9e8ff] text-[#0b4fd6]";
  }

  return "bg-slate-100 text-slate-600";
}

function createFunctionDrafts(members: TeamDashboardMember[]): Record<string, string[]> {
  return members.reduce<Record<string, string[]>>((accumulator, member) => {
    accumulator[member.id] = member.functions.map((teamFunction) => teamFunction.functionCode);
    return accumulator;
  }, {});
}

export default function TeamManagementPanel({
  organizationId,
  members,
  invitations,
  availableFunctions,
  teamActivity,
  accountOwner,
  currentUserId,
  canAssignAdmin,
  inviteAuthority,
  canManageTeam
}: TeamManagementPanelProps): React.ReactElement {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busyInvite, setBusyInvite] = useState(false);
  const [busyInvitationId, setBusyInvitationId] = useState<string | null>(null);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [functionDrafts, setFunctionDrafts] = useState<Record<string, string[]>>(() =>
    createFunctionDrafts(members)
  );

  useEffect(() => {
    setFunctionDrafts(createFunctionDrafts(members));
  }, [members]);

  const teamMembers = accountOwner
    ? members.filter((membership) => membership.id !== accountOwner.id)
    : members;

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
        email: email.trim()
      });

      if (!result.success) {
        setError(result.error);
        setBusyInvite(false);
        return;
      }

      setMessage("Invitation envoyee.");
      setEmail("");
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

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Equipe, invitations et acces</h1>
          <p className="mt-2 text-sm text-slate-500">
            {members.length} membre(s) actif(s), {invitations.length} invitation(s) en attente.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-8 border-b border-slate-200 pb-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Actifs</p>
          <p className="text-xl font-semibold text-slate-900">{members.length}</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">En attente</p>
          <p className="text-xl font-semibold text-slate-900">{invitations.length}</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Roles</p>
          <p className="text-xl font-semibold text-slate-900">{availableFunctions.length}</p>
        </div>
      </div>

      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Account Owner</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">{formatOwnerTitle(accountOwner)}</h2>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                Team Authority
              </span>
            </div>

            {accountOwner ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{shortId(accountOwner.userId)}</p>
                    <p className="mt-1 text-sm text-slate-500">{formatRole(accountOwner.role)}</p>
                  </div>
                  {accountOwner.userId === currentUserId ? (
                    <span className="rounded-full bg-[#d9e8ff] px-3 py-1 text-xs font-semibold text-[#0b4fd6]">Vous</span>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <p>Ajoute le {formatDate(accountOwner.createdAtIso)}</p>
                  <p>Compte principal de l'organisation</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Aucun proprietaire de compte detecte.</p>
            )}

            <div className="space-y-3 rounded-3xl bg-slate-950 p-5 text-sm text-slate-200">
              <p className="font-semibold text-white">Regle de securite</p>
              <p>
                Les membres d'equipe n'utilisent jamais le login du gestionnaire qui les invite. Chaque acces est
                individuel pour garder la trace des activites et proteger le compte principal.
              </p>
              <p>
                {canManageTeam
                  ? "Votre compte peut piloter les invitations et les roles applicatifs de l'equipe."
                  : "Votre compte peut consulter l'equipe, mais la gestion des invitations et des roles est reservee au proprietaire du compte ou a un admin."}
              </p>
            </div>
          </div>

          <form onSubmit={handleInvite} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Invite Team Members</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">Envoyer une invitation par email</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                Email First
              </span>
            </div>

            <div className="mt-5 grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">1</p>
                <p className="mt-2 text-sm font-medium text-slate-900">Invitation</p>
                <p className="mt-1 text-sm text-slate-500">Le membre recoit un email personnel avec un lien securise.</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">2</p>
                <p className="mt-2 text-sm font-medium text-slate-900">Activation</p>
                <p className="mt-1 text-sm text-slate-500">Il cree son compte ou se connecte avec son propre compte existant.</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">3</p>
                <p className="mt-2 text-sm font-medium text-slate-900">Role applicatif</p>
                <p className="mt-1 text-sm text-slate-500">Le membre rejoint comme personnel interne et recoit ses acces de travail apres activation.</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block text-sm text-slate-700">
                Adresse email du membre
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
                  placeholder="membre@entreprise.com"
                  type="email"
                  required
                  disabled={!inviteAuthority}
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!inviteAuthority || busyInvite || email.trim().length === 0}
                className="rounded-full bg-[#0063fe] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0052d4] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyInvite ? "Invitation..." : "Envoyer l'invitation"}
              </button>
              {!inviteAuthority ? (
                <p className="text-sm text-slate-500">Invitation reservee au proprietaire du compte ou a un admin.</p>
              ) : null}
            </div>
          </form>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Application Roles</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Roles applicatifs disponibles</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{availableFunctions.length}</span>
          </div>

          {availableFunctions.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-400">
              Aucun role applicatif configure pour cette organisation.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {availableFunctions.map((teamFunction) => (
                <article key={teamFunction.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{teamFunction.displayName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {teamFunction.description ?? "Role interne applique a la plateforme web."}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClasses(isAdminFunction(teamFunction) ? "amber" : "blue")}`}>
                      {countPermissions(teamFunction)} permissions
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Pending Invitations</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Invitations en attente</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{invitations.length}</span>
          </div>

          {invitations.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-400">
              Aucune invitation en attente.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {invitations.map((invitation) => {
                const invitationBusy = busyInvitationId === invitation.id;

                return (
                  <article key={invitation.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{invitation.email}</p>
                        <p className="mt-1 text-sm text-slate-500">Acces operateur individuel en attente d'activation</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                        En attente
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <p>Envoyee le {formatDate(invitation.createdAtIso)}</p>
                      <p>Expire le {formatDate(invitation.expiresAtIso)}</p>
                      <p>Personnel interne invite</p>
                      <p>Role applicatif attribue apres activation</p>
                    </div>

                    {inviteAuthority ? (
                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handleResend(invitation.id)}
                          disabled={invitationBusy}
                          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 disabled:opacity-50"
                        >
                          {invitationBusy ? "Traitement..." : "Renvoyer"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevoke(invitation.id)}
                          disabled={invitationBusy}
                          className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Active Team</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Membres actifs</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{members.length}</span>
          </div>

          {members.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-400">
              Aucun membre.
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              {accountOwner ? (
                <article className="rounded-3xl border border-[#bfd6ff] bg-[linear-gradient(135deg,#eff5ff_0%,#ffffff_100%)] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[#0b4fd6]">Account Owner</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">{shortId(accountOwner.userId)}</p>
                      <p className="mt-1 text-sm text-slate-600">{formatOwnerTitle(accountOwner)}</p>
                    </div>
                    {accountOwner.userId === currentUserId ? (
                      <span className="rounded-full bg-[#0b4fd6] px-3 py-1 text-xs font-semibold text-white">Vous</span>
                    ) : null}
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                    <p>Statut: {formatStatus(accountOwner.status)}</p>
                    <p>Ajoute le {formatDate(accountOwner.createdAtIso)}</p>
                    <p>Acces total par statut d'owner</p>
                  </div>
                </article>
              ) : null}

              {teamMembers.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-400">
                  Aucun autre membre actif pour le moment.
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {teamMembers.map((membership) => {
                    const selectedFunctions = functionDrafts[membership.id] ?? [];
                    const memberBusy = busyMemberId === membership.id;

                    return (
                      <article key={membership.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{shortId(membership.userId)}</p>
                            <p className="mt-1 text-sm text-slate-500">{formatRole(membership.role)}</p>
                          </div>
                          {membership.userId === currentUserId ? (
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">Vous</span>
                          ) : null}
                        </div>

                        <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                          <p>Statut: {formatStatus(membership.status)}</p>
                          <p>Ajoute le {formatDate(membership.createdAtIso)}</p>
                          <p>Personnel interne</p>
                          <p className="font-mono text-xs text-slate-500">{membership.userId}</p>
                        </div>

                        <div className="mt-5 space-y-3 rounded-3xl border border-slate-200 bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900">Roles applicatifs</p>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                              {membership.functions.length}
                            </span>
                          </div>

                          {membership.functions.length === 0 ? (
                            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                              Aucun role applicatif attribue pour l'instant.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {membership.functions.map((teamFunction) => (
                                <span
                                  key={teamFunction.id}
                                  className="rounded-full bg-[#d9e8ff] px-3 py-1 text-xs font-semibold text-[#0b4fd6]"
                                >
                                  {teamFunction.displayName}
                                </span>
                              ))}
                            </div>
                          )}

                          {canManageTeam ? (
                            <div className="space-y-3 pt-2">
                              {availableFunctions.map((teamFunction) => {
                                const disabled =
                                  memberBusy || (isAdminFunction(teamFunction) && !canAssignAdmin);

                                return (
                                  <label
                                    key={teamFunction.id}
                                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${disabled ? "border-slate-200 bg-slate-100 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-700"}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedFunctions.includes(teamFunction.functionCode)}
                                      onChange={() => handleToggleFunction(membership.id, teamFunction.functionCode)}
                                      disabled={disabled}
                                    />
                                    <span>
                                      <span className="block font-medium text-slate-900">{teamFunction.displayName}</span>
                                      <span className="mt-1 block text-xs text-slate-500">
                                        {teamFunction.description ?? "Role interne applique a la plateforme web."}
                                      </span>
                                      {isAdminFunction(teamFunction) && !canAssignAdmin ? (
                                        <span className="mt-1 block text-xs text-amber-700">
                                          Seul le landlord peut attribuer le role Admin.
                                        </span>
                                      ) : null}
                                    </span>
                                  </label>
                                );
                              })}

                              <button
                                type="button"
                                onClick={() => handleSaveFunctions(membership.id)}
                                disabled={memberBusy || selectedFunctions.length === 0}
                                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {memberBusy ? "Enregistrement..." : "Enregistrer les roles"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Activity Tracking</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Activite equipe</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{teamActivity.length}</span>
          </div>

          {teamActivity.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-400">
              Aucune activite equipe recente.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {teamActivity.map((item) => (
                <article key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClasses(item.tone)}`}>
                      {formatDateTime(item.occurredAtIso)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
    </div>
  );
}
