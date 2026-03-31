"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type {
  MaintenanceRequest,
  MaintenanceStatus,
  MaintenanceTimelineEvent,
  MaintenanceEventType
} from "@hhousing/domain";
import { patchWithAuth } from "../../../../lib/api-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Résolu",
  cancelled: "Annulé"
};

const STATUS_STYLES: Record<MaintenanceStatus, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500"
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Faible",
  medium: "Moyen",
  high: "Élevé",
  urgent: "Urgent"
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-gray-100 text-gray-500",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700"
};

const STATUS_WORKFLOW: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  open: ["in_progress", "cancelled"],
  in_progress: ["resolved", "open", "cancelled"],
  resolved: [],
  cancelled: []
};

export default function MaintenanceDetailPage({ params }: PageProps): React.ReactElement {
  const { id } = use(params);

  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [timeline, setTimeline] = useState<MaintenanceTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [assignedToName, setAssignedToName] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");

  useEffect(() => {
    async function fetchRequest(): Promise<void> {
      try {
        const response = await fetch(`/api/maintenance/${id}`, {
          credentials: "include"
        });

        if (!response.ok) {
          setError("Demande introuvable");
          setLoading(false);
          return;
        }

        const data = await response.json() as {
          success: boolean;
          data?: { request: MaintenanceRequest; timeline: MaintenanceTimelineEvent[] };
        };
        if (data.success && data.data) {
          setRequest(data.data.request);
          setTimeline(data.data.timeline);
          setAssignedToName(data.data.request.assignedToName ?? "");
          setInternalNotes(data.data.request.internalNotes ?? "");
          setResolutionNotes(data.data.request.resolutionNotes ?? "");
        }

        setLoading(false);
      } catch {
        setError("Erreur lors du chargement de la demande");
        setLoading(false);
      }
    }

    fetchRequest();
  }, [id]);

  async function patchRequest(payload: {
    status?: MaintenanceStatus;
    assignedToName?: string | null;
    internalNotes?: string | null;
    resolutionNotes?: string | null;
  }): Promise<void> {
    setUpdating(true);
    setError(null);

    const result = await patchWithAuth<MaintenanceRequest>(`/api/maintenance/${id}`, payload);

    if (!result.success) {
      setError(result.error);
      setUpdating(false);
      return;
    }

    setRequest(result.data);
    setUpdating(false);
  }

  async function handleStatusChange(newStatus: MaintenanceStatus): Promise<void> {
    if (!confirm(`Êtes-vous sûr de vouloir changer le statut vers "${STATUS_LABELS[newStatus]}" ?`)) {
      return;
    }
    await patchRequest({ status: newStatus });
    await refreshTimeline();
  }

  async function handleAssignmentSave(): Promise<void> {
    await patchRequest({ assignedToName: assignedToName.trim() || null, status: "in_progress" });
    await refreshTimeline();
  }

  async function handleNotesSave(): Promise<void> {
    await patchRequest({
      internalNotes: internalNotes.trim() || null,
      resolutionNotes: resolutionNotes.trim() || null
    });
    await refreshTimeline();
  }

  async function refreshTimeline(): Promise<void> {
    const response = await fetch(`/api/maintenance/${id}`, { credentials: "include" });
    if (!response.ok) return;
    const data = await response.json() as {
      success: boolean;
      data?: { request: MaintenanceRequest; timeline: MaintenanceTimelineEvent[] };
    };
    if (data.success && data.data) {
      setRequest(data.data.request);
      setTimeline(data.data.timeline);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Chargement...</p>
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="p-8">
        <p className="text-red-600">{error}</p>
        <Link href="/dashboard/maintenance" className="text-[#0063fe] hover:underline">
          Retour aux demandes
        </Link>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Demande introuvable</p>
      </div>
    );
  }

  const availableTransitions = STATUS_WORKFLOW[request.status];

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/dashboard/maintenance" className="text-sm text-[#0063fe] hover:underline mb-4 inline-block">
          ← Retour aux demandes
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#010a19]">{request.title}</h1>
            <p className="text-gray-600 mt-1">
              Créée le {new Date(request.createdAtIso).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <div className="flex gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${PRIORITY_STYLES[request.priority] ?? "bg-gray-100 text-gray-500"}`}>
              {PRIORITY_LABELS[request.priority] ?? request.priority}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[request.status] ?? "bg-gray-100 text-gray-500"}`}>
              {STATUS_LABELS[request.status] ?? request.status}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Description</h2>
          <p className="text-gray-600 whitespace-pre-wrap">{request.description}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Assigné à (staff / vendor)</h2>
            <div className="flex gap-2">
              <input
                value={assignedToName}
                onChange={(event) => setAssignedToName(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Nom de la personne ou du prestataire"
              />
              <button
                onClick={() => {
                  void handleAssignmentSave();
                }}
                disabled={updating}
                className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
              >
                Sauver
              </button>
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Unité / locataire</h2>
            <p className="text-sm text-gray-600">Unité: {request.unitId}</p>
            <p className="text-sm text-gray-600">Locataire: {request.tenantId ?? "Non spécifié"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Notes internes</h2>
            <textarea
              value={internalNotes}
              onChange={(event) => setInternalNotes(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-28"
              placeholder="Contexte opérationnel, diagnostics, suivi interne"
            />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Notes de résolution</h2>
            <textarea
              value={resolutionNotes}
              onChange={(event) => setResolutionNotes(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-28"
              placeholder="Action effectuée, pièces changées, validation finale"
            />
          </div>
        </div>

        <button
          onClick={() => {
            void handleNotesSave();
          }}
          disabled={updating}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 mb-6"
        >
          Mettre à jour les notes
        </button>

        {request.resolvedAt && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Résolu le</h2>
            <p className="text-gray-600">{new Date(request.resolvedAt).toLocaleDateString("fr-FR")} à {new Date(request.resolvedAt).toLocaleTimeString("fr-FR")}</p>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5 mb-4">
            {error}
          </p>
        )}

        {availableTransitions.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Changer le statut</h2>
            <div className="flex gap-2">
              {availableTransitions.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={updating}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition disabled:opacity-60 ${
                    status === "resolved"
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : status === "in_progress"
                      ? "bg-yellow-600 text-white hover:bg-yellow-700"
                      : status === "cancelled"
                      ? "bg-gray-600 text-white hover:bg-gray-700"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {updating ? "..." : `Marquer comme ${STATUS_LABELS[status].toLowerCase()}`}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 pt-6 mt-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Historique</h2>
          {timeline.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun événement pour l'instant.</p>
          ) : (
            <ol className="space-y-2">
              {timeline.map((event) => (
                <li key={event.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                  <p className="font-medium text-[#010a19]">{formatEventLabel(event)}</p>
                  {event.note ? <p className="text-gray-600 mt-1">{event.note}</p> : null}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(event.createdAtIso).toLocaleDateString("fr-FR")} {new Date(event.createdAtIso).toLocaleTimeString("fr-FR")}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function formatEventLabel(event: MaintenanceTimelineEvent): string {
  const labels: Record<MaintenanceEventType, string> = {
    created: "Demande créée",
    status_changed: `Statut changé${event.statusFrom ? `: ${event.statusFrom} -> ${event.statusTo}` : ""}`,
    assigned: `Assignée à ${event.assignedToName ?? "(non défini)"}`,
    internal_note_updated: "Notes internes mises à jour",
    resolution_note_updated: "Notes de résolution mises à jour"
  };

  return labels[event.eventType] ?? event.eventType;
}
