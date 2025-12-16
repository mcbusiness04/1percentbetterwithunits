import React, { useMemo, useState, useCallback } from "react";
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

  const getDateString = useCallback((daysAgo: number) => {
    const [year, month, day] = currentDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split("T")[0];
  }, [currentDate]);

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
    for (let i = 1; i < 365; i++) {
      const dayStats = getDayStats(getDateString(i));
      if (dayStats.totalGoal === 0) continue;
      if (dayStats.isGoodDay) {
        streak++;
      } else {
        break;
      }
    }
    if (today.isGoodDay) streak++;
    
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
  }, [getDayStats, currentDate, getDateString]);

  const totalImprovement = useMemo(() => {
    let totalUnits = 0;
    let totalGoals = 0;
    let goodDays = 0;
    let trackedDays = 0;
    
    for (let i = 0; i < 30; i++) {
      const stats = getDayStats(getDateString(i));
      if (stats.totalGoal > 0) {
        totalUnits += stats.total;
        totalGoals += stats.totalGoal;
        trackedDays++;
        if (stats.isGoodDay) goodDays++;
      }
    }
    
    const percent = totalGoals > 0 ? Math.round(((totalUnits - totalGoals) / totalGoals) * 100) : 0;
    const isPositive = percent >= 0;
    
    let message = "";
    if (trackedDays === 0) {
      message = "Start tracking to see progress!";
    } else if (percent >= 50) {
      message = "You're crushing it!";
    } else if (percent >= 20) {
      message = "Amazing progress!";
    } else if (percent >= 0) {
      message = "On track!";
    } else if (percent >= -20) {
      message = "Almost there, keep going!";
    } else {
      message = "Time to bounce back!";
    }
    
    return { percent, isPositive, message, goodDays, trackedDays };
  }, [getDayStats, getDateString]);

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
  }, [timeRange, getDayStats, getDateString]);

  const habitStats = useMemo(() => {
    return activeHabits.map((habit) => {
      const habitLogs = logs.filter((l) => l.habitId === habit.id);
      const todayUnits = habitLogs.filter((l) => l.date === currentDate).reduce((sum, l) => sum + l.count, 0);
      
      let daysGoalMet = 0;
      let daysWithData = 0;
      let totalUnitsLast7 = 0;
      for (let i = 0; i < 7; i++) {
        const dateStr = getDateString(i);
        const createdDate = habit.createdAt.split("T")[0];
        if (dateStr < createdDate) continue;
        daysWithData++;
        const units = habitLogs.filter((l) => l.date === dateStr).reduce((sum, l) => sum + l.count, 0);
        totalUnitsLast7 += units;
        if (units >= habit.dailyGoal) daysGoalMet++;
      }
      
      const dayTotals: Record<string, number> = {};
      habitLogs.forEach((l) => {
        dayTotals[l.date] = (dayTotals[l.date] || 0) + l.count;
      });
      const dayValues = Object.values(dayTotals);
      const bestDay = dayValues.length > 0 ? Math.max(...dayValues) : 0;
      const avgDay = dayValues.length > 0 ? Math.round(dayValues.reduce((a, b) => a + b, 0) / dayValues.length) : 0;
      
      const isGoalMet = todayUnits >= habit.dailyGoal;
      const progress = habit.dailyGoal > 0 ? Math.min(todayUnits / habit.dailyGoal, 1) : 0;
      
      return { habit, todayUnits, isGoalMet, progress, daysGoalMet, daysWithData, bestDay, avgDay };
    });
  }, [activeHabits, logs, currentDate, getDateString]);

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
      <Animated.View 
        entering={FadeIn} 
        style={[
          styles.heroCard, 
          { backgroundColor: totalImprovement.isPositive ? GREEN + "15" : RED + "15" }
        ]}
      >
        <View style={styles.heroContent}>
          <ThemedText 
            type="h1" 
            style={{ 
              color: totalImprovement.isPositive ? GREEN : RED,
              fontSize: 48,
              fontWeight: "700",
            }}
          >
            {totalImprovement.isPositive ? "+" : ""}{totalImprovement.percent}%
          </ThemedText>
          <ThemedText type="body" style={{ color: totalImprovement.isPositive ? GREEN : RED, fontWeight: "600" }}>
            {totalImprovement.message}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4 }}>
            {totalImprovement.goodDays} perfect days out of {totalImprovement.trackedDays}
          </ThemedText>
        </View>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(50)} style={styles.overviewGrid}>
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
                <ThemedText type="body" style={{ fontWeight: "600", color: stat.daysGoalMet >= 5 ? GREEN : stat.daysGoalMet >= 3 ? GOLD : theme.text }}>
                  {stat.daysGoalMet}/{stat.daysWithData}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>goals</ThemedText>
              </View>
              <View style={styles.habitStatItem}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>{stat.avgDay}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>avg</ThemedText>
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
  heroCard: {
    padding: Spacing.xl,
    borderRadius: 20,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  heroContent: {
    alignItems: "center",
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
    minHeight: 60,
    height: 60,
    overflow: "hidden",
  },
  trendBar: {
    flex: 1,
    borderRadius: 2,
    marginHorizontal: 1,
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
