import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { ListSkeleton } from "@/components/skeleton";
import { useRouter, useFocusEffect } from "expo-router";
import type { ListTenantConversationsOutput } from "@/lib/api-contracts-types";
import type { ApiResult } from "@/lib/api-client";
import { getWithAuth } from "@/lib/api-client";
import { ScreenShell } from "@/components/screen-shell";
import { useInbox } from "@/contexts/inbox-context";
import { NetworkError } from "@/components/network-error";

export default function InboxScreen(): React.ReactElement {
  const router = useRouter();
  const { setConversations: setInboxConversations, markAllRead } = useInbox();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [conversations, setConversations] = useState<ListTenantConversationsOutput["conversations"]>([]);

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setIsOffline(false);

    const result: ApiResult<ListTenantConversationsOutput> = await getWithAuth<ListTenantConversationsOutput>(
      "/api/mobile/messages/conversations"
    );

    if (!result.success) {
      if (result.code === "NETWORK_ERROR") setIsOffline(true);
      setError(result.error);
      setConversations([]);
    } else {
      setConversations(result.data.conversations);
      setInboxConversations(result.data.conversations);
    }

    setIsLoading(false);
  }, [setInboxConversations]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reset badge when user focuses this screen
  useFocusEffect(
    useCallback((): void => {
      markAllRead();
    }, [markAllRead])
  );

  return (
    <ScreenShell title="Inbox" subtitle="Messages de votre gestion.">
      {isLoading ? <ListSkeleton rows={4} /> : null}

      {!isLoading && error ? (
        isOffline ? (
          <NetworkError onRetry={() => { void load(); }} />
        ) : (
          <View style={styles.notice}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => { void load(); }}>
              <Text style={styles.retryBtnText}>Réessayer</Text>
            </Pressable>
          </View>
        )
      ) : null}

      {!isLoading && !error && conversations.length === 0 ? (
        <View style={styles.notice}>
          <Text style={styles.emptyTitle}>Aucun message</Text>
          <Text style={styles.emptyText}>Votre gestion vous contactera ici.</Text>
        </View>
      ) : null}

      {!isLoading && !error && conversations.length > 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { void load(); }} tintColor="#0063FE" />}
        >
          {conversations.map((conversation) => (
            <Pressable
              key={conversation.conversationId}
              style={styles.item}
              onPress={() => { router.push(`/(tabs)/messages/${conversation.conversationId}`); }}
            >
              <View style={styles.itemHeader}>
                <Text style={styles.itemSender}>{conversation.organizationName}</Text>
                <Text style={styles.itemDate}>{new Date(conversation.lastMessageAtIso).toLocaleDateString("fr-FR")}</Text>
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
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#010A19" },
  emptyText: { fontSize: 14, color: "#4B5563" },
  list: { flex: 1 },
  item: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 6,
    marginBottom: 10
  },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  itemSender: { fontSize: 15, fontWeight: "700", color: "#010A19", flex: 1 },
  itemDate: { fontSize: 12, color: "#6B7280" },
  itemProperty: { fontSize: 13, fontWeight: "600", color: "#0063FE" },
  itemPreview: { fontSize: 13, color: "#4B5563" }
});
