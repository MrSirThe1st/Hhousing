import type { AuthSession, LeaseWithTenantView } from "@hhousing/api-contracts";
import type { CalendarEvent, MaintenanceRequest, Payment, Task, Tenant } from "@hhousing/domain";
import { createCalendarEventRepo, createId, createMaintenanceRepo, createPaymentRepo, createTaskRepo, createTenantLeaseRepo } from "../app/api/shared";
import { filterCalendarEventsByScope, filterMaintenanceRequestsByScope, filterPaymentsByScope, filterTasksByScope, filterTenantsByScope, getScopedPortfolioData } from "./operator-scope-portfolio";
import type { DashboardCalendarEntry } from "./dashboard-workflow.types";

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function createSystemTaskId(): string {
  return createId("tsk");
}

function getTaskLabelMap(tasks: Task[], events: CalendarEvent[], leases: LeaseWithTenantView[], tenants: Tenant[], scopedPortfolio: Awaited<ReturnType<typeof getScopedPortfolioData>>): Map<string, string> {
  const labelMap = new Map<string, string>();

  for (const item of scopedPortfolio.properties) {
    labelMap.set(`property:${item.property.id}`, item.property.name);
    for (const unit of item.units) {
      labelMap.set(`unit:${unit.id}`, `${item.property.name} · Unité ${unit.unitNumber}`);
    }
  }

  for (const lease of leases) {
    labelMap.set(`lease:${lease.id}`, `${lease.tenantFullName} · Bail ${lease.startDate}`);
  }

  for (const tenant of tenants) {
    labelMap.set(`tenant:${tenant.id}`, tenant.fullName);
  }

  for (const task of tasks) {
    labelMap.set(`task:${task.id}`, task.title);
  }

  for (const event of events) {
    labelMap.set(`event:${event.id}`, event.title);
  }

  return labelMap;
}

function resolveRelatedLabel(labelMap: Map<string, string>, type: string | null, id: string | null): string | null {
  if (!type || !id) {
    return null;
  }

  return labelMap.get(`${type}:${id}`) ?? null;
}

function getTaskStatusLabel(status: Task["status"]): string {
  if (status === "open") return "Ouverte";
  if (status === "in_progress") return "En cours";
  if (status === "done") return "Terminée";
  return "Annulée";
}

function getEventStatusLabel(status: CalendarEvent["status"]): string {
  if (status === "scheduled") return "Planifié";
  if (status === "in_progress") return "En cours";
  if (status === "done") return "Terminé";
  return "Annulé";
}

function getPaymentStatusLabel(payment: Payment): string {
  return payment.status === "overdue" ? "En retard" : "À encaisser";
}

type SyncSystemTasksPrefetched = {
  maintenanceRequests: MaintenanceRequest[];
  payments: Payment[];
  leases: LeaseWithTenantView[];
};

export async function syncSystemTasks(session: AuthSession, prefetched?: SyncSystemTasksPrefetched): Promise<void> {
  const organizationId = session.organizationId;
  const taskRepo = createTaskRepo();

  let maintenanceRequests: MaintenanceRequest[];
  let payments: Payment[];
  let leases: LeaseWithTenantView[];

  if (prefetched) {
    ({ maintenanceRequests, payments, leases } = prefetched);
  } else {
    const maintenanceRepo = createMaintenanceRepo();
    const paymentRepo = createPaymentRepo();
    const leaseRepo = createTenantLeaseRepo();
    [maintenanceRequests, payments, leases] = await Promise.all([
      maintenanceRepo.listMaintenanceRequests({ organizationId }),
      paymentRepo.listPayments({ organizationId }),
      leaseRepo.listLeasesByOrganization(organizationId)
    ]);
  }

  const todayIsoDate = getTodayIsoDate();
  const activeSystemKeys: string[] = [];
  const upsertPromises: Promise<Task>[] = [];

  for (const request of maintenanceRequests) {
    if (request.status !== "open" && request.status !== "in_progress") {
      continue;
    }

    const systemKey = `maintenance:${request.id}:follow_up`;
    activeSystemKeys.push(systemKey);
    upsertPromises.push(taskRepo.upsertSystemTask({
      id: createSystemTaskId(),
      organizationId,
      title: `Suivre maintenance · ${request.title}`,
      description: request.description,
      priority: request.priority,
      dueDate: request.createdAtIso.slice(0, 10),
      assignedUserId: null,
      relatedEntityType: "maintenance_request",
      relatedEntityId: request.id,
      propertyId: null,
      unitId: request.unitId,
      leaseId: null,
      tenantId: request.tenantId,
      paymentId: null,
      maintenanceRequestId: request.id,
      systemCode: "maintenance_follow_up",
      systemKey
    }));
  }

  for (const payment of payments) {
    if (payment.status !== "overdue" && !(payment.status === "pending" && payment.dueDate < todayIsoDate)) {
      continue;
    }

    const systemKey = `payment:${payment.id}:overdue_follow_up`;
    activeSystemKeys.push(systemKey);
    upsertPromises.push(taskRepo.upsertSystemTask({
      id: createSystemTaskId(),
      organizationId,
      title: `Relancer paiement · ${payment.amount.toLocaleString("fr-FR")} ${payment.currencyCode}`,
      description: payment.note,
      priority: "urgent",
      dueDate: payment.dueDate,
      assignedUserId: null,
      relatedEntityType: "payment",
      relatedEntityId: payment.id,
      propertyId: null,
      unitId: null,
      leaseId: payment.leaseId,
      tenantId: payment.tenantId,
      paymentId: payment.id,
      maintenanceRequestId: null,
      systemCode: "rent_overdue_follow_up",
      systemKey
    }));
  }

  for (const lease of leases) {
    if (lease.endDate === null || (lease.status !== "active" && lease.status !== "pending")) {
      continue;
    }

    const msUntilEnd = new Date(`${lease.endDate}T12:00:00.000Z`).getTime() - new Date(`${todayIsoDate}T12:00:00.000Z`).getTime();
    const dayDiff = Math.floor(msUntilEnd / 86400000);
    if (dayDiff < 0 || dayDiff > 30) {
      continue;
    }

    const systemKey = `lease:${lease.id}:renewal`;
    activeSystemKeys.push(systemKey);
    upsertPromises.push(taskRepo.upsertSystemTask({
      id: createSystemTaskId(),
      organizationId,
      title: `Préparer renouvellement · ${lease.tenantFullName}`,
      description: `Le bail arrive à échéance le ${lease.endDate}`,
      priority: dayDiff <= 7 ? "urgent" : "high",
      dueDate: lease.endDate,
      assignedUserId: null,
      relatedEntityType: "lease",
      relatedEntityId: lease.id,
      propertyId: null,
      unitId: lease.unitId,
      leaseId: lease.id,
      tenantId: lease.tenantId,
      paymentId: null,
      maintenanceRequestId: null,
      systemCode: "lease_renewal",
      systemKey
    }));
  }

  await Promise.all(upsertPromises);
  await taskRepo.closeInactiveSystemTasks(organizationId, activeSystemKeys);
}

export async function buildDashboardWorkflowData(session: AuthSession): Promise<{
  tasks: Task[];
  calendarEntries: DashboardCalendarEntry[];
  relatedOptions: Array<{ type: "property" | "unit" | "lease" | "tenant"; id: string; label: string; propertyId?: string | null; unitId?: string | null; leaseId?: string | null; tenantId?: string | null }>;
}> {
  const taskRepo = createTaskRepo();
  const calendarEventRepo = createCalendarEventRepo();
  const paymentRepo = createPaymentRepo();
  const maintenanceRepo = createMaintenanceRepo();
  const leaseRepo = createTenantLeaseRepo();

  // Fetch all source data in one parallel batch (includes what syncSystemTasks needs)
  const [scopedPortfolio, maintenanceRequests, payments, calendarEvents, tenants] = await Promise.all([
    getScopedPortfolioData(session),
    maintenanceRepo.listMaintenanceRequests({ organizationId: session.organizationId }),
    paymentRepo.listPayments({ organizationId: session.organizationId }),
    calendarEventRepo.listCalendarEvents({ organizationId: session.organizationId }),
    leaseRepo.listTenantsByOrganization ? leaseRepo.listTenantsByOrganization(session.organizationId) : Promise.resolve([] as Tenant[])
  ] as const);

  // Sync system tasks using already-fetched data — no duplicate DB queries
  await syncSystemTasks(session, { maintenanceRequests, payments, leases: scopedPortfolio.leases });

  // Fetch tasks after sync so we see the latest upserted/closed state
  const tasks = await taskRepo.listTasks({ organizationId: session.organizationId });

  const scopedTasks = filterTasksByScope(tasks, scopedPortfolio);
  const scopedEvents = filterCalendarEventsByScope(calendarEvents, scopedPortfolio);
  const scopedPayments = filterPaymentsByScope(payments, scopedPortfolio);
  const scopedMaintenance = filterMaintenanceRequestsByScope(maintenanceRequests, scopedPortfolio);
  const scopedTenants = filterTenantsByScope(tenants as Tenant[], scopedPortfolio);
  const labelMap = getTaskLabelMap(scopedTasks, scopedEvents, scopedPortfolio.leases, scopedTenants, scopedPortfolio);

  const manualEventEntries: DashboardCalendarEntry[] = scopedEvents.map((event) => ({
    id: `event:${event.id}`,
    title: event.title,
    detail: event.description ?? "Événement opérationnel personnalisé",
    startAtIso: event.startAtIso,
    endAtIso: event.endAtIso,
    eventType: event.eventType,
    statusLabel: getEventStatusLabel(event.status),
    source: "manual",
    relatedLabel: resolveRelatedLabel(labelMap, event.relatedEntityType, event.relatedEntityId)
  }));

  const taskEntries: DashboardCalendarEntry[] = scopedTasks
    .filter((task) => task.status === "open" || task.status === "in_progress")
    .map((task) => ({
      id: `task:${task.id}`,
      title: task.title,
      detail: task.description ?? "Rappel lié à une tâche opérationnelle",
      startAtIso: `${task.dueDate}T08:00:00.000Z`,
      endAtIso: null,
      eventType: "task",
      statusLabel: getTaskStatusLabel(task.status),
      source: "task",
      relatedLabel: resolveRelatedLabel(labelMap, task.relatedEntityType, task.relatedEntityId)
    }));

  const leaseEntries: DashboardCalendarEntry[] = scopedPortfolio.leases.flatMap((lease) => {
    const entries: DashboardCalendarEntry[] = [
      {
        id: `lease-start:${lease.id}`,
        title: `Début de bail · ${lease.tenantFullName}`,
        detail: `Début du bail pour l'unité ${lease.unitId}`,
        startAtIso: `${lease.startDate}T09:00:00.000Z`,
        endAtIso: null,
        eventType: "lease",
        statusLabel: lease.status === "active" ? "Actif" : lease.status === "pending" ? "À activer" : "Terminé",
        source: "derived",
        relatedLabel: resolveRelatedLabel(labelMap, "lease", lease.id)
      }
    ];

    if (lease.endDate !== null) {
      entries.push({
        id: `lease-end:${lease.id}`,
        title: `Fin de bail · ${lease.tenantFullName}`,
        detail: `Échéance du bail prévue le ${lease.endDate}`,
        startAtIso: `${lease.endDate}T17:00:00.000Z`,
        endAtIso: null,
        eventType: "lease",
        statusLabel: lease.status === "ended" ? "Terminé" : "À traiter",
        source: "derived",
        relatedLabel: resolveRelatedLabel(labelMap, "lease", lease.id)
      });
    }

    return entries;
  });

  const paymentEntries: DashboardCalendarEntry[] = scopedPayments.map((payment) => ({
    id: `payment:${payment.id}`,
    title: `Échéance loyer · ${payment.amount.toLocaleString("fr-FR")} ${payment.currencyCode}`,
    detail: payment.note ?? "Paiement à suivre dans le cycle de collecte",
    startAtIso: `${payment.dueDate}T08:30:00.000Z`,
    endAtIso: null,
    eventType: "rent",
    statusLabel: getPaymentStatusLabel(payment),
    source: "derived",
    relatedLabel: resolveRelatedLabel(labelMap, "lease", payment.leaseId)
  }));

  const maintenanceEntries: DashboardCalendarEntry[] = scopedMaintenance
    .filter((request) => request.status === "open" || request.status === "in_progress")
    .map((request: MaintenanceRequest) => ({
      id: `maintenance:${request.id}`,
      title: `Suivi maintenance · ${request.title}`,
      detail: request.description,
      startAtIso: request.updatedAtIso,
      endAtIso: null,
      eventType: "maintenance",
      statusLabel: request.status === "open" ? "Ouverte" : "En cours",
      source: "derived",
      relatedLabel: resolveRelatedLabel(labelMap, "unit", request.unitId)
    }));

  return {
    tasks: scopedTasks,
    calendarEntries: [...manualEventEntries, ...taskEntries, ...leaseEntries, ...paymentEntries, ...maintenanceEntries]
      .sort((left, right) => left.startAtIso.localeCompare(right.startAtIso)),
    relatedOptions: [
      ...scopedPortfolio.properties.map((item) => ({ type: "property" as const, id: item.property.id, label: item.property.name, propertyId: item.property.id })),
      ...scopedPortfolio.properties.flatMap((item) => item.units.map((unit) => ({ type: "unit" as const, id: unit.id, label: `${item.property.name} · Unité ${unit.unitNumber}`, propertyId: item.property.id, unitId: unit.id }))),
      ...scopedPortfolio.leases.map((lease) => ({ type: "lease" as const, id: lease.id, label: `${lease.tenantFullName} · Bail ${lease.startDate}`, leaseId: lease.id, unitId: lease.unitId, tenantId: lease.tenantId })),
      ...scopedTenants.map((tenant) => ({ type: "tenant" as const, id: tenant.id, label: tenant.fullName, tenantId: tenant.id }))
    ]
  };
}