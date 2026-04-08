"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  EmailTemplateScenario,
  Document,
  DocumentAttachmentType,
  DocumentType,
  Tenant,
  Unit
} from "@hhousing/domain";
import type {
  CreateEmailTemplateOutput,
  EmailTemplateView,
  LeaseWithTenantView,
  PropertyWithUnitsView,
  UpdateEmailTemplateOutput
} from "@hhousing/api-contracts";
import { BUILTIN_EMAIL_TEMPLATES, renderTemplateText, type EmailTemplateRenderContext } from "../lib/email/template-catalog";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";
import { deleteWithAuth, patchWithAuth, postWithAuth } from "../lib/api-client";

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
  lease: "Bail"
};

const SCENARIO_LABELS: Record<EmailTemplateScenario, string> = {
  welcome_letter: "Lettre de bienvenue",
  house_rules: "Règlement intérieur",
  lease_draft: "Envoi du bail",
  general: "Général"
};

type WorkspaceTab = "documents" | "templates" | "send";

type DocumentFormState = {
  fileName: string;
  file: File | null;
  documentType: DocumentType;
};

type TemplateFormState = {
  name: string;
  scenario: EmailTemplateScenario;
  subject: string;
  body: string;
};

interface DocumentsWorkspacePanelProps {
  organizationId: string;
  documents: Document[];
  properties: PropertyWithUnitsView[];
  leases: LeaseWithTenantView[];
  tenants: Tenant[];
}

const INITIAL_TEMPLATE_FORM: TemplateFormState = {
  name: "",
  scenario: "general",
  subject: "",
  body: ""
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsWorkspacePanel({
  organizationId,
  documents,
  properties,
  leases,
  tenants
}: DocumentsWorkspacePanelProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("documents");
  const [templates, setTemplates] = useState<EmailTemplateView[]>(BUILTIN_EMAIL_TEMPLATES);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<DocumentType | "all">("all");
  const [attachmentFilter, setAttachmentFilter] = useState<DocumentAttachmentType | "all">("all");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [documentForm, setDocumentForm] = useState<DocumentFormState>({
    fileName: "",
    file: null,
    documentType: "other"
  });
  const [uploadBusy, setUploadBusy] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(INITIAL_TEMPLATE_FORM);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(BUILTIN_EMAIL_TEMPLATES[0]?.id ?? "");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.property.id ?? "");
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>(leases[0]?.id ?? "");
  const [selectedTenantId, setSelectedTenantId] = useState<string>(tenants[0]?.id ?? "");
  const [recipientEmail, setRecipientEmail] = useState<string>(tenants[0]?.email ?? leases[0]?.tenantEmail ?? "");
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [emailBody, setEmailBody] = useState<string>("");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchTemplates(): Promise<void> {
    setTemplatesLoading(true);
    try {
      const response = await fetch("/api/email-templates", { credentials: "include" });
      if (!response.ok) {
        setTemplates(BUILTIN_EMAIL_TEMPLATES);
        return;
      }

      const result = await response.json() as { success: boolean; data?: { templates: EmailTemplateView[] } };
      setTemplates(result.success && result.data ? result.data.templates : BUILTIN_EMAIL_TEMPLATES);
    } finally {
      setTemplatesLoading(false);
    }
  }

  useEffect(() => {
    void fetchTemplates();
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  );

  const selectedLease = useMemo(
    () => leases.find((lease) => lease.id === selectedLeaseId) ?? null,
    [leases, selectedLeaseId]
  );

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === selectedTenantId) ?? null,
    [tenants, selectedTenantId]
  );

  const selectedPropertyRecord = useMemo(() => {
    if (selectedPropertyId) {
      return properties.find((propertyItem) => propertyItem.property.id === selectedPropertyId) ?? null;
    }

    if (!selectedLease) {
      return null;
    }

    return properties.find((propertyItem) => propertyItem.units.some((unit) => unit.id === selectedLease.unitId)) ?? null;
  }, [properties, selectedLease, selectedPropertyId]);

  const selectedUnit = useMemo((): Unit | null => {
    if (!selectedLease || !selectedPropertyRecord) {
      return null;
    }

    return selectedPropertyRecord.units.find((unit) => unit.id === selectedLease.unitId) ?? null;
  }, [selectedLease, selectedPropertyRecord]);

  const sendContext = useMemo<EmailTemplateRenderContext>(() => ({
    property: selectedPropertyRecord?.property ?? null,
    unit: selectedUnit,
    lease: selectedLease,
    tenant: selectedTenant,
    today: new Date().toISOString().substring(0, 10)
  }), [selectedLease, selectedPropertyRecord, selectedTenant, selectedUnit]);

  useEffect(() => {
    if (!selectedLease) {
      return;
    }

    const leaseProperty = properties.find((propertyItem) => propertyItem.units.some((unit) => unit.id === selectedLease.unitId));
    if (leaseProperty) {
      setSelectedPropertyId(leaseProperty.property.id);
    }

    setSelectedTenantId(selectedLease.tenantId);
    setRecipientEmail(selectedLease.tenantEmail ?? "");

    const leaseDocumentIds = documents
      .filter((document) => document.attachmentType === "lease" && document.attachmentId === selectedLease.id)
      .map((document) => document.id);
    setSelectedDocumentIds(leaseDocumentIds);
  }, [documents, leases, properties, selectedLease]);

  useEffect(() => {
    if (!selectedLease && selectedTenant?.email) {
      setRecipientEmail(selectedTenant.email);
    }
  }, [selectedLease, selectedTenant]);

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }

    setEmailSubject(renderTemplateText(selectedTemplate.subject, sendContext));
    setEmailBody(renderTemplateText(selectedTemplate.body, sendContext));
  }, [selectedTemplate, sendContext]);

  const filteredDocuments = useMemo(() => {
    let filtered = documents;
    if (typeFilter !== "all") {
      filtered = filtered.filter((document) => document.documentType === typeFilter);
    }
    if (attachmentFilter !== "all") {
      filtered = filtered.filter((document) => document.attachmentType === attachmentFilter);
    }
    return filtered;
  }, [attachmentFilter, documents, typeFilter]);

  const customTemplates = useMemo(
    () => templates.filter((template) => template.source === "custom"),
    [templates]
  );

  async function handleUploadDocument(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setUploadBusy(true);
    setError(null);
    setMessage(null);

    if (!documentForm.file) {
      setError("Veuillez sélectionner un fichier.");
      setUploadBusy(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const filePath = `${organizationId}/library/${Date.now()}-${documentForm.file.name}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, documentForm.file);

    if (uploadError) {
      setError(uploadError.message.toLowerCase().includes("row-level security policy")
        ? "Upload bloqué par Supabase Storage RLS. Ajoutez une policy INSERT pour le bucket 'documents' (rôle authenticated)."
        : `Erreur de téléchargement: ${uploadError.message}`);
      setUploadBusy(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(filePath);

    const result = await postWithAuth<Document>("/api/documents", {
      organizationId,
      fileName: documentForm.fileName.trim() || documentForm.file.name,
      fileUrl: publicUrl,
      fileSize: documentForm.file.size,
      mimeType: documentForm.file.type || "application/octet-stream",
      documentType: documentForm.documentType
    });

    if (!result.success) {
      setError(result.error);
      setUploadBusy(false);
      return;
    }

    setMessage("Document téléchargé avec succès.");
    setShowUploadForm(false);
    setUploadBusy(false);
    window.location.reload();
  }

  async function handleDeleteDocument(documentId: string): Promise<void> {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) {
      return;
    }

    setDeletingDocumentId(documentId);
    setError(null);
    setMessage(null);

    const result = await deleteWithAuth(`/api/documents/${documentId}`);
    if (!result.success) {
      setError(result.error);
      setDeletingDocumentId(null);
      return;
    }

    setMessage("Document supprimé avec succès.");
    setDeletingDocumentId(null);
    window.location.reload();
  }

  async function handleSaveTemplate(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setTemplateBusy(true);
    setError(null);
    setMessage(null);

    const payload = {
      organizationId,
      name: templateForm.name.trim(),
      scenario: templateForm.scenario,
      subject: templateForm.subject.trim(),
      body: templateForm.body.trim()
    };

    const result = editingTemplateId
      ? await patchWithAuth<UpdateEmailTemplateOutput>(`/api/email-templates/${editingTemplateId}`, payload)
      : await postWithAuth<CreateEmailTemplateOutput>("/api/email-templates", payload);

    if (!result.success) {
      setError(result.error);
      setTemplateBusy(false);
      return;
    }

    setTemplateForm(INITIAL_TEMPLATE_FORM);
    setEditingTemplateId(null);
    setMessage(editingTemplateId ? "Template mis à jour." : "Template créé.");
    setTemplateBusy(false);
    await fetchTemplates();
  }

  async function handleDeleteTemplate(templateId: string): Promise<void> {
    if (!confirm("Supprimer ce template ?")) {
      return;
    }

    setDeletingTemplateId(templateId);
    setError(null);
    setMessage(null);

    const result = await deleteWithAuth(`/api/email-templates/${templateId}`);
    if (!result.success) {
      setError(result.error);
      setDeletingTemplateId(null);
      return;
    }

    setMessage("Template supprimé.");
    setDeletingTemplateId(null);
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId(BUILTIN_EMAIL_TEMPLATES[0]?.id ?? "");
    }
    await fetchTemplates();
  }

  async function handleSendEmail(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSendBusy(true);
    setError(null);
    setMessage(null);

    const result = await postWithAuth<{ success: boolean }>("/api/emails/send", {
      organizationId,
      to: recipientEmail.trim(),
      subject: emailSubject.trim(),
      body: emailBody.trim(),
      documentIds: selectedDocumentIds
    });

    if (!result.success) {
      setError(result.error);
      setSendBusy(false);
      return;
    }

    setMessage("Email envoyé avec succès.");
    setSendBusy(false);
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#010a19]">Documents et envois</h1>
          <p className="mt-1 text-sm text-gray-500">
            Centralisez vos documents, préparez vos templates et envoyez les bons fichiers aux bons locataires.
          </p>
        </div>
      </div>

      <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        {[
          { id: "documents", label: `Documents (${documents.length})` },
          { id: "templates", label: `Templates (${templates.length})` },
          { id: "send", label: "Envoi" }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as WorkspaceTab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              activeTab === tab.id ? "bg-[#0063fe] text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message ? <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div> : null}
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {activeTab === "documents" ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-base font-semibold text-[#010a19]">Bibliothèque documentaire</h2>
              <p className="mt-1 text-sm text-gray-500">Chargez les pièces et rattachez-les proprement à un bail, un locataire, une unité ou une propriété.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowUploadForm((previous) => !previous)}
              className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0]"
            >
              {showUploadForm ? "Annuler" : "+ Télécharger"}
            </button>
          </div>

          {showUploadForm ? (
            <form onSubmit={handleUploadDocument} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700">
                  <span className="mb-1.5 block">Fichier</span>
                  <input
                    type="file"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setDocumentForm((previous) => ({
                        ...previous,
                        file,
                        fileName: previous.fileName || file?.name || ""
                      }));
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  <span className="mb-1.5 block">Libellé du document</span>
                  <input
                    value={documentForm.fileName}
                    onChange={(event) => setDocumentForm((previous) => ({ ...previous, fileName: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Ex: Bail signé avril 2026"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Type de document</span>
                <select
                  value={documentForm.documentType}
                  onChange={(event) => setDocumentForm((previous) => ({ ...previous, documentType: event.target.value as DocumentType }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                Le document sera stocké dans la bibliothèque et pourra être choisi plus tard dans les brouillons ou autres envois.
              </div>

              <button type="submit" disabled={uploadBusy} className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60">
                {uploadBusy ? "Téléchargement..." : "Télécharger le document"}
              </button>
            </form>
          ) : null}

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex gap-2 flex-wrap">
              <button type="button" onClick={() => setTypeFilter("all")} className={`px-3 py-1.5 text-xs font-medium rounded-lg ${typeFilter === "all" ? "bg-[#0063fe] text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}>
                Tous les types ({documents.length})
              </button>
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([type, label]) => (
                <button key={type} type="button" onClick={() => setTypeFilter(type as DocumentType)} className={`px-3 py-1.5 text-xs font-medium rounded-lg ${typeFilter === type ? "bg-[#0063fe] text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="border-b border-gray-200 bg-white px-4 py-3 flex gap-2 flex-wrap">
              <button type="button" onClick={() => setAttachmentFilter("all")} className={`px-3 py-1.5 text-xs font-medium rounded-lg ${attachmentFilter === "all" ? "bg-[#010a19] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                Toutes les cibles
              </button>
              {Object.entries(ATTACHMENT_TYPE_LABELS).map(([type, label]) => (
                <button key={type} type="button" onClick={() => setAttachmentFilter(type as DocumentAttachmentType)} className={`px-3 py-1.5 text-xs font-medium rounded-lg ${attachmentFilter === type ? "bg-[#010a19] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {label}
                </button>
              ))}
            </div>
            {filteredDocuments.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">Aucun document dans cette vue.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Libellé</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Cible</th>
                    <th className="px-4 py-3 text-left">Taille</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDocuments.map((document) => (
                    <tr key={document.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-[#010a19]">{document.fileName}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${DOCUMENT_TYPE_STYLES[document.documentType]}`}>{DOCUMENT_TYPE_LABELS[document.documentType]}</span></td>
                      <td className="px-4 py-3 text-gray-600">{getDocumentLocationLabel(document, properties, leases, tenants)}</td>
                      <td className="px-4 py-3 text-gray-500">{formatFileSize(document.fileSize)}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(document.createdAtIso).toLocaleDateString("fr-FR")}</td>
                      <td className="px-4 py-3 space-x-3">
                        <a href={document.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[#0063fe] hover:underline text-sm font-medium">Ouvrir</a>
                        <button type="button" onClick={() => handleDeleteDocument(document.id)} disabled={deletingDocumentId === document.id} className="text-red-600 hover:underline text-sm font-medium disabled:opacity-60">
                          {deletingDocumentId === document.id ? "..." : "Supprimer"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "templates" ? (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-[#010a19]">Templates prêts à l'emploi</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {templates.filter((template) => template.source === "builtin").map((template) => (
                  <article key={template.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-[#010a19]">{template.name}</h3>
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">{SCENARIO_LABELS[template.scenario]}</span>
                    </div>
                    <p className="mt-2 text-xs font-medium text-gray-500">Sujet: {template.subject}</p>
                    <p className="mt-3 whitespace-pre-line text-sm text-gray-600 line-clamp-6">{template.body}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-[#010a19]">Templates personnalisés</h2>
              <p className="mt-1 text-sm text-gray-500">Créez vos propres modèles d'envoi, puis réutilisez-les dans l'onglet Envoi.</p>
              {templatesLoading ? (
                <p className="mt-4 text-sm text-gray-400">Chargement...</p>
              ) : customTemplates.length === 0 ? (
                <p className="mt-4 text-sm text-gray-400">Aucun template personnalisé enregistré.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {customTemplates.map((template) => (
                    <div key={template.id} className="rounded-xl border border-gray-200 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-[#010a19]">{template.name}</h3>
                            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700">{SCENARIO_LABELS[template.scenario]}</span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">{template.subject}</p>
                        </div>
                        <div className="flex gap-3">
                          <button type="button" onClick={() => {
                            setEditingTemplateId(template.id);
                            setTemplateForm({
                              name: template.name,
                              scenario: template.scenario,
                              subject: template.subject,
                              body: template.body
                            });
                          }} className="text-sm font-medium text-[#0063fe] hover:underline">
                            Modifier
                          </button>
                          <button type="button" onClick={() => void handleDeleteTemplate(template.id)} disabled={deletingTemplateId === template.id} className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60">
                            {deletingTemplateId === template.id ? "..." : "Supprimer"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveTemplate} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4 h-fit">
            <div>
              <h2 className="text-base font-semibold text-[#010a19]">{editingTemplateId ? "Modifier le template" : "Créer un template"}</h2>
              <p className="mt-1 text-sm text-gray-500">Le contenu reste modifiable au moment de l'envoi.</p>
            </div>
            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-1.5 block">Nom</span>
              <input value={templateForm.name} onChange={(event) => setTemplateForm((previous) => ({ ...previous, name: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-1.5 block">Scénario</span>
              <select value={templateForm.scenario} onChange={(event) => setTemplateForm((previous) => ({ ...previous, scenario: event.target.value as EmailTemplateScenario }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {Object.entries(SCENARIO_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-1.5 block">Sujet</span>
              <input value={templateForm.subject} onChange={(event) => setTemplateForm((previous) => ({ ...previous, subject: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-1.5 block">Texte</span>
              <textarea value={templateForm.body} onChange={(event) => setTemplateForm((previous) => ({ ...previous, body: event.target.value }))} className="min-h-56 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
            </label>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
              {"Placeholders disponibles: {{today}}, {{tenant_name}}, {{tenant_email}}, {{property_name}}, {{property_address}}, {{property_city}}, {{unit_number}}, {{lease_start_date}}, {{lease_end_date}}, {{monthly_rent}}, {{currency}}"}
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={templateBusy} className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60">
                {templateBusy ? "Enregistrement..." : editingTemplateId ? "Mettre à jour" : "Créer le template"}
              </button>
              {editingTemplateId ? (
                <button type="button" onClick={() => { setEditingTemplateId(null); setTemplateForm(INITIAL_TEMPLATE_FORM); }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Annuler
                </button>
              ) : null}
            </div>
          </form>
        </section>
      ) : null}

      {activeTab === "send" ? (
        <form onSubmit={handleSendEmail} className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5">
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
              <div>
                <h2 className="text-base font-semibold text-[#010a19]">Contexte d'envoi</h2>
                <p className="mt-1 text-sm text-gray-500">Choisissez le template et le contexte. Les informations seront injectées automatiquement dans le message.</p>
              </div>
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Template</span>
                <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>{template.name} · {template.source === "builtin" ? "Standard" : "Personnalisé"}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Propriété</span>
                <select value={selectedPropertyId} onChange={(event) => setSelectedPropertyId(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Aucune</option>
                  {properties.map((propertyItem) => (
                    <option key={propertyItem.property.id} value={propertyItem.property.id}>{propertyItem.property.name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Bail</span>
                <select value={selectedLeaseId} onChange={(event) => setSelectedLeaseId(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Aucun</option>
                  {leases.map((lease) => (
                    <option key={lease.id} value={lease.id}>{lease.tenantFullName} · {lease.startDate}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Locataire</span>
                <select value={selectedTenantId} onChange={(event) => setSelectedTenantId(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Aucun</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>{tenant.fullName}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Adresse email destinataire</span>
                <input type="email" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
              </label>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
              <div>
                <h2 className="text-base font-semibold text-[#010a19]">Pièces jointes</h2>
                <p className="mt-1 text-sm text-gray-500">Les documents du bail sélectionné sont pré-cochés automatiquement. Vous pouvez ajuster la sélection.</p>
              </div>
              <div className="max-h-80 space-y-2 overflow-auto pr-1">
                {documents.length === 0 ? (
                  <p className="text-sm text-gray-400">Aucun document disponible.</p>
                ) : (
                  documents.map((document) => (
                    <label key={document.id} className="flex items-start gap-3 rounded-lg border border-gray-200 px-3 py-3 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedDocumentIds.includes(document.id)}
                        onChange={() => setSelectedDocumentIds((previous) => previous.includes(document.id) ? previous.filter((id) => id !== document.id) : [...previous, document.id])}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300"
                      />
                      <div>
                        <div className="font-medium text-[#010a19]">{document.fileName}</div>
                        <div className="mt-1 text-xs text-gray-500">{getDocumentLocationLabel(document, properties, leases, tenants)}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4 h-fit">
            <div>
              <h2 className="text-base font-semibold text-[#010a19]">Contenu de l'email</h2>
              <p className="mt-1 text-sm text-gray-500">Le contenu est pré-rempli à partir du template, puis reste entièrement modifiable avant envoi.</p>
            </div>
            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-1.5 block">Sujet</span>
              <input value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-1.5 block">Message</span>
              <textarea value={emailBody} onChange={(event) => setEmailBody(event.target.value)} className="min-h-80 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
            </label>
            <button type="submit" disabled={sendBusy} className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60">
              {sendBusy ? "Envoi..." : "Envoyer l'email"}
            </button>
          </section>
        </form>
      ) : null}
    </div>
  );
}

function getAttachmentLabel(
  document: Document,
  properties: PropertyWithUnitsView[],
  leases: LeaseWithTenantView[],
  tenants: Tenant[]
): string {
  if (document.attachmentType === null || document.attachmentId === null) {
    return "Bibliothèque générale";
  }

  if (document.attachmentType === "property") {
    return properties.find((propertyItem) => propertyItem.property.id === document.attachmentId)?.property.name ?? document.attachmentId;
  }

  if (document.attachmentType === "unit") {
    const propertyItem = properties.find((item) => item.units.some((unit) => unit.id === document.attachmentId));
    const unit = propertyItem?.units.find((item) => item.id === document.attachmentId);
    return unit ? `${propertyItem?.property.name} · ${unit.unitNumber}` : document.attachmentId;
  }

  if (document.attachmentType === "tenant") {
    return tenants.find((tenant) => tenant.id === document.attachmentId)?.fullName ?? document.attachmentId;
  }

  const lease = leases.find((item) => item.id === document.attachmentId);
  return lease ? `${lease.tenantFullName} · ${lease.startDate}` : document.attachmentId;
}

function getDocumentLocationLabel(
  document: Document,
  properties: PropertyWithUnitsView[],
  leases: LeaseWithTenantView[],
  tenants: Tenant[]
): string {
  if (document.attachmentType === null || document.attachmentId === null) {
    return "Bibliothèque générale";
  }

  return `${ATTACHMENT_TYPE_LABELS[document.attachmentType]} · ${getAttachmentLabel(document, properties, leases, tenants)}`;
}