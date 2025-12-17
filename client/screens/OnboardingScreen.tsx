import React, { useState, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, ScrollView, Dimensions, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown, FadeInUp, SlideInRight } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useUnits } from "@/lib/UnitsContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface StarterHabit {
  id: string;
  name: string;
  icon: string;
  color: string;
  unitName: string;
  dailyGoal: number;
}

const STARTER_HABITS: StarterHabit[] = [
  { id: "reading", name: "Reading", icon: "book-open", color: "#5856D6", unitName: "pages", dailyGoal: 10 },
  { id: "exercise", name: "Exercise", icon: "activity", color: "#FF9500", unitName: "minutes", dailyGoal: 30 },
  { id: "meditation", name: "Meditation", icon: "sun", color: "#34C759", unitName: "minutes", dailyGoal: 10 },
  { id: "water", name: "Hydration", icon: "droplet", color: "#007AFF", unitName: "glasses", dailyGoal: 8 },
  { id: "writing", name: "Writing", icon: "edit-3", color: "#AF52DE", unitName: "words", dailyGoal: 500 },
  { id: "learning", name: "Learning", icon: "book", color: "#FF2D55", unitName: "lessons", dailyGoal: 1 },
];

type OnboardingStep = "motivation" | "ability" | "commitment" | "select" | "goal" | "ready";

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { addHabit, completeOnboarding, isPro } = useUnits();

  const [step, setStep] = useState<OnboardingStep>("motivation");
  const [selectedHabit, setSelectedHabit] = useState<StarterHabit | null>(null);
  const [dailyGoal, setDailyGoal] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectHabit = useCallback((habit: StarterHabit) => {
    setSelectedHabit(habit);
    setDailyGoal(habit.dailyGoal);
    setStep("goal");
  }, []);

  const handleCreateHabit = useCallback(async () => {
    if (!selectedHabit || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await addHabit({
        name: selectedHabit.name,
        icon: selectedHabit.icon,
        color: selectedHabit.color,
        unitName: selectedHabit.unitName,
        dailyGoal: dailyGoal,
        tapIncrement: 1,
        habitType: "count",
      });
      setStep("ready");
    } catch (error) {
      console.error("Failed to create habit:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedHabit, dailyGoal, addHabit, isSubmitting]);

  const handleFinishOnboarding = useCallback(async () => {
    await completeOnboarding();
    if (!isPro) {
      navigation.navigate("Paywall", { reason: "onboarding" });
    }
  }, [completeOnboarding, isPro, navigation]);

  if (step === "motivation") {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: insets.top + Spacing["4xl"],
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <Animated.View entering={FadeIn.duration(600)} style={styles.centeredContent}>
          <View style={[styles.iconContainer, { backgroundColor: theme.accent + "20" }]}>
            <Feather name="target" size={56} color={theme.accent} />
          </View>
          
          <ThemedText type="h1" style={styles.title}>
            Become 1% better{"\n"}every single day
          </ThemedText>
          
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Small daily actions compound into extraordinary results.
            Track your habits, see your progress, stay accountable.
          </ThemedText>

          <Animated.View entering={FadeInUp.delay(300)} style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText type="h3" style={{ color: theme.accent }}>365x</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                improvement in a year
              </ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText type="h3" style={{ color: theme.accent }}>1 tap</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                to log progress
              </ThemedText>
            </View>
          </Animated.View>
        </Animated.View>

        <View style={styles.footer}>
          <View style={styles.progressDots}>
            {["motivation", "ability", "commitment", "select"].map((s, i) => (
              <View
                key={s}
                style={[
                  styles.dot,
                  { backgroundColor: step === s ? theme.accent : theme.border },
                ]}
              />
            ))}
          </View>
          <Button onPress={() => setStep("ability")}>Continue</Button>
        </View>
      </View>
    );
  }

  if (step === "ability") {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: insets.top + Spacing["4xl"],
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <Animated.View entering={SlideInRight.duration(400)} style={styles.centeredContent}>
          <View style={[styles.iconContainer, { backgroundColor: "#34C759" + "20" }]}>
            <Feather name="zap" size={56} color="#34C759" />
          </View>
          
          <ThemedText type="h1" style={styles.title}>
            So simple,{"\n"}it takes 2 seconds
          </ThemedText>
          
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            No complicated setup. No streaks to stress about.
            Just tap to add a unit whenever you make progress.
          </ThemedText>

          <Animated.View entering={FadeInUp.delay(200)} style={styles.demoContainer}>
            <View style={[styles.demoHabit, { backgroundColor: "#FF9500" + "15", borderColor: "#FF9500" + "40" }]}>
              <View style={[styles.demoIcon, { backgroundColor: "#FF9500" + "30" }]}>
                <Feather name="activity" size={24} color="#FF9500" />
              </View>
              <View style={styles.demoText}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>Exercise</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>2 of 5 minutes today</ThemedText>
              </View>
              <View style={[styles.tapBadge, { backgroundColor: "#34C759" }]}>
                <ThemedText type="small" style={{ color: "white", fontWeight: "600" }}>+1</ThemedText>
              </View>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.md }}>
              One tap = one unit logged
            </ThemedText>
          </Animated.View>
        </Animated.View>

        <View style={styles.footer}>
          <View style={styles.progressDots}>
            {["motivation", "ability", "commitment", "select"].map((s, i) => (
              <View
                key={s}
                style={[
                  styles.dot,
                  { backgroundColor: s === "motivation" || s === "ability" ? theme.accent : theme.border },
                ]}
              />
            ))}
          </View>
          <Button onPress={() => setStep("commitment")}>Continue</Button>
        </View>
      </View>
    );
  }

  if (step === "commitment") {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: insets.top + Spacing["4xl"],
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <Animated.View entering={SlideInRight.duration(400)} style={styles.centeredContent}>
          <View style={[styles.iconContainer, { backgroundColor: "#FF2D55" + "20" }]}>
            <Feather name="heart" size={56} color="#FF2D55" />
          </View>
          
          <ThemedText type="h1" style={styles.title}>
            Your future self{"\n"}will thank you
          </ThemedText>
          
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            People who track their habits are 42% more likely to achieve their goals.
            Start with just one habit - keep it tiny.
          </ThemedText>

          <Animated.View entering={FadeInUp.delay(200)} style={styles.benefitsContainer}>
            {[
              { icon: "check-circle", text: "Visual progress you can feel" },
              { icon: "shield", text: "No guilt - just growth" },
              { icon: "trending-up", text: "Build momentum daily" },
            ].map((benefit, index) => (
              <Animated.View
                key={benefit.text}
                entering={FadeInDown.delay(300 + index * 100)}
                style={styles.benefitRow}
              >
                <Feather name={benefit.icon as any} size={20} color={theme.accent} />
                <ThemedText type="body">{benefit.text}</ThemedText>
              </Animated.View>
            ))}
          </Animated.View>
        </Animated.View>

        <View style={styles.footer}>
          <View style={styles.progressDots}>
            {["motivation", "ability", "commitment", "select"].map((s, i) => (
              <View
                key={s}
                style={[
                  styles.dot,
                  { backgroundColor: s !== "select" ? theme.accent : theme.border },
                ]}
              />
            ))}
          </View>
          <Button onPress={() => setStep("select")}>Pick Your First Habit</Button>
        </View>
      </View>
    );
  }

  if (step === "select") {
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
        <View style={styles.header}>
          <Pressable onPress={() => setStep("commitment")} style={styles.backButton}>
            <Feather name="chevron-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h3">Start with one tiny habit</ThemedText>
          <ThemedText type="body" style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Pick something easy. You can add more later.
          </ThemedText>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.habitGrid} showsVerticalScrollIndicator={false}>
          {STARTER_HABITS.map((habit, index) => (
            <Animated.View key={habit.id} entering={FadeInDown.delay(index * 50)}>
              <Pressable
                onPress={() => handleSelectHabit(habit)}
                style={({ pressed }) => [
                  styles.habitCard,
                  {
                    backgroundColor: habit.color + "20",
                    borderColor: habit.color + "40",
                    opacity: pressed ? 0.8 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <View style={[styles.habitIcon, { backgroundColor: habit.color + "30" }]}>
                  <Feather name={habit.icon as any} size={24} color={habit.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>{habit.name}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {habit.dailyGoal} {habit.unitName} per day
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={20} color={theme.textSecondary} />
              </Pressable>
            </Animated.View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.progressDots}>
            {["motivation", "ability", "commitment", "select"].map((s) => (
              <View key={s} style={[styles.dot, { backgroundColor: theme.accent }]} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (step === "goal" && selectedHabit) {
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
        <View style={styles.header}>
          <Pressable onPress={() => setStep("select")} style={styles.backButton}>
            <Feather name="chevron-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h3">Set a tiny daily goal</ThemedText>
          <ThemedText type="body" style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Start small - you can always increase it later
          </ThemedText>
        </View>

        <Animated.View entering={FadeIn} style={[styles.goalCard, { backgroundColor: selectedHabit.color + "15" }]}>
          <View style={[styles.selectedHabitIcon, { backgroundColor: selectedHabit.color + "30" }]}>
            <Feather name={selectedHabit.icon as any} size={32} color={selectedHabit.color} />
          </View>
          <ThemedText type="h4">{selectedHabit.name}</ThemedText>

          <View style={styles.goalStepper}>
            <Pressable
              onPress={() => setDailyGoal(Math.max(1, dailyGoal - 1))}
              style={[styles.stepperButton, { backgroundColor: theme.backgroundDefault }]}
            >
              <Feather name="minus" size={24} color={theme.text} />
            </Pressable>
            <View style={styles.goalDisplay}>
              <ThemedText type="h1" style={{ color: selectedHabit.color }}>{dailyGoal}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {selectedHabit.unitName} per day
              </ThemedText>
            </View>
            <Pressable
              onPress={() => setDailyGoal(dailyGoal + 1)}
              style={[styles.stepperButton, { backgroundColor: theme.backgroundDefault }]}
            >
              <Feather name="plus" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.xl }}>
            Tip: Make it so easy you can't say no
          </ThemedText>
        </Animated.View>

        <View style={styles.footer}>
          <Button onPress={handleCreateHabit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create My Habit"}
          </Button>
        </View>
      </View>
    );
  }

  if (step === "ready") {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: insets.top + Spacing["4xl"],
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <Animated.View entering={FadeIn.duration(600)} style={styles.centeredContent}>
          <View style={[styles.iconContainer, { backgroundColor: "#34C759" + "20" }]}>
            <Feather name="check-circle" size={56} color="#34C759" />
          </View>
          
          <ThemedText type="h1" style={styles.title}>
            You're ready!
          </ThemedText>
          
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Your first habit is set up. Now let's unlock your full potential
            with unlimited tracking and insights.
          </ThemedText>

          {selectedHabit ? (
            <Animated.View 
              entering={FadeInUp.delay(200)}
              style={[styles.readyHabitCard, { backgroundColor: selectedHabit.color + "15", borderColor: selectedHabit.color + "40" }]}
            >
              <View style={[styles.habitIcon, { backgroundColor: selectedHabit.color + "30" }]}>
                <Feather name={selectedHabit.icon as any} size={24} color={selectedHabit.color} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>{selectedHabit.name}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Goal: {dailyGoal} {selectedHabit.unitName}/day
                </ThemedText>
              </View>
              <Feather name="check" size={20} color="#34C759" />
            </Animated.View>
          ) : null}
        </Animated.View>

        <View style={styles.footer}>
          <Button onPress={handleFinishOnboarding}>Continue to Units</Button>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  centeredContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: 40,
  },
  subtitle: {
    textAlign: "center",
    paddingHorizontal: Spacing.md,
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  statCard: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  demoContainer: {
    width: "100%",
    paddingHorizontal: Spacing.md,
  },
  demoHabit: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    gap: Spacing.md,
  },
  demoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  demoText: {
    flex: 1,
  },
  tapBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  benefitsContainer: {
    width: "100%",
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  backButton: {
    marginBottom: Spacing.md,
  },
  headerSubtitle: {
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  habitGrid: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  habitCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    gap: Spacing.md,
  },
  habitIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  goalCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["2xl"],
    borderRadius: 24,
    marginTop: Spacing.xl,
  },
  selectedHabitIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  goalStepper: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing["2xl"],
    gap: Spacing.xl,
  },
  stepperButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  goalDisplay: {
    alignItems: "center",
    minWidth: 100,
  },
  readyHabitCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    gap: Spacing.md,
    width: "100%",
    marginTop: Spacing.xl,
  },
  footer: {
    paddingTop: Spacing.lg,
    gap: Spacing.md,
    alignItems: "center",
  },
  progressDots: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
