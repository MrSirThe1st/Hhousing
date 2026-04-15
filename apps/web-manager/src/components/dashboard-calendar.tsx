"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteWithAuth, patchWithAuth, postWithAuth } from "../lib/api-client";
import type { DashboardCalendarEntry, DashboardWorkflowRelatedOption } from "../lib/dashboard-workflow.types";
import type { DashboardCalendarEventTone, DashboardCalendarProps } from "./dashboard-calendar.types";
import UniversalLoadingState from "./universal-loading-state";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const EVENT_TONE_STYLES: Record<DashboardCalendarEventTone, string> = {
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  slate: "border-slate-200 bg-slate-100 text-slate-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
};

type CalendarFormState = {
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  eventType: "custom" | "inspection" | "reminder";
  relatedType: "property" | "unit" | "lease" | "tenant" | "";
  relatedId: string;
};

function createDate(year: number, month: number, day: number): Date {
  return new Date(year, month, day, 12, 0, 0, 0);
}

function addDays(value: Date, amount: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfMonth(value: Date): Date {
  return createDate(value.getFullYear(), value.getMonth(), 1);
}

function startOfWeek(value: Date): Date {
  const weekdayOffset = (value.getDay() + 6) % 7;
  return addDays(value, -weekdayOffset);
}

function isSameDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function getDateKey(value: Date): string {
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

function getMonthDays(viewMonth: Date): Date[] {
  const firstDay = startOfMonth(viewMonth);
  const gridStart = startOfWeek(firstDay);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function clampDay(viewMonth: Date, desiredDay: number): Date {
  const lastDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  return createDate(viewMonth.getFullYear(), viewMonth.getMonth(), Math.min(desiredDay, lastDay));
}

function getTone(entry: DashboardCalendarEntry): DashboardCalendarEventTone {
  if (entry.eventType === "maintenance") return "amber";
  if (entry.eventType === "lease") return "emerald";
  if (entry.eventType === "rent") return "blue";
  if (entry.eventType === "inspection") return "rose";
  if (entry.eventType === "task") return "slate";
  return entry.source === "manual" ? "rose" : "slate";
}

function formatMonthLabel(value: Date): string {
  return value.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function formatRangeLabel(viewMonth: Date): string {
  const first = startOfWeek(startOfMonth(viewMonth));
  const last = addDays(first, 41);
  const formatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
  return `${formatter.format(first)} - ${formatter.format(last)}`;
}

function formatLocalDateTimeValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatTimeLabel(entry: DashboardCalendarEntry): string {
  return new Date(entry.startAtIso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function getRelatedPayload(option: DashboardWorkflowRelatedOption | undefined): {
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  propertyId: string | null;
  unitId: string | null;
  leaseId: string | null;
  tenantId: string | null;
} {
  if (!option) {
    return {
      relatedEntityType: null,
      relatedEntityId: null,
      propertyId: null,
      unitId: null,
      leaseId: null,
      tenantId: null
    };
  }

  return {
    relatedEntityType: option.type,
    relatedEntityId: option.id,
    propertyId: option.type === "property" ? option.id : option.propertyId ?? null,
    unitId: option.type === "unit" ? option.id : option.unitId ?? null,
    leaseId: option.type === "lease" ? option.id : option.leaseId ?? null,
    tenantId: option.type === "tenant" ? option.id : option.tenantId ?? null
  };
}

export default function DashboardCalendar({ organizationId, currentUserId, entries, relatedOptions, scopeLabel }: DashboardCalendarProps): React.ReactElement {
  const router = useRouter();
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormBusy, setEditFormBusy] = useState(false);
  const [editFormState, setEditFormState] = useState<CalendarFormState>({
    title: "",
    description: "",
    startAt: formatLocalDateTimeValue(new Date()),
    endAt: "",
    eventType: "custom",
    relatedType: "",
    relatedId: ""
  });
  const [formState, setFormState] = useState<CalendarFormState>({
    title: "",
    description: "",
    startAt: formatLocalDateTimeValue(new Date()),
    endAt: "",
    eventType: "custom",
    relatedType: "",
    relatedId: ""
  });
  const today = new Date();
  const monthDays = getMonthDays(viewMonth);
  const monthEntries = useMemo(
    () => entries.filter((entry) => {
      const date = new Date(entry.startAtIso);
      return date.getMonth() === viewMonth.getMonth() && date.getFullYear() === viewMonth.getFullYear();
    }),
    [entries, viewMonth]
  );
  const eventMap = new Map<string, DashboardCalendarEntry[]>();

  const availableRelatedOptions = useMemo(() => {
    if (!formState.relatedType) {
      return [];
    }
    return relatedOptions.filter((option) => option.type === formState.relatedType);
  }, [formState.relatedType, relatedOptions]);
  const isActionBusy = formBusy || editFormBusy || busyEntryId !== null;

  for (const event of monthEntries) {
    const dateKey = getDateKey(new Date(event.startAtIso));
    const existingEvents = eventMap.get(dateKey) ?? [];
    existingEvents.push(event);
    eventMap.set(dateKey, existingEvents);
  }

  async function handleCreateEvent(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormBusy(true);
    setError(null);
    setMessage(null);

    const selectedOption = relatedOptions.find(
      (option) => option.type === formState.relatedType && option.id === formState.relatedId
    );
    const relatedPayload = getRelatedPayload(selectedOption);

    const result = await postWithAuth("/api/calendar-events", {
      organizationId,
      title: formState.title.trim(),
      description: formState.description.trim() || null,
      startAtIso: new Date(formState.startAt).toISOString(),
      endAtIso: formState.endAt ? new Date(formState.endAt).toISOString() : null,
      eventType: formState.eventType,
      status: "scheduled",
      assignedUserId: currentUserId,
      ...relatedPayload
    });

    if (!result.success) {
      setError(result.error);
      setFormBusy(false);
      return;
    }

    setFormState({
      title: "",
      description: "",
      startAt: formatLocalDateTimeValue(new Date()),
      endAt: "",
      eventType: "custom",
      relatedType: "",
      relatedId: ""
    });
    setFormBusy(false);
    setShowCreateForm(false);
    setMessage("Événement créé.");
    router.refresh();
  }

  const selectedEntry = selectedEntryId ? entries.find((e) => e.id === selectedEntryId) ?? null : null;

  const availableEditRelatedOptions = useMemo(() => {
    if (!editFormState.relatedType) return [];
    return relatedOptions.filter((option) => option.type === editFormState.relatedType);
  }, [editFormState.relatedType, relatedOptions]);

  async function handleEditEvent(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!selectedEntryId) return;
    const eventId = selectedEntryId.replace(/^event:/, "");
    setEditFormBusy(true);
    setError(null);
    setMessage(null);

    const selectedOption = editFormState.relatedType && editFormState.relatedId
      ? relatedOptions.find((o) => o.type === editFormState.relatedType && o.id === editFormState.relatedId)
      : undefined;
    const relatedPayload = getRelatedPayload(selectedOption);

    const result = await patchWithAuth(`/api/calendar-events/${eventId}`, {
      title: editFormState.title.trim(),
      description: editFormState.description.trim() || null,
      startAtIso: new Date(editFormState.startAt).toISOString(),
      endAtIso: editFormState.endAt ? new Date(editFormState.endAt).toISOString() : null,
      eventType: editFormState.eventType,
      ...relatedPayload
    });

    if (!result.success) {
      setError(result.error);
      setEditFormBusy(false);
      return;
    }

    setEditFormBusy(false);
    setShowEditForm(false);
    setMessage("Événement mis à jour.");
    router.refresh();
  }

  async function handleDeleteEvent(entryId: string): Promise<void> {
    const eventId = entryId.replace(/^event:/, "");
    setBusyEntryId(entryId);
    setError(null);
    setMessage(null);

    const result = await deleteWithAuth(`/api/calendar-events/${eventId}`);
    if (!result.success) {
      setError(result.error);
      setBusyEntryId(null);
      return;
    }

    setBusyEntryId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold capitalize tracking-[-0.02em] text-[#010a19]">{formatMonthLabel(viewMonth)}</h2>
            <p className="mt-1 text-sm text-slate-500">{formatRangeLabel(viewMonth)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setViewMonth(startOfMonth(addDays(viewMonth, -1)))}
                className="rounded px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-[#010a19]"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setViewMonth(startOfMonth(new Date()))}
                className="rounded bg-white px-3 py-1.5 text-sm font-semibold text-[#0063fe] shadow-sm transition hover:bg-[#0063fe] hover:text-white"
              >
                Aujourd&apos;hui
              </button>
              <button
                type="button"
                onClick={() => setViewMonth(startOfMonth(addDays(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1), 0)))}
                className="rounded px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-[#010a19]"
              >
                →
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm((currentValue) => !currentValue)}
              className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
            >
              {showCreateForm ? "Fermer" : "+ Nouvel événement"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Événements</p>
            <p className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">{monthEntries.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rappels</p>
            <p className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">{monthEntries.filter((entry) => entry.source === "task").length}</p>
          </div>
        </div>
      </section>

      {showCreateForm ? (
        <form onSubmit={handleCreateEvent} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[#010a19]">Nouvel événement</h3>
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
              <span className="text-sm font-medium text-slate-700">Type</span>
              <select
                value={formState.eventType}
                onChange={(event) => setFormState((current) => ({ ...current, eventType: event.target.value as CalendarFormState["eventType"] }))}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm transition focus:border-[#0063fe] focus:outline-none focus:ring-2 focus:ring-[#0063fe]/20"
              >
                <option value="custom">Custom</option>
                <option value="inspection">Inspection</option>
                <option value="reminder">Reminder</option>
              </select>
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
              <span className="text-sm font-medium text-slate-700">Début</span>
              <input
                type="datetime-local"
                value={formState.startAt}
                onChange={(event) => setFormState((current) => ({ ...current, startAt: event.target.value }))}
                required
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm transition focus:border-[#0063fe] focus:outline-none focus:ring-2 focus:ring-[#0063fe]/20"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Fin</span>
              <input
                type="datetime-local"
                value={formState.endAt}
                onChange={(event) => setFormState((current) => ({ ...current, endAt: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm transition focus:border-[#0063fe] focus:outline-none focus:ring-2 focus:ring-[#0063fe]/20"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Objet lié</span>
              <select
                value={formState.relatedType}
                onChange={(event) => setFormState((current) => ({ ...current, relatedType: event.target.value as CalendarFormState["relatedType"], relatedId: "" }))}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm transition focus:border-[#0063fe] focus:outline-none focus:ring-2 focus:ring-[#0063fe]/20"
              >
                <option value="">Aucun</option>
                <option value="property">Propriété</option>
                <option value="unit">Unité</option>
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
              Créer l'événement
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {monthDays.map((day) => {
              const dayEvents = eventMap.get(getDateKey(day)) ?? [];
              const isCurrentMonth = day.getMonth() === viewMonth.getMonth();
              const isToday = isSameDay(day, today);

              return (
                <article
                  key={getDateKey(day)}
                  className={`min-h-32 border-b border-r border-slate-200 p-2.5 transition last:border-r-0 ${!isCurrentMonth ? "bg-slate-50/50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center text-sm font-semibold ${
                        isToday ? "rounded-full bg-[#0063fe] text-white" : isCurrentMonth ? "text-[#010a19]" : "text-slate-400"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {dayEvents.length > 0 && !isToday ? (
                      <span className="text-[10px] font-medium text-slate-400">{dayEvents.length}</span>
                    ) : null}
                  </div>

                  <div className="mt-2 space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => { setSelectedEntryId(event.id); setShowEditForm(false); }}
                        className={`w-full rounded-lg border px-2 py-1 text-left text-xs font-medium transition hover:shadow-sm ${EVENT_TONE_STYLES[getTone(event)]} ${selectedEntryId === event.id ? "ring-2 ring-[#0063fe] ring-offset-1" : ""}`}
                      >
                        <p className="truncate leading-tight">{event.title}</p>
                      </button>
                    ))}
                    {dayEvents.length > 3 ? (
                      <p className="px-2 text-[10px] font-medium text-slate-400">+{dayEvents.length - 3} more</p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          {selectedEntry ? (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Détail</h3>
                <button
                  type="button"
                  onClick={() => { setSelectedEntryId(null); setShowEditForm(false); }}
                  className="text-slate-400 transition hover:text-slate-700"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold text-[#010a19]">{selectedEntry.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {new Date(selectedEntry.startAtIso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-slate-400">{formatTimeLabel(selectedEntry)}</p>
                    </div>
                    <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${EVENT_TONE_STYLES[getTone(selectedEntry)]}`}>
                      {selectedEntry.statusLabel}
                    </span>
                  </div>
                  {selectedEntry.relatedLabel ? (
                    <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">{selectedEntry.relatedLabel}</p>
                  ) : null}
                  {selectedEntry.detail ? (
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{selectedEntry.detail}</p>
                  ) : null}
                </div>
              </div>

              {selectedEntry.source === "manual" ? (
                <>
                  {!showEditForm ? (
                    <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          const eventType = (selectedEntry.eventType === "custom" || selectedEntry.eventType === "inspection" || selectedEntry.eventType === "reminder")
                            ? selectedEntry.eventType
                            : "custom" as const;
                          setEditFormState({
                            title: selectedEntry.title,
                            description: selectedEntry.detail,
                            startAt: formatLocalDateTimeValue(new Date(selectedEntry.startAtIso)),
                            endAt: selectedEntry.endAtIso ? formatLocalDateTimeValue(new Date(selectedEntry.endAtIso)) : "",
                            eventType,
                            relatedType: "",
                            relatedId: ""
                          });
                          setShowEditForm(true);
                        }}
                        className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteEvent(selectedEntry.id)}
                        disabled={busyEntryId === selectedEntry.id}
                        className="flex-1 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                      >
                        Supprimer
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={(e) => void handleEditEvent(e)} className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-slate-700">Titre</span>
                        <input
                          value={editFormState.title}
                          onChange={(e) => setEditFormState((s) => ({ ...s, title: e.target.value }))}
                          required
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm transition focus:border-[#0063fe] focus:outline-none focus:ring-2 focus:ring-[#0063fe]/20"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-slate-700">Description</span>
                        <textarea
                          value={editFormState.description}
                          onChange={(e) => setEditFormState((s) => ({ ...s, description: e.target.value }))}
                          rows={2}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm transition focus:border-[#0063fe] focus:outline-none focus:ring-2 focus:ring-[#0063fe]/20"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-slate-700">Type</span>
                        <select
                          value={editFormState.eventType}
                          onChange={(e) => setEditFormState((s) => ({ ...s, eventType: e.target.value as CalendarFormState["eventType"] }))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm transition focus:border-[#0063fe] focus:outline-none focus:ring-2 focus:ring-[#0063fe]/20"
                        >
                          <option value="custom">Custom</option>
                          <option value="inspection">Inspection</option>
                          <option value="reminder">Reminder</option>
                        </select>
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-slate-700">Début</span>
                        <input
                          type="datetime-local"
                          value={editFormState.startAt}
                          onChange={(e) => setEditFormState((s) => ({ ...s, startAt: e.target.value }))}
                          required
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm transition focus:border-[#0063fe] focus:outline-none focus:ring-2 focus:ring-[#0063fe]/20"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-slate-700">Fin</span>
                        <input
                          type="datetime-local"
                          value={editFormState.endAt}
                          onChange={(e) => setEditFormState((s) => ({ ...s, endAt: e.target.value }))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm transition focus:border-[#0063fe] focus:outline-none focus:ring-2 focus:ring-[#0063fe]/20"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-slate-700">Objet lié</span>
                        <select
                          value={editFormState.relatedType}
                          onChange={(e) => setEditFormState((s) => ({ ...s, relatedType: e.target.value as CalendarFormState["relatedType"], relatedId: "" }))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm transition focus:border-[#0063fe] focus:outline-none focus:ring-2 focus:ring-[#0063fe]/20"
                        >
                          <option value="">Aucun</option>
                          <option value="property">Propriété</option>
                          <option value="unit">Unité</option>
                          <option value="tenant">Locataire</option>
                        </select>
                      </label>
                      {editFormState.relatedType ? (
                        <label className="block space-y-1.5">
                          <span className="text-sm font-medium text-slate-700">Sélection</span>
                          <select
                            value={editFormState.relatedId}
                            onChange={(e) => setEditFormState((s) => ({ ...s, relatedId: e.target.value }))}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm transition focus:border-[#0063fe] focus:outline-none focus:ring-2 focus:ring-[#0063fe]/20"
                          >
                            <option value="">Aucun</option>
                            {availableEditRelatedOptions.map((option) => (
                              <option key={`${option.type}:${option.id}`} value={option.id}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
                      <div className="flex gap-2 pt-2">
                        <button
                          type="submit"
                          disabled={editFormBusy || editFormState.title.trim().length === 0}
                          className="flex-1 rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0052d4] disabled:opacity-60"
                        >
                          Sauvegarder
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowEditForm(false)}
                          className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  )}
                </>
              ) : (
                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs text-amber-700">Événement généré automatiquement — lecture seule.</p>
                </div>
              )}

              {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
            </section>
          ) : (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Focus du mois</h3>
              <div className="mt-4 space-y-2">
                {monthEntries.slice(0, 8).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => { setSelectedEntryId(event.id); setShowEditForm(false); }}
                    className="w-full rounded-lg border border-slate-200 p-3 text-left transition hover:border-[#0063fe] hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#010a19]">{event.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {new Date(event.startAtIso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} • {formatTimeLabel(event)}
                        </p>
                      </div>
                      <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${EVENT_TONE_STYLES[getTone(event)]}`}>
                        {event.statusLabel}
                      </span>
                    </div>
                  </button>
                ))}
                {monthEntries.length > 8 ? (
                  <p className="px-3 py-2 text-xs text-slate-400">+{monthEntries.length - 8} autres événements</p>
                ) : null}
                {monthEntries.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mt-3 text-sm text-slate-500">Aucun événement sur ce mois</p>
                  </div>
                ) : null}
              </div>
            </section>
          )}       
        </aside>
      </div>

      {isActionBusy ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
    </div>
  );
}