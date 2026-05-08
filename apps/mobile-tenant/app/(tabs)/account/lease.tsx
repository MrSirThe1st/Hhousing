import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { CardSkeleton, ListSkeleton } from "@/components/skeleton";
import { NetworkError } from "@/components/network-error";
import type { Document } from "@hhousing/domain";
import type { ApiResult, LeaseWithTenantView } from "@hhousing/api-contracts";
import { getWithAuth } from "@/lib/api-client";

type TenantLeaseOutput = {
  lease: LeaseWithTenantView | null;
};

type MobileDocumentsOutput = { documents: Document[] };

function formatDateNumeric(value: string): string {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function formatDateReadable(value: string): string {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatAmount(amount: number, currencyCode: string): string {
  const formatted = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount);
  return `${formatted.replace(/\u00A0|\s/g, ".")} ${currencyCode}`;
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function badgeLeaseId(leaseId: string): string {
  return `ID: #${leaseId.slice(0, 8).toUpperCase()}`;
}

export default function LeaseScreen(): React.ReactElement {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpeningDoc, setIsOpeningDoc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [lease, setLease] = useState<LeaseWithTenantView | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);

  const load = useCallback(async (refresh = false): Promise<void> => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);
    setIsOffline(false);

    try {
      const [leaseResult, docsResult] = await Promise.all([
        getWithAuth<TenantLeaseOutput>("/api/mobile/lease"),
        getWithAuth<MobileDocumentsOutput>("/api/mobile/documents")
      ]);

      let nextError: string | null = null;

      if (!leaseResult.success) {
        if (leaseResult.code === "NETWORK_ERROR") setIsOffline(true);
        nextError = leaseResult.error;
        setLease(null);
      } else {
        setLease(leaseResult.data.lease);
      }

      if (!docsResult.success) {
        if (docsResult.code === "NETWORK_ERROR") setIsOffline(true);
        if (!nextError) {
          nextError = docsResult.error;
        }
        setDocuments([]);
      } else {
        setDocuments(docsResult.data.documents);
      }

      setError(nextError);
    } finally {
      if (refresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleDocuments = useMemo(() => documents.slice(0, 3), [documents]);

  const openDocument = useCallback(async (document: Document): Promise<void> => {
    setIsOpeningDoc(document.id);
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
      setIsOpeningDoc(null);
    }
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loadingWrap}>
          <CardSkeleton />
          <CardSkeleton />
          <ListSkeleton rows={3} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        <Pressable style={styles.topBarLeft} onPress={() => { router.back(); }}>
          <Ionicons name="arrow-back" size={22} color="#0063FE" />
          <Text style={styles.topBarTitle}>Mon Bail</Text>
        </Pressable>
        <View style={styles.topBarActions}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => {
              const first = visibleDocuments[0];
              if (first) {
                void openDocument(first);
              }
            }}
          >
            <Ionicons name="download-outline" size={18} color="#4B5563" />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={() => { router.push("/(tabs)/account/documents"); }}
          >
            <Ionicons name="share-social-outline" size={18} color="#4B5563" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { void load(true); }}
            tintColor="#0063FE"
          />
        }
      >
        {error ? (
          isOffline ? (
            <NetworkError onRetry={() => { void load(); }} />
          ) : (
            <View style={styles.notice}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={() => { void load(); }}>
                <Text style={styles.retryButtonText}>Réessayer</Text>
              </Pressable>
            </View>
          )
        ) : null}

        {!lease ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Aucun bail actif</Text>
            <Text style={styles.emptyText}>
              Votre compte n'est pas encore lié à un bail. Contactez votre gestionnaire.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatarWrap}>
                <Ionicons name="person-outline" size={34} color="#6B7280" />
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle-outline" size={14} color="#ffffff" />
                </View>
              </View>

              <Text style={styles.tenantName}>{lease.tenantFullName}</Text>
              <Text style={styles.tenantSince}>Locataire depuis {formatDateReadable(lease.startDate)}</Text>

              <View style={styles.profileBadges}>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>CONTRAT ACTIF</Text>
                </View>
                <View style={styles.idPill}>
                  <Text style={styles.idPillText}>{badgeLeaseId(lease.id)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrap}>
                  <Ionicons name="document-text-outline" size={18} color="#0063FE" />
                </View>
                <Text style={styles.sectionTitle}>CONTRAT</Text>
              </View>

              <DetailRow label="Début" value={formatDateNumeric(lease.startDate)} />
              <Divider />
              <DetailRow label="Fin" value={lease.endDate ? formatDateNumeric(lease.endDate) : "-"} />
              <Divider />
              <DetailRow label="Type" value={lease.termType === "fixed" ? "Résidentiel" : "Mois à mois"} />
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrap}>
                  <Ionicons name="cash-outline" size={18} color="#0063FE" />
                </View>
                <Text style={styles.sectionTitle}>LOYER</Text>
              </View>

              <View style={styles.rentAmountRow}>
                <Text style={styles.rowLabel}>Montant mensuel</Text>
                <View style={styles.rentRight}>
                  <Text style={styles.rentAmount}>{formatAmount(lease.monthlyRentAmount, lease.currencyCode)}</Text>
                  <Text style={styles.rentSuffix}>/ MOIS</Text>
                </View>
              </View>
              <Divider />
              <DetailRow label="Dépôt" value={formatAmount(lease.depositAmount, lease.currencyCode)} />
              <Divider />
              <DetailRow
                label="Fréquence"
                value={lease.paymentFrequency === "monthly" ? "Mensuelle" : lease.paymentFrequency === "quarterly" ? "Trimestrielle" : "Annuelle"}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.documentsTitle}>Documents du bail</Text>

              {visibleDocuments.length === 0 ? (
                <Text style={styles.documentsEmpty}>Aucun document disponible.</Text>
              ) : (
                visibleDocuments.map((document, index) => (
                  <Pressable
                    key={document.id}
                    style={styles.docRow}
                    onPress={() => { void openDocument(document); }}
                    disabled={isOpeningDoc === document.id}
                  >
                    <View style={styles.docIconWrap}>
                      <Ionicons name="document-attach-outline" size={18} color="#6B7280" />
                    </View>
                    <View style={styles.docBody}>
                      <Text style={styles.docName} numberOfLines={1}>{document.fileName}</Text>
                      <Text style={styles.docMeta}>
                        {formatFileSize(document.fileSize)} • {formatDateNumeric(document.createdAtIso)}
                      </Text>
                    </View>
                    {isOpeningDoc === document.id ? (
                      <ActivityIndicator size="small" color="#0063FE" />
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    )}
                    {index < visibleDocuments.length - 1 ? <Divider offset /> : null}
                  </Pressable>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Divider({ offset = false }: { offset?: boolean }): React.ReactElement {
  return <View style={[styles.divider, offset && styles.docDivider]} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F5F6FA"
  },
  loadingWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10
  },
  topBar: {
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: "#D4DAE7",
    backgroundColor: "#F5F6FA",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  topBarTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0063FE"
  },
  topBarActions: {
    flexDirection: "row",
    gap: 4
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center"
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 12
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
  retryButton: {
    alignSelf: "flex-start",
    borderRadius: 8,
    backgroundColor: "#0063FE",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  retryButtonText: { color: "#ffffff", fontWeight: "600", fontSize: 13 },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D4DAE7",
    backgroundColor: "#ffffff",
    padding: 24,
    alignItems: "center",
    gap: 8
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151" },
  emptyText: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 20 },

  profileCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C5CCD9",
    backgroundColor: "#ffffff",
    padding: 16,
    alignItems: "center",
    gap: 4
  },
  avatarWrap: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 4
  },
  verifiedBadge: {
    position: "absolute",
    right: 0,
    bottom: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#0063FE",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ffffff"
  },
  tenantName: {
    fontSize: 23,
    fontWeight: "700",
    color: "#010A19"
  },
  tenantSince: {
    fontSize: 14,
    color: "#6B7280"
  },
  profileBadges: {
    marginTop: 6,
    flexDirection: "row",
    gap: 8
  },
  statusPill: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999
  },
  statusPillText: {
    color: "#2563EB",
    fontSize: 10,
    fontWeight: "700"
  },
  idPill: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999
  },
  idPillText: {
    color: "#6B7280",
    fontSize: 10,
    fontWeight: "700"
  },

  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C5CCD9",
    backgroundColor: "#ffffff",
    padding: 16
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14
  },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E8F1FF",
    alignItems: "center",
    justifyContent: "center"
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#010A19"
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10
  },
  rowLabel: {
    color: "#6B7280",
    fontSize: 24
  },
  rowValue: {
    color: "#010A19",
    fontSize: 24,
    fontWeight: "700"
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB"
  },

  rentAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10
  },
  rentRight: {
    alignItems: "flex-end"
  },
  rentAmount: {
    fontSize: 38,
    fontWeight: "700",
    color: "#0063FE"
  },
  rentSuffix: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: -2
  },

  documentsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#010A19",
    marginBottom: 8
  },
  documentsEmpty: {
    fontSize: 14,
    color: "#6B7280"
  },
  docRow: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12
  },
  docIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#ECEEF7",
    alignItems: "center",
    justifyContent: "center"
  },
  docBody: {
    flex: 1,
    gap: 3
  },
  docName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#010A19"
  },
  docMeta: {
    fontSize: 12,
    color: "#6B7280"
  },
  docDivider: {
    position: "absolute",
    left: 44,
    right: 0,
    bottom: 0
  }
});