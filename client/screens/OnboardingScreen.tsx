import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useUnits } from "@/lib/UnitsContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface StarterHabit {
  id: string;
  name: string;
  icon: string;
  color: string;
  unitName: string;
  dailyGoal: number;
}

const STARTER_HABITS: StarterHabit[] = [
  {
    id: "reading",
    name: "Reading",
    icon: "book-open",
    color: "#5856D6",
    unitName: "pages",
    dailyGoal: 10,
  },
  {
    id: "exercise",
    name: "Exercise",
    icon: "activity",
    color: "#FF9500",
    unitName: "minutes",
    dailyGoal: 30,
  },
  {
    id: "meditation",
    name: "Meditation",
    icon: "sun",
    color: "#34C759",
    unitName: "minutes",
    dailyGoal: 10,
  },
  {
    id: "water",
    name: "Hydration",
    icon: "droplet",
    color: "#007AFF",
    unitName: "glasses",
    dailyGoal: 8,
  },
  {
    id: "writing",
    name: "Writing",
    icon: "edit-3",
    color: "#AF52DE",
    unitName: "words",
    dailyGoal: 500,
  },
  {
    id: "learning",
    name: "Learning",
    icon: "book",
    color: "#FF2D55",
    unitName: "lessons",
    dailyGoal: 1,
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { addHabit, completeOnboarding } = useUnits();

  const [step, setStep] = useState<"welcome" | "select" | "goal">("welcome");
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
      const success = await addHabit({
        name: selectedHabit.name,
        icon: selectedHabit.icon,
        color: selectedHabit.color,
        unitName: selectedHabit.unitName,
        dailyGoal: dailyGoal,
      });

      if (!success) {
        console.warn("Failed to add habit");
      }

      await completeOnboarding();
    } catch (error) {
      console.error("Failed to create habit:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedHabit, dailyGoal, addHabit, completeOnboarding, isSubmitting]);

  const handleSkip = useCallback(async () => {
    await completeOnboarding();
  }, [completeOnboarding]);

  const handleCustomHabit = useCallback(async () => {
    await completeOnboarding();
    setTimeout(() => {
      navigation.navigate("NewHabit");
    }, 100);
  }, [completeOnboarding, navigation]);

  if (step === "welcome") {
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
        <Animated.View entering={FadeIn} style={styles.welcomeContent}>
          <View style={[styles.iconContainer, { backgroundColor: theme.accent + "20" }]}>
            <Feather name="layers" size={56} color={theme.accent} />
          </View>
          <ThemedText type="h1" style={styles.welcomeTitle}>
            Welcome to Units
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}
          >
            Track your habits. See your progress. Every unit counts.
          </ThemedText>
        </Animated.View>

        <View style={styles.footer}>
          <Button onPress={() => setStep("select")}>Get Started</Button>
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
          <ThemedText type="h3">Pick a habit to start</ThemedText>
          <ThemedText
            type="body"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            You can add more later. Pick one to get started.
          </ThemedText>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.habitGrid}
          showsVerticalScrollIndicator={false}
        >
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
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  {habit.name}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Track {habit.unitName}
                </ThemedText>
              </Pressable>
            </Animated.View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={handleCustomHabit} style={styles.customButton}>
            <ThemedText type="body" style={{ color: theme.link }}>
              Create custom habit
            </ThemedText>
          </Pressable>
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Skip for now
            </ThemedText>
          </Pressable>
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
          <Pressable
            onPress={() => setStep("select")}
            style={styles.backButton}
          >
            <Feather name="chevron-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h3">Set your daily goal</ThemedText>
          <ThemedText
            type="body"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            How many {selectedHabit.unitName} do you want to track per day?
          </ThemedText>
        </View>

        <Animated.View 
          entering={FadeIn}
          style={[styles.goalCard, { backgroundColor: selectedHabit.color + "15" }]}
        >
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
              <ThemedText type="h1" style={{ color: selectedHabit.color }}>
                {dailyGoal}
              </ThemedText>
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
        </Animated.View>

        <View style={styles.footer}>
          <Button onPress={handleCreateHabit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Start Tracking"}
          </Button>
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
  welcomeContent: {
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
  welcomeTitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  welcomeSubtitle: {
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
    lineHeight: 24,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  backButton: {
    marginBottom: Spacing.md,
  },
  subtitle: {
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
  footer: {
    paddingTop: Spacing.lg,
    gap: Spacing.md,
    alignItems: "center",
  },
  customButton: {
    padding: Spacing.md,
  },
  skipButton: {
    padding: Spacing.sm,
  },
});
