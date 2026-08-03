import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { ListSkeleton } from "@/components/skeleton";
import { useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { ApiResult } from "@/lib/api-client";
import { getWithAuth } from "@/lib/api-client";
import { ScreenShell } from "@/components/screen-shell";
import { useInbox } from "@/contexts/inbox-context";
import { NetworkError } from "@/components/network-error";
import { formatLocaleDate } from "@/i18n/format";
import { fontWeight, fontSize, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

type ConversationItem = {
  conversationId: string;
  organizationName: string;
  propertyName: string;
  lastMessageAtIso: string;
  lastMessagePreview: string;
  lastMessageSenderSide: string;
};

type ConversationsOutput = { conversations: unknown[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeConversation(value: unknown, index: number, t: TFunction): ConversationItem {
  const raw = isRecord(value) ? value : {};
  const lastMessage = isRecord(raw.lastMessage) ? raw.lastMessage : {};

  return {
    conversationId: asString(raw.conversationId || raw.id, `conversation-${index}`),
    organizationName: asString(raw.organizationName, t("messages.fallbackOrg")),
    propertyName: asString(raw.propertyName, t("messages.fallbackProperty")),
    lastMessageAtIso: asString(raw.lastMessageAtIso || lastMessage.createdAt, new Date().toISOString()),
    lastMessagePreview: asString(raw.lastMessagePreview || lastMessage.text, ""),
    lastMessageSenderSide: asString(raw.lastMessageSenderSide || lastMessage.senderSide, "manager")
  };
}

export default function InboxScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { setConversations: setInboxConversations, markAllRead } = useInbox();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setIsOffline(false);

    const result: ApiResult<ConversationsOutput> = await getWithAuth<ConversationsOutput>(
      "/api/mobile/messages/conversations"
    );

    if (!result.success) {
      if (result.code === "NETWORK_ERROR") setIsOffline(true);
      setError(result.error);
      setConversations([]);
    } else {
      const normalized = result.data.conversations.map((conversation, index) =>
        normalizeConversation(conversation, index, t)
      );
      setConversations(normalized);
      setInboxConversations(normalized);
    }

    setIsLoading(false);
  }, [setInboxConversations, t]);

  useEffect(() => {
    void load();
  }, [load]);

  // Format dates with the active locale.
  const conversationRows = useMemo(
    () =>
      conversations.map((conversation) => ({
        conversation,
        dateLabel: formatLocaleDate(conversation.lastMessageAtIso)
      })),
    [conversations, i18n.language]
  );

  // Reset badge when user focuses this screen
  useFocusEffect(
    useCallback((): void => {
      markAllRead();
    }, [markAllRead])
  );

  return (
    <ScreenShell title={t("messages.title")} subtitle={t("messages.subtitle")}>
      {isLoading ? <ListSkeleton rows={4} /> : null}

      {!isLoading && error ? (
        isOffline ? (
          <NetworkError onRetry={() => { void load(); }} />
        ) : (
          <View style={styles.notice}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => { void load(); }}>
              <Text style={styles.retryBtnText}>{t("common.retry")}</Text>
            </Pressable>
          </View>
        )
      ) : null}

      {!isLoading && !error && conversations.length === 0 ? (
        <View style={styles.notice}>
          <Text style={styles.emptyTitle}>{t("messages.emptyTitle")}</Text>
          <Text style={styles.emptyText}>{t("messages.emptyText")}</Text>
        </View>
      ) : null}

      {!isLoading && !error && conversationRows.length > 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { void load(); }} tintColor={colors.brand} />}
        >
          {conversationRows.map(({ conversation, dateLabel }) => (
            <Pressable
              key={conversation.conversationId}
              style={styles.item}
              onPress={() => { router.push(`/(tabs)/messages/${conversation.conversationId}`); }}
            >
              <View style={styles.itemHeader}>
                <Text style={styles.itemSender}>{conversation.organizationName}</Text>
                <Text style={styles.itemDate}>{dateLabel}</Text>
              </View>
              <Text style={styles.itemProperty}>{conversation.propertyName}</Text>
              <Text style={styles.itemPreview} numberOfLines={2}>{conversation.lastMessagePreview}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </ScreenShell>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
    emptyTitle: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.text },
    emptyText: { fontSize: fontSize.secondary, color: colors.textSecondary },
    list: { flex: 1 },
    item: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 6,
      marginBottom: 10
    },
    itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
    itemSender: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.text, flex: 1 },
    itemDate: { fontSize: fontSize.caption, color: colors.textMuted },
    itemProperty: { fontSize: fontSize.secondary, fontWeight: "600", color: colors.brand },
    itemPreview: { fontSize: fontSize.secondary, color: colors.textSecondary }
  });
}
