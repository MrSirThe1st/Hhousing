"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { GetLeaseMoveOutOutput, LeaseWithTenantView } from "@hhousing/api-contracts";
import type { Document, MoveOut, Property, Tenant, Unit } from "@hhousing/domain";
import { getWithAuth, postWithAuth } from "../../../../lib/api-client";
import UniversalLoadingState from "../../../../components/universal-loading-state";
import ActionMenu from "../../../../components/action-menu";

const ContextualDocumentPanel = dynamic(
  () => import("../../../../components/contextual-document-panel"),
  { ssr: false }
);

const ContextualDocumentUploadForm = dynamic(
  () => import("../../../../components/contextual-document-upload-form"),
  { ssr: false }
);

const STATUS_LABELS: Record<string, string> = { active: "Actif", ended: "Terminé", pending: "En attente" };
const STATUS_STYLES: Record<string, string> = { active: "bg-green-100 text-green-700", ended: "bg-gray-100 text-gray-500", pending: "bg-yellow-100 text-yellow-700" };
const PAYMENT_FREQUENCY_LABELS: Record<string, string> = {
  monthly: "Mensuel",
  quarterly: "Trimestriel",
  annually: "Annuel",
  one_time: "Unique"
};
const SIGNING_METHOD_LABELS: Record<string, string> = {
  physical: "Physique",
  scanned: "Scannée",
  email_confirmation: "Confirmation e-mail"
};

interface LeaseDetailClientProps {
  id: string;
  initialLease: LeaseWithTenantView;
  initialAvailableDocuments: Document[];
  tenant: Tenant | null;
  unit: Unit | null;
  property: Property | null;
  showMoveOutAction: boolean;
}

export default function LeaseDetailClient({
  id,
  initialLease,
  initialAvailableDocuments: _initialAvailableDocuments,
  tenant,
  unit,
  property,
  showMoveOutAction
}: LeaseDetailClientProps): React.ReactElement {
  const router = useRouter();
  const [lease] = useState<LeaseWithTenantView>(initialLease);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyMoveOut, setBusyMoveOut] = useState(false);
  const [plannedMoveOut, setPlannedMoveOut] = useState<MoveOut | null>(null);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [documentRefreshSignal, setDocumentRefreshSignal] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadMoveOut(): Promise<void> {
      const result = await getWithAuth<GetLeaseMoveOutOutput>(`/api/leases/${id}/move-out`);
      if (cancelled) return;
      if (result.success && result.data.moveOut?.status === "planned") {
        setPlannedMoveOut(result.data.moveOut);
      } else {
        setPlannedMoveOut(null);
      }
    }

    void loadMoveOut();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleConfirmDeparture(): Promise<void> {
    setBusyMoveOut(true);
    setError(null);
    setMessage(null);
    const result = await postWithAuth(`/api/leases/${id}/move-out/confirm-departure`, {});
    if (!result.success) {
      setError(result.error);
      setBusyMoveOut(false);
      return;
    }
    setMessage("Départ confirmé. Le bail est terminé et le logement est libre.");
    setBusyMoveOut(false);
    router.refresh();
  }

  async function handleCancelMoveOut(): Promise<void> {
    setBusyMoveOut(true);
    setError(null);
    setMessage(null);
    const result = await postWithAuth(`/api/leases/${id}/move-out/cancel`, {});
    if (!result.success) {
      setError(result.error);
      setBusyMoveOut(false);
      return;
    }
    setPlannedMoveOut(null);
    setMessage("Fin de location annulée.");
    setBusyMoveOut(false);
    router.refresh();
  }

  const canUseMoveOutAction = showMoveOutAction && lease.status === "active" && plannedMoveOut === null;
  const canUseAddDocumentAction = true;
  const canUseDraftEmailWorkspaceAction = lease.status === "active";

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/dashboard/leases" className="mb-4 inline-block text-sm text-[#0063fe] hover:underline">
          ← Retour aux baux
        </Link>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#010a19]">Bail - {lease.tenantFullName}</h1>
            <p className="mt-1 text-gray-600">{lease.tenantEmail ?? "Aucun e-mail"}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[lease.status] ?? "bg-gray-100 text-gray-500"}`}>
              {STATUS_LABELS[lease.status] ?? lease.status}
            </span>
            {plannedMoveOut ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                Fin prévue · {plannedMoveOut.departureEffectiveDate}
              </span>
            ) : null}
            <ActionMenu
              triggerLabel="Actions"
              items={[
                ...(showMoveOutAction
                  ? [{
                      label: "Mettre fin à la location",
                      href: `/dashboard/leases/${id}/move-out`,
                      disabled: !canUseMoveOutAction
                    }]
                  : []),
                {
                  label: "Communications du bail",
                  href: `/dashboard/leases/${id}/emails`,
                  disabled: !canUseDraftEmailWorkspaceAction
                }
              ]}
            />
          </div>
        </div>

        {plannedMoveOut ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
            <h2 className="text-sm font-semibold text-amber-900">Fin de location planifiée</h2>
            <p className="mt-1 text-sm text-amber-800">
              Départ effectif le {plannedMoveOut.departureEffectiveDate}.
              {plannedMoveOut.depositRefundAmount !== null
                ? ` Montant à rembourser: ${plannedMoveOut.depositRefundAmount.toLocaleString("fr-FR")} ${plannedMoveOut.currencyCode ?? lease.currencyCode}.`
                : null}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyMoveOut}
                onClick={() => void handleConfirmDeparture()}
                className="rounded-lg bg-[#0063fe] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0052d4] disabled:opacity-60"
              >
                Confirmer le départ maintenant
              </button>
              <button
                type="button"
                disabled={busyMoveOut}
                onClick={() => void handleCancelMoveOut()}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Annuler la fin de location
              </button>
            </div>
          </div>
        ) : null}

        <div className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Locataire</h2>
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
            <div><p className="text-xs text-slate-500">Nom complet</p><p className="mt-0.5 text-sm font-medium text-[#010a19]">{lease.tenantFullName}</p></div>
            <div><p className="text-xs text-slate-500">E-mail</p><p className="mt-0.5 text-sm font-medium text-[#010a19]">{lease.tenantEmail ?? "—"}</p></div>
            <div><p className="text-xs text-slate-500">Téléphone</p><p className="mt-0.5 text-sm font-medium text-[#010a19]">{tenant?.phone ?? "—"}</p></div>
          </div>
        </div>

        <div className="mb-6 border-t border-slate-100" />

        {(property ?? unit) ? (
          <div className="mb-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Bien &amp; logement</h2>
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
              {property ? (
                <>
                  <div><p className="text-xs text-slate-500">Nom du bien</p><p className="mt-0.5 text-sm font-medium text-[#010a19]">{property.name}</p></div>
                  <div className="md:col-span-2"><p className="text-xs text-slate-500">Adresse</p><p className="mt-0.5 text-sm font-medium text-[#010a19]">{property.address}{property.city ? `, ${property.city}` : ""}</p></div>
                </>
              ) : null}
              {unit ? (
                <>
                  <div><p className="text-xs text-slate-500">Logement</p><p className="mt-0.5 text-sm font-medium text-[#010a19]">{unit.unitNumber}</p></div>
                  <div><p className="text-xs text-slate-500">Chambres / Salles de bain</p><p className="mt-0.5 text-sm font-medium text-[#010a19]">{unit.bedroomCount ?? "—"} ch. / {unit.bathroomCount ?? "—"} sdb</p></div>
                  <div><p className="text-xs text-slate-500">Surface</p><p className="mt-0.5 text-sm font-medium text-[#010a19]">{unit.sizeSqm != null ? `${unit.sizeSqm} m²` : "—"}</p></div>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mb-6 border-t border-slate-100" />

        <div className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Conditions du bail</h2>
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
            <div><p className="text-xs text-slate-500">Date de début</p><p className="mt-0.5 text-sm font-medium text-[#010a19]">{lease.startDate}</p></div>
            <div><p className="text-xs text-slate-500">Date de fin</p><p className="mt-0.5 text-sm font-medium text-[#010a19]">{lease.endDate ?? "Sans date de fin"}</p></div>
            <div><p className="text-xs text-slate-500">Type de durée</p><p className="mt-0.5 text-sm font-medium text-[#010a19]">{lease.termType === "fixed" ? `Durée fixe${lease.fixedTermMonths ? ` · ${lease.fixedTermMonths} mois` : ""}` : "Mois à mois"}</p></div>
            <div><p className="text-xs text-slate-500">Fréquence de paiement</p><p className="mt-0.5 text-sm font-medium text-[#010a19]">{PAYMENT_FREQUENCY_LABELS[lease.paymentFrequency] ?? lease.paymentFrequency}</p></div>
            <div><p className="text-xs text-slate-500">Début des paiements</p><p className="mt-0.5 text-sm font-medium text-[#010a19]">{lease.paymentStartDate}</p></div>
            <div><p className="text-xs text-slate-500">Jour d&apos;échéance</p><p className="mt-0.5 text-sm font-medium text-[#010a19]">{lease.dueDayOfMonth}</p></div>
            <div><p className="text-xs text-slate-500">Renouvellement auto</p><p className="mt-0.5 text-sm font-medium text-[#010a19]">{lease.autoRenewToMonthly ? "Oui" : "Non"}</p></div>
            <div><p className="text-xs text-slate-500">Activé le</p><p className="mt-0.5 text-sm font-medium text-[#010a19]">{lease.activatedAtIso ? new Date(lease.activatedAtIso).toLocaleDateString("fr-FR") : "—"}</p></div>
            <div><p className="text-xs text-slate-500">Créé le</p><p className="mt-0.5 text-sm font-medium text-[#010a19]">{new Date(lease.createdAtIso).toLocaleDateString("fr-FR")}</p></div>
          </div>
        </div>

        <div className="mb-6 border-t border-slate-100" />

        <div className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Montants</h2>
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
            <div><p className="text-xs text-slate-500">Loyer mensuel</p><p className="mt-0.5 text-sm font-medium text-[#010a19]">{lease.monthlyRentAmount.toLocaleString("fr-FR")} {lease.currencyCode}</p></div>
            <div><p className="text-xs text-slate-500">Caution</p><p className="mt-0.5 text-sm font-medium text-[#010a19]">{lease.depositAmount.toLocaleString("fr-FR")} {lease.currencyCode}</p></div>
            <div><p className="text-xs text-slate-500">Méthode de signature</p><p className="mt-0.5 text-sm font-medium text-[#010a19]">{lease.signingMethod ? (SIGNING_METHOD_LABELS[lease.signingMethod] ?? lease.signingMethod) : "—"}</p></div>
            <div><p className="text-xs text-slate-500">Signé le</p><p className="mt-0.5 text-sm font-medium text-[#010a19]">{lease.signedAt ?? "—"}</p></div>
          </div>
        </div>

        {message ? <p className="mt-3 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p> : null}
        {error ? <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
      </div>

      {busyMoveOut ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}

      <div id="lease-documents-panel">
        <ContextualDocumentPanel attachmentType="lease" attachmentId={id} title="Documents du bail" description="Importez ici le bail signé, les annexes, et les pièces remises au locataire pour cette entrée en location." addButtonLabel="+ Ajouter un document" defaultDocumentType="lease_agreement" preferredDocumentType="lease_agreement" preferredDocumentEmptyMessage="Aucun bail signé n'est encore importé pour cette entrée en location." preferredDocumentReadyMessage="Un bail signé est déjà attaché à cette entrée en location." showAddButton={canUseAddDocumentAction} onAddButtonClick={() => setDocumentModalOpen(true)} refreshSignal={documentRefreshSignal} />
      </div>
      {documentModalOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/55 p-4" onClick={() => setDocumentModalOpen(false)} role="dialog" aria-modal="true" aria-label="Ajouter un document au bail"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-200 px-6 py-4"><div><h2 className="text-lg font-semibold text-[#010a19]">Ajouter un document</h2><p className="mt-1 text-sm text-slate-500">Importez un document et rattachez-le directement à ce bail.</p></div><button type="button" onClick={() => setDocumentModalOpen(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Fermer</button></div><div className="p-6"><ContextualDocumentUploadForm attachmentType="lease" attachmentId={id} defaultDocumentType="lease_agreement" onUploaded={() => { setDocumentRefreshSignal((current) => current + 1); }} /></div></div></div> : null}
    </div>
  );
}
