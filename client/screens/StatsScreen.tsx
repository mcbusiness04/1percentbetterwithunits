import React, { useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { useUnits } from "@/lib/UnitsContext";

type TimeRange = "week" | "month" | "year";

const SCREEN_WIDTH = Dimensions.get("window").width;
const GREEN = "#06D6A0";
const RED = "#EF476F";
const GOLD = "#FFD700";

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { habits, logs, badHabitLogs, currentDate } = useUnits();
  
  const [timeRange, setTimeRange] = useState<TimeRange>("week");

  const activeHabits = useMemo(
    () => habits.filter((h) => !h.isArchived),
    [habits]
  );

  const getDateString = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split("T")[0];
  };

  const getDayStats = useMemo(() => {
    return (dateStr: string) => {
      const dayLogs = logs.filter((l) => l.date === dateStr);
      const dayBadLogs = badHabitLogs.filter((l) => l.date === dateStr && !l.isUndone);
      const total = dayLogs.reduce((sum, l) => sum + l.count, 0);
      
      const habitTotals: Record<string, number> = {};
      dayLogs.forEach((l) => {
        habitTotals[l.habitId] = (habitTotals[l.habitId] || 0) + l.count;
      });
      
      const dayActiveHabits = activeHabits.filter((h) => {
        const createdDate = h.createdAt.split("T")[0];
        return createdDate <= dateStr;
      });
      
      const totalGoal = dayActiveHabits.reduce((sum, h) => sum + h.dailyGoal, 0);
      const allGoalsMet = dayActiveHabits.length > 0 && dayActiveHabits.every(
        (h) => (habitTotals[h.id] || 0) >= h.dailyGoal
      );
      const noBadHabits = dayBadLogs.length === 0;
      const isGoodDay = allGoalsMet && noBadHabits;
      
      return { total, totalGoal, allGoalsMet, isGoodDay, habitTotals };
    };
  }, [logs, badHabitLogs, activeHabits]);

  const overviewStats = useMemo(() => {
    const today = getDayStats(currentDate);
    const yesterday = getDayStats(getDateString(1));
    
    const todayTotal = today.total;
    const yesterdayTotal = yesterday.total;
    const todayDelta = todayTotal - yesterdayTotal;
    
    let weekTotal = 0;
    let lastWeekTotal = 0;
    for (let i = 0; i < 7; i++) {
      weekTotal += getDayStats(getDateString(i)).total;
      lastWeekTotal += getDayStats(getDateString(i + 7)).total;
    }
    const weekDelta = weekTotal - lastWeekTotal;
    
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const dayStats = getDayStats(getDateString(i));
      if (dayStats.isGoodDay) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    let perfectDays = 0;
    for (let i = 0; i < 30; i++) {
      if (getDayStats(getDateString(i)).isGoodDay) perfectDays++;
    }
    
    return {
      todayTotal, todayDelta, todayIsGood: today.isGoodDay,
      weekTotal, weekDelta,
      streak,
      perfectDays,
    };
  }, [getDayStats, currentDate]);

  const trendData = useMemo(() => {
    const days = timeRange === "week" ? 7 : timeRange === "month" ? 30 : 365;
    const data: { isGood: boolean; total: number; goal: number }[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const stats = getDayStats(getDateString(i));
      data.push({
        isGood: stats.isGoodDay,
        total: stats.total,
        goal: stats.totalGoal,
      });
    }
    
    const goodDays = data.filter(d => d.isGood).length;
    const totalDays = data.filter(d => d.goal > 0).length;
    const successRate = totalDays > 0 ? Math.round((goodDays / totalDays) * 100) : 0;
    const totalUnits = data.reduce((sum, d) => sum + d.total, 0);
    
    return { data, goodDays, totalDays, successRate, totalUnits };
  }, [timeRange, getDayStats]);

  const habitStats = useMemo(() => {
    return activeHabits.map((habit) => {
      const habitLogs = logs.filter((l) => l.habitId === habit.id);
      const todayUnits = habitLogs.filter((l) => l.date === currentDate).reduce((sum, l) => sum + l.count, 0);
      
      let weekUnits = 0;
      let daysGoalMet = 0;
      for (let i = 0; i < 7; i++) {
        const units = habitLogs.filter((l) => l.date === getDateString(i)).reduce((sum, l) => sum + l.count, 0);
        weekUnits += units;
        if (units >= habit.dailyGoal) daysGoalMet++;
      }
      
      const dayTotals: Record<string, number> = {};
      habitLogs.forEach((l) => {
        dayTotals[l.date] = (dayTotals[l.date] || 0) + l.count;
      });
      const bestDayEntry = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0];
      const bestDay = bestDayEntry ? bestDayEntry[1] : 0;
      
      const isGoalMet = todayUnits >= habit.dailyGoal;
      const progress = habit.dailyGoal > 0 ? Math.min(todayUnits / habit.dailyGoal, 1) : 0;
      
      return { habit, todayUnits, weekUnits, isGoalMet, progress, daysGoalMet, bestDay };
    });
  }, [activeHabits, logs, currentDate]);

  const maxTrendValue = Math.max(...trendData.data.map(d => d.total), 1);

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
      <Animated.View entering={FadeIn} style={styles.overviewGrid}>
        <View style={[styles.statBox, { backgroundColor: overviewStats.todayIsGood ? GREEN + "15" : theme.backgroundDefault }]}>
          <ThemedText type="h2" style={{ color: overviewStats.todayIsGood ? GREEN : theme.text }}>
            {overviewStats.todayTotal}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>Today</ThemedText>
          {overviewStats.todayDelta !== 0 ? (
            <View style={[styles.deltaChip, { backgroundColor: overviewStats.todayDelta > 0 ? GREEN + "20" : RED + "20" }]}>
              <Feather name={overviewStats.todayDelta > 0 ? "arrow-up" : "arrow-down"} size={10} color={overviewStats.todayDelta > 0 ? GREEN : RED} />
              <ThemedText type="small" style={{ color: overviewStats.todayDelta > 0 ? GREEN : RED, fontSize: 10 }}>
                {Math.abs(overviewStats.todayDelta)}
              </ThemedText>
            </View>
          ) : null}
        </View>
        
        <View style={[styles.statBox, { backgroundColor: overviewStats.weekDelta >= 0 ? GREEN + "15" : RED + "15" }]}>
          <ThemedText type="h2" style={{ color: overviewStats.weekDelta >= 0 ? GREEN : RED }}>
            {overviewStats.weekTotal}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>This Week</ThemedText>
          {overviewStats.weekDelta !== 0 ? (
            <View style={[styles.deltaChip, { backgroundColor: overviewStats.weekDelta > 0 ? GREEN + "20" : RED + "20" }]}>
              <Feather name={overviewStats.weekDelta > 0 ? "arrow-up" : "arrow-down"} size={10} color={overviewStats.weekDelta > 0 ? GREEN : RED} />
              <ThemedText type="small" style={{ color: overviewStats.weekDelta > 0 ? GREEN : RED, fontSize: 10 }}>
                {Math.abs(overviewStats.weekDelta)}
              </ThemedText>
            </View>
          ) : null}
        </View>
        
        <View style={[styles.statBox, { backgroundColor: overviewStats.streak > 0 ? GOLD + "15" : theme.backgroundDefault }]}>
          <ThemedText type="h2" style={{ color: overviewStats.streak > 0 ? GOLD : theme.text }}>
            {overviewStats.streak}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>Streak</ThemedText>
        </View>
        
        <View style={[styles.statBox, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h2" style={{ color: trendData.successRate >= 50 ? GREEN : theme.text }}>
            {trendData.successRate}%
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>Success</ThemedText>
        </View>
      </Animated.View>

      <View style={styles.tabsContainer}>
        {(["week", "month", "year"] as TimeRange[]).map((range) => (
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
        entering={FadeIn.delay(50)}
        style={[styles.trendCard, { backgroundColor: theme.backgroundDefault }]}
      >
        <View style={styles.trendHeader}>
          <ThemedText type="h4">Progress</ThemedText>
          <View style={styles.trendSummary}>
            <View style={[styles.dot, { backgroundColor: GREEN }]} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {trendData.goodDays} good days
            </ThemedText>
          </View>
        </View>
        <View style={styles.trendChart}>
          {trendData.data.map((day, i) => (
            <View
              key={i}
              style={[
                styles.trendBar,
                {
                  height: Math.max((day.total / maxTrendValue) * 60, 2),
                  backgroundColor: day.goal === 0 ? theme.textSecondary + "30" : day.isGood ? GREEN : RED + "60",
                },
              ]}
            />
          ))}
        </View>
      </Animated.View>

      <ThemedText type="h4" style={styles.sectionTitle}>Habits</ThemedText>
      
      {habitStats.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Add habits to see stats
          </ThemedText>
        </View>
      ) : (
        habitStats.map((stat, index) => (
          <Animated.View
            key={stat.habit.id}
            entering={FadeInDown.delay(index * 30)}
            style={[
              styles.habitCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <View style={styles.habitHeader}>
              <View style={[styles.habitDot, { backgroundColor: stat.habit.color }]} />
              <ThemedText type="body" style={{ fontWeight: "600", flex: 1 }}>
                {stat.habit.name}
              </ThemedText>
              <View style={[
                styles.goalBadge, 
                { backgroundColor: stat.isGoalMet ? GREEN + "20" : RED + "20" }
              ]}>
                <Feather 
                  name={stat.isGoalMet ? "check" : "x"} 
                  size={12} 
                  color={stat.isGoalMet ? GREEN : RED} 
                />
              </View>
            </View>
            
            <View style={styles.habitProgressRow}>
              <View style={styles.habitProgressBar}>
                <View
                  style={[
                    styles.habitProgress,
                    {
                      width: `${stat.progress * 100}%`,
                      backgroundColor: stat.isGoalMet ? GREEN : stat.habit.color,
                    },
                  ]}
                />
              </View>
              <ThemedText type="small" style={{ color: theme.textSecondary, minWidth: 45, textAlign: "right" }}>
                {stat.todayUnits}/{stat.habit.dailyGoal}
              </ThemedText>
            </View>
            
            <View style={styles.habitStats}>
              <View style={styles.habitStatItem}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>{stat.weekUnits}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>week</ThemedText>
              </View>
              <View style={styles.habitStatItem}>
                <ThemedText type="body" style={{ fontWeight: "600", color: stat.daysGoalMet >= 5 ? GREEN : theme.text }}>
                  {stat.daysGoalMet}/7
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>goals</ThemedText>
              </View>
              <View style={styles.habitStatItem}>
                <ThemedText type="body" style={{ fontWeight: "600", color: GOLD }}>{stat.bestDay}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>best</ThemedText>
              </View>
            </View>
          </Animated.View>
        ))
      )}
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
  overviewGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statBox: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
    gap: 2,
  },
  deltaChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    alignItems: "center",
  },
  trendCard: {
    padding: Spacing.lg,
    borderRadius: 16,
    marginBottom: Spacing.xl,
  },
  trendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  trendSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trendChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 60,
    gap: 2,
  },
  trendBar: {
    flex: 1,
    borderRadius: 2,
    minWidth: 2,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: 16,
    alignItems: "center",
  },
  habitCard: {
    padding: Spacing.md,
    borderRadius: 16,
    marginBottom: Spacing.sm,
  },
  habitHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  habitDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  goalBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  habitProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  habitProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(128, 128, 128, 0.2)",
    borderRadius: 4,
    overflow: "hidden",
  },
  habitProgress: {
    height: "100%",
    borderRadius: 4,
  },
  habitStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  habitStatItem: {
    alignItems: "center",
  },
});
