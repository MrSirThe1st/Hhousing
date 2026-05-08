import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
import type { Payment } from "@hhousing/domain";
import type { ApiResult } from "@hhousing/api-contracts";
import { ListSkeleton } from "@/components/skeleton";
import { NetworkError } from "@/components/network-error";
import { getWithAuth } from "@/lib/api-client";

type MobilePaymentsOutput = { payments: Payment[] };

type PaymentFilter = "all" | "pending" | "paid";

type PaymentGroup = {
  year: string;
  months: Array<{
    monthKey: string;
    monthLabel: string;
    items: Payment[];
  }>;
};

const STATUS_LABEL: Record<Payment["status"], string> = {
  pending: "En attente",
  paid: "Payé",
  overdue: "En retard",
  cancelled: "Annulé"
};

const STATUS_BG: Record<Payment["status"], string> = {
  pending: "#FEF3C7",
  paid: "#DCFCE7",
  overdue: "#FEE2E2",
  cancelled: "#F3F4F6"
};

const STATUS_TEXT: Record<Payment["status"], string> = {
  pending: "#D97706",
  paid: "#16A34A",
  overdue: "#DC2626",
  cancelled: "#6B7280"
};

const MONTHS_LONG = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const MONTHS_SHORT = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sep", "Oct", "Nov", "Déc"
];

function formatAmount(amount: number, currency: string): string {
  const formatted = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount);
  return `${formatted.replace(/\u00A0|\s/g, ".")} ${currency}`;
}

function parseYmd(value: string): { year: number; month: number; day: number } {
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  return {
    year: parseInt(yearRaw ?? "0", 10),
    month: parseInt(monthRaw ?? "1", 10),
    day: parseInt(dayRaw ?? "1", 10)
  };
}

function formatDate(value: string): string {
  const { year, month, day } = parseYmd(value);
  const monthText = MONTHS_SHORT[Math.max(0, Math.min(11, month - 1))] ?? "";
  return `${String(day).padStart(2, "0")} ${monthText} ${year}`;
}

function monthLabelFromYmd(value: string): string {
  const { month } = parseYmd(value);
  return MONTHS_LONG[Math.max(0, Math.min(11, month - 1))] ?? "";
}

function paymentTitle(payment: Payment): string {
  if (payment.paymentKind === "rent") {
    return `Loyer ${monthLabelFromYmd(payment.dueDate)}`;
  }
  if (payment.paymentKind === "deposit") return "Caution";
  if (payment.paymentKind === "prorated_rent") return "Loyer proratisé";
  if (payment.paymentKind === "fee") return "Frais";
  return "Paiement";
}

function sortPaymentsDesc(left: Payment, right: Payment): number {
  if (left.dueDate > right.dueDate) return -1;
  if (left.dueDate < right.dueDate) return 1;
  return 0;
}

function getGroups(payments: Payment[]): PaymentGroup[] {
  const sorted = [...payments].sort(sortPaymentsDesc);
  const map = new Map<string, Map<string, Payment[]>>();

  for (const payment of sorted) {
    const { year, month } = parseYmd(payment.dueDate);
    const yearKey = String(year);
    const monthKey = `${yearKey}-${String(month).padStart(2, "0")}`;

    if (!map.has(yearKey)) {
      map.set(yearKey, new Map<string, Payment[]>());
    }

    const monthMap = map.get(yearKey);
    if (!monthMap) continue;

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, []);
    }

    monthMap.get(monthKey)?.push(payment);
  }

  return [...map.entries()]
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([year, monthsMap]) => {
      const months = [...monthsMap.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([monthKey, items]) => {
          const monthValue = Number(monthKey.slice(5, 7));
          const monthLabel = MONTHS_LONG[Math.max(0, Math.min(11, monthValue - 1))] ?? "";

          return {
            monthKey,
            monthLabel: monthLabel.toUpperCase(),
            items
          };
        });

      return { year, months };
    });
}

export default function PaymentsScreen(): React.ReactElement {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PaymentFilter>("all");

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setIsOffline(false);

    const result: ApiResult<MobilePaymentsOutput> = await getWithAuth<MobilePaymentsOutput>(
      "/api/mobile/payments"
    );

    if (!result.success) {
      if (result.code === "NETWORK_ERROR") {
        setIsOffline(true);
      }
      setError(result.error);
    } else {
      setPayments(result.data.payments);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const payablePayment = useMemo(() => {
    const dueList = payments
      .filter((payment) => payment.status === "pending" || payment.status === "overdue")
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    return dueList[0] ?? null;
  }, [payments]);

  const totalDue = useMemo(() => {
    return payments
      .filter((payment) => payment.status === "pending" || payment.status === "overdue")
      .reduce((sum, payment) => sum + payment.amount, 0);
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return payments.filter((payment) => {
      if (filter === "pending" && payment.status !== "pending" && payment.status !== "overdue") {
        return false;
      }
      if (filter === "paid" && payment.status !== "paid") {
        return false;
      }

      if (!normalized) {
        return true;
      }

      const haystack = [
        payment.dueDate,
        payment.chargePeriod ?? "",
        paymentTitle(payment),
        STATUS_LABEL[payment.status]
      ].join(" ").toLowerCase();

      return haystack.includes(normalized);
    });
  }, [filter, payments, search]);

  const groups = useMemo(() => getGroups(filteredPayments), [filteredPayments]);

  const hasOlderArchive = useMemo(() => {
    const years = payments.map((payment) => parseYmd(payment.dueDate).year);
    if (years.length === 0) return false;

    const latestYear = Math.max(...years);
    const oldestYear = Math.min(...years);
    return oldestYear < latestYear;
  }, [payments]);

  const cycleFilter = useCallback((): void => {
    if (filter === "all") {
      setFilter("pending");
      return;
    }

    if (filter === "pending") {
      setFilter("paid");
      return;
    }

    setFilter("all");
  }, [filter]);

  return (
    <SafeAreaView style={styles.root}>
      {isLoading ? (
        <View style={styles.content}>
          <ListSkeleton rows={5} />
        </View>
      ) : null}

      {!isLoading && error ? (
        <View style={styles.content}>
          {isOffline ? (
            <NetworkError onRetry={() => { void load(); }} />
          ) : (
            <View style={styles.notice}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retry} onPress={() => { void load(); }}>
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}

      {!isLoading && !error ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { void load(); }} tintColor="#0063FE" />}
        >
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>SOLDE TOTAL DÛ</Text>
            <Text style={styles.summaryAmount}>
              {formatAmount(totalDue, payablePayment?.currencyCode ?? "CDF")}
            </Text>
            <View style={styles.summaryActions}>
              <View style={styles.manualNoticeBox}>
                <Ionicons name="information-circle-outline" size={16} color="#0063FE" />
                <Text style={styles.manualNoticeText}>Paiement traité manuellement par l'administration.</Text>
              </View>
              <Pressable
                style={styles.historyBtn}
                onPress={() => { router.push("/(tabs)/account/documents"); }}
              >
                <Ionicons name="receipt-outline" size={18} color="#010A19" />
              </Pressable>
            </View>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <Ionicons name="search-outline" size={18} color="#9CA3AF" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Rechercher un paiement..."
                placeholderTextColor="#9CA3AF"
                style={styles.searchInput}
              />
            </View>
            <Pressable
              style={[styles.filterBtn, filter !== "all" && styles.filterBtnActive]}
              onPress={cycleFilter}
            >
              <Ionicons name="options-outline" size={18} color={filter === "all" ? "#010A19" : "#0063FE"} />
            </Pressable>
          </View>

          {groups.length === 0 ? (
            <View style={styles.notice}>
              <Text style={styles.emptyTitle}>Aucun paiement trouvé</Text>
              <Text style={styles.emptyText}>Essayez une autre recherche ou un autre filtre.</Text>
            </View>
          ) : (
            groups.map((group) => (
              <View key={group.year} style={styles.groupSection}>
                <Text style={styles.yearTitle}>{group.year}</Text>

                {group.months.map((monthGroup) => (
                  <View key={monthGroup.monthKey} style={styles.monthBlock}>
                    <Text style={styles.monthTitle}>{monthGroup.monthLabel}</Text>

                    {monthGroup.items.map((payment) => (
                      <View key={payment.id} style={styles.paymentCard}>
                        <View style={styles.paymentLeft}>
                          <View style={styles.paymentIconWrap}>
                            <Ionicons
                              name={payment.status === "paid" ? "checkmark-circle-outline" : "time-outline"}
                              size={18}
                              color="#0063FE"
                            />
                          </View>
                          <View style={styles.paymentTextBlock}>
                            <Text style={styles.paymentTitle}>{paymentTitle(payment)}</Text>
                            <Text style={styles.paymentDate}>{formatDate(payment.dueDate)}</Text>
                          </View>
                        </View>

                        <View style={styles.paymentRight}>
                          <Text style={styles.paymentAmount}>{formatAmount(payment.amount, payment.currencyCode)}</Text>
                          <View style={[styles.badge, { backgroundColor: STATUS_BG[payment.status] }]}>
                            <Text style={[styles.badgeText, { color: STATUS_TEXT[payment.status] }]}>
                              {STATUS_LABEL[payment.status]}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ))
          )}

          {hasOlderArchive ? (
            <View style={styles.archiveSection}>
              <View style={styles.archiveDivider} />
              <Text style={styles.archiveText}>Anciens paiements</Text>
              <Pressable onPress={() => { setSearch(""); setFilter("all"); }}>
                <Text style={styles.archiveLink}>Voir l'archive complète</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      ) : null}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F5F6FA"
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
    gap: 14
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#D4DAE7",
    borderRadius: 12,
    padding: 14,
    gap: 8
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.4
  },
  summaryAmount: {
    fontSize: 42,
    fontWeight: "700",
    color: "#010A19",
    lineHeight: 44
  },
  summaryActions: {
    flexDirection: "row",
    gap: 8
  },
  manualNoticeBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#BFD7FF",
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  manualNoticeText: {
    flex: 1,
    color: "#1E3A8A",
    fontSize: 12,
    fontWeight: "600"
  },
  historyBtn: {
    width: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D4DAE7",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center"
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  searchInputWrap: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D4DAE7",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#010A19",
    paddingVertical: 0
  },
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D4DAE7",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff"
  },
  filterBtnActive: {
    borderColor: "#93C5FD",
    backgroundColor: "#EFF6FF"
  },
  groupSection: {
    gap: 10
  },
  yearTitle: {
    color: "#0063FE",
    fontSize: 30,
    fontWeight: "700"
  },
  monthBlock: {
    gap: 8
  },
  monthTitle: {
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: "700",
    color: "#6B7280"
  },
  paymentCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D4DAE7",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  paymentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1
  },
  paymentIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E8F1FF",
    alignItems: "center",
    justifyContent: "center"
  },
  paymentTextBlock: {
    flex: 1,
    gap: 2
  },
  paymentTitle: {
    color: "#010A19",
    fontSize: 16,
    fontWeight: "700"
  },
  paymentDate: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "500"
  },
  paymentRight: {
    alignItems: "flex-end",
    gap: 6
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#010A19"
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700"
  },
  archiveSection: {
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    paddingBottom: 20
  },
  archiveDivider: {
    width: 56,
    height: 4,
    borderRadius: 99,
    backgroundColor: "#E5E7EB",
    marginBottom: 6
  },
  archiveText: {
    fontSize: 20,
    color: "#6B7280"
  },
  archiveLink: {
    color: "#0063FE",
    fontWeight: "700",
    fontSize: 24
  },
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D4DAE7",
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 8
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#010A19"
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280"
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 14
  },
  retry: {
    alignSelf: "flex-start",
    borderRadius: 8,
    backgroundColor: "#0063FE",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  retryText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13
  },
  
});