"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import type { Document } from "@hhousing/domain";
import { patchWithAuth } from "../../../../../lib/api-client";
import UniversalLoadingState from "../../../../../components/universal-loading-state";

type LeaseEmailWorkspaceClientProps = {
  id: string;
  lease: LeaseWithTenantView;
  documents: Document[];
  initialSelectedDocumentIds: string[];
};

export default function LeaseEmailWorkspaceClient({
  id,
  lease,
  documents,
  initialSelectedDocumentIds
}: LeaseEmailWorkspaceClientProps): React.ReactElement {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>(initialSelectedDocumentIds);
  const [sendingDraftEmail, setSendingDraftEmail] = useState(false);
  const [resendingActivationEmail, setResendingActivationEmail] = useState(false);
  const [draftEmailMessage, setDraftEmailMessage] = useState<string | null>(null);
  const [activationEmailMessage, setActivationEmailMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendableDocuments = useMemo(
    () => documents.filter((document) => document.mimeType !== "message/rfc822"),
    [documents]
  );

  const filteredDocuments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (query.length === 0) {
      return sendableDocuments;
    }

    return sendableDocuments.filter((document) => {
      const attachmentLabel = document.attachmentType && document.attachmentId
        ? `${document.attachmentType} ${document.attachmentId}`
        : "";

      return (
        document.fileName.toLowerCase().includes(query)
        || attachmentLabel.toLowerCase().includes(query)
        || document.documentType.toLowerCase().includes(query)
      );
    });
  }, [searchTerm, sendableDocuments]);

  const canSendDraftEmail = lease.status === "pending" && Boolean(lease.tenantEmail);
  const canResendActivationEmail = lease.status === "active" && Boolean(lease.tenantEmail);

  async function handleSendDraftEmail(): Promise<void> {
    setSendingDraftEmail(true);
    setError(null);
    setDraftEmailMessage(null);
    setActivationEmailMessage(null);

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

  async function handleResendActivationEmail(): Promise<void> {
    setResendingActivationEmail(true);
    setError(null);
    setDraftEmailMessage(null);
    setActivationEmailMessage(null);

    const result = await patchWithAuth<LeaseWithTenantView>(`/api/leases/${id}`, {
      action: "resend_activation_email"
    });

    if (!result.success) {
      setError(result.error);
      setResendingActivationEmail(false);
      return;
    }

    setActivationEmailMessage("Email d'activation renvoyé au locataire.");
    setResendingActivationEmail(false);
  }

  function toggleDocument(documentId: string): void {
    setSelectedDocumentIds((previous) => (
      previous.includes(documentId)
        ? previous.filter((value) => value !== documentId)
        : [...previous, documentId]
    ));
  }

  function selectAllVisible(): void {
    const visibleIds = filteredDocuments.map((document) => document.id);
    setSelectedDocumentIds((previous) => {
      const merged = new Set([...previous, ...visibleIds]);
      return [...merged];
    });
  }

  function clearSelection(): void {
    setSelectedDocumentIds([]);
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href={`/dashboard/leases/${id}`} className="inline-block text-sm text-[#0063fe] hover:underline">
          ← Retour au bail
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[#010a19]">Emails du bail</h1>
        <p className="mt-1 text-sm text-gray-600">{lease.tenantFullName} · {lease.tenantEmail ?? "Aucun e-mail locataire"}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#010a19]">Envoyer l'email du brouillon</h2>
              <p className="mt-1 text-sm text-gray-600">Sélectionnez les pièces jointes à envoyer avec le brouillon du bail.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {selectedDocumentIds.length} sélectionné(s)
            </span>
          </div>

          {lease.status !== "pending" ? (
            <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              L'envoi du brouillon est disponible uniquement pour un bail en attente.
            </p>
          ) : null}

          {!lease.tenantEmail ? (
            <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              Ajoutez un e-mail locataire avant l'envoi.
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Filtrer les documents..."
              className="min-w-64 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
            />
            <button type="button" onClick={selectAllVisible} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Tout sélectionner (visible)
            </button>
            <button type="button" onClick={clearSelection} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Vider
            </button>
          </div>

          <div className="mt-4 max-h-[28rem] overflow-auto rounded-lg border border-gray-200">
            {filteredDocuments.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500">Aucun document correspondant.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredDocuments.map((document) => (
                  <li key={document.id} className="px-4 py-3">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedDocumentIds.includes(document.id)}
                        onChange={() => toggleDocument(document.id)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#010a19]">{document.fileName}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {document.documentType} · {document.attachmentType && document.attachmentId ? `${document.attachmentType} · ${document.attachmentId}` : "Bibliothèque générale"}
                        </p>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 flex items-center justify-end">
            <button
              type="button"
              onClick={handleSendDraftEmail}
              disabled={sendingDraftEmail || !canSendDraftEmail || selectedDocumentIds.length === 0}
              className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0052d4] disabled:opacity-60"
            >
              {sendingDraftEmail ? "Envoi..." : "Envoyer l'email du brouillon"}
            </button>
          </div>

          {draftEmailMessage ? <p className="mt-3 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">{draftEmailMessage}</p> : null}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#010a19]">Renvoyer l'email d'activation</h2>
          <p className="mt-1 text-sm text-gray-600">Action disponible après activation du bail.</p>

          {lease.status !== "active" ? (
            <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Le renvoi d'activation est disponible uniquement pour un bail actif.
            </p>
          ) : null}

          {!lease.tenantEmail ? (
            <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              Ajoutez un e-mail locataire avant le renvoi.
            </p>
          ) : null}

          <div className="mt-4 flex items-center justify-end">
            <button
              type="button"
              onClick={handleResendActivationEmail}
              disabled={resendingActivationEmail || !canResendActivationEmail}
              className="rounded-lg border border-[#0063fe] px-4 py-2 text-sm font-semibold text-[#0063fe] hover:bg-[#0063fe]/5 disabled:opacity-60"
            >
              {resendingActivationEmail ? "Renvoi..." : "Renvoyer l'email d'activation"}
            </button>
          </div>

          {activationEmailMessage ? <p className="mt-3 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">{activationEmailMessage}</p> : null}
        </section>
      </div>

      {sendingDraftEmail || resendingActivationEmail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}

      {error ? <p className="mt-6 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
