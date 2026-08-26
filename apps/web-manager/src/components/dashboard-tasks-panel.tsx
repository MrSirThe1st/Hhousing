"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Task } from "@hhousing/domain";
import { deleteWithAuth, patchWithAuth, postWithAuth } from "../lib/api-client";
import type { DashboardTasksPanelProps } from "../lib/dashboard-workflow.types";
import ResponsiveTable from "./responsive-table";
import UniversalLoadingState from "./universal-loading-state";

type TaskFormState = {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string;
  relatedType: "property" | "unit" | "lease" | "tenant" | "";
  relatedId: string;
};

function getPriorityLabel(priority: TaskFormState["priority"]): string {
  if (priority === "low") return "Faible";
  if (priority === "medium") return "Moyenne";
  if (priority === "high") return "Haute";
  return "Urgente";
}

function getPriorityClass(priority: TaskFormState["priority"]): string {
  if (priority === "low") return "bg-slate-100 text-slate-600";
  if (priority === "medium") return "bg-blue-100 text-blue-700";
  if (priority === "high") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function getStatusClass(status: string): string {
  if (status === "open") return "bg-slate-100 text-slate-700";
  if (status === "in_progress") return "bg-blue-100 text-blue-700";
  if (status === "done") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-200 text-slate-600";
}

function getStatusLabel(status: string): string {
  if (status === "open") return "Ouverte";
  if (status === "in_progress") return "En cours";
  if (status === "done") return "Terminée";
  return "Annulée";
}

function formatDueDate(dueDate: string): string {
  return new Date(`${dueDate}T12:00:00`).toLocaleDateString("fr-FR");
}

export default function DashboardTasksPanel({
  organizationId,
  currentUserId,
  tasks,
  relatedOptions
}: DashboardTasksPanelProps): React.ReactElement {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "in_progress" | "done" | "cancelled">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "manual" | "system">("all");
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<TaskFormState>({
    title: "",
    description: "",
    priority: "medium",
    dueDate: new Date().toISOString().slice(0, 10),
    relatedType: "",
    relatedId: ""
  });

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }

      if (sourceFilter !== "all" && task.source !== sourceFilter) {
        return false;
      }

      return true;
    });
  }, [sourceFilter, statusFilter, tasks]);

  const summary = useMemo(() => ({
    openCount: tasks.filter((task) => task.status === "open").length,
    inProgressCount: tasks.filter((task) => task.status === "in_progress").length,
    doneCount: tasks.filter((task) => task.status === "done").length,
    manualCount: tasks.filter((task) => task.source === "manual").length,
    systemCount: tasks.filter((task) => task.source === "system").length
  }), [tasks]);

  const availableRelatedOptions = useMemo(() => {
    if (!formState.relatedType) {
      return [];
    }

    return relatedOptions.filter((option) => option.type === formState.relatedType);
  }, [formState.relatedType, relatedOptions]);
  const isActionBusy = formBusy || busyTaskId !== null;

  function getRelatedLabel(task: Task): string | null {
    if (!task.relatedEntityType || !task.relatedEntityId) {
      return null;
    }

    return relatedOptions.find(
      (option) => option.type === task.relatedEntityType && option.id === task.relatedEntityId
    )?.label ?? task.relatedEntityId;
  }

  async function handleCreateTask(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormBusy(true);
    setMessage(null);
    setError(null);

    const selectedOption = relatedOptions.find(
      (option) => option.type === formState.relatedType && option.id === formState.relatedId
    );

    const result = await postWithAuth("/api/tasks", {
      organizationId,
      title: formState.title.trim(),
      description: formState.description.trim() || null,
      priority: formState.priority,
      dueDate: formState.dueDate,
      assignedUserId: currentUserId,
      relatedEntityType: formState.relatedType || null,
      relatedEntityId: selectedOption?.id ?? null,
      propertyId: selectedOption?.type === "property" ? selectedOption.id : selectedOption?.propertyId ?? null,
      unitId: selectedOption?.type === "unit" ? selectedOption.id : selectedOption?.unitId ?? null,
      leaseId: selectedOption?.type === "lease" ? selectedOption.id : selectedOption?.leaseId ?? null,
      tenantId: selectedOption?.type === "tenant" ? selectedOption.id : selectedOption?.tenantId ?? null
    });

    if (!result.success) {
      setError(result.error);
      setFormBusy(false);
      return;
    }

    setFormState({
      title: "",
      description: "",
      priority: "medium",
      dueDate: new Date().toISOString().slice(0, 10),
      relatedType: "",
      relatedId: ""
    });
    setShowCreateForm(false);
    setFormBusy(false);
    setMessage("Tâche créée.");
    router.refresh();
  }

  async function handleStatusChange(taskId: string, status: "in_progress" | "done" | "cancelled"): Promise<void> {
    setBusyTaskId(taskId);
    setMessage(null);
    setError(null);

    const result = await patchWithAuth(`/api/tasks/${taskId}`, { status });
    if (!result.success) {
      setError(result.error);
      setBusyTaskId(null);
      return;
    }

    setBusyTaskId(null);
    router.refresh();
  }

  async function handleDeleteTask(taskId: string): Promise<void> {
    setBusyTaskId(taskId);
    setMessage(null);
    setError(null);

    const result = await deleteWithAuth(`/api/tasks/${taskId}`);
    if (!result.success) {
      setError(result.error);
      setBusyTaskId(null);
      return;
    }

    setBusyTaskId(null);
    router.refresh();
  }

  function renderTaskActions(task: Task): React.ReactNode {
    return (
      <div className="flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
        {task.status !== "done" && task.status !== "cancelled" ? (
          <button
            type="button"
            onClick={() => void handleStatusChange(task.id, "done")}
            disabled={busyTaskId === task.id}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            Terminer
          </button>
        ) : null}
        {task.source === "manual" ? (
          <button
            type="button"
            onClick={() => void handleDeleteTask(task.id)}
            disabled={busyTaskId === task.id}
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
          >
            Supprimer
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Tâches</h2>
          <p className="mt-2 text-sm text-slate-500">
            Tâches manuelles et système pour les retards de paiement et renouvellements de bail.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm((currentValue) => !currentValue)}
          className="inline-flex items-center rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
        >
          {showCreateForm ? "Fermer" : "+ Nouvelle tâche"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-8 border-b border-slate-200 pb-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Ouvertes</p>
          <p className="text-xl font-semibold text-slate-900">{summary.openCount}</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">En cours</p>
          <p className="text-xl font-semibold text-slate-900">{summary.inProgressCount}</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Terminées</p>
          <p className="text-xl font-semibold text-slate-900">{summary.doneCount}</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Manuelles</p>
          <p className="text-xl font-semibold text-slate-900">{summary.manualCount}</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Système</p>
          <p className="text-xl font-semibold text-slate-900">{summary.systemCount}</p>
        </div>
      </div>

      {showCreateForm ? (
        <form onSubmit={handleCreateTask} className="space-y-4 border-b border-slate-200 pb-6">
          <h3 className="text-lg font-semibold text-[#010a19]">Nouvelle tâche</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Titre</span>
              <input
                value={formState.title}
                onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Échéance</span>
              <input
                type="date"
                value={formState.dueDate}
                onChange={(event) => setFormState((current) => ({ ...current, dueDate: event.target.value }))}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
              />
            </label>
            <label className="space-y-2 lg:col-span-2">
              <span className="text-sm font-medium text-slate-700">Description</span>
              <textarea
                value={formState.description}
                onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Priorité</span>
              <select
                value={formState.priority}
                onChange={(event) => setFormState((current) => ({ ...current, priority: event.target.value as TaskFormState["priority"] }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
              >
                <option value="low">Faible</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgente</option>
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Objet lié</span>
                <select
                  value={formState.relatedType}
                  onChange={(event) => setFormState((current) => ({ ...current, relatedType: event.target.value as TaskFormState["relatedType"], relatedId: "" }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
                >
                  <option value="">Aucun</option>
                  <option value="property">Propriété</option>
                  <option value="unit">Unité</option>
                  <option value="lease">Bail</option>
                  <option value="tenant">Locataire</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Sélection</span>
                <select
                  value={formState.relatedId}
                  onChange={(event) => setFormState((current) => ({ ...current, relatedId: event.target.value }))}
                  disabled={!formState.relatedType}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">Aucun</option>
                  {availableRelatedOptions.map((option) => (
                    <option key={`${option.type}:${option.id}`} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={formBusy || formState.title.trim().length === 0}
              className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0052d4] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Créer la tâche
            </button>
          </div>
        </form>
      ) : null}

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#010a19]">Liste des tâches</h3>
          <p className="mt-1 text-sm text-slate-500">
            {filteredTasks.length} tâche(s) affichée(s)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
          >
            <option value="all">Tous statuts</option>
            <option value="open">Ouvertes</option>
            <option value="in_progress">En cours</option>
            <option value="done">Terminées</option>
            <option value="cancelled">Annulées</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value as typeof sourceFilter)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
          >
            <option value="all">Tous types</option>
            <option value="manual">Manuelles</option>
            <option value="system">Système</option>
          </select>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <h3 className="text-lg font-semibold text-[#010a19]">Aucune tâche pour l&apos;instant</h3>
          <p className="mt-2 text-sm text-slate-500">
            Créez une tâche manuelle ou laissez le système en générer selon les retards et renouvellements.
          </p>
        </div>
      ) : (
        <ResponsiveTable<Task>
          framed
          keyExtractor={(task) => task.id}
          data={filteredTasks}
          paginate
          defaultPageSize={10}
          emptyState={
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              Aucune tâche pour les filtres actuels.
            </div>
          }
          columns={[
            {
              header: "Tâche",
              render: (task) => (
                <div className="min-w-0 max-w-md">
                  <p className="font-semibold text-[#10213d]">{task.title}</p>
                  {task.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{task.description}</p>
                  ) : null}
                </div>
              )
            },
            {
              header: "Statut",
              render: (task) => (
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClass(task.status)}`}>
                  {getStatusLabel(task.status)}
                </span>
              )
            },
            {
              header: "Priorité",
              render: (task) => (
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getPriorityClass(task.priority)}`}>
                  {getPriorityLabel(task.priority)}
                </span>
              )
            },
            {
              header: "Type",
              render: (task) => (
                <span className="text-slate-600">
                  {task.source === "system" ? "Système" : "Manuelle"}
                </span>
              )
            },
            {
              header: "Échéance",
              render: (task) => (
                <span className="text-slate-600">{formatDueDate(task.dueDate)}</span>
              )
            },
            {
              header: "Objet lié",
              render: (task) => (
                <span className="text-slate-600">{getRelatedLabel(task) ?? "—"}</span>
              )
            },
            {
              header: "Actions",
              className: "w-0",
              render: (task) => renderTaskActions(task)
            }
          ]}
          renderMobileCard={(task) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-[#010a19]">{task.title}</h3>
                  {task.description ? (
                    <p className="mt-1 text-sm text-slate-500">{task.description}</p>
                  ) : null}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClass(task.status)}`}>
                  {getStatusLabel(task.status)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span className={`rounded-full px-2.5 py-0.5 font-medium ${getPriorityClass(task.priority)}`}>
                  {getPriorityLabel(task.priority)}
                </span>
                <span>{task.source === "system" ? "Système" : "Manuelle"}</span>
                <span>Échéance {formatDueDate(task.dueDate)}</span>
                {getRelatedLabel(task) ? <span>{getRelatedLabel(task)}</span> : null}
              </div>
              {renderTaskActions(task)}
            </div>
          )}
        />
      )}

      {isActionBusy ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
    </div>
  );
}
