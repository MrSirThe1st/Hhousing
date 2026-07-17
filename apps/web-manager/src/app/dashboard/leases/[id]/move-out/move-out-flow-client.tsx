"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type {
  CloseMoveOutOutput,
  GetLeaseMoveOutOutput,
  GetMoveOutReconciliationOutput,
  LeaseMoveOutView,
  UpsertMoveOutChargeInput,
  UpsertMoveOutInput
} from "@hhousing/api-contracts";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import type { Document } from "@hhousing/domain";
import { getWithAuth, patchWithAuth, postWithAuth } from "../../../../../lib/api-client";
import { createSupabaseBrowserClient } from "../../../../../lib/supabase/browser";
import UniversalLoadingState from "../../../../../components/universal-loading-state";

type MoveOutChargeType = UpsertMoveOutChargeInput["chargeType"];

type MoveOutChecklistItem = {
  id: string;
  label: string;
  isChecked: boolean;
  note: string | null;
};

type MoveOutChargeDraft = {
  id: string;
  chargeType: MoveOutChargeType;
  amount: string;
  currencyCode: string;
  note: string;
};

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
type WizardStep = "departure" | "finances" | "inspection" | "close";

const WIZARD_STEPS: Array<{ id: WizardStep; label: string }> = [
  { id: "departure", label: "Départ" },
  { id: "finances", label: "Finances" },
  { id: "inspection", label: "Inspection" },
  { id: "close", label: "Clôturer" }
];

const DEFAULT_CHECKLIST: MoveOutChecklistItem[] = [
  { id: "keys_returned", label: "Clés récupérées", isChecked: false, note: null },
  { id: "meter_reading", label: "Index eau/électricité relevés", isChecked: false, note: null },
  { id: "walls_checked", label: "Murs et plafonds inspectés", isChecked: false, note: null },
  { id: "fixtures_checked", label: "Équipements inspectés", isChecked: false, note: null },
  { id: "cleaning_done", label: "État de propreté constaté", isChecked: false, note: null }
];

const MOVE_OUT_CHARGE_OPTIONS: Array<{ value: MoveOutChargeType; label: string }> = [
  { value: "unpaid_rent", label: "Loyers en retard" },
  { value: "prorated_rent", label: "Loyer proratisé" },
  { value: "fee", label: "Frais" },
  { value: "damage", label: "Dommages" },
  { value: "cleaning", label: "Nettoyage" },
  { value: "penalty", label: "Pénalité" },
  { value: "deposit_deduction", label: "Retenue sur garantie" },
  { value: "credit", label: "Crédit locataire" }
];

const RECONCILIATION_SEVERITY_LABELS: Record<string, string> = {
  blocking: "Blocage",
  drift_anomaly: "Écart détecté",
  warning: "Avertissement"
};

const RECONCILIATION_SEVERITY_STYLES: Record<string, string> = {
  blocking: "border-red-200 bg-red-50 text-red-700",
  drift_anomaly: "border-amber-200 bg-amber-50 text-amber-700",
  warning: "border-gray-200 bg-gray-50 text-gray-700"
};

function makeDraftCharge(currencyCode: string): MoveOutChargeDraft {
  return {
    id: `charge_${Math.random().toString(36).slice(2, 8)}`,
    chargeType: "damage",
    amount: "",
    currencyCode,
    note: ""
  };
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

interface MoveOutFlowClientProps {
  id: string;
  initialLease: LeaseWithTenantView;
  initialAvailableDocuments: Document[];
}

export default function MoveOutFlowClient({ id, initialLease, initialAvailableDocuments }: MoveOutFlowClientProps): React.ReactElement {
  const [lease] = useState<LeaseWithTenantView>(initialLease);
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>(initialAvailableDocuments);
  const [error, setError] = useState<string | null>(null);
  const [loadingMoveOut, setLoadingMoveOut] = useState(false);
  const [savingMoveOut, setSavingMoveOut] = useState(false);
  const [savingInspection, setSavingInspection] = useState(false);
  const [closingMoveOut, setClosingMoveOut] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [moveOutView, setMoveOutView] = useState<LeaseMoveOutView | null>(null);
  const [moveOutDate, setMoveOutDate] = useState(new Date().toISOString().slice(0, 10));
  const [moveOutReason, setMoveOutReason] = useState("");
  const [moveOutStatus, setMoveOutStatus] = useState<"draft" | "confirmed">("draft");
  const [moveOutCharges, setMoveOutCharges] = useState<MoveOutChargeDraft[]>([]);
  const [inspectionChecklist, setInspectionChecklist] = useState<MoveOutChecklistItem[]>(DEFAULT_CHECKLIST);
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [inspectionDate, setInspectionDate] = useState("");
  const [inspectionPhotoDocumentIds, setInspectionPhotoDocumentIds] = useState<string[]>([]);
  const [closureLedgerEventId, setClosureLedgerEventId] = useState("");
  const [reconciliation, setReconciliation] = useState<GetMoveOutReconciliationOutput | null>(null);
  const [showConfirmCloseModal, setShowConfirmCloseModal] = useState(false);
  const [step, setStep] = useState<WizardStep>("departure");
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  const inspectionPhotoDocuments = useMemo(
    () => availableDocuments.filter((d) => inspectionPhotoDocumentIds.includes(d.id)),
    [availableDocuments, inspectionPhotoDocumentIds]
  );

  const moveOutSummary = moveOutView?.summary ?? null;
  const isMoveOutClosed = moveOutView?.moveOut.status === "closed";
  const isConfirmed = moveOutStatus === "confirmed" || moveOutView?.moveOut.status === "confirmed";
  const confirmedAt = moveOutView?.moveOut.confirmedAtIso ?? null;

  function markDirty(): void {
    setSaveState("dirty");
  }

  function applyMoveOutState(view: LeaseMoveOutView | null): void {
    setMoveOutView(view);

    if (!view) {
      setMoveOutDate(new Date().toISOString().slice(0, 10));
      setMoveOutReason("");
      setMoveOutStatus("draft");
      setMoveOutCharges([]);
      setInspectionChecklist(DEFAULT_CHECKLIST);
      setInspectionNotes("");
      setInspectionDate("");
      setInspectionPhotoDocumentIds([]);
      setClosureLedgerEventId("");
      return;
    }

    setMoveOutDate(view.moveOut.moveOutDate);
    setMoveOutReason(view.moveOut.reason ?? "");
    setMoveOutStatus(view.moveOut.status === "confirmed" ? "confirmed" : "draft");
    setClosureLedgerEventId(view.moveOut.closureLedgerEventId ? String(view.moveOut.closureLedgerEventId) : "");
    setMoveOutCharges(
      view.charges.map((charge) => ({
        id: charge.id,
        chargeType: charge.chargeType,
        amount: String(charge.amount),
        currencyCode: charge.currencyCode,
        note: charge.note ?? ""
      }))
    );

    if (view.inspection) {
      setInspectionChecklist(view.inspection.checklistSnapshot);
      setInspectionNotes(view.inspection.notes ?? "");
      setInspectionDate(view.inspection.inspectedAtIso ? view.inspection.inspectedAtIso.slice(0, 10) : "");
      setInspectionPhotoDocumentIds(view.inspection.photoDocumentIds);
      return;
    }

    setInspectionChecklist(DEFAULT_CHECKLIST);
    setInspectionNotes("");
    setInspectionDate("");
    setInspectionPhotoDocumentIds([]);
  }

  const refreshDocuments = useCallback(async (): Promise<void> => {
    const result = await getWithAuth<{ documents: Document[] }>(
      `/api/documents?organizationId=${lease.organizationId}&attachmentType=lease&attachmentId=${id}`
    );
    if (result.success) {
      setAvailableDocuments(result.data.documents);
    }
  }, [id, lease.organizationId]);

  async function loadMoveOutView(): Promise<void> {
    setLoadingMoveOut(true);

    const result = await getWithAuth<GetLeaseMoveOutOutput>(`/api/leases/${id}/move-out`);

    if (result.success) {
      applyMoveOutState(result.data.moveOut);
      const reconciliationResult = await getWithAuth<GetMoveOutReconciliationOutput>(`/api/leases/${id}/move-out/reconciliation`);
      if (reconciliationResult.success) {
        setReconciliation(reconciliationResult.data);
      }
    } else {
      setError(result.error);
    }

    setLoadingMoveOut(false);
  }

  useEffect(() => {
    void loadMoveOutView();
  }, [id]);

  // Block navigation when there are unsaved changes and last save failed
  useEffect(() => {
    if (saveState !== "dirty" && saveState !== "error") return;

    function handleBeforeUnload(event: BeforeUnloadEvent): void {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveState]);

  async function handleSaveMoveOut(nextStatus: "draft" | "confirmed"): Promise<boolean> {
    setSavingMoveOut(true);
    setSaveState("saving");
    setError(null);

    const charges: UpsertMoveOutChargeInput[] = [];
    for (const charge of moveOutCharges) {
      const amount = Number(charge.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        continue;
      }

      charges.push({
        chargeType: charge.chargeType,
        amount,
        currencyCode: charge.currencyCode.trim().toUpperCase() || lease.currencyCode,
        note: charge.note.trim() || null
      });
    }

    const payload: UpsertMoveOutInput = {
      moveOutDate,
      reason: moveOutReason.trim() || null,
      status: nextStatus,
      charges
    };

    const result = await patchWithAuth<LeaseMoveOutView>(`/api/leases/${id}/move-out`, payload);
    if (!result.success) {
      setError(result.error);
      setSaveState("error");
      setSavingMoveOut(false);
      return false;
    }

    await loadMoveOutView();
    setSaveState("saved");
    setLastSavedAt(new Date().toISOString());
    setSavingMoveOut(false);
    return true;
  }

  async function handleSaveInspection(): Promise<boolean> {
    setSavingInspection(true);
    setSaveState("saving");
    setError(null);

    const result = await patchWithAuth(`/api/leases/${id}/move-out/inspection`, {
      checklistSnapshot: inspectionChecklist,
      notes: inspectionNotes.trim() || null,
      photoDocumentIds: inspectionPhotoDocumentIds,
      inspectedAt: inspectionDate || null
    });

    if (!result.success) {
      setError(result.error);
      setSaveState("error");
      setSavingInspection(false);
      return false;
    }

    setSaveState("saved");
    setLastSavedAt(new Date().toISOString());
    await loadMoveOutView();
    setSavingInspection(false);
    return true;
  }

  async function handleAutoFillLedgerEventId(): Promise<void> {
    const result = await getWithAuth<{ ledgerEventId: number | null }>("/api/move-outs/latest-ledger-event");
    if (result.success && result.data.ledgerEventId !== null) {
      setClosureLedgerEventId(String(result.data.ledgerEventId));
    } else {
      setError("Aucun enregistrement financier trouvé pour cette organisation.");
    }
  }

  async function handleCloseMoveOut(): Promise<void> {
    const parsedClosureLedgerEventId = Number(closureLedgerEventId);
    if (!Number.isInteger(parsedClosureLedgerEventId) || parsedClosureLedgerEventId <= 0) {
      setError("Identifiant de séquence comptable manquant. Utilisez le bouton de remplissage automatique.");
      return;
    }

    setShowConfirmCloseModal(false);
    setClosingMoveOut(true);
    setError(null);

    const result = await patchWithAuth<CloseMoveOutOutput>(`/api/leases/${id}/move-out/close`, {
      closureLedgerEventId: parsedClosureLedgerEventId
    });

    if (!result.success) {
      setError(result.error);
      setClosingMoveOut(false);
      return;
    }

    await loadMoveOutView();
    setClosingMoveOut(false);
  }

  async function handlePhotoUpload(file: File): Promise<void> {
    setUploadingPhoto(true);
    setError(null);

    const sessionResponse = await fetch("/api/session", { credentials: "include" });
    if (!sessionResponse.ok) {
      setError("Session expirée.");
      setUploadingPhoto(false);
      return;
    }

    const sessionPayload = await sessionResponse.json() as { success: boolean; data?: { organizationId: string; userId: string } };
    if (!sessionPayload.success || !sessionPayload.data) {
      setError("Session expirée.");
      setUploadingPhoto(false);
      return;
    }

    const { organizationId } = sessionPayload.data;
    const supabase = createSupabaseBrowserClient();
    const filePath = `${organizationId}/lease/${id}/${Date.now()}-${file.name}`;
    const uploadResult = await supabase.storage.from("documents").upload(filePath, file);

    if (uploadResult.error) {
      setError(`Erreur d'upload: ${uploadResult.error.message}`);
      setUploadingPhoto(false);
      return;
    }

    const publicUrl = supabase.storage.from("documents").getPublicUrl(filePath).data.publicUrl;
    const saveResult = await postWithAuth<{ id: string }>("/api/documents", {
      organizationId,
      fileName: file.name,
      fileUrl: publicUrl,
      fileSize: file.size,
      mimeType: file.type || "image/jpeg",
      documentType: "other",
      attachmentType: "lease",
      attachmentId: id
    });

    if (!saveResult.success) {
      setError(saveResult.error);
      setUploadingPhoto(false);
      return;
    }

    const newDocId = saveResult.data.id;
    await refreshDocuments();
    setInspectionPhotoDocumentIds((prev) => [...prev, newDocId]);
    setUploadingPhoto(false);
  }

  function addMoveOutCharge(): void {
    setMoveOutCharges((previous) => [...previous, makeDraftCharge(lease.currencyCode)]);
    markDirty();
  }

  function updateMoveOutCharge(index: number, patch: Partial<MoveOutChargeDraft>): void {
    setMoveOutCharges((previous) =>
      previous.map((charge, currentIndex) => (currentIndex === index ? { ...charge, ...patch } : charge))
    );
    markDirty();
  }

  function removeMoveOutCharge(index: number): void {
    setMoveOutCharges((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
    markDirty();
  }

  function toggleInspectionChecklistItem(idValue: string): void {
    setInspectionChecklist((previous) =>
      previous.map((item) => (item.id === idValue ? { ...item, isChecked: !item.isChecked } : item))
    );
    markDirty();
  }

  function updateInspectionChecklistNote(idValue: string, note: string): void {
    setInspectionChecklist((previous) =>
      previous.map((item) => (item.id === idValue ? { ...item, note: note.trim() || null } : item))
    );
    markDirty();
  }

  function SaveStateIndicator(): React.ReactElement {
    if (saveState === "saving") {
      return <span className="flex items-center gap-1.5 text-xs text-gray-400"><span className="h-2 w-2 animate-pulse rounded-full bg-gray-300" />Enregistrement...</span>;
    }
    if (saveState === "saved" && lastSavedAt) {
      const mins = Math.floor((Date.now() - new Date(lastSavedAt).getTime()) / 60_000);
      const label = mins < 1 ? "à l'instant" : `il y a ${mins} min`;
      return <span className="flex items-center gap-1.5 text-xs text-green-600"><span className="h-2 w-2 rounded-full bg-green-500" />Enregistré {label}</span>;
    }
    if (saveState === "error") {
      return <span className="flex items-center gap-1.5 text-xs text-red-600"><span className="h-2 w-2 rounded-full bg-red-500" />Échec de l'enregistrement</span>;
    }
    if (saveState === "dirty") {
      return <span className="flex items-center gap-1.5 text-xs text-gray-400"><span className="h-2 w-2 rounded-full bg-gray-300" />Non sauvegardé</span>;
    }
    return <span />;
  }

  const currentStatus = moveOutView?.moveOut.status ?? moveOutStatus;

  function StatusPill(): React.ReactElement {
    if (currentStatus === "closed") {
      return <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />Clôturé</span>;
    }
    if (currentStatus === "confirmed") {
      return <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Confirmé</span>;
    }
    return <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600"><span className="h-1.5 w-1.5 rounded-full bg-gray-400" />Brouillon</span>;
  }

  const blockingIssues = reconciliation?.issues.filter((i) => i.severity === "blocking") ?? [];
  const canClose = currentStatus === "confirmed" && !isMoveOutClosed && blockingIssues.length === 0;
  const stepIndex = WIZARD_STEPS.findIndex((item) => item.id === step);
  const busy = savingMoveOut || savingInspection || closingMoveOut || loadingMoveOut;

  useEffect(() => {
    if (isMoveOutClosed) {
      setStep("close");
    }
  }, [isMoveOutClosed]);

  function validateStep(currentStep: WizardStep): string | null {
    if (currentStep === "departure") {
      if (!moveOutDate) {
        return "Indiquez la date de sortie.";
      }
      return null;
    }
    if (currentStep === "finances") {
      const invalidCharge = moveOutCharges.find((charge) => {
        const trimmed = charge.amount.trim();
        if (trimmed.length === 0) {
          return false;
        }
        const amount = Number(trimmed);
        return !Number.isFinite(amount) || amount <= 0;
      });
      if (invalidCharge) {
        return "Chaque ligne de régularisation renseignée doit avoir un montant positif.";
      }
      return null;
    }
    return null;
  }

  async function goNext(): Promise<void> {
    setError(null);
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (step === "departure" && !isMoveOutClosed && saveState === "dirty") {
      const saved = await handleSaveMoveOut(isConfirmed ? "confirmed" : "draft");
      if (!saved) {
        return;
      }
    }

    if (step === "finances" && !isMoveOutClosed && saveState === "dirty" && !isConfirmed) {
      const saved = await handleSaveMoveOut("draft");
      if (!saved) {
        return;
      }
    }

    if (step === "inspection" && !isMoveOutClosed && saveState === "dirty") {
      const saved = await handleSaveInspection();
      if (!saved) {
        return;
      }
    }

    const next = WIZARD_STEPS[stepIndex + 1];
    if (next) {
      setStep(next.id);
    }
  }

  function goBack(): void {
    setError(null);
    const previous = WIZARD_STEPS[stepIndex - 1];
    if (previous) {
      setStep(previous.id);
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/move-outs" className="text-sm text-[#0063fe] hover:underline">← Départs</Link>
            <span className="text-gray-300">/</span>
            <Link href={`/dashboard/leases/${id}`} className="text-sm text-gray-500 hover:underline">{lease.tenantFullName}</Link>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-[#010a19]">Départ locataire</h1>
            <StatusPill />
          </div>
          <p className="mt-2 text-sm text-slate-600">Suivez les étapes. Une seule décision à la fois.</p>
        </div>
        <SaveStateIndicator />
      </div>

      <div className="mb-6 max-w-2xl">
        <div className="flex items-center gap-1 sm:gap-2">
          {WIZARD_STEPS.map((wizardStep, index) => {
            const isCurrent = wizardStep.id === step;
            const isDone = index < stepIndex || (isMoveOutClosed && index <= stepIndex);
            return (
              <div key={wizardStep.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
                <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      isCurrent
                        ? "bg-[#0063fe] text-white"
                        : isDone
                          ? "bg-[#0063fe]/15 text-[#0063fe]"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className={`hidden truncate text-xs sm:block ${isCurrent ? "font-semibold text-[#010a19]" : "text-slate-500"}`}>
                    {wizardStep.label}
                  </span>
                </div>
                {index < WIZARD_STEPS.length - 1 ? (
                  <div className={`mb-4 hidden h-0.5 flex-1 sm:block ${isDone ? "bg-[#0063fe]/40" : "bg-slate-200"}`} />
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-center text-sm font-medium text-[#010a19] sm:hidden">
          Étape {stepIndex + 1} sur {WIZARD_STEPS.length} · {WIZARD_STEPS[stepIndex]?.label}
        </p>
      </div>

      <div className="max-w-2xl space-y-5">
        {step === "departure" ? (
          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-[#010a19]">Quand part le locataire ?</h2>
              <p className="mt-1 text-sm text-slate-600">Date de sortie et motif du départ.</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Date de sortie</span>
                {isConfirmed && !isMoveOutClosed ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-[#010a19]">
                      {new Date(moveOutDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                    <button type="button" onClick={() => void handleSaveMoveOut("draft")} className="text-xs text-[#0063fe] hover:underline">
                      Modifier (repasser en brouillon)
                    </button>
                  </div>
                ) : (
                  <input
                    type="date"
                    value={moveOutDate}
                    onChange={(event) => { setMoveOutDate(event.target.value); markDirty(); }}
                    disabled={isMoveOutClosed}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] disabled:opacity-60"
                  />
                )}
              </label>
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1.5 block">Motif (optionnel)</span>
                <input
                  type="text"
                  value={moveOutReason}
                  onChange={(event) => { setMoveOutReason(event.target.value); markDirty(); }}
                  disabled={isMoveOutClosed}
                  placeholder="Ex. fin de contrat, départ anticipé..."
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] disabled:opacity-60"
                />
              </label>
            </div>
          </section>
        ) : null}

        {step === "finances" ? (
          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-[#010a19]">Régularisations financières</h2>
              <p className="mt-1 text-sm text-slate-600">
                Loyers, dommages, retenues sur caution. Vous pouvez continuer sans ligne si tout est déjà soldé.
              </p>
            </div>

            {moveOutSummary ? (
              <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-slate-50 p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Loyers en retard</p>
                  <p className="text-base font-semibold text-[#010a19]">
                    {moveOutSummary.outstandingAmount.toLocaleString("fr-FR")} {moveOutSummary.currencyCode}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Échéances à venir</p>
                  <p className="text-base font-semibold text-[#010a19]">
                    {moveOutSummary.futureScheduledAmount.toLocaleString("fr-FR")} {moveOutSummary.currencyCode}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Garantie</p>
                  <p className="text-base font-semibold text-[#010a19]">
                    {moveOutSummary.depositHeldAmount.toLocaleString("fr-FR")} {moveOutSummary.currencyCode}
                  </p>
                </div>
              </div>
            ) : null}

            {isConfirmed && confirmedAt ? (
              <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                <span className="text-xs font-medium text-blue-600">Données figées le {formatDateTime(confirmedAt)}</span>
              </div>
            ) : null}

            <div className="rounded-lg border border-gray-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[#010a19]">Lignes de régularisation</h3>
                {!isMoveOutClosed ? (
                  <button
                    type="button"
                    onClick={addMoveOutCharge}
                    className="rounded-lg border border-[#0063fe] px-3 py-1.5 text-xs font-semibold text-[#0063fe] hover:bg-[#0063fe]/5"
                  >
                    Ajouter une ligne
                  </button>
                ) : null}
              </div>
              {moveOutCharges.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun ajustement saisi.</p>
              ) : (
                <div className="space-y-3">
                  {moveOutCharges.map((charge, index) => (
                    <div key={charge.id} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:grid-cols-12">
                      <select
                        value={charge.chargeType}
                        onChange={(event) => updateMoveOutCharge(index, { chargeType: event.target.value as MoveOutChargeType })}
                        disabled={isMoveOutClosed}
                        className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm disabled:opacity-60 sm:col-span-4"
                      >
                        {MOVE_OUT_CHARGE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <input
                        value={charge.amount}
                        onChange={(event) => updateMoveOutCharge(index, { amount: event.target.value })}
                        disabled={isMoveOutClosed}
                        placeholder="Montant"
                        className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm disabled:opacity-60 sm:col-span-2"
                      />
                      <input
                        value={charge.currencyCode}
                        onChange={(event) => updateMoveOutCharge(index, { currencyCode: event.target.value.toUpperCase() })}
                        disabled={isMoveOutClosed}
                        className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm disabled:opacity-60 sm:col-span-2"
                      />
                      <input
                        value={charge.note}
                        onChange={(event) => updateMoveOutCharge(index, { note: event.target.value })}
                        disabled={isMoveOutClosed}
                        placeholder="Note"
                        className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm disabled:opacity-60 sm:col-span-3"
                      />
                      {!isMoveOutClosed ? (
                        <button
                          type="button"
                          onClick={() => removeMoveOutCharge(index)}
                          className="rounded-lg border border-red-200 px-2 py-2 text-xs font-semibold text-red-600 sm:col-span-1"
                        >
                          Suppr.
                        </button>
                      ) : (
                        <div className="sm:col-span-1" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {reconciliation ? (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="mb-2 text-sm font-semibold text-[#010a19]">Vérifications</h3>
                {reconciliation.issues.length === 0 ? (
                  <p className="text-sm font-medium text-green-700">✓ Tout est correct</p>
                ) : (
                  <div className="space-y-2">
                    {reconciliation.issues.map((issue) => (
                      <div
                        key={issue.code}
                        className={`rounded-lg border px-3 py-2 text-sm ${RECONCILIATION_SEVERITY_STYLES[issue.severity] ?? RECONCILIATION_SEVERITY_STYLES.warning}`}
                      >
                        <p className="font-semibold">{RECONCILIATION_SEVERITY_LABELS[issue.severity] ?? issue.severity}</p>
                        <p>{issue.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {!isMoveOutClosed ? (
              <div className="flex flex-wrap items-center gap-3">
                {!isConfirmed ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleSaveMoveOut("draft")}
                      disabled={savingMoveOut}
                      className="rounded-lg border border-[#0063fe] px-4 py-2 text-sm font-semibold text-[#0063fe] hover:bg-[#0063fe]/5 disabled:opacity-60"
                    >
                      Enregistrer le brouillon
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveMoveOut("confirmed")}
                      disabled={savingMoveOut}
                      title="La date et les données financières seront figées. Vous pourrez encore ajouter des photos et notes."
                      className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0052d4] disabled:opacity-60"
                    >
                      Valider et figer les finances
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleSaveMoveOut("draft")}
                    disabled={savingMoveOut}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Repasser en brouillon
                  </button>
                )}
              </div>
            ) : null}
          </section>
        ) : null}

        {step === "inspection" ? (
          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-[#010a19]">Inspection du logement</h2>
              <p className="mt-1 text-sm text-slate-600">Cochez ce qui a été vérifié. Photos et notes peuvent attendre.</p>
            </div>

            <div className="space-y-2">
              {inspectionChecklist.map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-200 bg-slate-50 px-3 py-2">
                  <label className="flex items-center gap-2 text-sm text-[#010a19]">
                    <input
                      type="checkbox"
                      checked={item.isChecked}
                      onChange={() => toggleInspectionChecklistItem(item.id)}
                      disabled={isMoveOutClosed}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    {item.label}
                  </label>
                  <input
                    value={item.note ?? ""}
                    onChange={(event) => updateInspectionChecklistNote(item.id, event.target.value)}
                    disabled={isMoveOutClosed}
                    placeholder="Note optionnelle"
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm disabled:opacity-60"
                  />
                </div>
              ))}
            </div>

            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-1.5 block">Date d&apos;inspection (optionnel)</span>
              <input
                type="date"
                value={inspectionDate}
                onChange={(event) => { setInspectionDate(event.target.value); markDirty(); }}
                disabled={isMoveOutClosed}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm disabled:opacity-60"
              />
            </label>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Photos d&apos;inspection (optionnel)</p>
              {inspectionPhotoDocuments.length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {inspectionPhotoDocuments.map((doc) => (
                    <div key={doc.id} className="group relative">
                      <img
                        src={doc.fileUrl}
                        alt={doc.fileName}
                        className="h-16 w-16 rounded-lg border border-gray-200 object-cover"
                      />
                      {!isMoveOutClosed ? (
                        <button
                          type="button"
                          onClick={() => {
                            setInspectionPhotoDocumentIds((prev) => prev.filter((docId) => docId !== doc.id));
                            markDirty();
                          }}
                          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 bg-white text-xs text-gray-500 opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label="Retirer la photo"
                        >
                          ×
                        </button>
                      ) : null}
                      <p className="mt-1 max-w-16 truncate text-center text-xs text-gray-400">{doc.fileName}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              {!isMoveOutClosed ? (
                <>
                  <input
                    ref={photoFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handlePhotoUpload(file);
                      event.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => photoFileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-[#0063fe] hover:text-[#0063fe] disabled:opacity-60"
                  >
                    {uploadingPhoto ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                        <path d="M8 1v10M3 6l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M1 12v2h14v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    )}
                    {uploadingPhoto ? "Envoi en cours..." : "Ajouter une photo"}
                  </button>
                </>
              ) : null}
            </div>

            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-1.5 block">Notes globales (optionnel)</span>
              <textarea
                value={inspectionNotes}
                onChange={(event) => { setInspectionNotes(event.target.value); markDirty(); }}
                disabled={isMoveOutClosed}
                className="min-h-24 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm disabled:opacity-60"
              />
            </label>

            {!isMoveOutClosed ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleSaveInspection()}
                  disabled={savingInspection || uploadingPhoto}
                  className="rounded-lg border border-[#0063fe] px-4 py-2 text-sm font-semibold text-[#0063fe] hover:bg-[#0063fe]/5 disabled:opacity-60"
                >
                  Enregistrer l&apos;inspection
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        {step === "close" ? (
          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-[#010a19]">Finaliser le départ</h2>
              <p className="mt-1 text-sm text-slate-600">Vérifiez le résumé, puis clôturez définitivement.</p>
            </div>

            <dl className="space-y-3 rounded-lg border border-gray-100 bg-slate-50 px-4 py-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Locataire</dt>
                <dd className="text-right font-medium text-[#010a19]">{lease.tenantFullName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Date de sortie</dt>
                <dd className="text-right font-medium text-[#010a19]">
                  {moveOutDate
                    ? new Date(`${moveOutDate}T12:00:00`).toLocaleDateString("fr-FR")
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Motif</dt>
                <dd className="text-right font-medium text-[#010a19]">{moveOutReason.trim() || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Régularisations</dt>
                <dd className="text-right font-medium text-[#010a19]">
                  {moveOutCharges.filter((c) => c.amount.trim()).length || "Aucune"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Inspection</dt>
                <dd className="text-right font-medium text-[#010a19]">
                  {inspectionChecklist.filter((item) => item.isChecked).length}/{inspectionChecklist.length} points
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Statut</dt>
                <dd className="text-right font-medium text-[#010a19]">
                  {currentStatus === "closed" ? "Clôturé" : currentStatus === "confirmed" ? "Confirmé" : "Brouillon"}
                </dd>
              </div>
            </dl>

            {!isMoveOutClosed ? (
              <div className="rounded-lg border border-dashed border-gray-300 px-4 py-3 space-y-3">
                <p className="text-sm text-gray-600">
                  Les données financières actuelles seront utilisées pour clôturer ce départ.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-500">Séquence comptable :</span>
                  <input
                    type="text"
                    value={closureLedgerEventId ? `#${closureLedgerEventId}` : "—"}
                    readOnly
                    className="w-24 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => void handleAutoFillLedgerEventId()}
                    className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                  >
                    Utiliser le dernier enregistrement
                  </button>
                </div>
                {blockingIssues.length > 0 ? (
                  <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                    Résolvez les blocages financiers avant de finaliser.
                  </p>
                ) : null}
                {currentStatus !== "confirmed" ? (
                  <p className="text-xs text-amber-700">
                    Retournez à Finances et validez pour figer les données avant de clôturer.
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowConfirmCloseModal(true)}
                  disabled={!canClose || closingMoveOut}
                  className="rounded-lg bg-[#010a19] px-4 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
                >
                  Finaliser le départ
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-semibold text-green-700">Départ finalisé</p>
                <p className="mt-1 text-xs text-green-600">Ce dossier a été clôturé et est désormais archivé.</p>
                <Link
                  href={`/dashboard/leases/${id}`}
                  className="mt-3 inline-block text-sm font-medium text-[#0063fe] hover:underline"
                >
                  Retour au bail
                </Link>
              </div>
            )}
          </section>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {!isMoveOutClosed || step !== "close" ? (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={goBack}
                disabled={busy}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Retour
              </button>
            ) : (
              <span />
            )}
            {step !== "close" ? (
              <button
                type="button"
                onClick={() => void goNext()}
                disabled={busy}
                className="rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
              >
                Continuer
              </button>
            ) : (
              <span />
            )}
          </div>
        ) : null}
      </div>

      {showConfirmCloseModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/40 backdrop-blur-[2px]">
          <div className="mx-4 w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-[#010a19]">Confirmer la finalisation</h2>
            <p className="mt-2 text-sm text-gray-600">
              Cette action est <strong>définitive</strong> et ne peut pas être annulée. Le dossier sera archivé avec l&apos;état financier actuel.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmCloseModal(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleCloseMoveOut()}
                disabled={closingMoveOut}
                className="rounded-lg bg-[#010a19] px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
              >
                Finaliser définitivement
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {busy ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
    </div>
  );
}
