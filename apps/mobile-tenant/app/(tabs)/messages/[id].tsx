import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { ApiResult } from "@/lib/api-client";
import { getWithAuth, postWithAuth } from "@/lib/api-client";
import { supabase } from "@/lib/supabase";
import { ScreenShell } from "@/components/screen-shell";
import { AppLoader, ScreenLoader } from "@/components/universal-loading-state";
import { ErrorState } from "@/components/error-state";
import i18n from "@/i18n";
import { formatLocaleDateTime } from "@/i18n/format";
import { fontSize, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

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
      organizationName: asString(rawConversation.organizationName, i18n.t("messages.conversation")),
      propertyName: asString(rawConversation.propertyName, i18n.t("messages.conversationSubtitle")),
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
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const conversationId = typeof params.id === "string" ? params.id : null;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetailView | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const messageRows = useMemo(
    () =>
      (detail?.messages ?? []).map((message) => ({
        message,
        timeLabel: formatLocaleDateTime(message.createdAtIso)
      })),
    [detail?.messages, i18n.language]
  );

  const load = useCallback(async (): Promise<void> => {
    if (!conversationId) {
      setError(t("messages.notFound"));
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
  }, [conversationId, t]);

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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingRoot} edges={["top"]}>
        <ScreenLoader />
      </SafeAreaView>
    );
  }

  return (
    <ScreenShell
      title={detail?.conversation.organizationName ?? t("messages.conversation")}
      subtitle={detail?.conversation.propertyName ?? t("messages.conversationSubtitle")}
      onBack={() => { router.back(); }}
    >
      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={8}
      >
        {error ? (
          <ErrorState
            error={error}
            onRetry={() => { void load(); }}
          />
        ) : null}

        {!error && detail ? (
          <>
            <ScrollView
              ref={scrollViewRef}
              style={styles.thread}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => { scrollViewRef.current?.scrollToEnd({ animated: false }); }}
            >
              {messageRows.map(({ message, timeLabel }) => {
                const isMine = message.senderSide === "tenant";

                return (
                  <View key={message.id} style={[styles.messageBubble, isMine ? styles.messageMine : styles.messageTheirs]}>
                    <Text style={[styles.messageBody, isMine && styles.messageBodyMine]}>{message.body}</Text>
                    <Text style={[styles.messageMeta, isMine && styles.messageMetaMine]}>
                      {timeLabel}
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
                placeholder={t("messages.placeholder")}
                placeholderTextColor={colors.textFaint}
                multiline
              />
              <Pressable
                style={[styles.sendBtn, (isSending || !messageBody.trim()) && styles.sendBtnDisabled]}
                onPress={() => { void handleSend(); }}
                disabled={isSending || !messageBody.trim()}
              >
                {isSending ? <AppLoader size="small" tone="onBrand" /> : <Text style={styles.sendBtnText}>{t("messages.send")}</Text>}
              </Pressable>
            </View>
          </>
        ) : null}
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    loadingRoot: {
      flex: 1,
      backgroundColor: colors.background
    },
    keyboardRoot: {
      flex: 1
    },
    info: { color: colors.textMuted, fontSize: fontSize.secondary },
    notice: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 10
    },
    errorText: { color: colors.danger, fontSize: fontSize.secondary },
    retryBtn: {
      alignSelf: "flex-start",
      borderRadius: 8,
      backgroundColor: colors.brand,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    retryBtnText: { color: colors.onBrand, fontWeight: "600", fontSize: fontSize.secondary },
    thread: { flex: 1, minHeight: 260, marginBottom: 10 },
    messageBubble: {
      maxWidth: "86%",
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
      marginBottom: 8,
      gap: 4
    },
    messageMine: { alignSelf: "flex-end", backgroundColor: colors.brand },
    messageTheirs: { alignSelf: "flex-start", backgroundColor: colors.surfaceMuted },
    messageBody: { color: colors.text, fontSize: fontSize.secondary },
    messageBodyMine: { color: colors.onBrand },
    messageMeta: { color: colors.textMuted, fontSize: fontSize.caption },
    messageMetaMine: { color: colors.onBrand },
    composerRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
    composerInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: fontSize.secondary,
      color: colors.text,
      backgroundColor: colors.inputBg,
      maxHeight: 120
    },
    sendBtn: {
      borderRadius: 10,
      backgroundColor: colors.brand,
      paddingHorizontal: 14,
      minHeight: 44,
      minWidth: 82,
      alignItems: "center",
      justifyContent: "center"
    },
    sendBtnDisabled: { backgroundColor: colors.brandMuted },
    sendBtnText: { color: colors.onBrand, fontSize: fontSize.secondary, fontWeight: "700" }
  });
}
