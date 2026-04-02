"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Tenant } from "@hhousing/domain";
import { postWithAuth } from "../lib/api-client";
import type {
  TenantFormState,
  TenantManagementPanelProps
} from "./tenant-management.types";

const INITIAL_TENANT_FORM: TenantFormState = {
  fullName: "",
  email: "",
  phone: ""
};

export default function TenantManagementPanel({
  organizationId,
  tenants
}: TenantManagementPanelProps): React.ReactElement {
  const router = useRouter();
  const [tenantForm, setTenantForm] = useState<TenantFormState>(INITIAL_TENANT_FORM);
  const [busy, setBusy] = useState(false);
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

  async function handleCreateTenant(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);

    const result = await postWithAuth<Tenant>("/api/tenants", {
      organizationId,
      fullName: tenantForm.fullName.trim(),
      email: tenantForm.email.trim() || null,
      phone: tenantForm.phone.trim() || null
    });

    if (!result.success) {
      setError(result.error);
      setBusy(false);
      return;
    }

    setTenantForm(INITIAL_TENANT_FORM);
    setMessage("Locataire créé avec succès.");
    setBusy(false);
    router.refresh();
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

      <form onSubmit={handleCreateTenant} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3 max-w-2xl">
        <h2 className="text-base font-semibold text-[#010a19]">Ajouter un locataire</h2>
        <input
          value={tenantForm.fullName}
          onChange={(event) => setTenantForm((prev) => ({ ...prev, fullName: event.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="Nom complet"
          required
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={tenantForm.email}
            onChange={(event) => setTenantForm((prev) => ({ ...prev, email: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="E-mail"
            type="email"
          />
          <input
            value={tenantForm.phone}
            onChange={(event) => setTenantForm((prev) => ({ ...prev, phone: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Téléphone"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
        >
          {busy ? "Création..." : "Créer le locataire"}
        </button>
      </form>

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
                  <td className="px-4 py-3 font-medium text-[#010a19]">{tenant.fullName}</td>
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