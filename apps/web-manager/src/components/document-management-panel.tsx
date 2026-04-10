"use client";

import { useMemo, useState } from "react";
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

const ATTACHMENT_TYPE_LABELS: Record<DocumentAttachmentType, string> = {
  property: "Propriété",
  unit: "Unité",
  tenant: "Locataire",
  lease: "Bail",
  owner: "Owner"
};

type DocumentFormState = {
  fileName: string;
  file: File | null;
  documentType: DocumentType;
  attachmentType: DocumentAttachmentType;
  attachmentId: string;
};

type DocumentManagementPanelProps = {
  organizationId: string;
  documents: Document[];
};

export default function DocumentManagementPanel({
  organizationId,
  documents
}: DocumentManagementPanelProps): React.ReactElement {
  const router = useRouter();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState<DocumentType | "all">("all");
  const [attachmentFilter, setAttachmentFilter] = useState<DocumentAttachmentType | "all">("all");
  const [documentForm, setDocumentForm] = useState<DocumentFormState>({
    fileName: "",
    file: null,
    documentType: "other",
    attachmentType: "property",
    attachmentId: ""
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const filteredDocuments = useMemo(() => {
    let filtered = documents;
    if (typeFilter !== "all") {
      filtered = filtered.filter(d => d.documentType === typeFilter);
    }
    if (attachmentFilter !== "all") {
      filtered = filtered.filter(d => d.attachmentType === attachmentFilter);
    }
    return filtered;
  }, [documents, typeFilter, attachmentFilter]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0] ?? null;
    setDocumentForm(prev => ({
      ...prev,
      file,
      fileName: file?.name ?? ""
    }));
  }

  async function handleUploadDocument(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);

    if (!documentForm.file) {
      setError("Veuillez sélectionner un fichier.");
      setBusy(false);
      return;
    }

    if (!documentForm.attachmentId.trim()) {
      setError("L'ID d'attachement est requis.");
      setBusy(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const filePath = `${organizationId}/${documentForm.attachmentType}/${documentForm.attachmentId}/${Date.now()}-${documentForm.file.name}`;

    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, documentForm.file);
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

    const { data: { publicUrl: fileUrl } } = supabase.storage.from("documents").getPublicUrl(filePath);

    const result = await postWithAuth<Document>("/api/documents", {
      organizationId,
      fileName: documentForm.fileName.trim(),
      fileUrl,
      fileSize: documentForm.file.size,
      mimeType: documentForm.file.type,
      documentType: documentForm.documentType,
      attachmentType: documentForm.attachmentType,
      attachmentId: documentForm.attachmentId.trim()
    });

    if (!result.success) {
      setError(result.error);
      setBusy(false);
      return;
    }

    setDocumentForm({
      fileName: "",
      file: null,
      documentType: "other",
      attachmentType: "property",
      attachmentId: ""
    });
    setShowUploadForm(false);
    setMessage("Document téléchargé avec succès.");
    setBusy(false);
    router.refresh();
  }

  async function handleDeleteDocument(documentId: string): Promise<void> {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) return;

    setDeleting(documentId);
    setError(null);

    const result = await deleteWithAuth(`/api/documents/${documentId}`);

    if (!result.success) {
      setError(result.error);
      setDeleting(null);
      return;
    }

    setMessage("Document supprimé avec succès.");
    setDeleting(null);
    router.refresh();
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#010a19]">Documents</h1>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0]"
        >
          {showUploadForm ? "Annuler" : "+ Télécharger"}
        </button>
      </div>

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showUploadForm && (
        <form onSubmit={handleUploadDocument} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#010a19]">Télécharger un document</h2>
              <p className="text-sm text-gray-500">Sélectionnez un fichier et remplissez les détails.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="file"
              onChange={handleFileChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            />
            <input
              value={documentForm.fileName}
              onChange={(e) => setDocumentForm(prev => ({ ...prev, fileName: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Nom du fichier (optionnel)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={documentForm.documentType}
              onChange={(e) => setDocumentForm(prev => ({ ...prev, documentType: e.target.value as DocumentType }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            >
              <option value="other">Autre</option>
              <option value="lease_agreement">Contrat de bail</option>
              <option value="receipt">Reçu</option>
              <option value="notice">Avis</option>
              <option value="id">Pièce d&apos;identité</option>
              <option value="contract">Contrat</option>
            </select>

            <select
              value={documentForm.attachmentType}
              onChange={(e) => setDocumentForm(prev => ({ ...prev, attachmentType: e.target.value as DocumentAttachmentType }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            >
              <option value="property">Propriété</option>
              <option value="unit">Unité</option>
              <option value="tenant">Locataire</option>
              <option value="lease">Bail</option>
            </select>

            <input
              value={documentForm.attachmentId}
              onChange={(e) => setDocumentForm(prev => ({ ...prev, attachmentId: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="ID de l'attachement"
              required
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
          >
            {busy ? "Téléchargement..." : "Télécharger le document"}
          </button>
        </form>
      )}

      {documents.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 text-sm text-gray-400">
          Aucun document pour l&apos;instant.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex gap-2 flex-wrap">
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                typeFilter === "all"
                  ? "bg-[#0063fe] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              Tous les types ({documents.length})
            </button>
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([type, label]) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type as DocumentType)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  typeFilter === type
                    ? "bg-[#0063fe] text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                {label} ({documents.filter(d => d.documentType === type).length})
              </button>
            ))}
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Nom du fichier</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Attaché à</th>
                <th className="px-4 py-3 text-left">Taille</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[#010a19]">{doc.fileName}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${DOCUMENT_TYPE_STYLES[doc.documentType] ?? "bg-gray-100 text-gray-500"}`}>
                      {DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {doc.attachmentType && doc.attachmentId
                      ? `${ATTACHMENT_TYPE_LABELS[doc.attachmentType]} (${doc.attachmentId.substring(0, 12)}...)`
                      : "Bibliothèque générale"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatFileSize(doc.fileSize)}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(doc.createdAtIso).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 space-x-3">
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0063fe] hover:underline text-sm font-medium"
                    >
                      Ouvrir
                    </a>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      disabled={deleting === doc.id}
                      className="text-red-600 hover:underline text-sm font-medium disabled:opacity-60"
                    >
                      {deleting === doc.id ? "..." : "Supprimer"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredDocuments.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Aucun document dans cette catégorie.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
