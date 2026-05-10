import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { ApiResult } from "@/lib/api-client";
import { getWithAuth, postWithAuth } from "@/lib/api-client";
import { supabase } from "@/lib/supabase";
import { ScreenShell } from "@/components/screen-shell";
import { ListSkeleton } from "@/components/skeleton";

type SenderSide = "tenant" | "manager";

type ChatMessage = {
  id: string;
  body: string;
  createdAtIso: string;
  senderSide: SenderSide;
};

type ConversationMeta = {
  organizationName: string;
  propertyName: string;
  lastMessagePreview?: string;
  lastMessageAtIso?: string;
};

type ConversationDetailView = {
  conversation: ConversationMeta;
  messages: ChatMessage[];
};

type SendMessageView = {
  message: ChatMessage;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asSenderSide(value: unknown): SenderSide {
  return value === "tenant" ? "tenant" : "manager";
}

function normalizeMessage(value: unknown, index = 0): ChatMessage {
  const raw = isRecord(value) ? value : {};
  return {
    id: asString(raw.id, `message-${index}`),
    body: asString(raw.body || raw.text, ""),
    createdAtIso: asString(raw.createdAtIso || raw.createdAt, new Date().toISOString()),
    senderSide: asSenderSide(raw.senderSide || raw.sender_side)
  };
}

function normalizeDetail(value: unknown): ConversationDetailView {
  const raw = isRecord(value) ? value : {};
  const rawConversation = isRecord(raw.conversation) ? raw.conversation : raw;
  const rawLastMessage = isRecord(rawConversation.lastMessage) ? rawConversation.lastMessage : {};
  const rawMessages = Array.isArray(raw.messages) ? raw.messages : [];

  return {
    conversation: {
      organizationName: asString(rawConversation.organizationName, "Conversation"),
      propertyName: asString(rawConversation.propertyName, "Messages avec votre gestion"),
      lastMessagePreview: asString(rawConversation.lastMessagePreview) || undefined,
      lastMessageAtIso: asString(rawConversation.lastMessageAtIso || rawLastMessage.createdAt) || undefined
    },
    messages: rawMessages.map((item, index) => normalizeMessage(item, index))
  };
}

function normalizeSendMessage(value: unknown): SendMessageView {
  const raw = isRecord(value) ? value : {};
  const rawMessage = isRecord(raw.message) ? raw.message : raw;
  return {
    message: normalizeMessage(rawMessage)
  };
}

export default function ConversationScreen(): React.ReactElement {
  const params = useLocalSearchParams<{ id?: string }>();
  const conversationId = typeof params.id === "string" ? params.id : null;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetailView | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!conversationId) {
      setError("Conversation introuvable.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result: ApiResult<unknown> =
      await getWithAuth<unknown>(
        `/api/mobile/messages/conversations/${conversationId}`
      );

    if (!result.success) {
      setError(result.error);
      setDetail(null);
    } else {
      setDetail(normalizeDetail(result.data));
    }

    setIsLoading(false);
  }, [conversationId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Supabase Realtime: append new messages from manager in real time
  useEffect(() => {
    if (!conversationId || isLoading) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const incoming = normalizeMessage(payload.new);

          setDetail((current) => {
            if (!current) return current;
            // Deduplicate — optimistic send already appended our own message
            if (current.messages.some((m: ChatMessage) => m.id === incoming.id)) {
              return current;
            }
            return { ...current, messages: [...current.messages, incoming] };
          });
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, isLoading]);

  const handleSend = useCallback(async (): Promise<void> => {
    const body = messageBody.trim();
    if (!conversationId || !body) {
      return;
    }

    setIsSending(true);
    setError(null);

    const result: ApiResult<unknown> = await postWithAuth<unknown>(
      `/api/mobile/messages/conversations/${conversationId}/messages`,
      { body }
    );

    setIsSending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    const sendPayload = normalizeSendMessage(result.data);

    setMessageBody("");
    setDetail((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        conversation: {
          ...current.conversation,
          lastMessagePreview: sendPayload.message.body,
          lastMessageAtIso: sendPayload.message.createdAtIso
        },
        messages: [...current.messages, sendPayload.message]
      };
    });
  }, [conversationId, messageBody]);

  return (
    <ScreenShell
      title={detail?.conversation.organizationName ?? "Conversation"}
      subtitle={detail?.conversation.propertyName ?? "Messages avec votre gestion"}
    >
      {isLoading ? <ListSkeleton rows={5} /> : null}

      {!isLoading && error ? (
        <View style={styles.notice}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => { void load(); }}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !error && detail ? (
        <>
          <ScrollView ref={scrollViewRef} style={styles.thread} showsVerticalScrollIndicator={false} onContentSizeChange={() => { scrollViewRef.current?.scrollToEnd({ animated: false }); }}>
            {detail.messages.map((message) => {
              const isMine = message.senderSide === "tenant";

              return (
                <View key={message.id} style={[styles.messageBubble, isMine ? styles.messageMine : styles.messageTheirs]}>
                  <Text style={[styles.messageBody, isMine && styles.messageBodyMine]}>{message.body}</Text>
                  <Text style={[styles.messageMeta, isMine && styles.messageMetaMine]}>
                    {new Date(message.createdAtIso).toLocaleString("fr-FR")}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.composerRow}>
            <TextInput
              style={styles.composerInput}
              value={messageBody}
              onChangeText={setMessageBody}
              placeholder="Écrire un message"
              placeholderTextColor="#9CA3AF"
              multiline
            />
            <Pressable
              style={[styles.sendBtn, (isSending || !messageBody.trim()) && styles.sendBtnDisabled]}
              onPress={() => { void handleSend(); }}
              disabled={isSending || !messageBody.trim()}
            >
              {isSending ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.sendBtnText}>Envoyer</Text>}
            </Pressable>
          </View>
        </>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  info: { color: "#6B7280", fontSize: 14 },
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 10
  },
  errorText: { color: "#B91C1C", fontSize: 14 },
  retryBtn: {
    alignSelf: "flex-start",
    borderRadius: 8,
    backgroundColor: "#0063FE",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  retryBtnText: { color: "#ffffff", fontWeight: "600", fontSize: 13 },
  thread: { flex: 1, minHeight: 260, marginBottom: 10 },
  messageBubble: {
    maxWidth: "86%",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    gap: 4
  },
  messageMine: { alignSelf: "flex-end", backgroundColor: "#0063FE" },
  messageTheirs: { alignSelf: "flex-start", backgroundColor: "#F3F4F6" },
  messageBody: { color: "#111827", fontSize: 14 },
  messageBodyMine: { color: "#ffffff" },
  messageMeta: { color: "#6B7280", fontSize: 11 },
  messageMetaMine: { color: "#DBEAFE" },
  composerRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#010A19",
    backgroundColor: "#ffffff",
    maxHeight: 120
  },
  sendBtn: {
    borderRadius: 10,
    backgroundColor: "#0063FE",
    paddingHorizontal: 14,
    paddingVertical: 11,
    minWidth: 82,
    alignItems: "center"
  },
  sendBtnDisabled: { backgroundColor: "#93C5FD" },
  sendBtnText: { color: "#ffffff", fontSize: 13, fontWeight: "700" }
});