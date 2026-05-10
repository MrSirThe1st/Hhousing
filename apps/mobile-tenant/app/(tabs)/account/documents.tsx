import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ListSkeleton } from "@/components/skeleton";
import { NetworkError } from "@/components/network-error";
import type { ApiResult } from "@/lib/api-client";
import { getWithAuth } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";

type DocumentType = "lease_agreement" | "receipt" | "notice" | "id" | "contract" | "other";

type MobileDocument = {
  id: string;
  fileName: string;
  documentType: DocumentType;
  fileUrl: string;
  fileSize: number;
  createdAtIso: string;
};

type MobileDocumentsOutput = { documents: unknown[] };
type DocumentFilter = "all" | DocumentType;

const DOCUMENT_TYPES: DocumentType[] = ["lease_agreement", "receipt", "notice", "id", "contract", "other"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asDocumentType(value: unknown): DocumentType {
  return typeof value === "string" && DOCUMENT_TYPES.includes(value as DocumentType)
    ? (value as DocumentType)
    : "other";
}

function normalizeDocument(value: unknown, index: number): MobileDocument {
  const raw = isRecord(value) ? value : {};
  const fileName = asString(raw.fileName || raw.name, `Document ${index + 1}`);
  const fileUrl = asString(raw.fileUrl || raw.url, "");
  const createdAtIso = asString(raw.createdAtIso || raw.createdAt, new Date().toISOString());

  return {
    id: asString(raw.id, `doc-${index}`),
    fileName,
    documentType: asDocumentType(raw.documentType || raw.type),
    fileUrl,
    fileSize: Math.max(0, asNumber(raw.fileSize, 0)),
    createdAtIso
  };
}

const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  lease_agreement: "Contrat de bail",
  receipt: "Reçu",
  notice: "Avis",
  id: "Pièce d'identité",
  contract: "Contrat",
  other: "Autre"
};

const DOCUMENT_TYPE_COLOR: Record<DocumentType, string> = {
  lease_agreement: "#2563EB",
  receipt: "#16A34A",
  notice: "#D97706",
  id: "#7C3AED",
  contract: "#4F46E5",
  other: "#6B7280"
};

const DOCUMENT_TYPE_ICON: Record<DocumentType, React.ComponentProps<typeof Ionicons>["name"]> = {
  lease_agreement: "document-text-outline",
  receipt: "receipt-outline",
  notice: "megaphone-outline",
  id: "card-outline",
  contract: "clipboard-outline",
  other: "attach-outline"
};

const FILTERS: DocumentFilter[] = ["all", "lease_agreement", "receipt", "notice"];

export default function DocumentsScreen(): React.ReactElement {
  const router = useRouter();
  const { session, isLoading: isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [documents, setDocuments] = useState<MobileDocument[]>([]);
  const [filter, setFilter] = useState<DocumentFilter>("all");
  const [search, setSearch] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  const load = useCallback(async (refresh = false): Promise<void> => {
    if (!session?.access_token) {
      setError("Session expirée. Veuillez vous reconnecter.");
      setIsOffline(false);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);
    setIsOffline(false);

    const result: ApiResult<MobileDocumentsOutput> = await getWithAuth<MobileDocumentsOutput>(
      "/api/mobile/documents"
    );
    if (!result.success) {
      if (result.code === "NETWORK_ERROR") setIsOffline(true);
      setError(result.error);
    } else {
      setDocuments(result.data.documents.map((item, index) => normalizeDocument(item, index)));
    }

    if (refresh) {
      setIsRefreshing(false);
    } else {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!session?.access_token) {
      setError("Session expirée. Veuillez vous reconnecter.");
      setIsLoading(false);
      return;
    }

    void load();
  }, [isAuthLoading, load, session?.access_token]);

  const filteredDocuments = useMemo(() => {
    const byType = filter === "all"
      ? documents
      : documents.filter((document) => document.documentType === filter);

    const query = search.trim().toLowerCase();
    if (!query) {
      return byType;
    }

    return byType.filter((document) => {
      return document.fileName.toLowerCase().includes(query)
        || DOCUMENT_TYPE_LABEL[document.documentType].toLowerCase().includes(query);
    });
  }, [documents, filter, search]);

  const storageUsagePercent = useMemo(() => {
    const usedBytes = documents.reduce((sum, document) => sum + document.fileSize, 0);
    const simulatedQuota = 64 * 1024 * 1024;
    const raw = Math.round((usedBytes / simulatedQuota) * 100);
    return Math.max(1, Math.min(100, raw));
  }, [documents]);

  const handleOpenDocument = useCallback(async (document: MobileDocument): Promise<void> => {
    setOpeningId(document.id);
    try {
      if (!document.fileUrl) {
        setError("Ce document n'a pas de lien téléchargeable.");
        return;
      }
      const canOpen = await Linking.canOpenURL(document.fileUrl);
      if (!canOpen) {
        setError("Impossible d'ouvrir ce document.");
        return;
      }
      await Linking.openURL(document.fileUrl);
    } catch {
      setError("Impossible d'ouvrir ce document.");
    } finally {
      setOpeningId(null);
    }
  }, []);

  if (isLoading || isAuthLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loadingWrap}>
          <ListSkeleton rows={4} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        <Pressable style={styles.topBackBtn} onPress={() => { router.back(); }}>
          <Ionicons name="arrow-back" size={21} color="#0063FE" />
          <Text style={styles.topTitle}>Documents</Text>
        </Pressable>
      </View>

      {error ? (
        isOffline ? (
          <NetworkError onRetry={() => { void load(); }} />
        ) : (
          <View style={styles.notice}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retry} onPress={() => { void load(); }}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        )
      ) : null}

      {!error ? (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.list}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { void load(true); }} tintColor="#0063FE" />}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow} style={styles.filterScroll}>
              {FILTERS.map((value) => (
                <Pressable
                  key={value}
                  style={[styles.filterChip, filter === value && styles.filterChipActive]}
                  onPress={() => { setFilter(value); }}
                >
                  <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
                    {value === "all" ? "Tous" : DOCUMENT_TYPE_LABEL[value]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={18} color="#9CA3AF" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Rechercher un document..."
                placeholderTextColor="#9CA3AF"
                style={styles.searchInput}
              />
            </View>

            {filteredDocuments.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="folder-open-outline" size={40} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>Aucun document</Text>
                <Text style={styles.emptyText}>Aucun document ne correspond à votre recherche.</Text>
              </View>
            ) : (
              filteredDocuments.map((document) => {
                const isOpening = openingId === document.id;
                const color = DOCUMENT_TYPE_COLOR[document.documentType];
                const fileSizeLabel = document.fileSize < 1024 * 1024
                  ? `${(document.fileSize / 1024).toFixed(1)}MB`
                  : `${(document.fileSize / (1024 * 1024)).toFixed(1)}MB`;

                return (
                  <View key={document.id} style={[styles.card, isOpening && styles.cardOpening]}>
                    <View style={styles.cardTop}>
                      <View style={[styles.iconBox, { backgroundColor: color + "18" }]}> 
                        <Ionicons name={DOCUMENT_TYPE_ICON[document.documentType]} size={20} color={color} />
                      </View>
                      <Pressable
                        onPress={() => { void handleOpenDocument(document); }}
                        disabled={isOpening}
                      >
                        {isOpening ? (
                          <ActivityIndicator size="small" color="#0063FE" />
                        ) : (
                          <Ionicons name="open-outline" size={20} color="#4B5563" />
                        )}
                      </Pressable>
                    </View>

                    <Text style={styles.cardTitle} numberOfLines={1}>{document.fileName}</Text>

                    <View style={styles.cardMetaRow}>
                      <View style={[styles.badge, { backgroundColor: color + "18" }]}>
                        <Text style={[styles.badgeText, { color }]}>
                          {DOCUMENT_TYPE_LABEL[document.documentType].split(" ")[0].toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.metaText}>{fileSizeLabel}</Text>
                    </View>

                    <View style={styles.line} />

                    <Pressable
                      style={styles.bottomRow}
                      onPress={() => { void handleOpenDocument(document); }}
                      disabled={isOpening}
                    >
                      <View style={styles.bottomLeft}>
                        <Ionicons name="calendar-outline" size={15} color="#9CA3AF" />
                        <Text style={styles.dateText}>{new Date(document.createdAtIso).toLocaleDateString("fr-FR")}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    </Pressable>
                  </View>
                );
              })
            )}

            <View style={styles.storageCard}>
              <View style={styles.storageHeader}>
                <Ionicons name="cloud-done-outline" size={20} color="#ffffff" />
                <Text style={styles.storageTitle}>Espace de Stockage</Text>
              </View>
              <Text style={styles.storageDescription}>
                Vos documents sont sécurisés et accessibles à tout moment depuis votre compte Haraka.
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${storageUsagePercent}%` }]} />
              </View>
              <Text style={styles.storagePercent}>{storageUsagePercent}% Utilisé</Text>
            </View>
          </ScrollView>
        </>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F5F6FA"
  },
  loadingWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16
  },
  topBar: {
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: "#D4DAE7",
    paddingHorizontal: 12,
    justifyContent: "center"
  },
  topBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  topTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0063FE"
  },
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 10
  },
  errorText: { color: "#B91C1C", fontSize: 14 },
  retry: {
    alignSelf: "flex-start",
    borderRadius: 8,
    backgroundColor: "#0063FE",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  retryText: { color: "#ffffff", fontWeight: "600", fontSize: 13 },
  content: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12
  },
  filterScroll: { flexGrow: 0 },
  filterRow: { gap: 8, alignItems: "center" },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#C5CCD9",
    backgroundColor: "#ECEEF7",
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignSelf: "flex-start"
  },
  filterChipActive: { borderColor: "#0063FE", backgroundColor: "#0063FE" },
  filterText: { color: "#6B7280", fontSize: 13, fontWeight: "600" },
  filterTextActive: { color: "#ffffff" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C5CCD9",
    backgroundColor: "#F5F6FA",
    paddingHorizontal: 12,
    minHeight: 44
  },
  searchInput: {
    flex: 1,
    color: "#010A19",
    fontSize: 15,
    paddingVertical: 0
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#C5CCD9",
    backgroundColor: "#ffffff",
    padding: 24,
    alignItems: "center",
    gap: 8
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151" },
  emptyText: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 20 },
  list: { flex: 1 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#C5CCD9",
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 10
  },
  cardOpening: { opacity: 0.6 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#010A19", lineHeight: 22 },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  metaText: { fontSize: 14, color: "#6B7280" },
  line: {
    height: 1,
    backgroundColor: "#D4DAE7"
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  bottomLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  dateText: {
    fontSize: 14,
    color: "#6B7280"
  },
  storageCard: {
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: "#0057E6",
    padding: 14,
    gap: 10
  },
  storageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  storageTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "700"
  },
  storageDescription: {
    color: "#DBEAFE",
    fontSize: 13,
    lineHeight: 18
  },
  progressTrack: {
    marginTop: 3,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 999
  },
  storagePercent: {
    color: "#E5EDFF",
    fontSize: 12,
    fontWeight: "700"
  }
});
