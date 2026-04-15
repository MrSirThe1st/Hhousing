"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteWithAuth, patchWithAuth, postWithAuth } from "../lib/api-client";
import type { DashboardTasksPanelProps } from "../lib/dashboard-workflow.types";
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

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Centre d&apos;exécution</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Tâches manuelles et système suivant automatiquement maintenance, paiements en retard et renouvellements de bail.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateForm((currentValue) => !currentValue)}
            className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
          >
            {showCreateForm ? "Fermer" : "+ Nouvelle tâche"}
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ouvertes</p>
            <p className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">{summary.openCount}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">En cours</p>
            <p className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">{summary.inProgressCount}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Terminées</p>
            <p className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">{summary.doneCount}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Manuelles</p>
            <p className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">{summary.manualCount}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Système</p>
            <p className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">{summary.systemCount}</p>
          </div>
        </div>
      </section>

      {showCreateForm ? (
        <form onSubmit={handleCreateTask} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[#010a19]">Nouvelle tâche</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Titre</span>
              <input
                value={formState.title}
                onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                required
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm transition focus:border-[#0063fe] focus:outline-none focus:ring-2 focus:ring-[#0063fe]/20"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Échéance</span>
              <input
                type="date"
                value={formState.dueDate}
                onChange={(event) => setFormState((current) => ({ ...current, dueDate: event.target.value }))}
                required
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm transition focus:border-[#0063fe] focus:outline-none focus:ring-2 focus:ring-[#0063fe]/20"
              />
            </label>
            <label className="space-y-2 lg:col-span-2">
              <span className="text-sm font-medium text-slate-700">Description</span>
              <textarea
                value={formState.description}
                onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm transition focus:border-[#0063fe] focus:outline-none focus:ring-2 focus:ring-[#0063fe]/20"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Priorité</span>
              <select
                value={formState.priority}
                onChange={(event) => setFormState((current) => ({ ...current, priority: event.target.value as TaskFormState["priority"] }))}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm transition focus:border-[#0063fe] focus:outline-none focus:ring-2 focus:ring-[#0063fe]/20"
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
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm transition focus:border-[#0063fe] focus:outline-none focus:ring-2 focus:ring-[#0063fe]/20"
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
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm transition focus:border-[#0063fe] focus:outline-none focus:ring-2 focus:ring-[#0063fe]/20 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">Aucun</option>
                  {availableRelatedOptions.map((option) => (
                    <option key={`${option.type}:${option.id}`} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#010a19]">Backlog opérateur</h3>
            <p className="mt-1 text-sm text-slate-500">Filtrez les tâches manuelles et système depuis une seule vue.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300"
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
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300"
            >
              <option value="all">Tous types</option>
              <option value="manual">Manuelles</option>
              <option value="system">Système</option>
            </select>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="mt-3 text-sm text-slate-500">Aucune tâche pour les filtres actuels</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <article key={task.id} className="rounded-xl border border-slate-200 bg-white p-5 transition hover:shadow-md">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-semibold text-[#010a19]">{task.title}</h4>
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${getStatusClass(task.status)}`}>
                        {getStatusLabel(task.status)}
                      </span>
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${getPriorityClass(task.priority)}`}>
                        {getPriorityLabel(task.priority as TaskFormState["priority"])}
                      </span>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {task.source === "system" ? "Système" : "Manuelle"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{task.description ?? "Aucune description."}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(`${task.dueDate}T12:00:00`).toLocaleDateString("fr-FR")}
                      </span>
                      {task.relatedEntityType && task.relatedEntityId ? (
                        <span className="flex items-center gap-1">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                          {relatedOptions.find((option) => option.type === task.relatedEntityType && option.id === task.relatedEntityId)?.label ?? task.relatedEntityId}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {task.status !== "done" ? (
                      <button
                        type="button"
                        onClick={() => void handleStatusChange(task.id, "done")}
                        disabled={busyTaskId === task.id}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                      >
                        Terminer
                      </button>
                    ) : null}
                    {task.source === "manual" ? (
                      <button
                        type="button"
                        onClick={() => void handleDeleteTask(task.id)}
                        disabled={busyTaskId === task.id}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                      >
                        Supprimer
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {isActionBusy ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
    </div>
  );
}