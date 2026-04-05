import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Document, DocumentType } from "@hhousing/domain";
import type { ApiResult } from "@hhousing/api-contracts";
import { getWithAuth } from "@/lib/api-client";
import { ScreenShell } from "@/components/screen-shell";

type MobileDocumentsOutput = { documents: Document[] };
type DocumentFilter = "all" | DocumentType;

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

const FILTERS: DocumentFilter[] = ["all", "lease_agreement", "receipt", "notice"];

export default function DocumentsScreen(): React.ReactElement {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filter, setFilter] = useState<DocumentFilter>("all");
  const [openingId, setOpeningId] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    const result: ApiResult<MobileDocumentsOutput> = await getWithAuth<MobileDocumentsOutput>(
      "/api/mobile/documents"
    );
    if (!result.success) {
      setError(result.error);
    } else {
      setDocuments(result.data.documents);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredDocuments = useMemo(() => {
    if (filter === "all") {
      return documents;
    }
    return documents.filter((document) => document.documentType === filter);
  }, [documents, filter]);

  const handleOpenDocument = useCallback(async (document: Document): Promise<void> => {
    setOpeningId(document.id);
    try {
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

  return (
    <ScreenShell title="Documents" subtitle="Bail, reçus et avis disponibles.">
      {isLoading ? <Text style={styles.info}>Chargement...</Text> : null}

      {!isLoading && error ? (
        <View style={styles.notice}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => { void load(); }}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !error ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
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

          {filteredDocuments.length === 0 ? (
            <View style={styles.notice}>
              <Text style={styles.emptyTitle}>Aucun document</Text>
              <Text style={styles.emptyText}>
                Les contrats, reçus et avis apparaîtront ici lorsqu'ils seront partagés.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
              {filteredDocuments.map((document) => (
                <Pressable key={document.id} style={styles.card} onPress={() => { void handleOpenDocument(document); }}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{document.fileName}</Text>
                    <View style={[styles.badge, { backgroundColor: DOCUMENT_TYPE_COLOR[document.documentType] + "20" }]}>
                      <Text style={[styles.badgeText, { color: DOCUMENT_TYPE_COLOR[document.documentType] }]}>
                        {DOCUMENT_TYPE_LABEL[document.documentType]}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.meta}>
                    Ajouté le {new Date(document.createdAtIso).toLocaleDateString("fr-FR")}
                  </Text>
                  <Text style={styles.meta}>{document.fileSize < 1024 * 1024 ? `${(document.fileSize / 1024).toFixed(1)} KB` : `${(document.fileSize / (1024 * 1024)).toFixed(1)} MB`}</Text>
                  <Text style={styles.openText}>{openingId === document.id ? "Ouverture..." : "Appuyer pour ouvrir"}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
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
  retry: {
    alignSelf: "flex-start",
    borderRadius: 8,
    backgroundColor: "#0063FE",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  retryText: { color: "#ffffff", fontWeight: "600", fontSize: 13 },
  filterRow: { gap: 8, paddingBottom: 14 },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  filterChipActive: { borderColor: "#0063FE", backgroundColor: "#EFF6FF" },
  filterText: { color: "#6B7280", fontSize: 12, fontWeight: "600" },
  filterTextActive: { color: "#0063FE" },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#010A19" },
  emptyText: { fontSize: 14, color: "#4B5563" },
  list: { flex: 1 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 6,
    marginBottom: 10
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: "#010A19" },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  meta: { fontSize: 13, color: "#6B7280" },
  openText: { fontSize: 12, color: "#0063FE", fontWeight: "600", marginTop: 2 }
});
