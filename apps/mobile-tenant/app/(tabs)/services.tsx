import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ScreenLoader } from "@/components/universal-loading-state";
import { getWithAuth, type ApiResult } from "@/lib/api-client";
import { ScreenShell } from "@/components/screen-shell";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { openWhatsAppMessage } from "@/lib/whatsapp";
import { fontSize, fontWeight, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

type ServiceProviderItem = {
  id: string;
  name: string;
  phone: string;
  whatsappPhone: string | null;
  description: string | null;
  city: string | null;
  quartier: string | null;
  categoryId: string;
  categoryName: string;
  isVerified: boolean;
  isPlatform: boolean;
  trustLabel: "verified" | "landlord_added";
};

type ServicesOutput = { providers: ServiceProviderItem[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeProvider(value: unknown, index: number): ServiceProviderItem {
  const raw = isRecord(value) ? value : {};
  const trustLabel = raw.trustLabel === "verified" ? "verified" : "landlord_added";

  return {
    id: asString(raw.id, `provider-${index}`),
    name: asString(raw.name, "—"),
    phone: asString(raw.phone),
    whatsappPhone: typeof raw.whatsappPhone === "string" ? raw.whatsappPhone : null,
    description: typeof raw.description === "string" ? raw.description : null,
    city: typeof raw.city === "string" ? raw.city : null,
    quartier: typeof raw.quartier === "string" ? raw.quartier : null,
    categoryId: asString(raw.categoryId),
    categoryName: asString(raw.categoryName, "—"),
    isVerified: raw.isVerified === true,
    isPlatform: raw.isPlatform === true,
    trustLabel
  };
}

export default function ServicesScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [providers, setProviders] = useState<ServiceProviderItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setIsOffline(false);

    const result: ApiResult<ServicesOutput> = await getWithAuth<ServicesOutput>("/api/mobile/services");

    if (!result.success) {
      if (result.code === "NETWORK_ERROR") setIsOffline(true);
      setError(result.error);
      setProviders([]);
    } else {
      setProviders((result.data.providers ?? []).map(normalizeProvider));
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, ServiceProviderItem[]>();
    for (const provider of providers) {
      const key = provider.categoryName || "—";
      const list = map.get(key) ?? [];
      list.push(provider);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [providers]);

  const selected = providers.find((provider) => provider.id === selectedId) ?? null;

  async function callPhone(phone: string): Promise<void> {
    const digits = phone.replace(/[^\d+]/g, "");
    if (!digits) return;
    await Linking.openURL(`tel:${digits}`);
  }

  async function openWhatsApp(phone: string): Promise<void> {
    await openWhatsAppMessage(t("services.whatsappPrefill"), phone);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingRoot} edges={["top"]}>
        <ScreenLoader />
      </SafeAreaView>
    );
  }

  return (
    <ScreenShell title={t("services.title")} subtitle={t("services.subtitle")}>
      {error ? (
        <ErrorState
          offline={isOffline}
          error={error}
          onRetry={() => {
            void load();
          }}
        />
      ) : null}

      {!error && providers.length === 0 ? (
        <EmptyState
          illustration="house"
          title={t("services.emptyTitle")}
          body={t("services.emptyBody")}
        />
      ) : null}

      {!error && providers.length > 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => {
                void load();
              }}
              tintColor={colors.brand}
            />
          }
        >
          {grouped.map(([category, items]) => (
            <View key={category} style={styles.section}>
              <Text style={styles.sectionTitle}>{category}</Text>
              {items.map((provider) => {
                const isOpen = selected?.id === provider.id;
                return (
                  <View key={provider.id} style={styles.card}>
                    <Pressable onPress={() => setSelectedId(isOpen ? null : provider.id)}>
                      <Text style={styles.name}>{provider.name}</Text>
                      <Text style={styles.badge}>
                        {provider.trustLabel === "verified"
                          ? t("services.verified")
                          : t("services.landlordAdded")}
                      </Text>
                      {(provider.quartier || provider.city) ? (
                        <Text style={styles.meta}>
                          {[provider.quartier, provider.city].filter(Boolean).join(", ")}
                        </Text>
                      ) : null}
                    </Pressable>

                    {isOpen ? (
                      <View style={styles.detail}>
                        {provider.description ? (
                          <Text style={styles.description}>{provider.description}</Text>
                        ) : null}
                        <Text style={styles.phone}>{provider.phone}</Text>
                        <View style={styles.actions}>
                          <Pressable
                            style={[styles.actionButton, styles.callButton]}
                            onPress={() => void callPhone(provider.phone)}
                          >
                            <Text style={styles.actionLabel}>{t("services.call")}</Text>
                          </Pressable>
                          {provider.whatsappPhone || provider.phone ? (
                            <Pressable
                              style={[styles.actionButton, styles.whatsappButton]}
                              onPress={() =>
                                void openWhatsApp(provider.whatsappPhone || provider.phone)
                              }
                            >
                              <Text style={styles.actionLabel}>{t("services.whatsapp")}</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      ) : null}
    </ScreenShell>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    loadingRoot: {
      flex: 1,
      backgroundColor: colors.background
    },
    content: {
      paddingBottom: 40,
      gap: 16
    },
    section: {
      gap: 10
    },
    sectionTitle: {
      fontSize: fontSize.secondary,
      fontWeight: fontWeight.bold,
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.4
    },
    card: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 6
    },
    name: {
      fontSize: fontSize.title,
      fontWeight: fontWeight.bold,
      color: colors.text
    },
    badge: {
      fontSize: fontSize.caption,
      color: colors.brand,
      fontWeight: fontWeight.semibold
    },
    meta: {
      fontSize: fontSize.secondary,
      color: colors.textMuted
    },
    detail: {
      marginTop: 10,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 10
    },
    description: {
      fontSize: fontSize.secondary,
      color: colors.text,
      lineHeight: 20
    },
    phone: {
      fontSize: fontSize.secondary,
      color: colors.textMuted
    },
    actions: {
      flexDirection: "row",
      gap: 8
    },
    actionButton: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center"
    },
    callButton: {
      backgroundColor: colors.brand
    },
    whatsappButton: {
      backgroundColor: "#128C7E"
    },
    actionLabel: {
      color: "#fff",
      fontWeight: fontWeight.bold,
      fontSize: fontSize.secondary
    }
  });
}
