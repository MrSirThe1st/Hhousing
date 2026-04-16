"use client";

import { useEffect, useMemo, useState } from "react";
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
import { getWithAuth, patchWithAuth } from "../../../../../lib/api-client";
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

const DEFAULT_CHECKLIST: MoveOutChecklistItem[] = [
  { id: "keys_returned", label: "Clés récupérées", isChecked: false, note: null },
  { id: "meter_reading", label: "Index eau/électricité relevés", isChecked: false, note: null },
  { id: "walls_checked", label: "Murs et plafonds inspectés", isChecked: false, note: null },
  { id: "fixtures_checked", label: "Équipements inspectés", isChecked: false, note: null },
  { id: "cleaning_done", label: "État de propreté constaté", isChecked: false, note: null }
];

const MOVE_OUT_CHARGE_OPTIONS: Array<{ value: MoveOutChargeType; label: string }> = [
  { value: "unpaid_rent", label: "Loyer impayé" },
  { value: "prorated_rent", label: "Loyer proratisé" },
  { value: "fee", label: "Frais" },
  { value: "damage", label: "Dommages" },
  { value: "cleaning", label: "Nettoyage" },
  { value: "penalty", label: "Pénalité" },
  { value: "deposit_deduction", label: "Retenue sur dépôt" },
  { value: "credit", label: "Crédit locataire" }
];

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

interface MoveOutFlowClientProps {
  id: string;
  initialLease: LeaseWithTenantView;
  initialAvailableDocuments: Document[];
}

export default function MoveOutFlowClient({ id, initialLease, initialAvailableDocuments }: MoveOutFlowClientProps): React.ReactElement {
  const [lease] = useState<LeaseWithTenantView>(initialLease);
  const [availableDocuments] = useState<Document[]>(initialAvailableDocuments);
  const [error, setError] = useState<string | null>(null);
  const [loadingMoveOut, setLoadingMoveOut] = useState(false);
  const [savingMoveOut, setSavingMoveOut] = useState(false);
  const [savingInspection, setSavingInspection] = useState(false);
  const [closingMoveOut, setClosingMoveOut] = useState(false);
  const [moveOutMessage, setMoveOutMessage] = useState<string | null>(null);
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

  const inspectionPhotoOptions = useMemo(
    () => availableDocuments.filter((document) => document.mimeType.startsWith("image/")),
    [availableDocuments]
  );

  const moveOutSummary = moveOutView?.summary ?? null;
  const isMoveOutClosed = moveOutView?.moveOut.status === "closed";

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

  async function handleSaveMoveOut(nextStatus: "draft" | "confirmed"): Promise<void> {
    setSavingMoveOut(true);
    setError(null);
    setMoveOutMessage(null);

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
      setSavingMoveOut(false);
      return;
    }

    await loadMoveOutView();
    setMoveOutMessage(nextStatus === "confirmed" ? "Move-out confirmé." : "Brouillon move-out enregistré.");
    setSavingMoveOut(false);
  }

  async function handleSaveInspection(): Promise<void> {
    setSavingInspection(true);
    setError(null);
    setMoveOutMessage(null);

    const result = await patchWithAuth(`/api/leases/${id}/move-out/inspection`, {
      checklistSnapshot: inspectionChecklist,
      notes: inspectionNotes.trim() || null,
      photoDocumentIds: inspectionPhotoDocumentIds,
      inspectedAt: inspectionDate || null
    });

    if (!result.success) {
      setError(result.error);
      setSavingInspection(false);
      return;
    }

    setMoveOutMessage("Inspection move-out enregistrée.");
    await loadMoveOutView();
    setSavingInspection(false);
  }

  async function handleCloseMoveOut(): Promise<void> {
    const parsedClosureLedgerEventId = Number(closureLedgerEventId);
    if (!Number.isInteger(parsedClosureLedgerEventId) || parsedClosureLedgerEventId <= 0) {
      setError("Saisissez un closureLedgerEventId valide (entier positif).");
      return;
    }

    setClosingMoveOut(true);
    setError(null);
    setMoveOutMessage(null);

    const result = await patchWithAuth<CloseMoveOutOutput>(`/api/leases/${id}/move-out/close`, {
      closureLedgerEventId: parsedClosureLedgerEventId
    });

    if (!result.success) {
      setError(result.error);
      setClosingMoveOut(false);
      return;
    }

    await loadMoveOutView();
    setMoveOutMessage("Move-out clôturé et snapshot figé.");
    setClosingMoveOut(false);
  }

  function addMoveOutCharge(): void {
    setMoveOutCharges((previous) => [...previous, makeDraftCharge(lease.currencyCode)]);
  }

  function updateMoveOutCharge(index: number, patch: Partial<MoveOutChargeDraft>): void {
    setMoveOutCharges((previous) =>
      previous.map((charge, currentIndex) => (currentIndex === index ? { ...charge, ...patch } : charge))
    );
  }

  function removeMoveOutCharge(index: number): void {
    setMoveOutCharges((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
  }

  function toggleInspectionChecklistItem(idValue: string): void {
    setInspectionChecklist((previous) =>
      previous.map((item) => (item.id === idValue ? { ...item, isChecked: !item.isChecked } : item))
    );
  }

  function updateInspectionChecklistNote(idValue: string, note: string): void {
    setInspectionChecklist((previous) =>
      previous.map((item) => (item.id === idValue ? { ...item, note: note.trim() || null } : item))
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Link href={`/dashboard/leases/${id}`} className="inline-block text-sm text-[#0063fe] hover:underline">
            ← Retour au bail
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-[#010a19]">Workflow move-out</h1>
          <p className="mt-1 text-sm text-gray-500">
            Bail: {lease.tenantFullName}
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">Date de sortie</span>
            <input type="date" value={moveOutDate} onChange={(event) => setMoveOutDate(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19]" />
          </label>
          <label className="block text-sm font-medium text-gray-700 md:col-span-2">
            <span className="mb-1.5 block">Motif</span>
            <input type="text" value={moveOutReason} onChange={(event) => setMoveOutReason(event.target.value)} placeholder="Ex. fin de contrat, départ anticipé..." className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19]" />
          </label>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[#010a19]">Ajustements move-out</h3>
            <button type="button" onClick={addMoveOutCharge} className="rounded-lg border border-[#0063fe] px-3 py-1.5 text-xs font-semibold text-[#0063fe] hover:bg-[#0063fe]/5">Ajouter une ligne</button>
          </div>
          {moveOutCharges.length === 0 ? <p className="text-sm text-gray-500">Aucun ajustement saisi.</p> : (
            <div className="space-y-3">
              {moveOutCharges.map((charge, index) => (
                <div key={charge.id} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-3 md:grid-cols-12">
                  <select value={charge.chargeType} onChange={(event) => updateMoveOutCharge(index, { chargeType: event.target.value as MoveOutChargeType })} className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm md:col-span-4">
                    {MOVE_OUT_CHARGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <input value={charge.amount} onChange={(event) => updateMoveOutCharge(index, { amount: event.target.value })} placeholder="Montant" className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm md:col-span-2" />
                  <input value={charge.currencyCode} onChange={(event) => updateMoveOutCharge(index, { currencyCode: event.target.value.toUpperCase() })} className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm md:col-span-2" />
                  <input value={charge.note} onChange={(event) => updateMoveOutCharge(index, { note: event.target.value })} placeholder="Note" className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-sm md:col-span-3" />
                  <button type="button" onClick={() => removeMoveOutCharge(index)} className="rounded-lg border border-red-200 px-2 py-2 text-xs font-semibold text-red-600 md:col-span-1">Suppr.</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {moveOutSummary ? (
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-3">
            <div><p className="text-xs uppercase tracking-wide text-gray-500">Impayés</p><p className="text-base font-semibold text-[#010a19]">{moveOutSummary.outstandingAmount.toLocaleString("fr-FR")} {moveOutSummary.currencyCode}</p></div>
            <div><p className="text-xs uppercase tracking-wide text-gray-500">Futur planifié</p><p className="text-base font-semibold text-[#010a19]">{moveOutSummary.futureScheduledAmount.toLocaleString("fr-FR")} {moveOutSummary.currencyCode}</p></div>
            <div><p className="text-xs uppercase tracking-wide text-gray-500">Dépôt détenu</p><p className="text-base font-semibold text-[#010a19]">{moveOutSummary.depositHeldAmount.toLocaleString("fr-FR")} {moveOutSummary.currencyCode}</p></div>
          </div>
        ) : null}

        {reconciliation ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#010a19]">Contrôles de reconciliation</h3>
              <span className="text-xs text-gray-500">{reconciliation.issueCount} anomalie(s) détectée(s)</span>
            </div>
            {reconciliation.issues.length === 0 ? (
              <p className="mt-2 text-sm text-green-700">Aucune anomalie détectée entre snapshot et vue live.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {reconciliation.issues.map((issue) => (
                  <div
                    key={issue.code}
                    className={`rounded-lg border px-3 py-2 text-sm ${RECONCILIATION_SEVERITY_STYLES[issue.severity] ?? RECONCILIATION_SEVERITY_STYLES.warning}`}
                  >
                    <p className="font-semibold">{issue.severity}</p>
                    <p>{issue.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-[#010a19]">Inspection move-out</h3>
          <div className="space-y-2">
            {inspectionChecklist.map((item) => (
              <div key={item.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                <label className="flex items-center gap-2 text-sm text-[#010a19]">
                  <input type="checkbox" checked={item.isChecked} onChange={() => toggleInspectionChecklistItem(item.id)} className="h-4 w-4 rounded border-gray-300" />
                  {item.label}
                </label>
                <input value={item.note ?? ""} onChange={(event) => updateInspectionChecklistNote(item.id, event.target.value)} placeholder="Note optionnelle" className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm" />
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-1.5 block">Date inspection</span>
              <input type="date" value={inspectionDate} onChange={(event) => setInspectionDate(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-1.5 block">Photos (documents image)</span>
              <select value="" onChange={(event) => {
                const selectedId = event.target.value;
                if (!selectedId) return;
                setInspectionPhotoDocumentIds((previous) => previous.includes(selectedId) ? previous : [...previous, selectedId]);
              }} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                <option value="">Ajouter une photo</option>
                {inspectionPhotoOptions.map((document) => <option key={document.id} value={document.id}>{document.fileName}</option>)}
              </select>
            </label>
          </div>
          {inspectionPhotoDocumentIds.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {inspectionPhotoDocumentIds.map((documentId) => (
                <button key={documentId} type="button" onClick={() => setInspectionPhotoDocumentIds((previous) => previous.filter((idValue) => idValue !== documentId))} className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-700">
                  {documentId} ×
                </button>
              ))}
            </div>
          ) : null}
          <label className="mt-3 block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">Notes globales</span>
            <textarea value={inspectionNotes} onChange={(event) => setInspectionNotes(event.target.value)} className="min-h-24 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm" />
          </label>
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={handleSaveInspection} disabled={savingInspection || isMoveOutClosed} className="rounded-lg border border-[#0063fe] px-4 py-2 text-sm font-semibold text-[#0063fe] hover:bg-[#0063fe]/5 disabled:opacity-60">Enregistrer l'inspection</button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => handleSaveMoveOut("draft")} disabled={savingMoveOut || isMoveOutClosed} className="rounded-lg border border-[#0063fe] px-4 py-2 text-sm font-semibold text-[#0063fe] hover:bg-[#0063fe]/5 disabled:opacity-60">Sauvegarder brouillon</button>
          <button type="button" onClick={() => handleSaveMoveOut("confirmed")} disabled={savingMoveOut || isMoveOutClosed} className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0052d4] disabled:opacity-60">Confirmer move-out</button>
          <span className="text-sm text-gray-500">Statut courant: {moveOutView?.moveOut.status ?? moveOutStatus}</span>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-[#010a19]">Clôture technique</h3>
          <p className="mt-1 text-xs text-gray-500">Renseignez le dernier ledger_event_id inclus dans le snapshot final.</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-1.5 block">closureLedgerEventId</span>
              <input
                type="number"
                min="1"
                value={closureLedgerEventId}
                onChange={(event) => setClosureLedgerEventId(event.target.value)}
                className="w-56 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                disabled={isMoveOutClosed}
              />
            </label>
            <button
              type="button"
              onClick={handleCloseMoveOut}
              disabled={closingMoveOut || moveOutView?.moveOut.status !== "confirmed" || isMoveOutClosed}
              className="rounded-lg bg-[#010a19] px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
            >
              Clôturer le move-out
            </button>
          </div>
        </div>

        {moveOutMessage ? <p className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">{moveOutMessage}</p> : null}
        {error ? <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
      </div>

      {savingMoveOut || savingInspection || closingMoveOut || loadingMoveOut ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
    </div>
  );
}
