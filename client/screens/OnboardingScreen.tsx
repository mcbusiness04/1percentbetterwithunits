import React, { useState, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, Dimensions, FlatList, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useUnits } from "@/lib/UnitsContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type OnboardingStep = "science" | "howto" | "paywall";

const SCIENCE_FACTS = [
  { icon: "zap", title: "Tiny Habits", description: "Start small. A 2-minute habit done daily beats a 2-hour habit you never start." },
  { icon: "repeat", title: "The Compound Effect", description: "1% better each day = 37x better in a year. Small actions compound into extraordinary results." },
  { icon: "target", title: "B = MAP", description: "Behavior = Motivation + Ability + Prompt. Make it easy, make it obvious, make it rewarding." },
];

const HOW_TO_STEPS = [
  { icon: "plus-circle", title: "Create habits", description: "Add what you want to track - exercise, reading, meditation, anything." },
  { icon: "mouse-pointer", title: "One tap to log", description: "Tap a habit to add units. That's it. No friction, no excuses." },
  { icon: "bar-chart-2", title: "See your progress", description: "Watch your blocks stack up. Green means goal met. Stay accountable." },
];

const FEATURES = [
  { icon: "layers", text: "Unlimited habits" },
  { icon: "trending-up", text: "Track every day, forever" },
  { icon: "bar-chart-2", text: "Deep insights & analytics" },
  { icon: "shield", text: "Stay accountable daily" },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { setIsPro, completeOnboarding } = useUnits();

  const [step, setStep] = useState<OnboardingStep>("science");
  const [selectedPlan, setSelectedPlan] = useState<"annual" | "monthly">("annual");

  const handleNext = useCallback(() => {
    if (step === "science") {
      setStep("howto");
    } else if (step === "howto") {
      setStep("paywall");
    }
  }, [step]);

  const handleSubscribe = useCallback(async () => {
    await setIsPro(true);
    await completeOnboarding();
  }, [setIsPro, completeOnboarding]);

  const handleRestorePurchases = useCallback(async () => {
    await setIsPro(true);
    await completeOnboarding();
  }, [setIsPro, completeOnboarding]);

  const handlePrivacy = useCallback(() => {
    Linking.openURL("https://example.com/privacy");
  }, []);

  const handleTerms = useCallback(() => {
    Linking.openURL("https://example.com/terms");
  }, []);

  const stepIndex = step === "science" ? 0 : step === "howto" ? 1 : 2;

  if (step === "science") {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: insets.top + Spacing["2xl"],
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.progressContainer}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                { backgroundColor: i <= stepIndex ? theme.accent : theme.border },
              ]}
            />
          ))}
        </View>

        <Animated.View entering={FadeIn.duration(500)} style={styles.centeredContent}>
          <View style={[styles.iconContainer, { backgroundColor: theme.accent + "20" }]}>
            <Feather name="book-open" size={48} color={theme.accent} />
          </View>

          <ThemedText type="h2" style={styles.title}>
            The Science of{"\n"}Habit Building
          </ThemedText>

          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Based on research by BJ Fogg and James Clear
          </ThemedText>

          <View style={styles.factsContainer}>
            {SCIENCE_FACTS.map((fact, index) => (
              <Animated.View
                key={fact.title}
                entering={FadeInDown.delay(200 + index * 100)}
                style={[styles.factCard, { backgroundColor: theme.backgroundDefault }]}
              >
                <View style={[styles.factIcon, { backgroundColor: theme.accent + "15" }]}>
                  <Feather name={fact.icon as any} size={20} color={theme.accent} />
                </View>
                <View style={styles.factText}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>{fact.title}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                    {fact.description}
                  </ThemedText>
                </View>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        <View style={styles.footer}>
          <Button onPress={handleNext}>Continue</Button>
        </View>
      </View>
    );
  }

  if (step === "howto") {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: insets.top + Spacing["2xl"],
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.progressContainer}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                { backgroundColor: i <= stepIndex ? theme.accent : theme.border },
              ]}
            />
          ))}
        </View>

        <Animated.View entering={FadeIn.duration(500)} style={styles.centeredContent}>
          <View style={[styles.iconContainer, { backgroundColor: theme.accent + "20" }]}>
            <Feather name="smartphone" size={48} color={theme.accent} />
          </View>

          <ThemedText type="h2" style={styles.title}>
            How Units Works
          </ThemedText>

          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Simple. Effective. Zero guilt.
          </ThemedText>

          <View style={styles.factsContainer}>
            {HOW_TO_STEPS.map((item, index) => (
              <Animated.View
                key={item.title}
                entering={FadeInDown.delay(200 + index * 100)}
                style={[styles.factCard, { backgroundColor: theme.backgroundDefault }]}
              >
                <View style={[styles.factIcon, { backgroundColor: theme.accent + "15" }]}>
                  <Feather name={item.icon as any} size={20} color={theme.accent} />
                </View>
                <View style={styles.factText}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>{item.title}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                    {item.description}
                  </ThemedText>
                </View>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        <View style={styles.footer}>
          <Button onPress={handleNext}>Get Started</Button>
        </View>
      </View>
    );
  }

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
      <View style={styles.progressContainer}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              { backgroundColor: i <= stepIndex ? theme.accent : theme.border },
            ]}
          />
        ))}
      </View>

      <Animated.View entering={FadeIn} style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: theme.accent + "20" }]}>
          <Feather name="star" size={48} color={theme.accent} />
        </View>

        <ThemedText type="h2" style={styles.title}>
          Unlock Your{"\n"}Full Potential
        </ThemedText>

        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          Start your journey to better habits with Units
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
                $11.99
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>/year</ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Just $1/month - Save 80%
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
          {selectedPlan === "annual" ? "Start for $11.99/year" : "Start for $4.99/month"}
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
          Payment will be charged to your Apple ID account at confirmation.
          Subscription automatically renews unless cancelled at least 24 hours before end of current period.
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
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  centeredContent: {
    flex: 1,
    alignItems: "center",
  },
  content: {
    flex: 1,
    alignItems: "center",
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  factsContainer: {
    width: "100%",
    gap: Spacing.md,
  },
  factCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  factIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  factText: {
    flex: 1,
  },
  features: {
    width: "100%",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  plansContainer: {
    width: "100%",
    gap: Spacing.md,
  },
  planCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    position: "relative",
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  bestValueBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  planPricing: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginBottom: 2,
  },
  checkCircle: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingTop: Spacing.lg,
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  disclaimer: {
    textAlign: "center",
    marginTop: Spacing.md,
    fontSize: 10,
    lineHeight: 14,
  },
});
