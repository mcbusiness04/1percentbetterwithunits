import React, { useCallback, useMemo, useState } from "react";
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
    isPro,
    getTodayTotalUnits,
  } = useUnits();

  const { pileBlocks, currentFallingBlock, dropBlock, removeBlock } = useFallingBlocks();

  const activeHabits = useMemo(
    () => habits.filter((h) => !h.isArchived),
    [habits]
  );

  const todayTotal = getTodayTotalUnits();

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

  const handleRemoveBlock = useCallback((color: string) => {
    removeBlock(color);
  }, [removeBlock]);

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
            paddingBottom: tabBarHeight + 160,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <Animated.View 
          entering={FadeIn.delay(100)}
          style={[styles.summaryCard, { backgroundColor: theme.accent + "15" }]}
        >
          <View style={styles.summaryContent}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Today's Progress
            </ThemedText>
            <View style={styles.summaryRow}>
              <ThemedText type="h1" style={[styles.summaryNumber, { color: theme.accent }]}>
                {todayTotal}
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}>
                units logged
              </ThemedText>
            </View>
          </View>
          <View style={[styles.summaryIcon, { backgroundColor: theme.accent + "20" }]}>
            <Feather name="zap" size={28} color={theme.accent} />
          </View>
        </Animated.View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h4">My Habits</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Tap to add units
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
                  onRemoveBlock={handleRemoveBlock}
                />
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={[styles.blockPileContainer, { bottom: tabBarHeight }]}>
        <View style={[styles.pileBackground, { backgroundColor: theme.backgroundDefault }]}>
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
            bottom: tabBarHeight + 140,
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
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: 20,
    marginBottom: Spacing.xl,
  },
  summaryContent: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  summaryNumber: {
    fontSize: 42,
    fontWeight: "700",
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginBottom: Spacing["2xl"],
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
  blockPileContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 130,
  },
  pileBackground: {
    flex: 1,
    marginHorizontal: Spacing.lg,
    borderRadius: 20,
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
