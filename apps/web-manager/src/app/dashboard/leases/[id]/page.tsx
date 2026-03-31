"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import type { Lease } from "@hhousing/domain";
import { patchWithAuth } from "../../../../lib/api-client";
import ContextualDocumentPanel from "../../../../components/contextual-document-panel";

type PageProps = {
  params: Promise<{ id: string }>;
};

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  ended: "Terminé",
  pending: "En attente"
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  ended: "bg-gray-100 text-gray-500",
  pending: "bg-yellow-100 text-yellow-700"
};

export default function LeaseDetailPage({ params }: PageProps): React.ReactElement {
  const router = useRouter();
  const { id } = use(params);

  const [lease, setLease] = useState<LeaseWithTenantView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [terminating, setTerminating] = useState(false);
  const [terminationDate, setTerminationDate] = useState("");

  useEffect(() => {
    async function fetchLease(): Promise<void> {
      try {
        const response = await fetch(`/api/leases/${id}`, {
          credentials: "include"
        });

        if (!response.ok) {
          setError("Bail introuvable");
          setLoading(false);
          return;
        }

        const data = await response.json() as { success: boolean; data?: LeaseWithTenantView };
        if (data.success && data.data) {
          setLease(data.data);
          setTerminationDate(new Date().toISOString().substring(0, 10));
        }

        setLoading(false);
      } catch {
        setError("Erreur lors du chargement du bail");
        setLoading(false);
      }
    }

    fetchLease();
  }, [id]);

  async function handleTerminate(): Promise<void> {
    if (!confirm("Êtes-vous sûr de vouloir résilier ce bail ? Cette action est irréversible.")) {
      return;
    }

    setTerminating(true);
    setError(null);

    const result = await patchWithAuth<Lease>(`/api/leases/${id}`, {
      endDate: terminationDate,
      status: "ended"
    });

    if (!result.success) {
      setError(result.error);
      setTerminating(false);
      return;
    }

    router.refresh();
    router.push("/dashboard/leases");
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Chargement...</p>
      </div>
    );
  }

  if (error && !lease) {
    return (
      <div className="p-8">
        <p className="text-red-600">{error}</p>
        <Link href="/dashboard/leases" className="text-[#0063fe] hover:underline">
          Retour aux baux
        </Link>
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Bail introuvable</p>
      </div>
    );
  }

  const canTerminate = lease.status === "active" || lease.status === "pending";

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/dashboard/leases" className="text-sm text-[#0063fe] hover:underline mb-4 inline-block">
          ← Retour aux baux
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#010a19]">Bail - {lease.tenantFullName}</h1>
            <p className="text-gray-600 mt-1">{lease.tenantEmail ?? "Aucun e-mail"}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[lease.status] ?? "bg-gray-100 text-gray-500"}`}>
            {STATUS_LABELS[lease.status] ?? lease.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-sm text-gray-500">Date de début</p>
            <p className="text-base font-medium text-[#010a19]">{lease.startDate}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date de fin</p>
            <p className="text-base font-medium text-[#010a19]">{lease.endDate ?? "Ouvert"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Loyer mensuel</p>
            <p className="text-base font-medium text-[#010a19]">
              {lease.monthlyRentAmount.toLocaleString("fr-FR")} {lease.currencyCode}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Créé le</p>
            <p className="text-base font-medium text-[#010a19]">
              {new Date(lease.createdAtIso).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>

        {canTerminate && (
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-[#010a19] mb-4">Résilier le bail</h2>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Date de résiliation
                </label>
                <input
                  type="date"
                  value={terminationDate}
                  onChange={(e) => setTerminationDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
                />
              </div>
              <button
                onClick={handleTerminate}
                disabled={terminating || !terminationDate}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {terminating ? "Résiliation..." : "Résilier le bail"}
              </button>
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5 mt-3">
                {error}
              </p>
            )}
          </div>
        )}
      </div>

      <ContextualDocumentPanel attachmentType="lease" attachmentId={id} />
    </div>
  );
}
