"use client";

import { useEffect, useState } from "react";
import type { DocumentAttachmentType, DocumentType } from "@hhousing/domain";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";
import { postWithAuth } from "../lib/api-client";

type SessionInfo = {
  organizationId: string;
  userId: string;
};

type ContextualDocumentUploadFormProps = {
  attachmentType: DocumentAttachmentType;
  attachmentId: string;
  defaultDocumentType?: DocumentType;
  onUploaded?: () => void;
};

export default function ContextualDocumentUploadForm({
  attachmentType,
  attachmentId,
  defaultDocumentType = "other",
  onUploaded
}: ContextualDocumentUploadFormProps): React.ReactElement {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>(defaultDocumentType);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init(): Promise<void> {
      const response = await fetch("/api/session", { credentials: "include" });
      if (!response.ok) return;

      const payload = await response.json() as {
        success: boolean;
        data?: { organizationId: string; userId: string };
      };

      if (!payload.success || !payload.data) return;
      setSessionInfo(payload.data);
    }

    void init();
  }, []);

  useEffect(() => {
    setDocumentType(defaultDocumentType);
  }, [defaultDocumentType]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!file || !sessionInfo) return;

    setBusy(true);
    setMessage(null);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const filePath = `${sessionInfo.organizationId}/${attachmentType}/${attachmentId}/${Date.now()}-${file.name}`;
    const uploadResult = await supabase.storage.from("documents").upload(filePath, file);

    if (uploadResult.error) {
      if (uploadResult.error.message.toLowerCase().includes("row-level security policy")) {
        setError("Upload bloqué par Supabase Storage RLS. Ajoutez une policy INSERT pour le bucket 'documents' (rôle authenticated).");
      } else {
        setError(`Erreur de téléchargement: ${uploadResult.error.message}`);
      }
      setBusy(false);
      return;
    }

    const publicUrl = supabase.storage.from("documents").getPublicUrl(filePath).data.publicUrl;
    const saveResult = await postWithAuth("/api/documents", {
      organizationId: sessionInfo.organizationId,
      fileName: file.name,
      fileUrl: publicUrl,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      documentType,
      attachmentType,
      attachmentId
    });

    if (!saveResult.success) {
      setError(saveResult.error);
      setBusy(false);
      return;
    }

    setFile(null);
    setDocumentType(defaultDocumentType);
    setMessage("Document téléchargé.");
    setBusy(false);
    onUploaded?.();
  }

  return (
    <div className="space-y-4">
      {message ? <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">{message}</div> : null}
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div> : null}

      <form onSubmit={(event) => { void handleSubmit(event); }} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs"
            required
          />
          <select
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value as DocumentType)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs"
          >
            <option value="other">Autre</option>
            <option value="lease_agreement">Contrat de bail</option>
            <option value="receipt">Reçu</option>
            <option value="notice">Avis</option>
            <option value="id">Pièce d'identité</option>
            <option value="contract">Contrat</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={busy || !file || !sessionInfo}
          className="rounded-lg bg-[#0063fe] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0050d0] disabled:opacity-60"
        >
          {busy ? "Téléchargement..." : "Télécharger"}
        </button>
      </form>
    </div>
  );
}