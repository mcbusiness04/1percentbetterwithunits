import React, { useCallback } from "react";
import { View, StyleSheet, Pressable, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useUnits } from "@/lib/UnitsContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type ScreenRouteProp = RouteProp<RootStackParamList, "Paywall">;

const FEATURES = [
  { icon: "layers", text: "Unlimited habits and history" },
  { icon: "grid", text: "Widgets + share cards" },
  { icon: "trending-up", text: "Rolling averages (30/90)" },
  { icon: "download", text: "Export + iCloud sync (soon)" },
];

const REASON_MESSAGES: Record<string, string> = {
  habits: "Free allows 2 habits. Pro unlocks unlimited.",
  tasks: "Free allows 3 tasks. Pro unlocks unlimited.",
  units: "Free allows 20 units/day. Pro unlocks unlimited.",
  history: "Free shows 7 days of history. Pro shows all time.",
  export: "Export is a Pro feature.",
  sync: "iCloud sync is a Pro feature.",
  settings: "Upgrade to unlock all features.",
};

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<ScreenRouteProp>();
  const { setIsPro } = useUnits();
  const { reason } = route.params;

  const handleStartPro = useCallback(async () => {
    await setIsPro(true);
    navigation.goBack();
  }, [setIsPro, navigation]);

  const handleNotNow = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRestorePurchases = useCallback(async () => {
    await setIsPro(true);
    navigation.goBack();
  }, [setIsPro, navigation]);

  const handlePrivacy = useCallback(() => {
    Linking.openURL("https://example.com/privacy");
  }, []);

  const handleTerms = useCallback(() => {
    Linking.openURL("https://example.com/terms");
  }, []);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      <Pressable onPress={handleNotNow} style={styles.closeButton}>
        <Feather name="x" size={24} color={theme.text} />
      </Pressable>

      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: theme.accentLight }]}>
          <Feather name="star" size={48} color={theme.accent} />
        </View>

        <ThemedText type="h2" style={styles.title}>
          Make Units unlimited.
        </ThemedText>

        {reason && REASON_MESSAGES[reason] ? (
          <ThemedText
            type="body"
            style={[styles.reasonText, { color: theme.textSecondary }]}
          >
            {REASON_MESSAGES[reason]}
          </ThemedText>
        ) : null}

        <View style={styles.features}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: theme.accentLight }]}>
                <Feather name={feature.icon as any} size={18} color={theme.accent} />
              </View>
              <ThemedText type="body">{feature.text}</ThemedText>
            </View>
          ))}
        </View>

        <View style={[styles.priceCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.priceOption}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              Annual
            </ThemedText>
            <ThemedText type="h4" style={{ color: theme.accent }}>
              $29.99/year
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              $2.50/month
            </ThemedText>
          </View>
          <View style={[styles.priceDivider, { backgroundColor: theme.border }]} />
          <View style={styles.priceOption}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              Monthly
            </ThemedText>
            <ThemedText type="h4">$4.99/month</ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Button onPress={handleStartPro}>Start Pro</Button>

        <Pressable onPress={handleNotNow} style={styles.notNowButton}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Not now
          </ThemedText>
        </Pressable>

        <View style={styles.legalRow}>
          <Pressable onPress={handleTerms}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Terms
            </ThemedText>
          </Pressable>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {" | "}
          </ThemedText>
          <Pressable onPress={handlePrivacy}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Privacy
            </ThemedText>
          </Pressable>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {" | "}
          </ThemedText>
          <Pressable onPress={handleRestorePurchases}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Restore
            </ThemedText>
          </Pressable>
        </View>

        <ThemedText
          type="small"
          style={[styles.disclaimer, { color: theme.textSecondary }]}
        >
          Subscription auto-renews unless cancelled. Manage in Apple ID Settings.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  closeButton: {
    position: "absolute",
    top: Spacing["5xl"],
    right: Spacing.lg,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  reasonText: {
    textAlign: "center",
    marginBottom: Spacing["2xl"],
  },
  features: {
    alignSelf: "stretch",
    marginBottom: Spacing["2xl"],
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  priceCard: {
    flexDirection: "row",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    alignSelf: "stretch",
  },
  priceOption: {
    flex: 1,
    padding: Spacing.lg,
    alignItems: "center",
  },
  priceDivider: {
    width: 1,
  },
  footer: {
    paddingTop: Spacing.lg,
  },
  notNowButton: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  disclaimer: {
    textAlign: "center",
    fontSize: 11,
  },
});
