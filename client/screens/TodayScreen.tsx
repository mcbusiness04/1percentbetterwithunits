import React, { useMemo } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { HabitRow } from "@/components/HabitRow";
import { FallingBlocks, PILE_HEIGHT } from "@/components/FallingBlocks";
import { BadHabitsSection } from "@/components/BadHabitsSection";
import { Button } from "@/components/Button";
import { useUnits } from "@/lib/UnitsContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const STATS_STRIP_HEIGHT = 72;
const PILE_SECTION_GAP = Spacing.md;

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const {
    habits,
    loading,
    getEffectiveTodayTotalUnits,
    getHighestDailyTotal,
    getDailyProgress,
    getEffectiveUnitsDistribution,
  } = useUnits();

  const activeHabits = useMemo(
    () => habits.filter((h) => !h.isArchived),
    [habits]
  );

  const todayTotal = getEffectiveTodayTotalUnits();
  const highestTotal = getHighestDailyTotal();
  const dailyProgress = getDailyProgress();

  const progressMessage = useMemo(() => {
    if (activeHabits.length === 0) return null;
    
    // improvementPercent is a ratio (0.5 = 50% surplus beyond goals)
    // Only shows when ALL goals are met; otherwise it's 0
    const imp = dailyProgress.improvementPercent;
    const impPercent = imp * 100; // Convert ratio to percentage for display
    const formatted = impPercent % 1 === 0 ? `${Math.round(impPercent)}` : `${impPercent.toFixed(1)}`;
    
    if (impPercent > 0) {
      return `${formatted}% better`;
    }
    
    // No surplus yet (either goals not met, or just met exactly)
    return null;
  }, [dailyProgress, activeHabits.length]);

  // Use centralized effective distribution to ensure all counts match
  const todayBlocks = useMemo(() => {
    const effectiveDistribution = getEffectiveUnitsDistribution();
    
    const blocks: { id: string; color: string; isTimeBlock?: boolean }[] = [];
    activeHabits.forEach((habit) => {
      const count = effectiveDistribution[habit.id] || 0;
      for (let i = 0; i < count; i++) {
        blocks.push({
          id: `${habit.id}-${i}`,
          color: habit.color,
          isTimeBlock: habit.habitType === "time",
        });
      }
    });
    
    return blocks;
  }, [activeHabits, getEffectiveUnitsDistribution]);

  const bottomOffset = tabBarHeight + Spacing.lg;
  const overlayHeight = STATS_STRIP_HEIGHT + PILE_HEIGHT + PILE_SECTION_GAP;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.loadingContainer}>
          <ThemedText type="body">Loading...</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: overlayHeight + bottomOffset + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: overlayHeight + bottomOffset }}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h4">My Habits</ThemedText>
          </View>

          {activeHabits.length === 0 ? (
            <Animated.View 
              entering={FadeInDown.delay(200)}
              style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}
            >
              <View style={[styles.emptyIcon, { backgroundColor: theme.accent + "15" }]}>
                <Feather name="target" size={32} color={theme.accent} />
              </View>
              <ThemedText type="h4" style={styles.emptyTitle}>
                Ready to build a habit?
              </ThemedText>
              <ThemedText
                type="body"
                style={[styles.emptySubtitle, { color: theme.textSecondary }]}
              >
                Tap below to add your first habit and start tracking your progress.
              </ThemedText>
              <Button
                onPress={() => navigation.navigate("NewHabit")}
                style={styles.emptyButton}
              >
                Add your first habit
              </Button>
            </Animated.View>
          ) : (
            activeHabits.map((habit, index) => (
              <Animated.View key={habit.id} entering={FadeInDown.delay(100 + index * 50)}>
                <HabitRow habit={habit} />
              </Animated.View>
            ))
          )}
        </View>

        <BadHabitsSection />
      </ScrollView>

      <View style={[styles.pileSection, { bottom: bottomOffset }]}>
        <Animated.View 
          entering={FadeIn.delay(300)}
          style={[styles.statsStrip, { backgroundColor: theme.backgroundDefault }]}
        >
          <View style={styles.statItem}>
            <ThemedText 
              type="h3" 
              style={{ color: theme.accent }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {todayTotal.toLocaleString()}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Today
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <ThemedText 
              type="h3" 
              style={{ color: theme.text }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {highestTotal.toLocaleString()}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Best Day
            </ThemedText>
          </View>
          {progressMessage ? (
            <>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <ThemedText 
                  type="h3"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{ 
                    color: dailyProgress.allGoalsMet && !dailyProgress.hasBadHabits 
                      ? theme.success 
                      : dailyProgress.hasBadHabits 
                        ? theme.danger 
                        : theme.textSecondary,
                  }}
                >
                  {progressMessage}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Progress
                </ThemedText>
              </View>
            </>
          ) : null}
        </Animated.View>

        <View style={[styles.pileContainer, { backgroundColor: theme.backgroundDefault }]}>
          <FallingBlocks blocks={todayBlocks} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  emptyState: {
    padding: Spacing["2xl"],
    borderRadius: 20,
    alignItems: "center",
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptySubtitle: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  emptyButton: {
    minWidth: 180,
  },
  pileSection: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
  },
  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: STATS_STRIP_HEIGHT,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  pileContainer: {
    height: PILE_HEIGHT,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: "hidden",
  },
});
