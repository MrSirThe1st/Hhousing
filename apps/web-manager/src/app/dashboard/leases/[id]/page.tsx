"use client";

import { use, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import type { Document, Lease, Payment } from "@hhousing/domain";
import { patchWithAuth } from "../../../../lib/api-client";

const ContextualDocumentPanel = dynamic(
  () => import("../../../../components/contextual-document-panel"),
  { ssr: false }
);

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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [terminating, setTerminating] = useState(false);
  const [terminationDate, setTerminationDate] = useState("");
  const [signingMethod, setSigningMethod] = useState<"physical" | "scanned" | "email_confirmation">("physical");
  const [signedAt, setSignedAt] = useState(new Date().toISOString().substring(0, 10));
  const [finalizing, setFinalizing] = useState(false);
  const [sendingDraftEmail, setSendingDraftEmail] = useState(false);
  const [draftEmailMessage, setDraftEmailMessage] = useState<string | null>(null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);

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
          setSignedAt(data.data.signedAt ?? new Date().toISOString().substring(0, 10));
          setSigningMethod(data.data.signingMethod ?? "physical");

          const paymentsResponse = await fetch(`/api/payments?leaseId=${encodeURIComponent(id)}`, {
            credentials: "include"
          });
          if (paymentsResponse.ok) {
            const paymentsData = await paymentsResponse.json() as { success: boolean; data?: { payments: Payment[] } };
            if (paymentsData.success && paymentsData.data) {
              setPayments(paymentsData.data.payments);
            }
          }

          const documentsParams = new URLSearchParams({ organizationId: data.data.organizationId });
          const documentsResponse = await fetch(`/api/documents?${documentsParams.toString()}`, {
            credentials: "include"
          });
          if (documentsResponse.ok) {
            const documentsData = await documentsResponse.json() as { success: boolean; data?: { documents: Document[] } };
            if (documentsData.success && documentsData.data) {
              const currentLeaseId = data.data.id;
              setAvailableDocuments(documentsData.data.documents);
              const leaseDocuments = documentsData.data.documents
                .filter((document) => document.attachmentType === "lease" && document.attachmentId === currentLeaseId)
                .map((document) => document.id);
              setSelectedDocumentIds(leaseDocuments);
            }
          }
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

  async function handleFinalize(): Promise<void> {
    setFinalizing(true);
    setError(null);
    setDraftEmailMessage(null);

    const result = await patchWithAuth<Lease>(`/api/leases/${id}`, {
      action: "finalize",
      organizationId: lease?.organizationId,
      signedAt,
      signingMethod
    });

    if (!result.success) {
      setError(result.error);
      setFinalizing(false);
      return;
    }

    router.refresh();
    setFinalizing(false);
  }

  async function handleSendDraftEmail(): Promise<void> {
    setSendingDraftEmail(true);
    setError(null);
    setDraftEmailMessage(null);

    const result = await patchWithAuth<LeaseWithTenantView>(`/api/leases/${id}`, {
      action: "send_draft_email",
      documentIds: selectedDocumentIds
    });

    if (!result.success) {
      setError(result.error);
      setSendingDraftEmail(false);
      return;
    }

    setDraftEmailMessage("Email de brouillon envoyé au locataire.");
    setSendingDraftEmail(false);
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
  const initialPayments = payments.filter((payment) => payment.isInitialCharge);
  const unpaidInitialPayments = initialPayments.filter((payment) => payment.status !== "paid");
  const canFinalize = lease.status === "pending" && unpaidInitialPayments.length === 0 && initialPayments.length > 0;
  const sendableDocuments = availableDocuments.filter((document) => document.mimeType !== "message/rfc822");

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
          <div>
            <p className="text-sm text-gray-500">Signé le</p>
            <p className="text-base font-medium text-[#010a19]">{lease.signedAt ?? "Non renseigné"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Méthode de signature</p>
            <p className="text-base font-medium text-[#010a19]">{lease.signingMethod ?? "Non renseignée"}</p>
          </div>
        </div>

        {lease.status === "pending" ? (
          <div className="border-t border-gray-200 pt-6 mb-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[#010a19]">Finaliser le move in</h2>
              <p className="mt-1 text-sm text-gray-500">
                Le bail reste en attente tant que les charges initiales ne sont pas payées et que la signature n'est pas renseignée.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Date de signature</span>
                <input
                  type="date"
                  value={signedAt}
                  onChange={(event) => setSignedAt(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19]"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Méthode de signature</span>
                <select
                  value={signingMethod}
                  onChange={(event) => setSigningMethod(event.target.value as "physical" | "scanned" | "email_confirmation")}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19]"
                >
                  <option value="physical">Physique</option>
                  <option value="scanned">Scannée</option>
                  <option value="email_confirmation">Confirmation email</option>
                </select>
              </label>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#010a19]">Envoyer le brouillon au locataire</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Utilisez cette action quand le brouillon est prêt. Choisissez un ou plusieurs documents de la bibliothèque à joindre. Email cible: {lease.tenantEmail ?? "aucun e-mail renseigné"}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSendDraftEmail}
                  disabled={sendingDraftEmail || !lease.tenantEmail || selectedDocumentIds.length === 0}
                  className="rounded-lg border border-[#0063fe] px-4 py-2 text-sm font-semibold text-[#0063fe] hover:bg-[#0063fe]/5 disabled:opacity-60"
                >
                  {sendingDraftEmail ? "Envoi..." : "Envoyer l'email du brouillon"}
                </button>
              </div>
              <div className="mt-4 max-h-56 space-y-2 overflow-auto pr-1">
                {sendableDocuments.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucun document disponible dans la bibliothèque.</p>
                ) : (
                  sendableDocuments.map((document) => (
                    <label key={document.id} className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedDocumentIds.includes(document.id)}
                        onChange={() => setSelectedDocumentIds((previous) => previous.includes(document.id)
                          ? previous.filter((item) => item !== document.id)
                          : [...previous, document.id])}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300"
                      />
                      <div>
                        <div className="font-medium text-[#010a19]">{document.fileName}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          {document.attachmentType && document.attachmentId
                            ? `${document.attachmentType} · ${document.attachmentId}`
                            : "Bibliothèque générale"}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
              {draftEmailMessage ? <p className="mt-3 text-sm text-green-700">{draftEmailMessage}</p> : null}
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-[#010a19]">Charges initiales à solder avant activation</h3>
              {initialPayments.length === 0 ? (
                <p className="mt-2 text-sm text-red-600">Aucune charge initiale n'a été générée pour ce bail.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                  {initialPayments.map((payment) => (
                    <li key={payment.id} className="flex items-center justify-between gap-4">
                      <span>{payment.note ?? payment.paymentKind}</span>
                      <span className={payment.status === "paid" ? "text-green-700" : "text-yellow-700"}>
                        {payment.amount.toLocaleString("fr-FR")} {payment.currencyCode} · {payment.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              onClick={handleFinalize}
              disabled={finalizing || !canFinalize}
              className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0052d4] disabled:opacity-60"
            >
              {finalizing ? "Finalisation..." : "Finaliser et activer le bail"}
            </button>
          </div>
        ) : null}

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

      <ContextualDocumentPanel
        attachmentType="lease"
        attachmentId={id}
        title="Documents du bail"
        description="Importez ici le bail signé, les annexes, et les pièces remises au locataire pour ce move in."
        addButtonLabel="+ Ajouter un document"
        defaultDocumentType="lease_agreement"
        preferredDocumentType="lease_agreement"
        preferredDocumentEmptyMessage="Aucun bail signé n'est encore importé pour ce move in."
        preferredDocumentReadyMessage="Un bail signé est déjà attaché à ce move in."
      />
    </div>
  );
}
