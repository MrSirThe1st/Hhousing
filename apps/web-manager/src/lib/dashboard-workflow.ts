import type { MembershipAuthSession, LeaseWithTenantView } from "@hhousing/api-contracts";
import type { CalendarEvent, Payment, Task, Tenant } from "@hhousing/domain";
import {
  createCalendarEventRepo,
  createId,
  createPaymentRepo,
  createRepositoryFromEnv,
  createTaskRepo,
  createTenantLeaseRepo
} from "../app/api/shared";
import type { DashboardCalendarEntry } from "./dashboard-workflow.types";
import { getNow } from "./time";

function getTodayIsoDate(): string {
  return getNow().toISOString().slice(0, 10);
}

function createSystemTaskId(): string {
  return createId("tsk");
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

function isMaintenanceSystemTask(task: Task): boolean {
  return task.systemCode === "maintenance_follow_up" || task.relatedEntityType === "maintenance_request";
}

type SyncSystemTasksPrefetched = {
  payments: Payment[];
  leases: LeaseWithTenantView[];
};

export async function syncSystemTasks(session: MembershipAuthSession, prefetched?: SyncSystemTasksPrefetched): Promise<void> {
  const organizationId = session.organizationId;
  const taskRepo = createTaskRepo();

  let payments: Payment[];
  let leases: LeaseWithTenantView[];

  if (prefetched) {
    ({ payments, leases } = prefetched);
  } else {
    const paymentRepo = createPaymentRepo();
    const leaseRepo = createTenantLeaseRepo();
    [payments, leases] = await Promise.all([
      paymentRepo.listPaymentsPage({
        organizationId,
        status: "overdue",
        limit: 50,
        cursor: null
      }).then((page) => page.payments),
      leaseRepo.listLeasesPage({
        organizationId,
        status: "active",
        limit: 50,
        cursor: null
      }).then((page) => page.leases)
    ]);
  }

  const todayIsoDate = getTodayIsoDate();
  const activeSystemKeys: string[] = [];
  const upsertPromises: Promise<Task>[] = [];

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
  // Closing inactive system tasks also retires legacy maintenance_follow_up entries
  // that are no longer included in activeSystemKeys.
  await taskRepo.closeInactiveSystemTasks(organizationId, activeSystemKeys);
}

export async function buildDashboardWorkflowData(session: MembershipAuthSession): Promise<{
  tasks: Task[];
  calendarEntries: DashboardCalendarEntry[];
  relatedOptions: Array<{ type: "property" | "unit" | "lease" | "tenant"; id: string; label: string; propertyId?: string | null; unitId?: string | null; leaseId?: string | null; tenantId?: string | null }>;
}> {
  const taskRepo = createTaskRepo();
  const calendarEventRepo = createCalendarEventRepo();
  const paymentRepo = createPaymentRepo();
  const leaseRepo = createTenantLeaseRepo();
  const propertyRepo = createRepositoryFromEnv();

  if (!propertyRepo.success) {
    throw new Error(propertyRepo.error);
  }

  // Bounded reads only — never getScopedPortfolioData / unbounded list* on this path.
  // System-task sync is intentionally skipped on page render (too write-heavy).
  const [allTasks, calendarEvents, leasesPage, paymentsPage, propertyOptions, propertyUnitOptions, tenants] =
    await Promise.all([
      taskRepo.listTasks({ organizationId: session.organizationId }),
      calendarEventRepo.listCalendarEvents({ organizationId: session.organizationId }),
      leaseRepo.listLeasesPage({
        organizationId: session.organizationId,
        status: null,
        limit: 50,
        cursor: null
      }),
      paymentRepo.listPaymentsPage({
        organizationId: session.organizationId,
        status: "overdue",
        limit: 50,
        cursor: null
      }),
      propertyRepo.data.listPropertyOptions(session.organizationId),
      propertyRepo.data.listPropertyUnitOptions(session.organizationId),
      leaseRepo.listTenantsByOrganization
        ? leaseRepo.listTenantsByOrganization(session.organizationId)
        : Promise.resolve([] as Tenant[])
    ]);

  const tasks = allTasks.filter((task) => !isMaintenanceSystemTask(task));
  const leases = leasesPage.leases;
  const payments = paymentsPage.payments;

  const labelMap = new Map<string, string>();
  for (const property of propertyOptions) {
    labelMap.set(`property:${property.id}`, property.name);
  }
  for (const group of propertyUnitOptions) {
    for (const unit of group.units) {
      labelMap.set(`unit:${unit.id}`, `${group.propertyName} · Unité ${unit.label}`);
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
  for (const event of calendarEvents) {
    labelMap.set(`event:${event.id}`, event.title);
  }

  const manualEventEntries: DashboardCalendarEntry[] = calendarEvents.map((event) => ({
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

  const taskEntries: DashboardCalendarEntry[] = tasks
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

  const leaseEntries: DashboardCalendarEntry[] = leases.flatMap((lease) => {
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

  const paymentEntries: DashboardCalendarEntry[] = payments.map((payment) => ({
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

  return {
    tasks,
    calendarEntries: [...manualEventEntries, ...taskEntries, ...leaseEntries, ...paymentEntries]
      .sort((left, right) => left.startAtIso.localeCompare(right.startAtIso)),
    relatedOptions: [
      ...propertyOptions.map((property) => ({
        type: "property" as const,
        id: property.id,
        label: property.name,
        propertyId: property.id
      })),
      ...propertyUnitOptions.flatMap((group) =>
        group.units.map((unit) => ({
          type: "unit" as const,
          id: unit.id,
          label: `${group.propertyName} · Unité ${unit.label}`,
          propertyId: group.propertyId,
          unitId: unit.id
        }))
      ),
      ...leases.map((lease) => ({
        type: "lease" as const,
        id: lease.id,
        label: `${lease.tenantFullName} · Bail ${lease.startDate}`,
        leaseId: lease.id,
        unitId: lease.unitId,
        tenantId: lease.tenantId
      })),
      ...tenants.map((tenant) => ({
        type: "tenant" as const,
        id: tenant.id,
        label: tenant.fullName,
        tenantId: tenant.id
      }))
    ]
  };
}
