"use client";

import { useState } from "react";
import Link from "next/link";
import type { Tenant } from "@hhousing/domain";
import { postWithAuth } from "../lib/api-client";
import type { TenantManagementPanelProps } from "./tenant-management.types";

export default function TenantManagementPanel({
  organizationId,
  tenants
}: TenantManagementPanelProps): React.ReactElement {
  const [inviteBusyTenantId, setInviteBusyTenantId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activationLink, setActivationLink] = useState<string | null>(null);

  async function handleCreateInvitation(tenant: Tenant): Promise<void> {
    setInviteBusyTenantId(tenant.id);
    setMessage(null);
    setError(null);
    setActivationLink(null);

    const result = await postWithAuth<{
      invitationId: string;
      tenantId: string;
      email: string;
      expiresAtIso: string;
      activationLink: string;
    }>(`/api/tenants/${tenant.id}/invite`, {});

    if (!result.success) {
      setError(result.error);
      setInviteBusyTenantId(null);
      return;
    }

    setMessage(`Invitation générée pour ${tenant.fullName}.`);
    setActivationLink(result.data.activationLink);
    setInviteBusyTenantId(null);
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#010a19]">Locataires</h1>
      </div>

      {message ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
          {activationLink ? (
            <div className="mt-2 break-all">
              <span className="font-medium">Lien d&apos;activation:</span> {activationLink}
            </div>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#010a19]">Ajouter un locataire</h2>
            <p className="mt-1 text-sm text-gray-500">
              Ouvrez un écran dédié pour ajouter un locataire avec ses informations de profil et sa photo.
            </p>
          </div>
          <Link
            href="/dashboard/tenants/add"
            className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0]"
          >
            Ajouter un locataire
          </Link>
        </div>
      </div>

      {tenants.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 text-sm text-gray-400">
          Aucun locataire pour l&apos;instant.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Nom</th>
                <th className="px-4 py-3 text-left">E-mail</th>
                <th className="px-4 py-3 text-left">Téléphone</th>
                <th className="px-4 py-3 text-left">Ajouté le</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[#010a19]">
                    <div className="flex items-center gap-3">
                      {tenant.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={tenant.photoUrl} alt={tenant.fullName} className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500">
                          {tenant.fullName.substring(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div>{tenant.fullName}</div>
                        {tenant.dateOfBirth ? (
                          <div className="text-xs font-normal text-gray-500">Né le {tenant.dateOfBirth}</div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{tenant.email ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{tenant.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(tenant.createdAtIso).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 space-x-3">
                    <Link href={`/dashboard/tenants/${tenant.id}`} className="text-[#0063fe] hover:underline text-sm font-medium">
                      Voir détails
                    </Link>
                    {tenant.email && !tenant.authUserId ? (
                      <button
                        type="button"
                        disabled={inviteBusyTenantId === tenant.id}
                        onClick={() => {
                          void handleCreateInvitation(tenant);
                        }}
                        className="text-sm font-medium text-[#010a19] hover:underline disabled:opacity-50"
                      >
                        {inviteBusyTenantId === tenant.id ? "Création..." : "Créer invitation"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}