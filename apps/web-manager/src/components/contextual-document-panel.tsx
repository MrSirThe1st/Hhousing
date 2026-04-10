"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Document, DocumentType, DocumentAttachmentType } from "@hhousing/domain";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";
import { postWithAuth, deleteWithAuth } from "../lib/api-client";
import ActionMenu from "./action-menu";
import UniversalLoadingState from "./universal-loading-state";

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  lease_agreement: "Contrat de bail",
  receipt: "Reçu",
  notice: "Avis",
  id: "Pièce d'identité",
  contract: "Contrat",
  other: "Autre"
};

const DOCUMENT_TYPE_STYLES: Record<DocumentType, string> = {
  lease_agreement: "bg-blue-100 text-blue-700",
  receipt: "bg-green-100 text-green-700",
  notice: "bg-yellow-100 text-yellow-700",
  id: "bg-purple-100 text-purple-700",
  contract: "bg-indigo-100 text-indigo-700",
  other: "bg-gray-100 text-gray-500"
};

type SessionInfo = {
  organizationId: string;
  userId: string;
};

type ContextualDocumentPanelProps = {
  attachmentType: DocumentAttachmentType;
  attachmentId: string;
  title?: string;
  description?: string;
  addButtonLabel?: string;
  defaultDocumentType?: DocumentType;
  preferredDocumentType?: DocumentType;
  preferredDocumentEmptyMessage?: string;
  preferredDocumentReadyMessage?: string;
  showUploadFormOnMount?: boolean;
  containerClassName?: string;
  showAddButton?: boolean;
};

export default function ContextualDocumentPanel({
  attachmentType,
  attachmentId,
  title = "Documents",
  description,
  addButtonLabel = "+ Ajouter",
  defaultDocumentType = "other",
  preferredDocumentType,
  preferredDocumentEmptyMessage,
  preferredDocumentReadyMessage,
  showUploadFormOnMount = false,
  containerClassName = "mt-6 rounded-2xl border border-slate-400",
  showAddButton = true
}: ContextualDocumentPanelProps): React.ReactElement {
  const router = useRouter();
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>(defaultDocumentType);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchDocuments = useCallback(async (organizationId: string): Promise<void> => {
    try {
      const params = new URLSearchParams({ organizationId, attachmentType, attachmentId });
      const resp = await fetch(`/api/documents?${params.toString()}`, { credentials: "include" });
      if (!resp.ok) return;
      const json = await resp.json() as { success: boolean; data?: { documents: Document[] } };
      if (json.success && json.data) {
        setDocuments(json.data.documents);
      }
    } catch {
      // non-critical — panel already shows empty state
    }
  }, [attachmentType, attachmentId]);

  useEffect(() => {
    async function init(): Promise<void> {
      try {
        const resp = await fetch("/api/session", { credentials: "include" });
        if (!resp.ok) return;
        const json = await resp.json() as {
          success: boolean;
          data?: { organizationId: string; userId: string };
        };
        if (!json.success || !json.data) return;
        setSessionInfo(json.data);
        await fetchDocuments(json.data.organizationId);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [fetchDocuments]);

  useEffect(() => {
    setDocumentType(defaultDocumentType);
  }, [defaultDocumentType]);

  useEffect(() => {
    if (showUploadFormOnMount) {
      setShowUploadForm(true);
    }
  }, [showUploadFormOnMount]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setFile(e.target.files?.[0] ?? null);
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!file || !sessionInfo) return;

    setBusy(true);
    setMessage(null);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const filePath = `${sessionInfo.organizationId}/${attachmentType}/${attachmentId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
    if (uploadError) {
      if (uploadError.message.toLowerCase().includes("row-level security policy")) {
        setError(
          "Upload bloqué par Supabase Storage RLS. Ajoutez une policy INSERT pour le bucket 'documents' (rôle authenticated)."
        );
      } else {
        setError(`Erreur de téléchargement: ${uploadError.message}`);
      }
      setBusy(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(filePath);

    const result = await postWithAuth<Document>("/api/documents", {
      organizationId: sessionInfo.organizationId,
      fileName: file.name,
      fileUrl: publicUrl,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      documentType,
      attachmentType,
      attachmentId
    });

    if (!result.success) {
      setError(result.error);
      setBusy(false);
      return;
    }

    setFile(null);
    setDocumentType(defaultDocumentType);
    setShowUploadForm(false);
    setMessage("Document téléchargé.");
    setBusy(false);
    await fetchDocuments(sessionInfo.organizationId);
    router.refresh();
  }

  async function handleDelete(documentId: string): Promise<void> {
    if (!confirm("Supprimer ce document ?")) return;

    setDeleting(documentId);
    setError(null);

    const result = await deleteWithAuth<{ success: boolean }>(`/api/documents/${documentId}`);
    if (!result.success) {
      setError(result.error);
      setDeleting(null);
      return;
    }

    setMessage("Document supprimé.");
    setDeleting(null);
    if (sessionInfo) await fetchDocuments(sessionInfo.organizationId);
    router.refresh();
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const preferredDocuments = preferredDocumentType
    ? documents.filter((document) => document.documentType === preferredDocumentType)
    : [];

  return (
    <div className={containerClassName}>
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-[#010a19]">{title}</h2>
          {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
        </div>
        {!loading && sessionInfo && showAddButton && (
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="rounded-lg bg-[#0063fe] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0050d0]"
          >
            {showUploadForm ? "Annuler" : addButtonLabel}
          </button>
        )}
      </div>

      <div className="space-y-4 px-6 py-5">

      {preferredDocumentType ? (
        <div className={`rounded-lg border px-3 py-2 text-xs ${preferredDocuments.length > 0 ? "border-green-200 bg-green-50 text-green-700" : "border-yellow-200 bg-yellow-50 text-yellow-700"}`}>
          {preferredDocuments.length > 0
            ? preferredDocumentReadyMessage ?? "Document attendu déjà importé."
            : preferredDocumentEmptyMessage ?? "Document attendu manquant."}
        </div>
      ) : null}

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {showUploadForm && (
        <form onSubmit={handleUpload} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              type="file"
              onChange={handleFileChange}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs"
              required
            />
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs"
            >
              <option value="other">Autre</option>
              <option value="lease_agreement">Contrat de bail</option>
              <option value="receipt">Reçu</option>
              <option value="notice">Avis</option>
              <option value="id">Pièce d&apos;identité</option>
              <option value="contract">Contrat</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={busy || !file}
            className="rounded-lg bg-[#0063fe] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0050d0] disabled:opacity-60"
          >
            {busy ? "Téléchargement..." : "Télécharger"}
          </button>
        </form>
      )}

      {loading ? (
        <UniversalLoadingState minHeightClassName="min-h-28" size="compact" />
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
          Aucun document.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Document</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Taille</th>
                <th className="px-4 py-3 text-left">Ajouté le</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-[#010a19]">{doc.fileName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${DOCUMENT_TYPE_STYLES[doc.documentType] ?? "bg-gray-100 text-gray-500"}`}>
                      {DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatFileSize(doc.fileSize)}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(doc.createdAtIso).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-3 text-right">
                    <ActionMenu
                      items={[
                        { label: "Ouvrir", href: doc.fileUrl },
                        { label: deleting === doc.id ? "Suppression..." : "Supprimer", onSelect: () => { void handleDelete(doc.id); }, tone: "danger", disabled: deleting === doc.id }
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
