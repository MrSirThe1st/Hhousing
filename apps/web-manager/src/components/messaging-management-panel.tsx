"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  GetManagerConversationDetailOutput,
  ManagerConversationListItem
} from "@hhousing/api-contracts";
import UniversalLoadingState from "./universal-loading-state";

interface PropertyOption {
  id: string;
  name: string;
}

interface TenantOption {
  id: string;
  fullName: string;
}

interface MessagingManagementPanelProps {
  initialConversations: ManagerConversationListItem[];
  properties: PropertyOption[];
  tenants: TenantOption[];
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function MessagingManagementPanel({
  initialConversations,
  properties,
  tenants
}: MessagingManagementPanelProps): React.ReactElement {
  const [conversations, setConversations] = useState<ManagerConversationListItem[]>(
    initialConversations
  );
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    initialConversations[0]?.conversationId ?? null
  );
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [detail, setDetail] = useState<GetManagerConversationDetailOutput | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [newMessageBody, setNewMessageBody] = useState("");
  const [sending, setSending] = useState(false);

  const [startTenantId, setStartTenantId] = useState(tenants[0]?.id ?? "");
  const [startBody, setStartBody] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  async function loadConversations(): Promise<void> {
    setListLoading(true);
    setListError(null);

    const params = new URLSearchParams();
    if (selectedPropertyId) params.set("propertyId", selectedPropertyId);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());

    const response = await fetch(`/api/messages/conversations?${params.toString()}`, {
      credentials: "include"
    });

    const json = (await response.json()) as {
      success: boolean;
      error?: string;
      data?: { conversations: ManagerConversationListItem[] };
    };

    if (!json.success || !json.data) {
      setListError(json.error ?? "Impossible de charger les conversations");
      setListLoading(false);
      return;
    }

    setConversations(json.data.conversations);

    if (
      selectedConversationId &&
      !json.data.conversations.some((item) => item.conversationId === selectedConversationId)
    ) {
      setSelectedConversationId(json.data.conversations[0]?.conversationId ?? null);
    }

    if (!selectedConversationId && json.data.conversations[0]) {
      setSelectedConversationId(json.data.conversations[0].conversationId);
    }

    setListLoading(false);
  }

  async function loadDetail(conversationId: string): Promise<void> {
    setDetailLoading(true);
    setDetailError(null);

    const response = await fetch(`/api/messages/conversations/${conversationId}`, {
      credentials: "include"
    });

    const json = (await response.json()) as {
      success: boolean;
      error?: string;
      data?: GetManagerConversationDetailOutput;
    };

    if (!json.success || !json.data) {
      setDetail(null);
      setDetailError(json.error ?? "Impossible de charger la conversation");
      setDetailLoading(false);
      return;
    }

    setDetail(json.data);
    setDetailLoading(false);
  }

  useEffect(() => {
    void loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPropertyId, searchQuery]);

  useEffect(() => {
    if (!selectedConversationId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedConversationId);
  }, [selectedConversationId]);

  async function handleSendInConversation(): Promise<void> {
    if (!selectedConversationId || !newMessageBody.trim()) {
      return;
    }

    setSending(true);
    setDetailError(null);

    const response = await fetch(`/api/messages/conversations/${selectedConversationId}/messages`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: newMessageBody.trim() })
    });

    const json = (await response.json()) as {
      success: boolean;
      error?: string;
    };

    if (!json.success) {
      setDetailError(json.error ?? "Impossible d'envoyer le message");
      setSending(false);
      return;
    }

    setNewMessageBody("");
    await Promise.all([loadDetail(selectedConversationId), loadConversations()]);
    setSending(false);
  }

  async function handleStartConversation(): Promise<void> {
    if (!startTenantId || !startBody.trim()) {
      return;
    }

    setStarting(true);
    setStartError(null);

    const response = await fetch("/api/messages/conversations", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        organizationId: "unused",
        tenantId: startTenantId,
        body: startBody.trim()
      })
    });

    const json = (await response.json()) as {
      success: boolean;
      error?: string;
      data?: { conversationId: string };
    };

    if (!json.success || !json.data) {
      setStartError(json.error ?? "Impossible de démarrer la conversation");
      setStarting(false);
      return;
    }

    setStartBody("");
    await loadConversations();
    setSelectedConversationId(json.data.conversationId);
    setStarting(false);
  }

  const selectedSummary = useMemo(
    () => conversations.find((item) => item.conversationId === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-[#010a19]">Messagerie locataires</h1>
        <div className="flex gap-2">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Rechercher locataire, unité, propriété..."
            className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={selectedPropertyId}
            onChange={(event) => setSelectedPropertyId(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Toutes les propriétés</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>{property.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[390px_1fr]">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 p-3">
            <p className="text-xs text-gray-500">Conversations triées par activité récente</p>
          </div>

import UniversalLoadingState from "./universal-loading-state";
          <div className="max-h-[70vh] overflow-y-auto divide-y divide-gray-100">
            {listLoading ? (
              <UniversalLoadingState minHeightClassName="min-h-56" size="compact" />
            ) : listError ? (
              <p className="p-4 text-sm text-red-600">{listError}</p>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">Aucune conversation.</p>
            ) : (
              conversations.map((item) => {
                const active = item.conversationId === selectedConversationId;
                return (
                  <button
                    key={item.conversationId}
                    onClick={() => setSelectedConversationId(item.conversationId)}
                    className={`w-full text-left p-3 transition ${
                      active ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-[#010a19]">
                      {item.tenantName} - Unit {item.unitNumber} ({item.propertyName})
                    </p>
                    <p className="mt-1 text-xs text-gray-600 line-clamp-1">
                      Dernier message: "{item.lastMessagePreview}"
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">{formatDateTime(item.lastMessageAtIso)}</span>
                      {item.unreadCount > 0 ? (
                        <span className="rounded-full bg-[#0063fe] px-2 py-0.5 text-[11px] font-semibold text-white">
                          Non lus: {item.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {!selectedConversationId ? (
            <div className="p-5 space-y-4">
              <h2 className="text-lg font-semibold text-[#010a19]">Nouveau message</h2>
              <p className="text-sm text-gray-600">
                Une conversation est créée automatiquement à l&apos;envoi du premier message.
              </p>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600">Locataire</label>
                <select
                  value={startTenantId}
                  onChange={(event) => setStartTenantId(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>{tenant.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600">Message</label>
                <textarea
                  value={startBody}
                  onChange={(event) => setStartBody(event.target.value)}
                  className="min-h-28 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Écrivez votre message..."
                />
              </div>

              {startError ? <p className="text-sm text-red-600">{startError}</p> : null}

              <button
                onClick={() => {
                  void handleStartConversation();
                }}
                disabled={starting}
                className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {starting ? "Création..." : "Démarrer conversation"}
              </button>
            </div>
          ) : detailLoading ? (
            <UniversalLoadingState minHeightClassName="min-h-[70vh]" size="compact" />
          ) : detailError ? (
            <p className="p-5 text-sm text-red-600">{detailError}</p>
          ) : detail ? (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] min-h-[70vh]">
              <div className="border-r border-gray-200 p-4 flex flex-col">
                <div className="mb-3 border-b border-gray-100 pb-3">
                  <p className="text-sm font-semibold text-[#010a19]">
                    {detail.conversation.tenantName} - Unit {detail.conversation.unitNumber} ({detail.conversation.propertyName})
                  </p>
                  <p className="text-xs text-gray-500">Conversation</p>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                  {detail.messages.map((message) => {
                    const mine = message.senderSide === "manager";
                    return (
                      <div
                        key={message.id}
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          mine
                            ? "ml-auto bg-[#0063fe] text-white"
                            : "mr-auto bg-gray-100 text-gray-800"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.body}</p>
                        <p className={`mt-1 text-[11px] ${mine ? "text-blue-100" : "text-gray-500"}`}>
                          {formatDateTime(message.createdAtIso)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
                  <textarea
                    value={newMessageBody}
                    onChange={(event) => setNewMessageBody(event.target.value)}
                    className="min-h-20 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Répondre..."
                  />
                  <button
                    onClick={() => {
                      void handleSendInConversation();
                    }}
                    disabled={sending}
                    className="h-fit rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Envoyer
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-[#010a19]">Contexte</h3>

                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-semibold text-gray-500">Locataire</p>
                  <p className="text-sm font-medium text-[#010a19]">{detail.context.tenant.fullName}</p>
                  <p className="text-xs text-gray-600">{detail.context.tenant.email ?? "-"}</p>
                  <p className="text-xs text-gray-600">{detail.context.tenant.phone ?? "-"}</p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-semibold text-gray-500">Unité</p>
                  <p className="text-sm font-medium text-[#010a19]">
                    Unit {detail.context.unit.unitNumber}
                  </p>
                  <p className="text-xs text-gray-600">{detail.context.unit.propertyName}</p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-semibold text-gray-500">Bail</p>
                  {detail.context.lease ? (
                    <>
                      <p className="text-xs text-gray-700">Statut: {detail.context.lease.status}</p>
                      <p className="text-xs text-gray-700">
                        {detail.context.lease.startDate} - {detail.context.lease.endDate ?? "en cours"}
                      </p>
                      <p className="text-xs text-gray-700">
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: detail.context.lease.currencyCode,
                          maximumFractionDigits: 0
                        }).format(detail.context.lease.monthlyRentAmount)} / mois
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-600">Aucun bail actif lié.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="p-5 text-sm text-gray-500">Sélectionnez une conversation.</p>
          )}
        </div>
      </div>

      {selectedSummary ? null : null}
    </div>
  );
}
