import React, { useCallback, useMemo } from "react";
import { View, ScrollView, StyleSheet, Pressable, Alert } from "react-native";
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
import { FallingBlocks, useFallingBlocks } from "@/components/FallingBlocks";
import { UndoToast } from "@/components/UndoToast";
import { Button } from "@/components/Button";
import { useUnits } from "@/lib/UnitsContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const {
    habits,
    loading,
    canAddHabit,
    getTodayTotalUnits,
    getHighestDailyTotal,
  } = useUnits();

  const { pileBlocks, currentFallingBlock, dropBlock } = useFallingBlocks();

  const activeHabits = useMemo(
    () => habits.filter((h) => !h.isArchived),
    [habits]
  );

  const todayTotal = getTodayTotalUnits();
  const highestTotal = getHighestDailyTotal();

  const handleAddPress = useCallback(() => {
    if (canAddHabit()) {
      navigation.navigate("NewHabit");
    } else {
      Alert.alert(
        "Limit Reached",
        "Free tier allows 3 habits. Upgrade to Pro for unlimited habits.",
        [
          { text: "Not Now", style: "cancel" },
          { text: "Upgrade", onPress: () => navigation.navigate("Paywall", { reason: "habits" }) },
        ]
      );
    }
  }, [canAddHabit, navigation]);

  const handleDropBlock = useCallback((color: string) => {
    dropBlock(color);
  }, [dropBlock]);

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
            paddingBottom: tabBarHeight + 200,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h4">My Habits</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Tap to add
            </ThemedText>
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
                onPress={handleAddPress}
                style={styles.emptyButton}
              >
                Add your first habit
              </Button>
            </Animated.View>
          ) : (
            activeHabits.map((habit, index) => (
              <Animated.View key={habit.id} entering={FadeInDown.delay(100 + index * 50)}>
                <HabitRow 
                  habit={habit} 
                  onDropBlock={handleDropBlock}
                />
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={[styles.pileSection, { bottom: tabBarHeight }]}>
        <Animated.View 
          entering={FadeIn.delay(300)}
          style={[styles.statsStrip, { backgroundColor: theme.backgroundDefault }]}
        >
          <View style={styles.statItem}>
            <ThemedText type="h3" style={{ color: theme.accent }}>
              {todayTotal}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Today
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <ThemedText type="h3" style={{ color: theme.text }}>
              {highestTotal}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Best Day
            </ThemedText>
          </View>
        </Animated.View>

        <View style={[styles.pileContainer, { backgroundColor: theme.backgroundDefault }]}>
          <FallingBlocks 
            blocks={pileBlocks} 
            newBlock={currentFallingBlock}
          />
        </View>
      </View>

      <Pressable
        onPress={handleAddPress}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: theme.accent,
            bottom: tabBarHeight + 180,
            opacity: pressed ? 0.8 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}
      >
        <Feather name="plus" size={24} color="white" />
      </Pressable>

      <UndoToast />
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
    height: 170,
  },
  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: Spacing.xl,
  },
  statItem: {
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  pileContainer: {
    flex: 1,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: "hidden",
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
