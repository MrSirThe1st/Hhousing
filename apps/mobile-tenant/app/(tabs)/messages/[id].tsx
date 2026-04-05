import { useCallback, useEffect, useState } from "react";
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
import type { GetTenantConversationDetailOutput, SendTenantMessageOutput } from "@hhousing/api-contracts";
import type { ApiResult } from "@hhousing/api-contracts";
import { getWithAuth, postWithAuth } from "@/lib/api-client";
import { ScreenShell } from "@/components/screen-shell";

export default function ConversationScreen(): React.ReactElement {
  const params = useLocalSearchParams<{ id?: string }>();
  const conversationId = typeof params.id === "string" ? params.id : null;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<GetTenantConversationDetailOutput | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    if (!conversationId) {
      setError("Conversation introuvable.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result: ApiResult<GetTenantConversationDetailOutput> =
      await getWithAuth<GetTenantConversationDetailOutput>(
        `/api/mobile/messages/conversations/${conversationId}`
      );

    if (!result.success) {
      setError(result.error);
      setDetail(null);
    } else {
      setDetail(result.data);
    }

    setIsLoading(false);
  }, [conversationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSend = useCallback(async (): Promise<void> => {
    const body = messageBody.trim();
    if (!conversationId || !body) {
      return;
    }

    setIsSending(true);
    setError(null);

    const result: ApiResult<SendTenantMessageOutput> = await postWithAuth<SendTenantMessageOutput>(
      `/api/mobile/messages/conversations/${conversationId}/messages`,
      { body }
    );

    setIsSending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setMessageBody("");
    setDetail((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        conversation: {
          ...current.conversation,
          lastMessagePreview: result.data.message.body,
          lastMessageAtIso: result.data.message.createdAtIso
        },
        messages: [...current.messages, result.data.message]
      };
    });
  }, [conversationId, messageBody]);

  return (
    <ScreenShell
      title={detail?.conversation.organizationName ?? "Conversation"}
      subtitle={detail?.conversation.propertyName ?? "Messages avec votre gestion"}
    >
      {isLoading ? <Text style={styles.info}>Chargement...</Text> : null}

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
          <ScrollView style={styles.thread} showsVerticalScrollIndicator={false}>
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