"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Document, DocumentType, DocumentAttachmentType } from "@hhousing/domain";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";
import { postWithAuth, deleteWithAuth } from "../lib/api-client";

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
};

export default function ContextualDocumentPanel({
  attachmentType,
  attachmentId
}: ContextualDocumentPanelProps): React.ReactElement {
  const router = useRouter();
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>("other");
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
    setDocumentType("other");
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

  return (
    <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#010a19]">Documents</h2>
        {!loading && sessionInfo && (
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="rounded-lg bg-[#0063fe] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0050d0]"
          >
            {showUploadForm ? "Annuler" : "+ Ajouter"}
          </button>
        )}
      </div>

      {message && (
        <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {showUploadForm && (
        <form onSubmit={handleUpload} className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="file"
              onChange={handleFileChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs"
              required
            />
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs"
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
            className="rounded-lg bg-[#0063fe] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
          >
            {busy ? "Téléchargement..." : "Télécharger"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-xs text-gray-400">Chargement...</p>
      ) : documents.length === 0 ? (
        <p className="text-xs text-gray-400">Aucun document.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${DOCUMENT_TYPE_STYLES[doc.documentType] ?? "bg-gray-100 text-gray-500"}`}
                >
                  {DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                </span>
                <span className="truncate text-sm text-[#010a19]">{doc.fileName}</span>
                <span className="shrink-0 text-xs text-gray-400">{formatFileSize(doc.fileSize)}</span>
              </div>
              <div className="flex items-center gap-3 ml-3 shrink-0">
                <span className="text-xs text-gray-400">
                  {new Date(doc.createdAtIso).toLocaleDateString("fr-FR")}
                </span>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0063fe] hover:underline font-medium"
                >
                  Ouvrir
                </a>
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deleting === doc.id}
                  className="text-xs text-red-600 hover:underline font-medium disabled:opacity-60"
                >
                  {deleting === doc.id ? "..." : "Supprimer"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
