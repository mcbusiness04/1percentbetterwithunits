import React, { useMemo } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { StatCard } from "@/components/StatCard";
import { useUnits } from "@/lib/UnitsContext";

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const {
    habits,
    logs,
    getTodayTotalUnits,
    getWeekTotalUnits,
    getLifetimeTotalUnits,
    getWeekUnits,
    isPro,
  } = useUnits();

  const todayUnits = getTodayTotalUnits();
  const weekUnits = getWeekTotalUnits();
  const lifetimeUnits = getLifetimeTotalUnits();

  const activeHabits = useMemo(
    () => habits.filter((h) => !h.isArchived),
    [habits]
  );

  const avgPerDay = useMemo(() => {
    if (logs.length === 0) return 0;
    const dates = [...new Set(logs.map((l) => l.date))];
    const totalUnits = logs.reduce((sum, l) => sum + l.count, 0);
    return Math.round((totalUnits / Math.max(dates.length, 1)) * 10) / 10;
  }, [logs]);

  const avg7d = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString().split("T")[0];
    const recentLogs = logs.filter((l) => l.date >= dateStr);
    const total = recentLogs.reduce((sum, l) => sum + l.count, 0);
    return Math.round((total / 7) * 10) / 10;
  }, [logs]);

  const avg30d = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split("T")[0];
    const recentLogs = logs.filter((l) => l.date >= dateStr);
    const total = recentLogs.reduce((sum, l) => sum + l.count, 0);
    return Math.round((total / 30) * 10) / 10;
  }, [logs]);

  const avg90d = useMemo(() => {
    const now = new Date();
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const dateStr = ninetyDaysAgo.toISOString().split("T")[0];
    const recentLogs = logs.filter((l) => l.date >= dateStr);
    const total = recentLogs.reduce((sum, l) => sum + l.count, 0);
    return Math.round((total / 90) * 10) / 10;
  }, [logs]);

  const topHabitThisWeek = useMemo(() => {
    if (activeHabits.length === 0) return null;
    let topHabit = activeHabits[0];
    let topUnits = getWeekUnits(topHabit.id);

    activeHabits.forEach((habit) => {
      const units = getWeekUnits(habit.id);
      if (units > topUnits) {
        topHabit = habit;
        topUnits = units;
      }
    });

    return topUnits > 0 ? { habit: topHabit, units: topUnits } : null;
  }, [activeHabits, getWeekUnits]);

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
      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          This Week
        </ThemedText>
        <View style={[styles.weekCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.weekRow}>
            <View style={styles.weekStat}>
              <ThemedText type="h2" style={{ color: theme.accent }}>
                {weekUnits}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                units this week
              </ThemedText>
            </View>
            <View style={styles.weekStat}>
              <ThemedText type="h2">{avgPerDay}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                avg/day
              </ThemedText>
            </View>
          </View>
          {topHabitThisWeek ? (
            <View style={[styles.topHabit, { borderTopColor: theme.border }]}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Top habit
              </ThemedText>
              <View style={styles.topHabitRow}>
                <View
                  style={[
                    styles.topHabitDot,
                    { backgroundColor: topHabitThisWeek.habit.color },
                  ]}
                />
                <ThemedText type="body" style={{ fontWeight: "500" }}>
                  {topHabitThisWeek.habit.name}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {topHabitThisWeek.units} units
                </ThemedText>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Rolling Averages
        </ThemedText>
        <View style={styles.statsGrid}>
          <StatCard title="7-day avg" value={avg7d} subtitle="units/day" />
          <StatCard
            title="30-day avg"
            value={avg30d}
            subtitle="units/day"
            blurred={!isPro}
          />
          <StatCard
            title="90-day avg"
            value={avg90d}
            subtitle="units/day"
            blurred={!isPro}
          />
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          All Time
        </ThemedText>
        <View style={styles.statsGrid}>
          <StatCard
            title="Lifetime units"
            value={lifetimeUnits}
            color={theme.accent}
          />
          <StatCard
            title="Active habits"
            value={activeHabits.length}
          />
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Today
        </ThemedText>
        <View style={[styles.todayCard, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h1" style={{ color: theme.accent }}>
            {todayUnits}
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            units logged today
          </ThemedText>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  weekCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  weekStat: {
    alignItems: "center",
  },
  topHabit: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  topHabitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  topHabitDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statsGrid: {
    gap: Spacing.md,
  },
  todayCard: {
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
});
