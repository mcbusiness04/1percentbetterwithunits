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
import { PieChart } from "@/components/PieChart";
import { useUnits } from "@/lib/UnitsContext";

type TimeRange = "daily" | "weekly" | "monthly";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_HEIGHT = 160;

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { habits, logs, getTodayUnits, getWeekUnits, getMonthUnits, getTodayTotalUnits, getWeekTotalUnits, getDailyProgress, badHabitLogs } = useUnits();
  
  const [timeRange, setTimeRange] = useState<TimeRange>("daily");

  const activeHabits = useMemo(
    () => habits.filter((h) => !h.isArchived),
    [habits]
  );

  const pieChartData = useMemo(() => {
    return activeHabits.map((habit) => {
      const value = timeRange === "daily" 
        ? getTodayUnits(habit.id)
        : timeRange === "weekly"
        ? getWeekUnits(habit.id)
        : getMonthUnits(habit.id);
      return {
        label: habit.name,
        value,
        color: habit.color,
      };
    }).filter((item) => item.value > 0);
  }, [activeHabits, timeRange, getTodayUnits, getWeekUnits, getMonthUnits]);

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

  const statsOverview = useMemo(() => {
    const totalUnits = logs.reduce((sum, l) => sum + l.count, 0);
    const todayTotal = getTodayTotalUnits();
    const weekTotal = getWeekTotalUnits();
    
    const daysTracked = new Set(logs.map((l) => l.date)).size;
    
    const avgPerDay = daysTracked > 0 ? Math.round(totalUnits / daysTracked * 10) / 10 : 0;
    
    const dayTotals: Record<string, number> = {};
    logs.forEach((l) => {
      dayTotals[l.date] = (dayTotals[l.date] || 0) + l.count;
    });
    const bestDay = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0];
    
    let currentStreak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      if (dayTotals[dateStr] && dayTotals[dateStr] > 0) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }

    return {
      totalUnits,
      todayTotal,
      weekTotal,
      daysTracked,
      avgPerDay,
      bestDayValue: bestDay ? bestDay[1] : 0,
      bestDayDate: bestDay ? bestDay[0] : null,
      currentStreak,
    };
  }, [logs, getTodayTotalUnits, getWeekTotalUnits]);

  const chartData = timeRange === "daily" ? dailyData : timeRange === "weekly" ? weeklyData : monthlyData;
  const maxValue = Math.max(...chartData.map((d) => d.total), 1);

  const dailyImprovement = useMemo(() => {
    const { improvementPercent, hasDoubledGoal, allGoalsMet, hasBadHabits } = getDailyProgress();
    
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    
    const todayLogs = logs.filter((l) => l.date === todayStr);
    const yesterdayLogs = logs.filter((l) => l.date === yesterdayStr);
    const todayTotal = todayLogs.reduce((sum, l) => sum + l.count, 0);
    const yesterdayTotal = yesterdayLogs.reduce((sum, l) => sum + l.count, 0);
    
    const vsYesterday = yesterdayTotal > 0 
      ? Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 100) 
      : todayTotal > 0 ? 100 : 0;
    
    const habitComparisons = activeHabits.map((habit) => {
      const todayUnits = todayLogs.filter((l) => l.habitId === habit.id).reduce((sum, l) => sum + l.count, 0);
      const yesterdayUnits = yesterdayLogs.filter((l) => l.habitId === habit.id).reduce((sum, l) => sum + l.count, 0);
      const change = yesterdayUnits > 0 
        ? Math.round(((todayUnits - yesterdayUnits) / yesterdayUnits) * 100)
        : todayUnits > 0 ? 100 : 0;
      const isDoubled = todayUnits >= habit.dailyGoal * 2;
      return { habit, todayUnits, yesterdayUnits, change, isDoubled };
    });
    
    const mostImproved = habitComparisons
      .filter((h) => h.change > 0)
      .sort((a, b) => b.change - a.change)[0];
    
    const doublesCount = habitComparisons.filter((h) => h.isDoubled).length;
    
    const daysWithGoalsMet: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      
      const dayLogs = logs.filter((l) => l.date === dateStr);
      const dayBadHabitLogs = badHabitLogs.filter((l) => l.date === dateStr && !l.isUndone);
      
      const habitTotals: Record<string, number> = {};
      dayLogs.forEach((l) => {
        habitTotals[l.habitId] = (habitTotals[l.habitId] || 0) + l.count;
      });
      
      const dayActiveHabits = activeHabits.filter((h) => {
        const createdDate = h.createdAt.split("T")[0];
        return createdDate <= dateStr;
      });
      
      if (dayActiveHabits.length === 0) continue;
      
      const allMet = dayActiveHabits.every(
        (h) => (habitTotals[h.id] || 0) >= h.dailyGoal
      );
      const noBadHabits = dayBadHabitLogs.length === 0;
      
      if (allMet && noBadHabits) {
        daysWithGoalsMet.push(dateStr);
      }
    }
    
    let streak = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      if (daysWithGoalsMet.includes(dateStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    return {
      todayImprovement: improvementPercent,
      hasDoubledGoal,
      allGoalsMet,
      hasBadHabits,
      perfectDaysStreak: streak,
      perfectDaysThisWeek: daysWithGoalsMet.length,
      vsYesterday,
      todayTotal,
      yesterdayTotal,
      mostImproved,
      doublesCount,
      habitComparisons,
    };
  }, [getDailyProgress, logs, badHabitLogs, activeHabits]);

  const renderChart = () => {
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
      <Animated.View entering={FadeIn} style={styles.overviewGrid}>
        <View style={[styles.statBox, { backgroundColor: theme.accent + "15" }]}>
          <Feather name="zap" size={20} color={theme.accent} />
          <ThemedText type="h3" style={{ color: theme.accent }}>
            {statsOverview.todayTotal}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Today
          </ThemedText>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="calendar" size={20} color={theme.text} />
          <ThemedText type="h3">{statsOverview.weekTotal}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            This Week
          </ThemedText>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="trending-up" size={20} color={theme.text} />
          <ThemedText type="h3">{statsOverview.avgPerDay}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Daily Avg
          </ThemedText>
        </View>
        <View style={[styles.statBox, { backgroundColor: statsOverview.currentStreak > 0 ? "#FFD700" + "20" : theme.backgroundDefault }]}>
          <Feather name="award" size={20} color={statsOverview.currentStreak > 0 ? "#FFD700" : theme.text} />
          <ThemedText type="h3" style={{ color: statsOverview.currentStreak > 0 ? "#FFD700" : theme.text }}>
            {statsOverview.currentStreak}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Day Streak
          </ThemedText>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeIn.delay(50)}
        style={[styles.improvementCard, { backgroundColor: dailyImprovement.vsYesterday > 0 ? "#06D6A0" + "20" : theme.backgroundDefault }]}
      >
        <View style={styles.improvementHeader}>
          <View style={[styles.improvementIcon, { backgroundColor: dailyImprovement.vsYesterday > 0 ? "#06D6A0" + "30" : theme.textSecondary + "20" }]}>
            <Feather 
              name={dailyImprovement.vsYesterday > 0 ? "trending-up" : dailyImprovement.vsYesterday < 0 ? "trending-down" : "minus"} 
              size={24} 
              color={dailyImprovement.vsYesterday > 0 ? "#06D6A0" : dailyImprovement.vsYesterday < 0 ? theme.danger : theme.textSecondary} 
            />
          </View>
          <View style={styles.improvementTextContainer}>
            <ThemedText type="h3" style={{ color: dailyImprovement.vsYesterday > 0 ? "#06D6A0" : dailyImprovement.vsYesterday < 0 ? theme.danger : theme.text }}>
              {dailyImprovement.vsYesterday > 0 
                ? `${dailyImprovement.vsYesterday}% better than yesterday`
                : dailyImprovement.vsYesterday < 0 
                ? `${Math.abs(dailyImprovement.vsYesterday)}% behind yesterday`
                : "Same as yesterday"}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {dailyImprovement.doublesCount > 0
                ? `${dailyImprovement.doublesCount} habit${dailyImprovement.doublesCount > 1 ? "s" : ""} doubled - 2% bonus each`
                : dailyImprovement.allGoalsMet 
                ? "All goals met - 1% improvement"
                : dailyImprovement.hasBadHabits
                ? "Bad habit penalty applied"
                : `${dailyImprovement.todayTotal} units today vs ${dailyImprovement.yesterdayTotal} yesterday`}
            </ThemedText>
          </View>
        </View>
        <View style={styles.improvementStats}>
          <View style={styles.improvementStatItem}>
            <ThemedText type="h4" style={{ color: dailyImprovement.perfectDaysStreak > 0 ? "#FFD700" : theme.text }}>
              {dailyImprovement.perfectDaysStreak}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Perfect streak
            </ThemedText>
          </View>
          <View style={styles.improvementStatItem}>
            <ThemedText type="h4">{dailyImprovement.perfectDaysThisWeek}/7</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              This week
            </ThemedText>
          </View>
          <View style={styles.improvementStatItem}>
            <ThemedText type="h4" style={{ color: dailyImprovement.doublesCount > 0 ? "#FFD700" : theme.text }}>
              {dailyImprovement.doublesCount}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Doubled
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      {dailyImprovement.mostImproved ? (
        <Animated.View
          entering={FadeIn.delay(75)}
          style={[styles.insightMiniCard, { backgroundColor: dailyImprovement.mostImproved.habit.color + "20" }]}
        >
          <Feather name="award" size={18} color={dailyImprovement.mostImproved.habit.color} />
          <ThemedText type="body" style={{ flex: 1 }}>
            <ThemedText style={{ fontWeight: "600", color: dailyImprovement.mostImproved.habit.color }}>
              {dailyImprovement.mostImproved.habit.name}
            </ThemedText>
            {" "}is up {dailyImprovement.mostImproved.change}% today
          </ThemedText>
        </Animated.View>
      ) : null}

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
          Activity
        </ThemedText>
        {renderChart()}
      </Animated.View>

      <Animated.View
        entering={FadeIn.delay(100)}
        style={[styles.pieChartCard, { backgroundColor: theme.backgroundDefault }]}
      >
        <ThemedText type="h4" style={styles.chartTitle}>
          Habit Distribution
        </ThemedText>
        <PieChart data={pieChartData} size={160} showLegend={true} />
      </Animated.View>

      <View style={styles.habitStats}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Habit Progress
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
            const isGoalMet = todayUnits >= habit.dailyGoal && habit.dailyGoal > 0;

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
                  {isGoalMet ? (
                    <View style={styles.goalBadge}>
                      <Feather name="check-circle" size={14} color="#FFD700" />
                    </View>
                  ) : null}
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
                        backgroundColor: isGoalMet ? "#FFD700" : habit.color,
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
                  <View style={styles.statItem}>
                    <ThemedText type="h4" style={{ color: habit.color }}>
                      {habit.dailyGoal > 0 ? Math.round(progress * 100) : 0}%
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      goal
                    </ThemedText>
                  </View>
                </View>
              </Animated.View>
            );
          })
        )}
      </View>

      {statsOverview.bestDayValue > 0 ? (
        <Animated.View
          entering={FadeIn.delay(200)}
          style={[styles.insightCard, { backgroundColor: theme.backgroundDefault }]}
        >
          <Feather name="star" size={20} color="#FFD700" />
          <View style={styles.insightText}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              Best Day
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {statsOverview.bestDayValue} units on{" "}
              {statsOverview.bestDayDate
                ? new Date(statsOverview.bestDayDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "N/A"}
            </ThemedText>
          </View>
        </Animated.View>
      ) : null}
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
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statBox: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm) / 2 - 1,
    padding: Spacing.lg,
    borderRadius: 16,
    alignItems: "center",
    gap: 4,
  },
  tabsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
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
    marginBottom: Spacing.lg,
  },
  pieChartCard: {
    padding: Spacing.lg,
    borderRadius: 20,
    marginBottom: Spacing.xl,
  },
  chartTitle: {
    marginBottom: Spacing.md,
  },
  chartContainer: {
    height: CHART_HEIGHT + 40,
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
    gap: Spacing.sm,
  },
  habitDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  goalBadge: {
    marginRight: 4,
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
  insightCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: 16,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  insightText: {
    flex: 1,
  },
  improvementCard: {
    padding: Spacing.lg,
    borderRadius: 20,
    marginBottom: Spacing.lg,
  },
  improvementHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  improvementTextContainer: {
    flex: 1,
  },
  improvementStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  improvementStatItem: {
    alignItems: "center",
  },
  improvementIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  insightMiniCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.lg,
  },
});
