import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme";

interface SkeletonBoxProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export function SkeletonBox({ width = "100%", height = 16, borderRadius = 8, style }: SkeletonBoxProps): React.ReactElement {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true })
      ])
    );
    anim.start();
    return () => { anim.stop(); };
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: colors.skeleton, opacity }, style]}
    />
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }): React.ReactElement {
  const { colors } = useTheme();

  return (
    <View style={listStyles.container}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[listStyles.row, { borderBottomColor: colors.border }]}>
          <View style={listStyles.rowMain}>
            <SkeletonBox width="55%" height={14} />
            <SkeletonBox width="35%" height={12} style={{ marginTop: 6 }} />
          </View>
          <SkeletonBox width={56} height={22} borderRadius={12} />
        </View>
      ))}
    </View>
  );
}

export function CardSkeleton(): React.ReactElement {
  const { colors } = useTheme();

  return (
    <View style={[cardStyles.card, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
      <SkeletonBox width="40%" height={13} />
      <SkeletonBox width="60%" height={28} style={{ marginTop: 8 }} />
      <SkeletonBox width="50%" height={13} style={{ marginTop: 8 }} />
    </View>
  );
}

export function ProfileSkeleton(): React.ReactElement {
  const { colors } = useTheme();

  return (
    <View style={profileStyles.container}>
      <View style={profileStyles.header}>
        <SkeletonBox width={64} height={64} borderRadius={32} />
        <View style={profileStyles.headerText}>
          <SkeletonBox width="50%" height={18} />
          <SkeletonBox width="70%" height={13} style={{ marginTop: 6 }} />
        </View>
      </View>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={[profileStyles.row, { borderBottomColor: colors.border }]}>
          <SkeletonBox width={20} height={20} borderRadius={4} />
          <SkeletonBox width="60%" height={14} style={{ marginLeft: 12 }} />
        </View>
      ))}
    </View>
  );
}

export function FormSkeleton({ fields = 3 }: { fields?: number }): React.ReactElement {
  return (
    <View style={formStyles.container}>
      {Array.from({ length: fields }).map((_, i) => (
        <View key={i} style={formStyles.field}>
          <SkeletonBox width="30%" height={12} />
          <SkeletonBox width="100%" height={44} borderRadius={10} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

const listStyles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1
  },
  rowMain: { flex: 1, marginRight: 12 }
});

const cardStyles = StyleSheet.create({
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1
  }
});

const profileStyles = StyleSheet.create({
  container: { padding: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  headerText: { flex: 1, marginLeft: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1
  }
});

const formStyles = StyleSheet.create({
  container: { padding: 16 },
  field: { marginBottom: 16 }
});
