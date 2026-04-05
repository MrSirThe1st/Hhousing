import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { ListTenantConversationsOutput } from "@hhousing/api-contracts";
import type { ApiResult } from "@hhousing/api-contracts";
import { getWithAuth } from "@/lib/api-client";
import { ScreenShell } from "@/components/screen-shell";

export default function InboxScreen(): React.ReactElement {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ListTenantConversationsOutput["conversations"]>([]);

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    const result: ApiResult<ListTenantConversationsOutput> = await getWithAuth<ListTenantConversationsOutput>(
      "/api/mobile/messages/conversations"
    );

    if (!result.success) {
      setError(result.error);
      setConversations([]);
    } else {
      setConversations(result.data.conversations);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenShell title="Inbox" subtitle="Messages de votre gestion.">
      {isLoading ? <Text style={styles.info}>Chargement des messages...</Text> : null}

      {!isLoading && error ? (
        <View style={styles.notice}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => { void load(); }}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !error && conversations.length === 0 ? (
        <View style={styles.notice}>
          <Text style={styles.emptyTitle}>Aucun message</Text>
          <Text style={styles.emptyText}>Votre gestion vous contactera ici.</Text>
        </View>
      ) : null}

      {!isLoading && !error && conversations.length > 0 ? (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
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
