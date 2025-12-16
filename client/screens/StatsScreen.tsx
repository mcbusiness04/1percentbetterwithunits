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

type TimeRange = "daily" | "weekly" | "monthly" | "yearly";

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
  
  const [timeRange, setTimeRange] = useState<TimeRange>("daily");

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
      
      let minMultiplier = dayActiveHabits.length > 0 ? Infinity : 0;
      dayActiveHabits.forEach((h) => {
        const units = habitTotals[h.id] || 0;
        if (units < h.dailyGoal) {
          minMultiplier = 0;
        } else {
          minMultiplier = Math.min(minMultiplier, Math.floor(units / h.dailyGoal));
        }
      });
      if (minMultiplier === Infinity) minMultiplier = 0;
      
      const improvementPercent = isGoodDay && minMultiplier >= 1 ? minMultiplier : 0;
      
      return { total, totalGoal, allGoalsMet, isGoodDay, improvementPercent, habitTotals, hasPenalty: !noBadHabits };
    };
  }, [logs, badHabitLogs, activeHabits]);

  const overviewStats = useMemo(() => {
    const today = getDayStats(currentDate);
    const yesterday = getDayStats(getDateString(1));
    const dayBeforeYesterday = getDayStats(getDateString(2));
    
    const todayTotal = today.total;
    const yesterdayTotal = yesterday.total;
    
    const todayDelta = yesterdayTotal > 0 
      ? Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 100)
      : todayTotal > 0 ? 100 : 0;
    
    let weekTotal = 0;
    let lastWeekTotal = 0;
    for (let i = 0; i < 7; i++) {
      weekTotal += getDayStats(getDateString(i)).total;
      lastWeekTotal += getDayStats(getDateString(i + 7)).total;
    }
    const weekDelta = lastWeekTotal > 0 
      ? Math.round(((weekTotal - lastWeekTotal) / lastWeekTotal) * 100)
      : weekTotal > 0 ? 100 : 0;
    
    const daysWithData = new Set(logs.map((l) => l.date)).size;
    const totalUnits = logs.reduce((sum, l) => sum + l.count, 0);
    const avgPerDay = daysWithData > 0 ? Math.round(totalUnits / daysWithData * 10) / 10 : 0;
    
    let prevWeekTotal = 0;
    for (let i = 7; i < 14; i++) {
      prevWeekTotal += getDayStats(getDateString(i)).total;
    }
    const prevWeekDays = 7;
    const prevAvg = prevWeekDays > 0 ? prevWeekTotal / prevWeekDays : 0;
    const avgDelta = prevAvg > 0 
      ? Math.round(((avgPerDay - prevAvg) / prevAvg) * 100)
      : avgPerDay > 0 ? 100 : 0;
    
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const dayStats = getDayStats(getDateString(i));
      if (dayStats.isGoodDay) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    let prevStreak = 0;
    for (let i = 0; i < 30; i++) {
      const dayStats = getDayStats(getDateString(i + 1));
      if (dayStats.isGoodDay) {
        prevStreak++;
      } else if (i > 0) {
        break;
      }
    }
    const streakDelta = streak - prevStreak;
    
    return {
      todayTotal, todayDelta, todayIsGood: today.isGoodDay,
      weekTotal, weekDelta,
      avgPerDay, avgDelta,
      streak, streakDelta,
    };
  }, [getDayStats, currentDate, logs]);

  const recentDays = useMemo(() => {
    const days: { date: string; label: string; stats: ReturnType<typeof getDayStats>; isToday: boolean }[] = [];
    const today = new Date();
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayLabel = i === 0 ? "Today" : i === 1 ? "Yesterday" : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      
      days.push({
        date: dateStr,
        label: dayLabel,
        stats: getDayStats(dateStr),
        isToday: i === 0,
      });
    }
    return days;
  }, [getDayStats]);

  const chartData = useMemo(() => {
    const data: { label: string; total: number; goal: number; isGood: boolean; hasPenalty: boolean }[] = [];
    const today = new Date();
    
    if (timeRange === "daily") {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const stats = getDayStats(dateStr);
        data.push({
          label: date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2),
          total: stats.total,
          goal: stats.totalGoal,
          isGood: stats.isGoodDay,
          hasPenalty: stats.hasPenalty,
        });
      }
    } else if (timeRange === "weekly") {
      for (let i = 3; i >= 0; i--) {
        let weekTotal = 0;
        let weekGoal = 0;
        let allGood = true;
        let anyPenalty = false;
        for (let d = 0; d < 7; d++) {
          const stats = getDayStats(getDateString(i * 7 + d));
          weekTotal += stats.total;
          weekGoal += stats.totalGoal;
          if (!stats.isGoodDay) allGood = false;
          if (stats.hasPenalty) anyPenalty = true;
        }
        data.push({
          label: `W${4 - i}`,
          total: weekTotal,
          goal: weekGoal,
          isGood: weekTotal >= weekGoal,
          hasPenalty: anyPenalty,
        });
      }
    } else if (timeRange === "monthly") {
      for (let i = 2; i >= 0; i--) {
        const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
        let monthTotal = 0;
        let monthGoal = 0;
        let goodDays = 0;
        let anyPenalty = false;
        
        for (let d = 0; d < daysInMonth; d++) {
          const checkDate = new Date(monthDate);
          checkDate.setDate(checkDate.getDate() + d);
          if (checkDate > today) break;
          const dateStr = checkDate.toISOString().split("T")[0];
          const stats = getDayStats(dateStr);
          monthTotal += stats.total;
          monthGoal += stats.totalGoal;
          if (stats.isGoodDay) goodDays++;
          if (stats.hasPenalty) anyPenalty = true;
        }
        data.push({
          label: monthDate.toLocaleDateString("en-US", { month: "short" }),
          total: monthTotal,
          goal: monthGoal,
          isGood: monthTotal >= monthGoal,
          hasPenalty: anyPenalty,
        });
      }
    } else {
      for (let i = 0; i < 12; i++) {
        const monthDate = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1);
        const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
        let monthTotal = 0;
        let monthGoal = 0;
        
        for (let d = 0; d < daysInMonth; d++) {
          const checkDate = new Date(monthDate);
          checkDate.setDate(checkDate.getDate() + d);
          if (checkDate > today) break;
          const dateStr = checkDate.toISOString().split("T")[0];
          const stats = getDayStats(dateStr);
          monthTotal += stats.total;
          monthGoal += stats.totalGoal;
        }
        data.push({
          label: monthDate.toLocaleDateString("en-US", { month: "narrow" }),
          total: monthTotal,
          goal: monthGoal,
          isGood: monthTotal >= monthGoal,
          hasPenalty: false,
        });
      }
    }
    return data;
  }, [timeRange, getDayStats]);

  const habitStats = useMemo(() => {
    return activeHabits.map((habit) => {
      const habitLogs = logs.filter((l) => l.habitId === habit.id);
      const todayUnits = habitLogs.filter((l) => l.date === currentDate).reduce((sum, l) => sum + l.count, 0);
      const yesterdayUnits = habitLogs.filter((l) => l.date === getDateString(1)).reduce((sum, l) => sum + l.count, 0);
      
      let weekUnits = 0;
      for (let i = 0; i < 7; i++) {
        weekUnits += habitLogs.filter((l) => l.date === getDateString(i)).reduce((sum, l) => sum + l.count, 0);
      }
      
      const dayTotals: Record<string, number> = {};
      habitLogs.forEach((l) => {
        dayTotals[l.date] = (dayTotals[l.date] || 0) + l.count;
      });
      const bestDayEntry = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0];
      const bestDay = bestDayEntry ? { date: bestDayEntry[0], value: bestDayEntry[1] } : null;
      
      const delta = yesterdayUnits > 0 
        ? Math.round(((todayUnits - yesterdayUnits) / yesterdayUnits) * 100)
        : todayUnits > 0 ? 100 : 0;
      
      const isGoalMet = todayUnits >= habit.dailyGoal;
      const progress = habit.dailyGoal > 0 ? todayUnits / habit.dailyGoal : 0;
      
      let daysGoalMet = 0;
      for (let i = 0; i < 7; i++) {
        const units = habitLogs.filter((l) => l.date === getDateString(i)).reduce((sum, l) => sum + l.count, 0);
        if (units >= habit.dailyGoal) daysGoalMet++;
      }
      
      return {
        habit,
        todayUnits,
        yesterdayUnits,
        weekUnits,
        delta,
        isGoalMet,
        progress,
        bestDay,
        daysGoalMet,
      };
    });
  }, [activeHabits, logs, currentDate]);

  const overallImprovement = useMemo(() => {
    let totalImprovementDays = 0;
    let totalDays = 0;
    let cumulativeImprovement = 0;
    
    for (let i = 0; i < 30; i++) {
      const stats = getDayStats(getDateString(i));
      if (stats.isGoodDay) {
        totalImprovementDays++;
        cumulativeImprovement += stats.improvementPercent;
      }
      if (stats.total > 0 || stats.totalGoal > 0) {
        totalDays++;
      }
    }
    
    const successRate = totalDays > 0 ? Math.round((totalImprovementDays / totalDays) * 100) : 0;
    
    let last7Improvement = 0;
    let last7Days = 0;
    for (let i = 0; i < 7; i++) {
      const stats = getDayStats(getDateString(i));
      if (stats.isGoodDay) {
        last7Improvement += stats.improvementPercent;
        last7Days++;
      }
    }
    
    let prev7Improvement = 0;
    let prev7Days = 0;
    for (let i = 7; i < 14; i++) {
      const stats = getDayStats(getDateString(i));
      if (stats.isGoodDay) {
        prev7Improvement += stats.improvementPercent;
        prev7Days++;
      }
    }
    
    const recentAvg = last7Days > 0 ? last7Improvement / last7Days : 0;
    const prevAvg = prev7Days > 0 ? prev7Improvement / prev7Days : 0;
    const trend = recentAvg - prevAvg;
    
    const isImproving = trend >= 0 || last7Improvement > prev7Improvement;
    
    return {
      totalImprovementDays,
      totalDays,
      cumulativeImprovement,
      successRate,
      last7Improvement,
      prev7Improvement,
      trend,
      isImproving,
    };
  }, [getDayStats]);

  const maxChartValue = Math.max(...chartData.map((d) => Math.max(d.total, d.goal)), 1);

  const renderDelta = (delta: number, size: "small" | "normal" = "normal") => {
    const isPositive = delta > 0;
    const isNegative = delta < 0;
    const color = isPositive ? GREEN : isNegative ? RED : theme.textSecondary;
    const icon = isPositive ? "arrow-up" : isNegative ? "arrow-down" : "minus";
    
    return (
      <View style={styles.deltaContainer}>
        <Feather name={icon} size={size === "small" ? 10 : 12} color={color} />
        <ThemedText type="small" style={{ color, marginLeft: 2 }}>
          {Math.abs(delta)}%
        </ThemedText>
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
        <View style={[styles.statBox, { backgroundColor: overviewStats.todayIsGood ? GREEN + "15" : theme.backgroundDefault }]}>
          <View style={styles.statHeader}>
            <Feather name="zap" size={18} color={overviewStats.todayIsGood ? GREEN : theme.accent} />
            {renderDelta(overviewStats.todayDelta, "small")}
          </View>
          <ThemedText type="h3" style={{ color: overviewStats.todayIsGood ? GREEN : theme.text }}>
            {overviewStats.todayTotal}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Today
          </ThemedText>
        </View>
        
        <View style={[styles.statBox, { backgroundColor: overviewStats.weekDelta >= 0 ? GREEN + "15" : RED + "15" }]}>
          <View style={styles.statHeader}>
            <Feather name="calendar" size={18} color={overviewStats.weekDelta >= 0 ? GREEN : RED} />
            {renderDelta(overviewStats.weekDelta, "small")}
          </View>
          <ThemedText type="h3" style={{ color: overviewStats.weekDelta >= 0 ? GREEN : RED }}>
            {overviewStats.weekTotal}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            This Week
          </ThemedText>
        </View>
        
        <View style={[styles.statBox, { backgroundColor: overviewStats.avgDelta >= 0 ? GREEN + "15" : RED + "15" }]}>
          <View style={styles.statHeader}>
            <Feather name="trending-up" size={18} color={overviewStats.avgDelta >= 0 ? GREEN : RED} />
            {renderDelta(overviewStats.avgDelta, "small")}
          </View>
          <ThemedText type="h3" style={{ color: overviewStats.avgDelta >= 0 ? GREEN : RED }}>
            {overviewStats.avgPerDay}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Daily Avg
          </ThemedText>
        </View>
        
        <View style={[styles.statBox, { backgroundColor: overviewStats.streak > 0 ? GOLD + "20" : theme.backgroundDefault }]}>
          <View style={styles.statHeader}>
            <Feather name="award" size={18} color={overviewStats.streak > 0 ? GOLD : theme.textSecondary} />
            {overviewStats.streakDelta !== 0 ? (
              <View style={styles.deltaContainer}>
                <Feather 
                  name={overviewStats.streakDelta > 0 ? "arrow-up" : "arrow-down"} 
                  size={10} 
                  color={overviewStats.streakDelta > 0 ? GREEN : RED} 
                />
                <ThemedText type="small" style={{ color: overviewStats.streakDelta > 0 ? GREEN : RED, marginLeft: 2 }}>
                  {Math.abs(overviewStats.streakDelta)}
                </ThemedText>
              </View>
            ) : null}
          </View>
          <ThemedText type="h3" style={{ color: overviewStats.streak > 0 ? GOLD : theme.text }}>
            {overviewStats.streak}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Day Streak
          </ThemedText>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeIn.delay(50)}
        style={[
          styles.improvementHero,
          { backgroundColor: overallImprovement.isImproving ? GREEN + "15" : RED + "15" },
        ]}
      >
        <View style={styles.improvementHeroHeader}>
          <View style={[styles.improvementIcon, { backgroundColor: overallImprovement.isImproving ? GREEN + "30" : RED + "30" }]}>
            <Feather
              name={overallImprovement.isImproving ? "trending-up" : "trending-down"}
              size={28}
              color={overallImprovement.isImproving ? GREEN : RED}
            />
          </View>
          <View style={styles.improvementTextContainer}>
            <ThemedText type="h2" style={{ color: overallImprovement.isImproving ? GREEN : RED }}>
              {overallImprovement.cumulativeImprovement}% better
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              {overallImprovement.isImproving ? "You're improving!" : "Keep pushing, you can do it!"}
            </ThemedText>
          </View>
        </View>
        <View style={styles.improvementDetails}>
          <View style={styles.improvementDetailItem}>
            <ThemedText type="h4" style={{ color: theme.text }}>{overallImprovement.successRate}%</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Success Rate</ThemedText>
          </View>
          <View style={styles.improvementDetailItem}>
            <ThemedText type="h4" style={{ color: theme.text }}>{overallImprovement.totalImprovementDays}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Perfect Days</ThemedText>
          </View>
          <View style={styles.improvementDetailItem}>
            <ThemedText type="h4" style={{ color: overallImprovement.trend >= 0 ? GREEN : RED }}>
              {overallImprovement.trend >= 0 ? "+" : ""}{overallImprovement.trend.toFixed(1)}%
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>This Week</ThemedText>
          </View>
        </View>
      </Animated.View>

      <ThemedText type="h4" style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>
        Recent Days
      </ThemedText>
      <Animated.View entering={FadeIn.delay(100)} style={styles.recentDaysContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentDaysScroll}>
          {recentDays.slice(0, 7).map((day, index) => (
            <View
              key={day.date}
              style={[
                styles.dayCard,
                {
                  backgroundColor: day.stats.isGoodDay ? GREEN + "20" : day.stats.hasPenalty ? RED + "20" : theme.backgroundDefault,
                  borderColor: day.isToday ? theme.accent : "transparent",
                  borderWidth: day.isToday ? 2 : 0,
                },
              ]}
            >
              <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: "600" }}>
                {day.isToday ? "Today" : day.date.split("-")[2]}
              </ThemedText>
              <View style={[styles.dayIndicator, { backgroundColor: day.stats.isGoodDay ? GREEN : day.stats.hasPenalty ? RED : theme.textSecondary + "40" }]}>
                <Feather
                  name={day.stats.isGoodDay ? "check" : day.stats.hasPenalty ? "x" : "minus"}
                  size={14}
                  color="white"
                />
              </View>
              <ThemedText type="small" style={{ color: day.stats.isGoodDay ? GREEN : theme.textSecondary }}>
                {day.stats.total}
              </ThemedText>
              {day.stats.improvementPercent > 0 ? (
                <ThemedText type="small" style={{ color: GREEN, fontSize: 10 }}>
                  +{day.stats.improvementPercent}%
                </ThemedText>
              ) : null}
            </View>
          ))}
        </ScrollView>
      </Animated.View>

      <View style={styles.tabsContainer}>
        {(["daily", "weekly", "monthly", "yearly"] as TimeRange[]).map((range) => (
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
        entering={FadeIn.delay(150)}
        style={[styles.chartCard, { backgroundColor: theme.backgroundDefault }]}
      >
        <ThemedText type="h4" style={styles.chartTitle}>
          Goal Achievement
        </ThemedText>
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: GREEN }]} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Goal Met</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: RED }]} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Missed</ThemedText>
          </View>
        </View>
        <View style={styles.chart}>
          {chartData.map((item, index) => {
            const height = (item.total / maxChartValue) * 140;
            const goalHeight = (item.goal / maxChartValue) * 140;
            const isLast = index === chartData.length - 1;
            const barColor = item.isGood ? GREEN : item.hasPenalty ? RED : RED + "80";
            
            return (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barWrapper}>
                  <View style={[styles.goalLine, { bottom: Math.max(goalHeight, 2), backgroundColor: GOLD + "60" }]} />
                  <Animated.View
                    entering={FadeInDown.delay(index * 50).springify()}
                    style={[
                      styles.bar,
                      {
                        height: Math.max(height, 4),
                        backgroundColor: barColor,
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
      </Animated.View>

      <ThemedText type="h4" style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>
        Habit Details
      </ThemedText>
      {habitStats.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Add a habit to see stats here
          </ThemedText>
        </View>
      ) : (
        habitStats.map((stat, index) => (
          <Animated.View
            key={stat.habit.id}
            entering={FadeInDown.delay(index * 50 + 200)}
            style={[
              styles.habitStatCard,
              {
                backgroundColor: stat.habit.color + "10",
                borderLeftColor: stat.habit.color,
              },
            ]}
          >
            <View style={styles.habitStatHeader}>
              <View style={styles.habitNameRow}>
                <View style={[styles.habitDot, { backgroundColor: stat.habit.color }]} />
                <ThemedText type="body" style={{ fontWeight: "600", flex: 1 }}>
                  {stat.habit.name}
                </ThemedText>
                {stat.isGoalMet ? (
                  <View style={[styles.goalBadge, { backgroundColor: GREEN + "20" }]}>
                    <Feather name="check" size={12} color={GREEN} />
                  </View>
                ) : null}
              </View>
              <View style={styles.habitTodayRow}>
                <ThemedText type="h4" style={{ color: stat.isGoalMet ? GREEN : stat.habit.color }}>
                  {stat.todayUnits}/{stat.habit.dailyGoal}
                </ThemedText>
                {renderDelta(stat.delta)}
              </View>
            </View>
            
            <View style={styles.habitProgressBar}>
              <View
                style={[
                  styles.habitProgress,
                  {
                    width: `${Math.min(stat.progress * 100, 100)}%`,
                    backgroundColor: stat.isGoalMet ? GREEN : stat.habit.color,
                  },
                ]}
              />
            </View>
            
            <View style={styles.habitStatRow}>
              <View style={styles.habitStatItem}>
                <ThemedText type="body" style={{ color: theme.text, fontWeight: "600" }}>
                  {stat.weekUnits}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  This Week
                </ThemedText>
              </View>
              <View style={styles.habitStatItem}>
                <ThemedText type="body" style={{ color: theme.text, fontWeight: "600" }}>
                  {stat.daysGoalMet}/7
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Goals Met
                </ThemedText>
              </View>
              <View style={styles.habitStatItem}>
                <ThemedText type="body" style={{ color: GOLD, fontWeight: "600" }}>
                  {stat.bestDay?.value || 0}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Best Day
                </ThemedText>
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
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statBox: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm) / 2 - Spacing.sm / 2,
    padding: Spacing.md,
    borderRadius: 16,
    gap: 4,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deltaContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  improvementHero: {
    padding: Spacing.lg,
    borderRadius: 20,
    marginBottom: Spacing.lg,
  },
  improvementHeroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  improvementIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  improvementTextContainer: {
    flex: 1,
  },
  improvementDetails: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  improvementDetailItem: {
    alignItems: "center",
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  recentDaysContainer: {
    marginBottom: Spacing.lg,
  },
  recentDaysScroll: {
    gap: Spacing.sm,
  },
  dayCard: {
    width: 60,
    padding: Spacing.sm,
    borderRadius: 12,
    alignItems: "center",
    gap: 6,
  },
  dayIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  tabsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    alignItems: "center",
  },
  chartCard: {
    padding: Spacing.lg,
    borderRadius: 16,
  },
  chartTitle: {
    marginBottom: Spacing.sm,
  },
  chartLegend: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 160,
  },
  barContainer: {
    flex: 1,
    alignItems: "center",
  },
  barWrapper: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
    position: "relative",
  },
  bar: {
    width: "60%",
    minWidth: 16,
    maxWidth: 32,
  },
  goalLine: {
    position: "absolute",
    left: "10%",
    right: "10%",
    height: 2,
  },
  barValue: {
    position: "absolute",
    top: -18,
    fontSize: 10,
  },
  barLabel: {
    marginTop: 8,
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: 16,
    alignItems: "center",
  },
  habitStatCard: {
    padding: Spacing.md,
    borderRadius: 16,
    borderLeftWidth: 4,
    marginBottom: Spacing.sm,
  },
  habitStatHeader: {
    marginBottom: Spacing.sm,
  },
  habitNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 4,
  },
  habitDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  goalBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  habitTodayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  habitProgressBar: {
    height: 6,
    backgroundColor: "rgba(128, 128, 128, 0.2)",
    borderRadius: 3,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  habitProgress: {
    height: "100%",
    borderRadius: 3,
  },
  habitStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  habitStatItem: {
    alignItems: "center",
  },
});
