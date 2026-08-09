import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { getWithAuth, type ApiResult } from "@/lib/api-client";
import { openWhatsAppMessage } from "@/lib/whatsapp";
import { fontSize, fontWeight, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

type ServiceProviderItem = {
  id: string;
  name: string;
  phone: string;
  whatsappPhone: string | null;
  categoryName: string;
};

type ServicesOutput = { providers: ServiceProviderItem[] };

const HOME_CONTACTS_LIMIT = 3;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeProvider(value: unknown, index: number): ServiceProviderItem {
  const raw = isRecord(value) ? value : {};
  return {
    id: asString(raw.id, `provider-${index}`),
    name: asString(raw.name, "—"),
    phone: asString(raw.phone),
    whatsappPhone: typeof raw.whatsappPhone === "string" ? raw.whatsappPhone : null,
    categoryName: asString(raw.categoryName, "—")
  };
}

async function callPhone(phone: string): Promise<void> {
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return;
  await Linking.openURL(`tel:${digits}`);
}

interface HomeContactsUtilesProps {
  refreshToken?: number;
}

export function HomeContactsUtiles({ refreshToken = 0 }: HomeContactsUtilesProps): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [providers, setProviders] = useState<ServiceProviderItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const result: ApiResult<ServicesOutput> = await getWithAuth<ServicesOutput>("/api/mobile/services");
    if (result.success) {
      setProviders((result.data.providers ?? []).map(normalizeProvider));
    } else {
      setProviders([]);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const visible = providers.slice(0, HOME_CONTACTS_LIMIT);
  const hasMore = providers.length > HOME_CONTACTS_LIMIT;

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("home.contactsTitle")}</Text>
        {providers.length > 0 ? (
          <Pressable onPress={() => { router.push("/(tabs)/services"); }} hitSlop={8}>
            <Text style={styles.link}>
              {hasMore ? t("home.contactsSeeAll") : t("home.contactsOpen")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {!loaded ? null : providers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="construct-outline" size={20} color={colors.textFaint} />
          <Text style={styles.emptyText}>{t("home.contactsEmpty")}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {visible.map((provider) => (
            <View key={provider.id} style={styles.card}>
              <View style={styles.cardCopy}>
                <Text style={styles.category} numberOfLines={1}>
                  {provider.categoryName}
                </Text>
                <Text style={styles.name} numberOfLines={1}>
                  {provider.name}
                </Text>
              </View>
              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionBtn, styles.callBtn]}
                  onPress={() => { void callPhone(provider.phone); }}
                  accessibilityRole="button"
                  accessibilityLabel={t("services.call")}
                >
                  <Ionicons name="call" size={16} color={colors.onBrand} />
                </Pressable>
                {provider.whatsappPhone || provider.phone ? (
                  <Pressable
                    style={[styles.actionBtn, styles.whatsappBtn]}
                    onPress={() => {
                      void openWhatsAppMessage(
                        t("services.whatsappPrefill"),
                        provider.whatsappPhone || provider.phone
                      );
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t("services.whatsapp")}
                  >
                    <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    block: {
      marginTop: 26,
      paddingHorizontal: 20,
      gap: 10
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    title: {
      fontSize: fontSize.body,
      fontWeight: "700",
      color: colors.text
    },
    link: {
      fontSize: fontSize.secondary,
      fontWeight: "600",
      color: colors.brand
    },
    list: {
      gap: 8
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 12
    },
    cardCopy: {
      flex: 1,
      gap: 2
    },
    category: {
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: colors.textFaint,
      textTransform: "uppercase",
      letterSpacing: 0.3
    },
    name: {
      fontSize: fontSize.secondary,
      fontWeight: "700",
      color: colors.text
    },
    actions: {
      flexDirection: "row",
      gap: 8
    },
    actionBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center"
    },
    callBtn: {
      backgroundColor: colors.brand
    },
    whatsappBtn: {
      backgroundColor: "#128C7E"
    },
    emptyCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: 14,
      paddingVertical: 14
    },
    emptyText: {
      flex: 1,
      fontSize: fontSize.secondary,
      lineHeight: 20,
      color: colors.textMuted
    }
  });
}
