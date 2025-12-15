import React, { useMemo, useCallback, useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, Alert, ActionSheetIOS, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { HabitWall } from "@/components/HabitWall";
import { Button } from "@/components/Button";
import { useUnits } from "@/lib/UnitsContext";
import { TodayStackParamList } from "@/navigation/TodayStackNavigator";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type ScreenRouteProp = RouteProp<TodayStackParamList, "HabitDetail">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HabitDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const { habitId } = route.params;

  const {
    habits,
    logs,
    addUnits,
    deleteHabit,
    updateHabit,
    getTodayUnits,
    getWeekUnits,
    getLifetimeUnits,
    canAddUnits,
    isPro,
  } = useUnits();

  const habit = useMemo(
    () => habits.find((h) => h.id === habitId),
    [habits, habitId]
  );

  const habitLogs = useMemo(
    () => logs.filter((l) => l.habitId === habitId),
    [logs, habitId]
  );

  const todayUnits = habit ? getTodayUnits(habit.id) : 0;
  const weekUnits = habit ? getWeekUnits(habit.id) : 0;
  const lifetimeUnits = habit ? getLifetimeUnits(habit.id) : 0;

  const avg7d = useMemo(() => {
    if (!habit) return 0;
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString().split("T")[0];
    const recentLogs = habitLogs.filter((l) => l.date >= dateStr);
    const total = recentLogs.reduce((sum, l) => sum + l.count, 0);
    return Math.round((total / 7) * 10) / 10;
  }, [habit, habitLogs]);

  const handleAddUnits = useCallback(
    async (count: number) => {
      if (!habit) return;
      if (!canAddUnits(count)) {
        navigation.navigate("Paywall", { reason: "units" });
        return;
      }
      await addUnits(habit.id, count);
    },
    [habit, addUnits, canAddUnits, navigation]
  );

  const handleMenuPress = useCallback(() => {
    if (!habit) return;

    const options = ["Cancel", "Archive Habit", "Delete Habit"];
    const destructiveButtonIndex = 2;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          destructiveButtonIndex,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            updateHabit(habit.id, { isArchived: true });
            navigation.goBack();
          } else if (buttonIndex === 2) {
            Alert.alert(
              "Delete Habit",
              "This will permanently delete this habit and all its data. This cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    await deleteHabit(habit.id);
                    navigation.goBack();
                  },
                },
              ]
            );
          }
        }
      );
    } else {
      Alert.alert("Habit Options", undefined, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive Habit",
          onPress: () => {
            updateHabit(habit.id, { isArchived: true });
            navigation.goBack();
          },
        },
        {
          text: "Delete Habit",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Delete Habit",
              "This will permanently delete this habit and all its data.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    await deleteHabit(habit.id);
                    navigation.goBack();
                  },
                },
              ]
            );
          },
        },
      ]);
    }
  }, [habit, updateHabit, deleteHabit, navigation]);

  const handleDayPress = useCallback((date: string, units: number) => {
    Alert.alert(
      formatDisplayDate(date),
      `${units} unit${units !== 1 ? "s" : ""} logged`
    );
  }, []);

  if (!habit) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.centerContent}>
          <ThemedText type="body">Habit not found</ThemedText>
        </View>
      </View>
    );
  }

  const currentUnitVersion = habit.unitVersions[habit.unitVersions.length - 1];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: habit.color + "20" }]}>
          <Feather name={habit.icon as any} size={32} color={habit.color} />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="h3">{habit.name}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {currentUnitVersion.unitName}
            {currentUnitVersion.unitDescriptor
              ? ` (${currentUnitVersion.unitSize} ${currentUnitVersion.unitDescriptor})`
              : ""}
          </ThemedText>
        </View>
        <Pressable onPress={handleMenuPress} style={styles.menuButton}>
          <Feather name="more-vertical" size={24} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.quickAddSection}>
        <Pressable
          onPress={() => handleAddUnits(1)}
          style={[styles.quickAddButton, { backgroundColor: habit.color }]}
        >
          <ThemedText type="body" style={{ color: "white", fontWeight: "600" }}>
            +1
          </ThemedText>
        </Pressable>
        {isPro ? (
          <Pressable
            onPress={() => handleAddUnits(5)}
            style={[styles.quickAddButton, { backgroundColor: habit.color + "CC" }]}
          >
            <ThemedText type="body" style={{ color: "white", fontWeight: "600" }}>
              +5
            </ThemedText>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => navigation.navigate("QuickAdd", { habitId: habit.id })}
          style={[styles.quickAddButton, { backgroundColor: theme.backgroundDefault }]}
        >
          <ThemedText type="body" style={{ fontWeight: "500" }}>
            Add...
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statChip, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Today
          </ThemedText>
          <ThemedText type="h4">{todayUnits}</ThemedText>
        </View>
        <View style={[styles.statChip, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Week
          </ThemedText>
          <ThemedText type="h4">{weekUnits}</ThemedText>
        </View>
        <View style={[styles.statChip, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Lifetime
          </ThemedText>
          <ThemedText type="h4">{lifetimeUnits}</ThemedText>
        </View>
        <View style={[styles.statChip, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Avg 7d
          </ThemedText>
          <ThemedText type="h4">{avg7d}</ThemedText>
        </View>
      </View>

      <View style={styles.wallSection}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Wall
        </ThemedText>
        <HabitWall habit={habit} logs={habitLogs} onDayPress={handleDayPress} />
      </View>

      {habit.softFloorPerWeek > 0 ? (
        <View style={[styles.softFloorInfo, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="target" size={18} color={theme.accent} />
          <View style={styles.softFloorText}>
            <ThemedText type="small" style={{ fontWeight: "500" }}>
              Soft floor: {habit.softFloorPerWeek} units/week
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Progress: {weekUnits}/{habit.softFloorPerWeek}
            </ThemedText>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  headerText: {
    flex: 1,
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  quickAddSection: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing["2xl"],
  },
  quickAddButton: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing["2xl"],
  },
  statChip: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  wallSection: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  softFloorInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  softFloorText: {
    flex: 1,
  },
});
