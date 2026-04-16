"use client";

import { useState } from "react";
import ContextualDocumentPanel from "./contextual-document-panel";
import ContextualDocumentUploadForm from "./contextual-document-upload-form";

type OwnerDocumentsSectionClientProps = {
  ownerId: string;
};

export default function OwnerDocumentsSectionClient({ ownerId }: OwnerDocumentsSectionClientProps): React.ReactElement {
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [documentRefreshSignal, setDocumentRefreshSignal] = useState(0);

  return (
    <>
      <ContextualDocumentPanel
        attachmentType="owner"
        attachmentId={ownerId}
        title="Documents du propriétaire"
        description="Ajoutez les pièces d'identité, mandats, contrats ou autres documents liés à ce propriétaire."
        addButtonLabel="+ Ajouter un document"
        defaultDocumentType="other"
        showAddButton={true}
        onAddButtonClick={() => setDocumentModalOpen(true)}
        refreshSignal={documentRefreshSignal}
      />

      {documentModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/55 p-4"
          onClick={() => setDocumentModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Ajouter un document au propriétaire"
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-[#010a19]">Ajouter un document</h2>
                <p className="mt-1 text-sm text-slate-500">Importez un document et rattachez-le directement à ce propriétaire.</p>
              </div>
              <button
                type="button"
                onClick={() => setDocumentModalOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Fermer
              </button>
            </div>

            <div className="p-6">
              <ContextualDocumentUploadForm
                attachmentType="owner"
                attachmentId={ownerId}
                defaultDocumentType="other"
                onUploaded={() => {
                  setDocumentRefreshSignal((current) => current + 1);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}