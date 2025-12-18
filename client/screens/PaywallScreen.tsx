import React, { useCallback, useState } from "react";
import { View, StyleSheet, Pressable, Linking, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useUnits } from "@/lib/UnitsContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ScreenRouteProp = RouteProp<RootStackParamList, "Paywall">;

const FEATURES = [
  { icon: "layers", text: "Unlimited habits" },
  { icon: "trending-up", text: "Track every day, forever" },
  { icon: "bar-chart-2", text: "Deep insights & analytics" },
  { icon: "shield", text: "Stay accountable daily" },
];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const { setIsPro } = useUnits();
  const reason = route.params?.reason ?? "onboarding";

  const [selectedPlan, setSelectedPlan] = useState<"annual" | "monthly">("annual");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = useCallback(async () => {
    setLoading(true);
    try {
      await setIsPro(true);
      // Navigator will automatically switch to Main when isPro becomes true
      // Only call goBack if we're in a modal (can go back)
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to complete subscription. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [setIsPro, navigation]);

  const handleRestorePurchases = useCallback(async () => {
    setLoading(true);
    try {
      await setIsPro(true);
      // Navigator will automatically switch to Main when isPro becomes true
      // Only call goBack if we're in a modal (can go back)
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to restore purchases. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [setIsPro, navigation]);

  const handlePrivacy = useCallback(() => {
    Linking.openURL("https://example.com/privacy");
  }, []);

  const handleTerms = useCallback(() => {
    Linking.openURL("https://example.com/terms");
  }, []);

  const isFromOnboarding = reason === "onboarding";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.lg,
        },
      ]}
    >
      <Animated.View entering={FadeIn} style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: theme.accent + "20" }]}>
          <Feather name="star" size={48} color={theme.accent} />
        </View>

        <ThemedText type="h2" style={styles.title}>
          Unlock Your{"\n"}Full Potential
        </ThemedText>

        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          {isFromOnboarding
            ? "Start your journey to better habits with Units"
            : "Get unlimited access to track every habit, every day"}
        </ThemedText>

        <Animated.View entering={FadeInUp.delay(100)} style={styles.features}>
          {FEATURES.map((feature, index) => (
            <Animated.View key={feature.text} entering={FadeInDown.delay(150 + index * 50)} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: theme.accent + "15" }]}>
                <Feather name={feature.icon as any} size={18} color={theme.accent} />
              </View>
              <ThemedText type="body">{feature.text}</ThemedText>
            </Animated.View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300)} style={styles.plansContainer}>
          <Pressable
            onPress={() => setSelectedPlan("annual")}
            style={[
              styles.planCard,
              {
                backgroundColor: selectedPlan === "annual" ? theme.accent + "15" : theme.backgroundDefault,
                borderColor: selectedPlan === "annual" ? theme.accent : theme.border,
                borderWidth: selectedPlan === "annual" ? 2 : 1,
              },
            ]}
          >
            <View style={styles.planHeader}>
              <ThemedText type="body" style={{ fontWeight: "700" }}>
                Annual
              </ThemedText>
              <View style={[styles.bestValueBadge, { backgroundColor: theme.accent }]}>
                <ThemedText type="small" style={{ color: "white", fontWeight: "700", fontSize: 10 }}>
                  BEST VALUE
                </ThemedText>
              </View>
            </View>
            <View style={styles.planPricing}>
              <ThemedText type="h3" style={{ color: selectedPlan === "annual" ? theme.accent : theme.text }}>
                $9.99
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>/year</ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Just $0.83/month - Save 83%
            </ThemedText>
            {selectedPlan === "annual" ? (
              <View style={[styles.checkCircle, { backgroundColor: theme.accent }]}>
                <Feather name="check" size={14} color="white" />
              </View>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => setSelectedPlan("monthly")}
            style={[
              styles.planCard,
              {
                backgroundColor: selectedPlan === "monthly" ? theme.accent + "15" : theme.backgroundDefault,
                borderColor: selectedPlan === "monthly" ? theme.accent : theme.border,
                borderWidth: selectedPlan === "monthly" ? 2 : 1,
              },
            ]}
          >
            <ThemedText type="body" style={{ fontWeight: "700" }}>
              Monthly
            </ThemedText>
            <View style={styles.planPricing}>
              <ThemedText type="h3" style={{ color: selectedPlan === "monthly" ? theme.accent : theme.text }}>
                $4.99
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>/month</ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Flexible, cancel anytime
            </ThemedText>
            {selectedPlan === "monthly" ? (
              <View style={[styles.checkCircle, { backgroundColor: theme.accent }]}>
                <Feather name="check" size={14} color="white" />
              </View>
            ) : null}
          </Pressable>
        </Animated.View>
      </Animated.View>

      <View style={styles.footer}>
        <Button onPress={handleSubscribe}>
          {selectedPlan === "annual" ? "Start for $9.99/year" : "Start for $4.99/month"}
        </Button>

        <View style={styles.legalRow}>
          <Pressable onPress={handleTerms}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Terms
            </ThemedText>
          </Pressable>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>{" | "}</ThemedText>
          <Pressable onPress={handlePrivacy}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Privacy
            </ThemedText>
          </Pressable>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>{" | "}</ThemedText>
          <Pressable onPress={handleRestorePurchases}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Restore
            </ThemedText>
          </Pressable>
        </View>

        <ThemedText type="small" style={[styles.disclaimer, { color: theme.textSecondary }]}>
          Subscription auto-renews. Cancel anytime in App Store settings.
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
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.md,
    lineHeight: 36,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    lineHeight: 22,
  },
  features: {
    alignSelf: "stretch",
    marginBottom: Spacing.xl,
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
  plansContainer: {
    flexDirection: "row",
    gap: Spacing.md,
    alignSelf: "stretch",
  },
  planCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    position: "relative",
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  bestValueBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  planPricing: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    marginBottom: Spacing.xs,
  },
  checkCircle: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  disclaimer: {
    textAlign: "center",
    fontSize: 11,
  },
});
