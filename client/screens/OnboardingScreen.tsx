import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, StyleSheet, Pressable, Dimensions, FlatList, Linking, Alert, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeInLeft,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  withTiming,
  Easing,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useUnits } from "@/lib/UnitsContext";
import { useStoreKit } from "@/hooks/useStoreKit";
import { PRODUCT_IDS } from "@/lib/storekit";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type OnboardingStep = "welcome" | "science" | "benefits" | "demo" | "paywall";

const GRADIENT_COLORS = {
  welcome: ["#667eea", "#764ba2"] as const,
  science: ["#f093fb", "#f5576c"] as const,
  benefits: ["#4facfe", "#00f2fe"] as const,
  demo: ["#43e97b", "#38f9d7"] as const,
  paywall: ["#fa709a", "#fee140"] as const,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PulsingIcon({ name, color, size = 64, delay = 0 }: { name: string; color: string; size?: number; delay?: number }) {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Feather name={name as any} size={size} color={color} />
    </Animated.View>
  );
}

function FloatingBlocks() {
  const blocks = [
    { color: "#FF6B6B", size: 24, left: "15%", delay: 0 },
    { color: "#4ECDC4", size: 20, left: "35%", delay: 200 },
    { color: "#45B7D1", size: 28, left: "55%", delay: 400 },
    { color: "#96CEB4", size: 22, left: "75%", delay: 600 },
    { color: "#FFEAA7", size: 26, left: "25%", delay: 800 },
    { color: "#DDA0DD", size: 18, left: "65%", delay: 1000 },
  ];

  return (
    <View style={styles.floatingBlocksContainer}>
      {blocks.map((block, index) => (
        <FloatingBlock key={index} {...block} />
      ))}
    </View>
  );
}

function FloatingBlock({ color, size, left, delay }: { color: string; size: number; left: string; delay: number }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-20, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          position: "absolute",
          left: left as any,
          top: "30%",
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: 4,
          shadowColor: color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
        },
      ]}
    />
  );
}

function DemoHabitRow({ name, icon, color, units, goal, delay }: { name: string; icon: string; color: string; units: number; goal: number; delay: number }) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const [currentUnits, setCurrentUnits] = useState(units);
  
  const progress = currentUnits / goal;
  const statusColor = currentUnits === 0 ? "#FF4444" : currentUnits < goal ? "#FFB800" : "#34C759";

  const handleTap = useCallback(() => {
    scale.value = withSequence(
      withTiming(0.95, { duration: 50 }),
      withSpring(1, { damping: 10 })
    );
    setCurrentUnits(prev => Math.min(prev + 1, goal + 5));
  }, [goal]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInLeft.delay(delay).springify()}>
      <AnimatedPressable
        onPress={handleTap}
        style={[
          animatedStyle,
          styles.demoHabitRow,
          { backgroundColor: "rgba(255,255,255,0.15)", borderColor: statusColor },
        ]}
      >
        <View style={[styles.demoHabitIcon, { backgroundColor: color + "30" }]}>
          <Feather name={icon as any} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="body" style={{ fontWeight: "600", color: "white" }}>{name}</ThemedText>
          <View style={styles.demoProgressBar}>
            <View style={[styles.demoProgressFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: statusColor }]} />
          </View>
        </View>
        <View style={styles.demoUnitsContainer}>
          <ThemedText type="h3" style={{ color: statusColor }}>{currentUnits}</ThemedText>
          <ThemedText type="small" style={{ color: "rgba(255,255,255,0.7)" }}>/{goal}</ThemedText>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { setIsPro, completeOnboarding } = useUnits();
  const { products, loading: productsLoading, purchasing, iapAvailable, purchase, restore, getProductByType } = useStoreKit();

  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [selectedPlan, setSelectedPlan] = useState<"annual" | "monthly">("annual");

  const monthlyProduct = getProductByType("monthly");
  const yearlyProduct = getProductByType("yearly");

  const steps: OnboardingStep[] = ["welcome", "science", "benefits", "demo", "paywall"];
  const stepIndex = steps.indexOf(step);

  const handleNext = useCallback(() => {
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  }, [step]);

  const handleSubscribe = useCallback(async () => {
    const productId = selectedPlan === "annual" ? PRODUCT_IDS.YEARLY : PRODUCT_IDS.MONTHLY;
    
    if (Platform.OS === "web") {
      Alert.alert(
        "iOS Required",
        "Subscriptions are only available on iOS. Please download Units from the App Store to subscribe.",
        [{ text: "OK" }]
      );
      return;
    }
    
    if (!iapAvailable) {
      Alert.alert(
        "Development Build Required",
        "In-app purchases require a development or production build. This feature is not available in Expo Go.",
        [{ text: "OK" }]
      );
      return;
    }

    const result = await purchase(productId);
    
    if (result.success) {
      await setIsPro(true);
      await completeOnboarding();
    } else if (result.error && !result.error.includes("cancelled")) {
      Alert.alert("Purchase Failed", result.error);
    }
  }, [selectedPlan, iapAvailable, purchase, setIsPro, completeOnboarding]);

  const handleRestorePurchases = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "iOS Required",
        "Restore is only available on iOS. Please use the iOS app.",
        [{ text: "OK" }]
      );
      return;
    }
    
    if (!iapAvailable) {
      Alert.alert(
        "Development Build Required",
        "Restore requires a development or production build.",
        [{ text: "OK" }]
      );
      return;
    }

    const result = await restore();
    
    if (result.success && result.hasPremium) {
      await setIsPro(true);
      await completeOnboarding();
    } else if (result.success && !result.hasPremium) {
      Alert.alert("No Purchases Found", "We couldn't find any previous purchases to restore.");
    } else if (result.error) {
      Alert.alert("Restore Failed", result.error);
    }
  }, [iapAvailable, restore, setIsPro, completeOnboarding]);

  const handlePrivacy = useCallback(() => {
    Linking.openURL("https://example.com/privacy");
  }, []);

  const handleTerms = useCallback(() => {
    Linking.openURL("https://example.com/terms");
  }, []);

  const ProgressDots = () => (
    <View style={styles.progressContainer}>
      {steps.map((_, i) => (
        <Animated.View
          key={i}
          entering={FadeIn.delay(i * 100)}
          style={[
            styles.progressDot,
            {
              backgroundColor: i <= stepIndex ? "white" : "rgba(255,255,255,0.3)",
              width: i === stepIndex ? 24 : 8,
            },
          ]}
        />
      ))}
    </View>
  );

  if (step === "welcome") {
    return (
      <LinearGradient colors={GRADIENT_COLORS.welcome} style={styles.container}>
        <View style={[styles.safeArea, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }]}>
          <ProgressDots />
          
          <FloatingBlocks />

          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.centeredContent}>
            <View style={styles.welcomeIconContainer}>
              <PulsingIcon name="box" color="white" size={72} />
            </View>

            <Animated.Text entering={FadeInUp.delay(400)} style={styles.welcomeTitle}>
              Units
            </Animated.Text>

            <Animated.Text entering={FadeInUp.delay(500)} style={styles.welcomeSubtitle}>
              Build habits that stick.{"\n"}One tap at a time.
            </Animated.Text>

            <Animated.View entering={FadeInUp.delay(700)} style={styles.welcomeStats}>
              <View style={styles.welcomeStat}>
                <ThemedText type="h2" style={{ color: "white" }}>1%</ThemedText>
                <ThemedText type="small" style={{ color: "rgba(255,255,255,0.8)" }}>better daily</ThemedText>
              </View>
              <View style={styles.welcomeStatDivider} />
              <View style={styles.welcomeStat}>
                <ThemedText type="h2" style={{ color: "white" }}>37x</ThemedText>
                <ThemedText type="small" style={{ color: "rgba(255,255,255,0.8)" }}>growth yearly</ThemedText>
              </View>
            </Animated.View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(900)} style={styles.footer}>
            <Pressable onPress={handleNext} style={styles.nextButton}>
              <ThemedText type="body" style={{ color: GRADIENT_COLORS.welcome[0], fontWeight: "700" }}>
                Get Started
              </ThemedText>
              <Feather name="arrow-right" size={20} color={GRADIENT_COLORS.welcome[0]} />
            </Pressable>
          </Animated.View>
        </View>
      </LinearGradient>
    );
  }

  if (step === "science") {
    return (
      <LinearGradient colors={GRADIENT_COLORS.science} style={styles.container}>
        <View style={[styles.safeArea, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }]}>
          <ProgressDots />

          <Animated.View entering={FadeIn} style={styles.centeredContent}>
            <Animated.View entering={FadeInDown.delay(200)} style={styles.scienceIconContainer}>
              <PulsingIcon name="book-open" color="white" size={56} delay={200} />
            </Animated.View>

            <Animated.Text entering={FadeInUp.delay(300)} style={styles.sectionTitle}>
              The Science of{"\n"}Habit Building
            </Animated.Text>

            <View style={styles.scienceCards}>
              <Animated.View entering={FadeInLeft.delay(400).springify()} style={styles.scienceCard}>
                <View style={[styles.scienceCardIcon, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                  <Feather name="zap" size={24} color="white" />
                </View>
                <View style={styles.scienceCardText}>
                  <ThemedText type="body" style={{ fontWeight: "700", color: "white" }}>Tiny Habits</ThemedText>
                  <ThemedText type="small" style={{ color: "rgba(255,255,255,0.9)", marginTop: 4 }}>
                    2 minutes daily beats 2 hours you never start. Start impossibly small.
                  </ThemedText>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInRight.delay(500).springify()} style={styles.scienceCard}>
                <View style={[styles.scienceCardIcon, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                  <Feather name="trending-up" size={24} color="white" />
                </View>
                <View style={styles.scienceCardText}>
                  <ThemedText type="body" style={{ fontWeight: "700", color: "white" }}>Compound Effect</ThemedText>
                  <ThemedText type="small" style={{ color: "rgba(255,255,255,0.9)", marginTop: 4 }}>
                    1% better daily = 37x better in a year. Small wins compound massively.
                  </ThemedText>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInLeft.delay(600).springify()} style={styles.scienceCard}>
                <View style={[styles.scienceCardIcon, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                  <Feather name="target" size={24} color="white" />
                </View>
                <View style={styles.scienceCardText}>
                  <ThemedText type="body" style={{ fontWeight: "700", color: "white" }}>B = MAP</ThemedText>
                  <ThemedText type="small" style={{ color: "rgba(255,255,255,0.9)", marginTop: 4 }}>
                    Behavior = Motivation + Ability + Prompt. Make it easy, obvious, rewarding.
                  </ThemedText>
                </View>
              </Animated.View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(800)} style={styles.footer}>
            <Pressable onPress={handleNext} style={styles.nextButton}>
              <ThemedText type="body" style={{ color: GRADIENT_COLORS.science[0], fontWeight: "700" }}>
                Continue
              </ThemedText>
              <Feather name="arrow-right" size={20} color={GRADIENT_COLORS.science[0]} />
            </Pressable>
          </Animated.View>
        </View>
      </LinearGradient>
    );
  }

  if (step === "benefits") {
    return (
      <LinearGradient colors={GRADIENT_COLORS.benefits} style={styles.container}>
        <View style={[styles.safeArea, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }]}>
          <ProgressDots />

          <Animated.View entering={FadeIn} style={styles.centeredContent}>
            <Animated.View entering={FadeInDown.delay(200)} style={styles.benefitsIconContainer}>
              <PulsingIcon name="award" color="white" size={56} delay={200} />
            </Animated.View>

            <Animated.Text entering={FadeInUp.delay(300)} style={styles.sectionTitle}>
              Why Units Works
            </Animated.Text>

            <View style={styles.benefitsList}>
              {[
                { icon: "check-circle", title: "Zero Guilt", desc: "No streaks to break. Every day is fresh." },
                { icon: "smartphone", title: "One Tap Logging", desc: "Log progress in under 1 second." },
                { icon: "eye", title: "Visual Progress", desc: "Watch your blocks stack up daily." },
                { icon: "bar-chart-2", title: "Deep Insights", desc: "See trends, patterns, and growth." },
              ].map((benefit, index) => (
                <Animated.View
                  key={benefit.title}
                  entering={FadeInUp.delay(400 + index * 100).springify()}
                  style={styles.benefitRow}
                >
                  <View style={styles.benefitIcon}>
                    <Feather name={benefit.icon as any} size={24} color="white" />
                  </View>
                  <View style={styles.benefitText}>
                    <ThemedText type="body" style={{ fontWeight: "700", color: "white" }}>{benefit.title}</ThemedText>
                    <ThemedText type="small" style={{ color: "rgba(255,255,255,0.9)" }}>{benefit.desc}</ThemedText>
                  </View>
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(900)} style={styles.footer}>
            <Pressable onPress={handleNext} style={styles.nextButton}>
              <ThemedText type="body" style={{ color: GRADIENT_COLORS.benefits[0], fontWeight: "700" }}>
                See It In Action
              </ThemedText>
              <Feather name="arrow-right" size={20} color={GRADIENT_COLORS.benefits[0]} />
            </Pressable>
          </Animated.View>
        </View>
      </LinearGradient>
    );
  }

  if (step === "demo") {
    return (
      <LinearGradient colors={GRADIENT_COLORS.demo} style={styles.container}>
        <View style={[styles.safeArea, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }]}>
          <ProgressDots />

          <Animated.View entering={FadeIn} style={styles.centeredContent}>
            <Animated.View entering={FadeInDown.delay(200)}>
              <Feather name="smartphone" size={40} color="white" />
            </Animated.View>

            <Animated.Text entering={FadeInUp.delay(300)} style={[styles.sectionTitle, { marginBottom: Spacing.sm }]}>
              Try It Now
            </Animated.Text>

            <Animated.Text entering={FadeInUp.delay(400)} style={styles.demoSubtitle}>
              Tap the habits below to log progress
            </Animated.Text>

            <View style={styles.demoContainer}>
              <DemoHabitRow name="Reading" icon="book-open" color="#5856D6" units={3} goal={5} delay={500} />
              <DemoHabitRow name="Exercise" icon="activity" color="#FF9500" units={1} goal={3} delay={600} />
              <DemoHabitRow name="Meditation" icon="sun" color="#34C759" units={0} goal={2} delay={700} />
            </View>

            <Animated.View entering={FadeInUp.delay(900)} style={styles.demoHint}>
              <Feather name="info" size={16} color="rgba(255,255,255,0.8)" />
              <ThemedText type="small" style={{ color: "rgba(255,255,255,0.8)", marginLeft: Spacing.sm }}>
                Red = not started, Yellow = in progress, Green = goal met
              </ThemedText>
            </Animated.View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(1000)} style={styles.footer}>
            <Pressable onPress={handleNext} style={styles.nextButton}>
              <ThemedText type="body" style={{ color: GRADIENT_COLORS.demo[0], fontWeight: "700" }}>
                Start My Journey
              </ThemedText>
              <Feather name="arrow-right" size={20} color={GRADIENT_COLORS.demo[0]} />
            </Pressable>
          </Animated.View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={GRADIENT_COLORS.paywall} style={styles.container}>
      <View style={[styles.safeArea, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.lg }]}>
        <ProgressDots />

        <Animated.View entering={FadeIn} style={styles.paywallContent}>
          <Animated.View entering={FadeInDown.delay(200)} style={styles.paywallIconContainer}>
            <PulsingIcon name="star" color="white" size={48} />
          </Animated.View>

          <Animated.Text entering={FadeInUp.delay(300)} style={styles.paywallTitle}>
            Unlock Your{"\n"}Full Potential
          </Animated.Text>

          <Animated.View entering={FadeInUp.delay(400)} style={styles.paywallFeatures}>
            {[
              { icon: "infinity", text: "Unlimited habits" },
              { icon: "calendar", text: "Track every day, forever" },
              { icon: "pie-chart", text: "Advanced analytics" },
              { icon: "shield", text: "Daily accountability" },
            ].map((feature, index) => (
              <Animated.View key={feature.text} entering={FadeInLeft.delay(500 + index * 75)} style={styles.paywallFeatureRow}>
                <Feather name={feature.icon as any} size={18} color="white" />
                <ThemedText type="body" style={{ color: "white", marginLeft: Spacing.sm }}>{feature.text}</ThemedText>
              </Animated.View>
            ))}
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(700)} style={styles.plansContainer}>
            <Pressable
              onPress={() => setSelectedPlan("annual")}
              style={[
                styles.planCard,
                {
                  backgroundColor: selectedPlan === "annual" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
                  borderColor: selectedPlan === "annual" ? "white" : "rgba(255,255,255,0.3)",
                  borderWidth: 2,
                },
              ]}
            >
              <View style={styles.planHeader}>
                <ThemedText type="body" style={{ fontWeight: "700", color: "white" }}>Annual</ThemedText>
                <View style={styles.bestValueBadge}>
                  <ThemedText type="small" style={{ color: GRADIENT_COLORS.paywall[0], fontWeight: "700", fontSize: 10 }}>
                    BEST VALUE
                  </ThemedText>
                </View>
              </View>
              <View style={styles.planPricing}>
                <ThemedText type="h2" style={{ color: "white" }}>{yearlyProduct?.price || "$19.99"}</ThemedText>
                <ThemedText type="body" style={{ color: "rgba(255,255,255,0.8)" }}>/year</ThemedText>
              </View>
              <ThemedText type="small" style={{ color: "rgba(255,255,255,0.7)" }}>
                {yearlyProduct ? `Just ${(yearlyProduct.priceValue / 12).toFixed(2)}/month` : "Best value"}
              </ThemedText>
              {selectedPlan === "annual" && (
                <View style={styles.checkCircle}>
                  <Feather name="check" size={16} color={GRADIENT_COLORS.paywall[0]} />
                </View>
              )}
            </Pressable>

            <Pressable
              onPress={() => setSelectedPlan("monthly")}
              style={[
                styles.planCard,
                {
                  backgroundColor: selectedPlan === "monthly" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
                  borderColor: selectedPlan === "monthly" ? "white" : "rgba(255,255,255,0.3)",
                  borderWidth: 2,
                },
              ]}
            >
              <ThemedText type="body" style={{ fontWeight: "700", color: "white" }}>Monthly</ThemedText>
              <View style={styles.planPricing}>
                <ThemedText type="h2" style={{ color: "white" }}>{monthlyProduct?.price || "$4.99"}</ThemedText>
                <ThemedText type="body" style={{ color: "rgba(255,255,255,0.8)" }}>/month</ThemedText>
              </View>
              <ThemedText type="small" style={{ color: "rgba(255,255,255,0.7)" }}>Cancel anytime</ThemedText>
              {selectedPlan === "monthly" && (
                <View style={styles.checkCircle}>
                  <Feather name="check" size={16} color={GRADIENT_COLORS.paywall[0]} />
                </View>
              )}
            </Pressable>
          </Animated.View>
        </Animated.View>

        <View style={styles.paywallFooter}>
          <Pressable 
            onPress={handleSubscribe} 
            style={[styles.subscribeButton, purchasing && { opacity: 0.7 }]}
            disabled={purchasing}
          >
            {purchasing ? (
              <ActivityIndicator color={GRADIENT_COLORS.paywall[0]} />
            ) : (
              <ThemedText type="body" style={{ color: GRADIENT_COLORS.paywall[0], fontWeight: "700", fontSize: 17 }}>
                {selectedPlan === "annual" 
                  ? `Start for ${yearlyProduct?.price || "$19.99"}/year` 
                  : `Start for ${monthlyProduct?.price || "$4.99"}/month`}
              </ThemedText>
            )}
          </Pressable>

          <View style={styles.legalRow}>
            <Pressable onPress={handleTerms}>
              <ThemedText type="small" style={{ color: "rgba(255,255,255,0.7)" }}>Terms</ThemedText>
            </Pressable>
            <ThemedText type="small" style={{ color: "rgba(255,255,255,0.5)" }}>{" | "}</ThemedText>
            <Pressable onPress={handlePrivacy}>
              <ThemedText type="small" style={{ color: "rgba(255,255,255,0.7)" }}>Privacy</ThemedText>
            </Pressable>
            <ThemedText type="small" style={{ color: "rgba(255,255,255,0.5)" }}>{" | "}</ThemedText>
            <Pressable onPress={handleRestorePurchases}>
              <ThemedText type="small" style={{ color: "rgba(255,255,255,0.7)" }}>Restore</ThemedText>
            </Pressable>
          </View>

          <ThemedText type="small" style={styles.disclaimer}>
            Payment charged to Apple ID. Auto-renews unless cancelled 24hrs before period ends.
          </ThemedText>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  progressDot: {
    height: 8,
    borderRadius: 4,
  },
  centeredContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingBlocksContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  welcomeIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  welcomeTitle: {
    fontSize: 56,
    fontWeight: "800",
    color: "white",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  welcomeSubtitle: {
    fontSize: 20,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    lineHeight: 28,
    marginBottom: Spacing["2xl"],
  },
  welcomeStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  welcomeStat: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  welcomeStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  footer: {
    paddingTop: Spacing.lg,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  scienceIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "white",
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  scienceCards: {
    width: "100%",
    gap: Spacing.md,
  },
  scienceCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  scienceCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  scienceCardText: {
    flex: 1,
  },
  benefitsIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  benefitsList: {
    width: "100%",
    gap: Spacing.md,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: {
    flex: 1,
  },
  demoSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  demoContainer: {
    width: "100%",
    gap: Spacing.md,
  },
  demoHabitRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    gap: Spacing.md,
  },
  demoHabitIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  demoProgressBar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
    marginTop: 6,
    overflow: "hidden",
  },
  demoProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  demoUnitsContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  demoHint: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xl,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  paywallContent: {
    flex: 1,
    alignItems: "center",
  },
  paywallIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  paywallTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "white",
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  paywallFeatures: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  paywallFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
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
    backgroundColor: "white",
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  paywallFooter: {
    paddingTop: Spacing.md,
  },
  subscribeButton: {
    backgroundColor: "white",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  disclaimer: {
    textAlign: "center",
    marginTop: Spacing.sm,
    fontSize: 10,
    lineHeight: 14,
    color: "rgba(255,255,255,0.6)",
  },
});
