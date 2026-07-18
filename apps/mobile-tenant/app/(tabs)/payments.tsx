import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Payment } from "@/lib/domain-types";
import type { ApiResult } from "@/lib/api-client";
import { ListSkeleton } from "@/components/skeleton";
import { NetworkError } from "@/components/network-error";
import { getWithAuth, postWithAuth } from "@/lib/api-client";
import { openWhatsAppMessage } from "@/lib/whatsapp";
import {
  extractDrcNationalNumber,
  formatDrcNationalDisplay,
  nationalFromStoredPhone,
  toDrcE164,
  validateDrcPhoneInput
} from "@/lib/phone-input";

const LAST_PROVIDER_KEY = "hhousing.mobile.lastMoneyProvider";

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

type ProviderOption = {
  code: "AIRTEL_COD" | "ORANGE_COD" | "VODACOM_MPESA_COD";
  label: string;
};

type PaymentSuccessProof = {
  amount: number;
  currencyCode: string;
  providerLabel: string;
  paidAtLabel: string;
};

const PROVIDER_OPTIONS: ProviderOption[] = [
  { code: "AIRTEL_COD", label: "Airtel Money" },
  { code: "ORANGE_COD", label: "Orange Money" },
  { code: "VODACOM_MPESA_COD", label: "M-Pesa" }
];

type PaymentGroup = {
  year: string;
  months: Array<{
    monthKey: string;
    monthLabel: string;
    items: Payment[];
  }>;
};

const STATUS_LABEL: Record<Payment["status"], string> = {
  pending: "À payer",
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
  if (payment.paymentKind === "deposit") return "Garantie";
  if (payment.paymentKind === "prorated_rent") return "Loyer (prorata)";
  if (payment.paymentKind === "fee") return "Frais";
  return "Paiement";
}

function providerLabel(code: string): string {
  return PROVIDER_OPTIONS.find((option) => option.code === code)?.label ?? code;
}

function formatPaidAtLabel(iso: string | null): string {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleString("fr-FR");
  }
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function isProviderCode(value: string): value is ProviderOption["code"] {
  return PROVIDER_OPTIONS.some((option) => option.code === value);
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [isPayModalVisible, setIsPayModalVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderOption["code"]>("AIRTEL_COD");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [payStatusMessage, setPayStatusMessage] = useState<string | null>(null);
  const [successProof, setSuccessProof] = useState<PaymentSuccessProof | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    void (async (): Promise<void> => {
      try {
        const stored = await AsyncStorage.getItem(LAST_PROVIDER_KEY);
        if (stored && isProviderCode(stored)) {
          setSelectedProvider(stored);
        }
      } catch {
        // keep default provider
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const stopPolling = useCallback((): void => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const pollTransactionStatus = useCallback((transactionId: string): void => {
    stopPolling();

    pollTimerRef.current = setInterval(() => {
      void (async (): Promise<void> => {
        const result: ApiResult<PayBalanceStatusOutput> = await getWithAuth<PayBalanceStatusOutput>(
          `/api/mobile/payments/pay-balance/${transactionId}/status`
        );

        if (!result.success) {
          return;
        }

        if (result.data.status === "completed") {
          stopPolling();
          setIsPaying(false);
          setPayStatusMessage(null);
          setIsPayModalVisible(false);
          setSuccessProof({
            amount: result.data.totalAmount,
            currencyCode: result.data.currencyCode,
            providerLabel: providerLabel(result.data.provider),
            paidAtLabel: formatPaidAtLabel(result.data.completedAtIso)
          });
          await load();
          return;
        }

        if (result.data.status === "failed") {
          stopPolling();
          setIsPaying(false);
          setPayError(
            result.data.failureMessage
              ?? "Le paiement a échoué. Vérifiez votre solde Mobile Money et réessayez."
          );
          setPayStatusMessage(null);
        }
      })();
    }, 4000);
  }, [load, stopPolling]);

  const openPayModal = useCallback(async (): Promise<void> => {
    setPayError(null);
    setPayStatusMessage(null);
    setIsPayModalVisible(true);

    try {
      const stored = await AsyncStorage.getItem(LAST_PROVIDER_KEY);
      if (stored && isProviderCode(stored)) {
        setSelectedProvider(stored);
      }
    } catch {
      // keep current selection
    }

    const profileResult: ApiResult<ProfileOutput> = await getWithAuth<ProfileOutput>("/api/mobile/profile");
    if (profileResult.success && profileResult.data.tenant.phone) {
      setPhoneNumber(nationalFromStoredPhone(profileResult.data.tenant.phone));
    }
  }, []);

  const handlePayBalance = useCallback(async (): Promise<void> => {
    const phoneError = validateDrcPhoneInput(phoneNumber);
    if (phoneError) {
      setPayError(phoneError);
      return;
    }

    setIsPaying(true);
    setPayError(null);
    setPayStatusMessage("Confirmez sur votre téléphone Mobile Money…");

    try {
      await AsyncStorage.setItem(LAST_PROVIDER_KEY, selectedProvider);
    } catch {
      // non-blocking
    }

    const result: ApiResult<PayBalanceOutput> = await postWithAuth<PayBalanceOutput>(
      "/api/mobile/payments/pay-balance",
      {
        provider: selectedProvider,
        phoneNumber: toDrcE164(phoneNumber)
      }
    );

    if (!result.success) {
      setIsPaying(false);
      setPayStatusMessage(null);
      setPayError(
        result.code === "NETWORK_ERROR"
          ? "Pas de connexion. Vérifiez votre réseau et réessayez."
          : result.error
      );
      return;
    }

    setPayStatusMessage("Paiement en cours…");
    pollTransactionStatus(result.data.transactionId);
  }, [phoneNumber, pollTransactionStatus, selectedProvider]);

  const shareProofOnWhatsApp = useCallback(async (): Promise<void> => {
    if (!successProof) return;
    const message = [
      "Preuve de paiement — Haraka Property",
      `Montant : ${formatAmount(successProof.amount, successProof.currencyCode)}`,
      `Via : ${successProof.providerLabel}`,
      `Date : ${successProof.paidAtLabel}`,
      "Statut : Payé"
    ].join("\n");
    await openWhatsAppMessage(message);
  }, [successProof]);

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

  const filterHint =
    filter === "pending" ? "À payer" : filter === "paid" ? "Payés" : "Tous";

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
            <Text style={styles.summaryLabel}>À PAYER</Text>
            <Text style={styles.summaryAmount}>
              {formatAmount(totalDue, payablePayment?.currencyCode ?? "CDF")}
            </Text>
            {totalDue > 0 ? (
              <Pressable style={styles.payBtn} onPress={() => { void openPayModal(); }}>
                <Ionicons name="phone-portrait-outline" size={18} color="#ffffff" />
                <Text style={styles.payBtnText}>Payer maintenant</Text>
              </Pressable>
            ) : (
              <View style={styles.manualNoticeBox}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#16A34A" />
                <Text style={styles.manualNoticeText}>Aucun loyer à payer pour le moment.</Text>
              </View>
            )}
            <Text style={styles.payHint}>Airtel Money · Orange Money · M-Pesa</Text>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <Ionicons name="search-outline" size={18} color="#9CA3AF" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Rechercher un loyer…"
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
          {filter !== "all" ? (
            <Text style={styles.filterHint}>Filtre : {filterHint}</Text>
          ) : null}

          {payments.length === 0 ? (
            <View style={styles.notice}>
              <Text style={styles.emptyTitle}>Aucun paiement pour l&apos;instant</Text>
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
                          <Text style={styles.paymentAmount}>{formatAmount(payment.amount, payment.currencyCode ?? "CDF")}</Text>
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
                <Text style={styles.archiveLink}>Voir tout</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      ) : null}

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
            <Text style={styles.modalTitle}>Payer par Mobile Money</Text>
            <Text style={styles.modalSubtitle}>
              Montant : {formatAmount(totalDue, payablePayment?.currencyCode ?? "CDF")}
            </Text>

            <Text style={styles.fieldLabel}>Opérateur</Text>
            <View style={styles.providerRow}>
              {PROVIDER_OPTIONS.map((option) => (
                <Pressable
                  key={option.code}
                  style={[
                    styles.providerChip,
                    selectedProvider === option.code && styles.providerChipActive
                  ]}
                  onPress={() => { setSelectedProvider(option.code); }}
                  disabled={isPaying}
                >
                  <Text
                    style={[
                      styles.providerChipText,
                      selectedProvider === option.code && styles.providerChipTextActive
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Numéro Mobile Money</Text>
            <View style={styles.phoneInputWrap}>
              <Text style={styles.phonePrefix}>+243</Text>
              <TextInput
                value={formatDrcNationalDisplay(phoneNumber)}
                onChangeText={(nextValue) => setPhoneNumber(extractDrcNationalNumber(nextValue))}
                placeholder="990 000 000"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                style={styles.phoneInput}
                editable={!isPaying}
                maxLength={11}
              />
            </View>
            <Text style={styles.phoneHint}>9 chiffres après +243</Text>

            {payStatusMessage ? (
              <View style={styles.statusNotice}>
                {isPaying ? <ActivityIndicator color="#0063FE" /> : null}
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
                  {isPaying ? "En cours…" : "Confirmer"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={successProof !== null}
        animationType="fade"
        transparent
        onRequestClose={() => { setSuccessProof(null); }}
      >
        <View style={styles.proofBackdrop}>
          <View style={styles.proofCard}>
            <View style={styles.proofIconWrap}>
              <Ionicons name="checkmark-circle" size={56} color="#16A34A" />
            </View>
            <Text style={styles.proofTitle}>Payé</Text>
            <Text style={styles.proofSubtitle}>Votre paiement a bien été reçu.</Text>
            {successProof ? (
              <View style={styles.proofDetails}>
                <Text style={styles.proofAmount}>
                  {formatAmount(successProof.amount, successProof.currencyCode)}
                </Text>
                <Text style={styles.proofMeta}>Via {successProof.providerLabel}</Text>
                <Text style={styles.proofMeta}>{successProof.paidAtLabel}</Text>
              </View>
            ) : null}
            <Text style={styles.proofHint}>
              Faites une capture d&apos;écran ou envoyez cette preuve sur WhatsApp.
            </Text>
            <Pressable style={styles.proofWhatsAppBtn} onPress={() => { void shareProofOnWhatsApp(); }}>
              <Ionicons name="logo-whatsapp" size={20} color="#ffffff" />
              <Text style={styles.proofWhatsAppText}>Envoyer sur WhatsApp</Text>
            </Pressable>
            <Pressable style={styles.proofCloseBtn} onPress={() => { setSuccessProof(null); }}>
              <Text style={styles.proofCloseText}>Fermer</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    gap: 10
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
  payBtn: {
    borderRadius: 10,
    backgroundColor: "#0063FE",
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  payBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700"
  },
  payHint: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center"
  },
  manualNoticeBox: {
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  manualNoticeText: {
    flex: 1,
    color: "#166534",
    fontSize: 13,
    fontWeight: "600"
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
  filterHint: {
    marginTop: -6,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600"
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
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600"
  },
  archiveLink: {
    color: "#0063FE",
    fontWeight: "700",
    fontSize: 16
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
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(1, 10, 25, 0.45)",
    justifyContent: "flex-end"
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    gap: 12
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#010A19"
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
    borderColor: "#D4DAE7",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#ffffff"
  },
  providerChipActive: {
    borderColor: "#0063FE",
    backgroundColor: "#EFF6FF"
  },
  providerChipText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "600"
  },
  providerChipTextActive: {
    color: "#0063FE"
  },
  phoneInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#D4DAE7",
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 48,
    backgroundColor: "#ffffff"
  },
  phonePrefix: {
    color: "#010A19",
    fontSize: 16,
    fontWeight: "700"
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#010A19"
  },
  phoneHint: {
    marginTop: 4,
    color: "#9CA3AF",
    fontSize: 12
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
    borderColor: "#D4DAE7",
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
    color: "#ffffff",
    fontWeight: "700"
  },
  proofBackdrop: {
    flex: 1,
    backgroundColor: "rgba(1, 10, 25, 0.5)",
    justifyContent: "center",
    paddingHorizontal: 24
  },
  proofCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 10
  },
  proofIconWrap: {
    marginBottom: 4
  },
  proofTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#16A34A"
  },
  proofSubtitle: {
    fontSize: 15,
    color: "#374151",
    textAlign: "center"
  },
  proofDetails: {
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    marginBottom: 4
  },
  proofAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: "#010A19"
  },
  proofMeta: {
    fontSize: 14,
    color: "#6B7280"
  },
  proofHint: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 4
  },
  proofWhatsAppBtn: {
    marginTop: 8,
    width: "100%",
    borderRadius: 10,
    backgroundColor: "#128C7E",
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  proofWhatsAppText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700"
  },
  proofCloseBtn: {
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D4DAE7",
    paddingVertical: 12,
    alignItems: "center"
  },
  proofCloseText: {
    color: "#374151",
    fontWeight: "700",
    fontSize: 14
  }
});
