import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { SoftFloorStepper } from "@/components/SoftFloorStepper";
import { useUnits } from "@/lib/UnitsContext";
import { generateId } from "@/lib/storage";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface StarterHabit {
  id: string;
  name: string;
  icon: string;
  color: string;
  unitName: string;
  unitSize: number;
  unitDescriptor?: string;
  suggestedFloor: number;
}

const STARTER_HABITS: StarterHabit[] = [
  {
    id: "reading",
    name: "Reading",
    icon: "book-open",
    color: "#5856D6",
    unitName: "page",
    unitSize: 10,
    unitDescriptor: "pages",
    suggestedFloor: 7,
  },
  {
    id: "exercise",
    name: "Exercise",
    icon: "activity",
    color: "#FF9500",
    unitName: "session",
    unitSize: 1,
    suggestedFloor: 5,
  },
  {
    id: "meditation",
    name: "Meditation",
    icon: "sun",
    color: "#34C759",
    unitName: "minute",
    unitSize: 5,
    unitDescriptor: "minutes",
    suggestedFloor: 7,
  },
  {
    id: "water",
    name: "Water",
    icon: "droplet",
    color: "#007AFF",
    unitName: "glass",
    unitSize: 1,
    suggestedFloor: 14,
  },
  {
    id: "writing",
    name: "Writing",
    icon: "edit-3",
    color: "#AF52DE",
    unitName: "word",
    unitSize: 100,
    unitDescriptor: "words",
    suggestedFloor: 5,
  },
  {
    id: "learning",
    name: "Learning",
    icon: "book",
    color: "#FF2D55",
    unitName: "lesson",
    unitSize: 1,
    suggestedFloor: 5,
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { addHabit, completeOnboarding } = useUnits();

  const [step, setStep] = useState<"welcome" | "select" | "floor">("welcome");
  const [selectedHabit, setSelectedHabit] = useState<StarterHabit | null>(null);
  const [softFloor, setSoftFloor] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectHabit = useCallback((habit: StarterHabit) => {
    setSelectedHabit(habit);
    setSoftFloor(habit.suggestedFloor);
    setStep("floor");
  }, []);

  const handleCreateHabit = useCallback(async () => {
    if (!selectedHabit || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const unitVersion = {
        id: generateId(),
        unitName: selectedHabit.unitName,
        unitSize: selectedHabit.unitSize,
        unitDescriptor: selectedHabit.unitDescriptor,
        effectiveStartDate: new Date().toISOString().split("T")[0],
      };

      const success = await addHabit({
        name: selectedHabit.name,
        icon: selectedHabit.icon,
        color: selectedHabit.color,
        softFloorPerWeek: softFloor,
        unitVersions: [unitVersion],
      });

      if (!success) {
        console.warn("Failed to add habit - quota may be exceeded");
      }

      await completeOnboarding();
    } catch (error) {
      console.error("Failed to create habit:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedHabit, softFloor, addHabit, completeOnboarding, isSubmitting]);

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
        <View style={styles.welcomeContent}>
          <View style={[styles.iconContainer, { backgroundColor: theme.accentLight }]}>
            <Feather name="layers" size={56} color={theme.accent} />
          </View>
          <ThemedText type="h1" style={styles.welcomeTitle}>
            Welcome to Units
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}
          >
            Track your effort, not perfection. Every unit counts.
          </ThemedText>
        </View>

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
          <ThemedText type="h3">Start with one habit</ThemedText>
          <ThemedText
            type="body"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            Pick something you want to track. You can always add more later.
          </ThemedText>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.habitGrid}
          showsVerticalScrollIndicator={false}
        >
          {STARTER_HABITS.map((habit) => (
            <Pressable
              key={habit.id}
              onPress={() => handleSelectHabit(habit)}
              style={({ pressed }) => [
                styles.habitCard,
                {
                  backgroundColor: theme.backgroundDefault,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={[styles.habitIcon, { backgroundColor: habit.color + "20" }]}>
                <Feather name={habit.icon as any} size={24} color={habit.color} />
              </View>
              <ThemedText type="body" style={{ fontWeight: "500" }}>
                {habit.name}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {habit.unitSize} {habit.unitName}
                {habit.unitDescriptor ? ` = ${habit.unitSize} ${habit.unitDescriptor}` : ""}
              </ThemedText>
            </Pressable>
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

  if (step === "floor" && selectedHabit) {
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
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h3">Set a soft floor</ThemedText>
          <ThemedText
            type="body"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            A soft floor is your minimum weekly pace. No pressure, just a gentle reminder.
          </ThemedText>
        </View>

        <View style={styles.floorContent}>
          <View style={[styles.selectedHabit, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.habitIcon, { backgroundColor: selectedHabit.color + "20" }]}>
              <Feather name={selectedHabit.icon as any} size={24} color={selectedHabit.color} />
            </View>
            <View>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {selectedHabit.name}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {selectedHabit.unitName}
              </ThemedText>
            </View>
          </View>

          <SoftFloorStepper value={softFloor} onChange={setSoftFloor} />

          <View style={[styles.floorExplanation, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="info" size={16} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
              If you fall below {softFloor} units/week, you will see a gentle yellow indicator. No red, no guilt.
            </ThemedText>
          </View>
        </View>

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
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
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
    maxWidth: 280,
  },
  header: {
    marginBottom: Spacing["2xl"],
  },
  backButton: {
    marginBottom: Spacing.lg,
  },
  subtitle: {
    marginTop: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  habitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  habitCard: {
    width: "47%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    gap: Spacing.sm,
  },
  habitIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  floorContent: {
    flex: 1,
    gap: Spacing["2xl"],
  },
  selectedHabit: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  floorExplanation: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  footer: {
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  customButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
});
