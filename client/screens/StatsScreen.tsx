import React, { useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { useUnits } from "@/lib/UnitsContext";

type TimeRange = "daily" | "weekly" | "monthly";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_HEIGHT = 180;
const BAR_GAP = 8;

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { habits, logs, getTodayUnits, getWeekUnits, getMonthUnits } = useUnits();
  
  const [timeRange, setTimeRange] = useState<TimeRange>("daily");

  const activeHabits = useMemo(
    () => habits.filter((h) => !h.isArchived),
    [habits]
  );

  const dailyData = useMemo(() => {
    const days: { label: string; date: string; total: number }[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayLogs = logs.filter((l) => l.date === dateStr);
      const total = dayLogs.reduce((sum, l) => sum + l.count, 0);
      
      days.push({
        label: date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2),
        date: dateStr,
        total,
      });
    }
    return days;
  }, [logs]);

  const weeklyData = useMemo(() => {
    const weeks: { label: string; total: number }[] = [];
    const today = new Date();
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - (i * 7 + today.getDay()));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weekStartStr = weekStart.toISOString().split("T")[0];
      const weekEndStr = weekEnd.toISOString().split("T")[0];
      
      const weekLogs = logs.filter((l) => l.date >= weekStartStr && l.date <= weekEndStr);
      const total = weekLogs.reduce((sum, l) => sum + l.count, 0);
      
      weeks.push({
        label: `W${4 - i}`,
        total,
      });
    }
    return weeks;
  }, [logs]);

  const monthlyData = useMemo(() => {
    const months: { label: string; total: number }[] = [];
    const today = new Date();
    
    for (let i = 2; i >= 0; i--) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStart = monthDate.toISOString().split("T")[0];
      const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      const monthEnd = nextMonth.toISOString().split("T")[0];
      
      const monthLogs = logs.filter((l) => l.date >= monthStart && l.date <= monthEnd);
      const total = monthLogs.reduce((sum, l) => sum + l.count, 0);
      
      months.push({
        label: monthDate.toLocaleDateString("en-US", { month: "short" }),
        total,
      });
    }
    return months;
  }, [logs]);

  const chartData = timeRange === "daily" ? dailyData : timeRange === "weekly" ? weeklyData : monthlyData;
  const maxValue = Math.max(...chartData.map((d) => d.total), 1);

  const renderChart = () => {
    const barWidth = (SCREEN_WIDTH - Spacing.lg * 2 - (chartData.length - 1) * BAR_GAP) / chartData.length;
    
    return (
      <View style={styles.chartContainer}>
        <View style={styles.chart}>
          {chartData.map((item, index) => {
            const height = (item.total / maxValue) * CHART_HEIGHT;
            const isLast = timeRange === "daily" && index === chartData.length - 1;
            
            return (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barWrapper}>
                  <Animated.View
                    entering={FadeInDown.delay(index * 50).springify()}
                    style={[
                      styles.bar,
                      {
                        height: Math.max(height, 4),
                        backgroundColor: isLast ? theme.accent : theme.accent + "60",
                        borderRadius: 6,
                      },
                    ]}
                  />
                  {item.total > 0 ? (
                    <ThemedText
                      type="small"
                      style={[styles.barValue, { color: theme.textSecondary }]}
                    >
                      {item.total}
                    </ThemedText>
                  ) : null}
                </View>
                <ThemedText
                  type="small"
                  style={[
                    styles.barLabel,
                    { color: isLast ? theme.text : theme.textSecondary },
                  ]}
                >
                  {item.label}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

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
      <View style={styles.tabsContainer}>
        {(["daily", "weekly", "monthly"] as TimeRange[]).map((range) => (
          <Pressable
            key={range}
            onPress={() => setTimeRange(range)}
            style={[
              styles.tab,
              {
                backgroundColor: timeRange === range ? theme.accent : theme.backgroundDefault,
              },
            ]}
          >
            <ThemedText
              type="small"
              style={{
                color: timeRange === range ? "white" : theme.textSecondary,
                fontWeight: "600",
              }}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <Animated.View
        entering={FadeIn}
        style={[styles.chartCard, { backgroundColor: theme.backgroundDefault }]}
      >
        <ThemedText type="h4" style={styles.chartTitle}>
          {timeRange === "daily" ? "Last 7 Days" : timeRange === "weekly" ? "Last 4 Weeks" : "Last 3 Months"}
        </ThemedText>
        {renderChart()}
      </Animated.View>

      <View style={styles.habitStats}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Habit Breakdown
        </ThemedText>
        {activeHabits.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Add a habit to see stats here
            </ThemedText>
          </View>
        ) : (
          activeHabits.map((habit, index) => {
            const todayUnits = getTodayUnits(habit.id);
            const weekUnits = getWeekUnits(habit.id);
            const monthUnits = getMonthUnits(habit.id);
            const progress = habit.dailyGoal > 0 ? todayUnits / habit.dailyGoal : 0;

            return (
              <Animated.View
                key={habit.id}
                entering={FadeInDown.delay(index * 50)}
                style={[
                  styles.habitStatCard,
                  {
                    backgroundColor: habit.color + "15",
                    borderColor: habit.color + "30",
                  },
                ]}
              >
                <View style={styles.habitStatHeader}>
                  <View style={[styles.habitDot, { backgroundColor: habit.color }]} />
                  <ThemedText type="body" style={{ fontWeight: "600", flex: 1 }}>
                    {habit.name}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {todayUnits}/{habit.dailyGoal} today
                  </ThemedText>
                </View>
                <View style={styles.habitProgressBar}>
                  <View
                    style={[
                      styles.habitProgress,
                      {
                        width: `${Math.min(progress * 100, 100)}%`,
                        backgroundColor: progress >= 1 ? "#FFD700" : habit.color,
                      },
                    ]}
                  />
                </View>
                <View style={styles.habitStatRow}>
                  <View style={styles.statItem}>
                    <ThemedText type="h4" style={{ color: habit.color }}>
                      {weekUnits}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      this week
                    </ThemedText>
                  </View>
                  <View style={styles.statItem}>
                    <ThemedText type="h4" style={{ color: habit.color }}>
                      {monthUnits}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      this month
                    </ThemedText>
                  </View>
                </View>
              </Animated.View>
            );
          })
        )}
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
  tabsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignItems: "center",
  },
  chartCard: {
    padding: Spacing.lg,
    borderRadius: 20,
    marginBottom: Spacing.xl,
  },
  chartTitle: {
    marginBottom: Spacing.lg,
  },
  chartContainer: {
    height: CHART_HEIGHT + 60,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: CHART_HEIGHT,
  },
  barContainer: {
    flex: 1,
    alignItems: "center",
  },
  barWrapper: {
    height: CHART_HEIGHT,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  bar: {
    width: "70%",
    minWidth: 24,
  },
  barValue: {
    position: "absolute",
    top: -20,
    fontSize: 11,
  },
  barLabel: {
    marginTop: Spacing.sm,
    fontSize: 12,
  },
  habitStats: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: 16,
    alignItems: "center",
  },
  habitStatCard: {
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  habitStatHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  habitDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  habitProgressBar: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  habitProgress: {
    height: "100%",
    borderRadius: 4,
  },
  habitStatRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
});
