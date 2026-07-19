import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
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
import { useLocalSearchParams } from "expo-router";
import type { Payment } from "@/lib/domain-types";
import type { ApiResult } from "@/lib/api-client";
import { ListSkeleton } from "@/components/skeleton";
import { NetworkError } from "@/components/network-error";
import { FullScreenLoadingOverlay } from "@/components/universal-loading-state";
import { getWithAuth, postWithAuth } from "@/lib/api-client";
import {
  MobileMoneyLogo,
  MOBILE_MONEY_PROVIDERS,
  type MobileMoneyProviderCode
} from "@/components/mobile-money-logos";

type MobilePaymentsOutput = { payments: Payment[] };

type PayBalanceOutput = {
  transactionId: string;
  totalAmount: number;
  currencyCode: string;
  provider: string;
  status: "submitted" | "failed";
  paymentCount: number;
  pawapayStatus: string;
};

type PayBalanceStatusOutput = {
  transactionId: string;
  status: "pending" | "submitted" | "completed" | "failed";
  pawapayStatus: string | null;
  totalAmount: number;
  currencyCode: string;
  provider: string;
  failureCode: string | null;
  failureMessage: string | null;
  paymentCount: number;
  completedAtIso: string | null;
};

type ProfileOutput = { tenant: { phone: string | null } };

type PaymentFilter = "all" | "pending" | "paid";

type MonthGroup = {
  monthKey: string;
  monthLabel: string;
  items: Payment[];
};

const STATUS_BADGE_LABEL: Record<Payment["status"], string> = {
  pending: "À PAYER",
  paid: "PAYÉ",
  overdue: "À PAYER",
  cancelled: "ANNULÉ"
};

const STATUS_BADGE_BG: Record<Payment["status"], string> = {
  pending: "#FEF3C7",
  paid: "#DBEAFE",
  overdue: "#FEF3C7",
  cancelled: "#F3F4F6"
};

const STATUS_BADGE_TEXT: Record<Payment["status"], string> = {
  pending: "#D97706",
  paid: "#2563EB",
  overdue: "#D97706",
  cancelled: "#6B7280"
};

const MONTHS_LONG = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
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

function formatNumericDate(value: string): string {
  const { year, month, day } = parseYmd(value);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

function monthLabelFromYmd(value: string): string {
  const { month } = parseYmd(value);
  return MONTHS_LONG[Math.max(0, Math.min(11, month - 1))] ?? "";
}

function paymentTitle(payment: Payment): string {
  if (payment.paymentKind === "rent") {
    const { year } = parseYmd(payment.dueDate);
    return `Loyer ${monthLabelFromYmd(payment.dueDate)} ${year}`;
  }
  if (payment.paymentKind === "deposit") return "Garantie";
  if (payment.paymentKind === "prorated_rent") return "Loyer (prorata)";
  if (payment.paymentKind === "fee") return "Frais";
  return "Paiement";
}

function paymentMeta(payment: Payment): string {
  const date = formatNumericDate(payment.paidDate ?? payment.dueDate);
  if (payment.status === "paid") return `${date} • Payé`;
  if (payment.status === "overdue") return `${date} • En attente`;
  if (payment.status === "pending") return `${date} • En attente`;
  return `${date} • Annulé`;
}

function sortPaymentsDesc(left: Payment, right: Payment): number {
  if (left.dueDate > right.dueDate) return -1;
  if (left.dueDate < right.dueDate) return 1;
  return 0;
}

function getMonthGroups(payments: Payment[]): MonthGroup[] {
  const sorted = [...payments].sort(sortPaymentsDesc);
  const map = new Map<string, Payment[]>();

  for (const payment of sorted) {
    const { year, month } = parseYmd(payment.dueDate);
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    if (!map.has(monthKey)) {
      map.set(monthKey, []);
    }
    map.get(monthKey)?.push(payment);
  }

  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([monthKey, items]) => {
      const year = monthKey.slice(0, 4);
      const monthValue = Number(monthKey.slice(5, 7));
      const monthName = MONTHS_LONG[Math.max(0, Math.min(11, monthValue - 1))] ?? "";
      return {
        monthKey,
        monthLabel: `${monthName.toUpperCase()} ${year}`,
        items
      };
    });
}

export default function PaymentsScreen(): React.ReactElement {
  const params = useLocalSearchParams<{ pay?: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [isPayModalVisible, setIsPayModalVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<MobileMoneyProviderCode>("AIRTEL_COD");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [payStatusMessage, setPayStatusMessage] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoOpenedPayRef = useRef(false);

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
      setError(
        result.code === "NETWORK_ERROR"
          ? "Pas de connexion. Vérifiez votre réseau et réessayez."
          : result.error
      );
    } else {
      setPayments(result.data.payments);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const duePayments = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === "pending" || payment.status === "overdue")
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [payments]
  );

  const totalDue = useMemo(
    () => duePayments.reduce((sum, payment) => sum + payment.amount, 0),
    [duePayments]
  );

  const currencyCode = duePayments[0]?.currencyCode ?? "CDF";

  const stopPolling = useCallback((): void => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const pollTransactionStatus = useCallback((transactionId: string): void => {
    stopPolling();

    const checkOnce = async (): Promise<void> => {
      const result: ApiResult<PayBalanceStatusOutput> = await getWithAuth<PayBalanceStatusOutput>(
        `/api/mobile/payments/pay-balance/${transactionId}/status`
      );

      if (!result.success) {
        return;
      }

      if (result.data.status === "completed") {
        stopPolling();
        setIsPaying(false);
        setPayStatusMessage("Paiement confirmé. Merci !");
        setIsPayModalVisible(false);
        await load();
        return;
      }

      if (result.data.status === "failed") {
        stopPolling();
        setIsPaying(false);
        setPayError(result.data.failureMessage ?? "Le paiement a échoué.");
        setPayStatusMessage(null);
      }
    };

    void checkOnce();
    pollTimerRef.current = setInterval(() => {
      void checkOnce();
    }, 3000);
  }, [load, stopPolling]);

  const openPayModal = useCallback(async (): Promise<void> => {
    setPayError(null);
    setPayStatusMessage(null);
    setIsPayModalVisible(true);

    const profileResult: ApiResult<ProfileOutput> = await getWithAuth<ProfileOutput>("/api/mobile/profile");
    if (profileResult.success && profileResult.data.tenant.phone) {
      setPhoneNumber(profileResult.data.tenant.phone);
    }
  }, []);

  useEffect(() => {
    if (autoOpenedPayRef.current) return;
    if (params.pay !== "1") return;
    if (isLoading || totalDue <= 0) return;

    autoOpenedPayRef.current = true;
    void openPayModal();
  }, [isLoading, openPayModal, params.pay, totalDue]);

  const handlePayBalance = useCallback(async (): Promise<void> => {
    if (!phoneNumber.trim()) {
      setPayError("Veuillez saisir votre numéro mobile money.");
      return;
    }

    setIsPaying(true);
    setPayError(null);
    setPayStatusMessage("Traitement du paiement en cours...");

    const result: ApiResult<PayBalanceOutput> = await postWithAuth<PayBalanceOutput>(
      "/api/mobile/payments/pay-balance",
      {
        provider: selectedProvider,
        phoneNumber: phoneNumber.trim()
      }
    );

    if (!result.success) {
      setIsPaying(false);
      setPayStatusMessage(null);
      setPayError(result.error);
      return;
    }

    pollTransactionStatus(result.data.transactionId);
  }, [phoneNumber, pollTransactionStatus, selectedProvider]);

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
        paymentTitle(payment),
        paymentMeta(payment),
        STATUS_BADGE_LABEL[payment.status]
      ].join(" ").toLowerCase();

      return haystack.includes(normalized);
    });
  }, [filter, payments, search]);

  const groups = useMemo(() => getMonthGroups(filteredPayments), [filteredPayments]);

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

  const filterHint =
    filter === "pending" ? "À payer" : filter === "paid" ? "Payés" : "Tous";

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.content}>
          <ListSkeleton rows={6} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => { void load(); }}
            tintColor="#0063FE"
          />
        }
      >
        {totalDue > 0 ? (
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>SOLDE TOTAL DÛ</Text>
            <Text style={styles.balanceAmount}>{formatAmount(totalDue, currencyCode)}</Text>
            <Pressable style={styles.payCta} onPress={() => { void openPayModal(); }}>
              <Ionicons name="phone-portrait-outline" size={18} color="#FFFFFF" />
              <Text style={styles.payCtaText}>Payer maintenant</Text>
            </Pressable>
          </View>
        ) : null}

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
            <Ionicons
              name="options-outline"
              size={18}
              color={filter === "all" ? "#6B7280" : "#0063FE"}
            />
          </Pressable>
        </View>

        {filter !== "all" ? (
          <Text style={styles.filterHint}>Filtre : {filterHint}</Text>
        ) : null}

        {payments.length === 0 ? (
          <View style={styles.notice}>
            <Text style={styles.emptyTitle}>Aucun paiement</Text>
            <Text style={styles.emptyText}>
              Quand votre bailleur enregistrera un loyer, il apparaîtra ici.
            </Text>
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.notice}>
            <Text style={styles.emptyTitle}>Aucun résultat</Text>
            <Text style={styles.emptyText}>Essayez une autre recherche ou un autre filtre.</Text>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.monthKey} style={styles.monthBlock}>
              <Text style={styles.monthTitle}>{group.monthLabel}</Text>

              {group.items.map((payment) => {
                const paid = payment.status === "paid";

                return (
                  <View key={payment.id} style={styles.paymentCard}>
                    <View
                      style={[
                        styles.paymentIcon,
                        paid ? styles.paymentIconPaid : styles.paymentIconPending
                      ]}
                    >
                      <Ionicons
                        name={paid ? "checkmark-circle" : "time-outline"}
                        size={18}
                        color={paid ? "#2563EB" : "#D97706"}
                      />
                    </View>

                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentTitle} numberOfLines={1}>
                        {paymentTitle(payment)}
                      </Text>
                      <Text style={styles.paymentMeta} numberOfLines={1}>
                        {paymentMeta(payment)}
                      </Text>
                    </View>

                    <View style={styles.paymentRight}>
                      <Text style={styles.paymentAmount}>
                        {formatAmount(payment.amount, payment.currencyCode ?? "CDF")}
                      </Text>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: STATUS_BADGE_BG[payment.status] }
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            { color: STATUS_BADGE_TEXT[payment.status] }
                          ]}
                        >
                          {STATUS_BADGE_LABEL[payment.status]}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={isPayModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!isPaying) {
            setIsPayModalVisible(false);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Payer par mobile money</Text>
            <Text style={styles.modalSubtitle}>
              Montant total : {formatAmount(totalDue, currencyCode)}
            </Text>

            <Text style={styles.fieldLabel}>Opérateur</Text>
            <View style={styles.providerRow}>
              {MOBILE_MONEY_PROVIDERS.map((option) => {
                const active = selectedProvider === option.code;
                return (
                  <Pressable
                    key={option.code}
                    style={[styles.providerChip, active && styles.providerChipActive]}
                    onPress={() => { setSelectedProvider(option.code); }}
                    disabled={isPaying}
                  >
                    <MobileMoneyLogo code={option.code} size={28} />
                    <Text style={[styles.providerChipText, active && styles.providerChipTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Numéro mobile money</Text>
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="243973456789"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              style={styles.phoneInput}
              editable={!isPaying}
            />

            {payStatusMessage && !isPaying ? (
              <View style={styles.statusNotice}>
                <Text style={styles.statusNoticeText}>{payStatusMessage}</Text>
              </View>
            ) : null}

            {payError ? <Text style={styles.payErrorText}>{payError}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                disabled={isPaying}
                onPress={() => {
                  stopPolling();
                  setIsPayModalVisible(false);
                  setIsPaying(false);
                  setPayStatusMessage(null);
                  setPayError(null);
                }}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, isPaying && styles.confirmBtnDisabled]}
                disabled={isPaying}
                onPress={() => { void handlePayBalance(); }}
              >
                <Text style={styles.confirmBtnText}>
                  {isPaying ? "En cours..." : "Confirmer"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <FullScreenLoadingOverlay
        visible={isPaying}
        message="Traitement du paiement en cours..."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF"
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    gap: 12
  },
  balanceCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
    padding: 16,
    gap: 10
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.4
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: "700",
    color: "#111827"
  },
  payCta: {
    marginTop: 4,
    borderRadius: 10,
    backgroundColor: "#0063FE",
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  payCtaText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700"
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  searchInputWrap: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    paddingVertical: 0
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  filterBtnActive: {
    borderColor: "#93C5FD",
    backgroundColor: "#EFF6FF"
  },
  filterHint: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: -4
  },
  monthBlock: {
    gap: 8
  },
  monthTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: "700",
    color: "#9CA3AF",
    marginTop: 6
  },
  paymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  paymentIconPaid: {
    backgroundColor: "#DBEAFE"
  },
  paymentIconPending: {
    backgroundColor: "#FEF3C7"
  },
  paymentInfo: {
    flex: 1,
    gap: 2
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827"
  },
  paymentMeta: {
    fontSize: 12,
    color: "#9CA3AF"
  },
  paymentRight: {
    alignItems: "flex-end",
    gap: 4
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827"
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2
  },
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 14,
    gap: 8,
    marginTop: 8
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827"
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20
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
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(1, 10, 25, 0.45)",
    justifyContent: "flex-end"
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    gap: 12
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827"
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600"
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151"
  },
  providerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  providerChip: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    gap: 6,
    minWidth: 100
  },
  providerChipActive: {
    borderColor: "#0063FE",
    backgroundColor: "#EFF6FF"
  },
  providerChipText: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "600"
  },
  providerChipTextActive: {
    color: "#0063FE"
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827"
  },
  statusNotice: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFD7FF",
    backgroundColor: "#EFF6FF",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  statusNoticeText: {
    flex: 1,
    color: "#1E3A8A",
    fontSize: 13,
    fontWeight: "600"
  },
  payErrorText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "600"
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center"
  },
  cancelBtnText: {
    color: "#374151",
    fontWeight: "700"
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: "#0063FE",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center"
  },
  confirmBtnDisabled: {
    opacity: 0.7
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontWeight: "700"
  }
});
