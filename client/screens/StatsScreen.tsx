import React, { useMemo, useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, Pressable, Dimensions, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { useUnits } from "@/lib/UnitsContext";

type TimeRange = "week" | "month" | "year";

const SCREEN_WIDTH = Dimensions.get("window").width;
const GREEN = "#06D6A0";
const RED = "#FF3B30"; // Bright red (no pink)
const GOLD = "#FFD700";
const YELLOW = "#FFD93D";

// Convert UTC ISO timestamp to local date string (YYYY-MM-DD)
const getLocalDateFromISO = (isoString: string): string => {
  const date = new Date(isoString);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { habits, logs, badHabits, badHabitLogs, currentDate, addUnitsForDate, removeUnitsForDate, getDailyProgress, tapBadHabitForDate, undoBadHabitTapForDate, getBadHabitTapsForDate, getEffectiveTotalForDate, getEffectiveHabitUnitsForDate } = useUnits();
  
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const activeHabits = useMemo(
    () => habits.filter((h) => !h.isArchived),
    [habits]
  );

  const getDateString = useCallback((daysAgo: number) => {
    const [year, month, day] = currentDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - daysAgo);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [currentDate]);

  const getDayStats = useMemo(() => {
    // Create set of active habit IDs for efficient lookup
    const habitIds = new Set(activeHabits.map((h) => h.id));
    
    return (dateStr: string) => {
      // Only count logs for habits that still exist
      const dayLogs = logs.filter((l) => l.date === dateStr && habitIds.has(l.habitId));
      const dayBadLogs = badHabitLogs.filter((l) => l.date === dateStr && !l.isUndone);
      
      // Use effective (penalty-adjusted) total for the day
      const total = getEffectiveTotalForDate(dateStr);
      
      // Get effective habit totals with penalty applied
      const habitTotals: Record<string, number> = {};
      activeHabits.forEach((h) => {
        habitTotals[h.id] = getEffectiveHabitUnitsForDate(h.id, dateStr);
      });
      
      const dayActiveHabits = activeHabits.filter((h) => {
        const createdDate = getLocalDateFromISO(h.createdAt);
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
  }, [logs, badHabitLogs, activeHabits, getEffectiveTotalForDate, getEffectiveHabitUnitsForDate]);

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
    
    let monthTotal = 0;
    let lastMonthTotal = 0;
    for (let i = 0; i < 30; i++) {
      monthTotal += getDayStats(getDateString(i)).total;
      lastMonthTotal += getDayStats(getDateString(i + 30)).total;
    }
    const monthDelta = monthTotal - lastMonthTotal;
    
    return {
      todayTotal, todayDelta, todayIsGood: today.isGoodDay,
      weekTotal, weekDelta,
      monthTotal, monthDelta,
    };
  }, [getDayStats, currentDate, getDateString]);

  const totalImprovement = useMemo(() => {
    // Get today's progress for real-time updates
    const progress = getDailyProgress();
    const hasBadHabits = progress.hasBadHabits;
    
    // CUMULATIVE Total Score = sum of each day's (progress % / 100) over all time
    // Each day contributes: (effective units / goal) / 100
    // Example: Day 1 at 100% = +1, Day 2 at 50% = +0.5, Total = +1.5
    
    // Only consider dates from ACTIVE (non-archived) habits
    const activeHabitIds = new Set(activeHabits.map((h) => h.id));
    
    // Get all unique dates from logs of active habits only
    const allDates = new Set<string>();
    logs.forEach((l) => {
      if (activeHabitIds.has(l.habitId)) {
        allDates.add(l.date);
      }
    });
    badHabitLogs.forEach((l) => {
      const bh = badHabits.find((b) => b.id === l.badHabitId);
      if (bh && !bh.isArchived) {
        allDates.add(l.date);
      }
    });
    
    // Always include today
    allDates.add(currentDate);
    
    let cumulativeScore = 0;
    let goodDays = 0;
    let trackedDays = 0;
    
    // Sort dates and calculate cumulative score
    const sortedDates = [...allDates].sort();
    
    for (const dateStr of sortedDates) {
      const dayStats = getDayStats(dateStr);
      
      // Only count days where there was a goal (active habits existed)
      if (dayStats.totalGoal > 0) {
        trackedDays++;
        
        // Each day's contribution = effective units / goal
        // This means 100% progress = +1, 50% = +0.5, 200% = +2
        const dayProgress = dayStats.total / dayStats.totalGoal;
        cumulativeScore += dayProgress;
        
        if (dayStats.isGoodDay) goodDays++;
      }
    }
    
    // Round to 2 decimal places for display
    const roundedValue = Math.round(cumulativeScore * 100) / 100;
    let displayPercent: string;
    const sign = roundedValue >= 0 ? "+" : "";
    
    // Format with appropriate decimal places
    if (roundedValue === 0) {
      displayPercent = "+0";
    } else if (Number.isInteger(roundedValue)) {
      displayPercent = sign + roundedValue.toFixed(0);
    } else if (Math.abs(roundedValue) < 1) {
      // For values like 0.25, 0.5, show up to 2 decimals
      displayPercent = sign + roundedValue.toFixed(2).replace(/0$/, "");
    } else {
      // For values >= 1, show up to 2 decimals as needed
      displayPercent = sign + roundedValue.toFixed(2).replace(/\.?0+$/, "");
    }
    
    // isPositive is false when there are any bad habits today (shows red)
    const isPositive = !hasBadHabits;
    
    // Motivational message based on cumulative score
    let message = "";
    if (progress.totalGoal === 0) {
      message = "Start tracking to see progress!";
    } else if (cumulativeScore >= 5) {
      message = "Incredible journey!";
    } else if (cumulativeScore >= 2) {
      message = "You're crushing it!";
    } else if (cumulativeScore >= 1) {
      message = "Amazing progress!";
    } else if (cumulativeScore >= 0.5) {
      message = "Great work!";
    } else if (cumulativeScore >= 0) {
      message = "Keep going!";
    } else {
      message = "Time to bounce back!";
    }
    
    return { displayPercent, isPositive, message, goodDays, trackedDays, hasBadHabits };
  }, [getDailyProgress, getDayStats, logs, badHabitLogs, currentDate, activeHabits, badHabits]);

  const trendData = useMemo(() => {
    const days = timeRange === "week" ? 7 : timeRange === "month" ? 28 : 365;
    const data: { isGood: boolean; total: number; goal: number; allGoalsMet: boolean; hadBadHabits: boolean; hasStarted: boolean; dateStr: string }[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const dateStr = getDateString(i);
      const stats = getDayStats(dateStr);
      const dayBadLogs = badHabitLogs.filter((l) => l.date === dateStr && !l.isUndone);
      data.push({
        isGood: stats.isGoodDay,
        total: stats.total,
        goal: stats.totalGoal,
        allGoalsMet: stats.allGoalsMet,
        hadBadHabits: dayBadLogs.length > 0,
        hasStarted: stats.total > 0,
        dateStr,
      });
    }
    
    const goodDays = data.filter(d => d.isGood).length;
    const totalDays = data.filter(d => d.goal > 0).length;
    const successRate = totalDays > 0 ? Math.round((goodDays / totalDays) * 100) : 0;
    const totalUnits = data.reduce((sum, d) => sum + d.total, 0);
    
    return { data, goodDays, totalDays, successRate, totalUnits };
  }, [timeRange, getDayStats, getDateString, badHabitLogs]);

  const habitStats = useMemo(() => {
    const now = new Date();
    const startOfYear = `${now.getFullYear()}-01-01`;
    
    return activeHabits.map((habit) => {
      // Use effective (penalty-adjusted) today units
      const todayUnits = getEffectiveHabitUnitsForDate(habit.id, currentDate);
      
      // Get all unique dates for this habit (excluding current date for bestDay calculation)
      const habitLogs = logs.filter((l) => l.habitId === habit.id);
      const uniqueDates = [...new Set(habitLogs.map((l) => l.date))];
      const historicalDates = uniqueDates.filter((d) => d !== currentDate);
      
      // Calculate effective day totals for each historical date (excluding today)
      const dayTotals: Record<string, number> = {};
      historicalDates.forEach((date) => {
        dayTotals[date] = getEffectiveHabitUnitsForDate(habit.id, date);
      });
      const dayValues = Object.values(dayTotals);
      const bestDay = dayValues.length > 0 ? Math.max(...dayValues) : 0;
      // avgDay also uses historical data only (excluding current day)
      const avgDay = dayValues.length > 0 ? Math.round(dayValues.reduce((a, b) => a + b, 0) / dayValues.length) : 0;
      
      // Year and all-time totals using effective units
      const yearDates = uniqueDates.filter((d) => d >= startOfYear);
      const yearTotal = yearDates.reduce((sum, date) => sum + getEffectiveHabitUnitsForDate(habit.id, date), 0);
      const allTimeTotal = uniqueDates.reduce((sum, date) => sum + getEffectiveHabitUnitsForDate(habit.id, date), 0);
      
      const isGoalMet = todayUnits >= habit.dailyGoal;
      const progress = habit.dailyGoal > 0 ? Math.min(todayUnits / habit.dailyGoal, 1) : 0;
      
      const unitLabel = habit.habitType === "time" ? "min" : "";
      
      return { habit, todayUnits, isGoalMet, progress, bestDay, avgDay, yearTotal, allTimeTotal, unitLabel };
    });
  }, [activeHabits, logs, currentDate, getEffectiveHabitUnitsForDate]);

  const badHabitStats = useMemo(() => {
    const activeBadHabits = badHabits.filter(bh => !bh.isArchived);
    return activeBadHabits.map(bh => {
      const bhLogs = badHabitLogs.filter(l => l.badHabitId === bh.id && !l.isUndone);
      const todayTaps = bhLogs.filter(l => l.date === currentDate).length;
      const createdDate = getLocalDateFromISO(bh.createdAt);
      
      let daysClean = 0;
      let daysTracked = 0;
      for (let i = 0; i < 30; i++) {
        const dateStr = getDateString(i);
        if (dateStr < createdDate) continue;
        daysTracked++;
        const dayTaps = bhLogs.filter(l => l.date === dateStr).length;
        if (dayTaps === 0) daysClean++;
      }
      
      const totalTaps = bhLogs.length;
      
      return { badHabit: bh, todayTaps, daysClean, daysTracked, totalTaps };
    });
  }, [badHabits, badHabitLogs, currentDate, getDateString]);

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
          { backgroundColor: GOLD + "15" }
        ]}
      >
        <View style={styles.heroContent}>
          <ThemedText 
            type="h1" 
            style={{ 
              color: GOLD,
              fontSize: 48,
              fontWeight: "700",
            }}
          >
            {totalImprovement.displayPercent}%
          </ThemedText>
          <ThemedText type="body" style={{ color: GOLD, fontWeight: "600" }}>
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
        
        <View style={[styles.statBox, { backgroundColor: overviewStats.monthDelta >= 0 ? GREEN + "15" : RED + "15" }]}>
          <ThemedText type="h2" style={{ color: overviewStats.monthDelta >= 0 ? GREEN : RED }}>
            {overviewStats.monthTotal}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>This Month</ThemedText>
          {overviewStats.monthDelta !== 0 ? (
            <View style={[styles.deltaChip, { backgroundColor: overviewStats.monthDelta > 0 ? GREEN + "20" : RED + "20" }]}>
              <Feather name={overviewStats.monthDelta > 0 ? "arrow-up" : "arrow-down"} size={10} color={overviewStats.monthDelta > 0 ? GREEN : RED} />
              <ThemedText type="small" style={{ color: overviewStats.monthDelta > 0 ? GREEN : RED, fontSize: 10 }}>
                {Math.abs(overviewStats.monthDelta)}
              </ThemedText>
            </View>
          ) : null}
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
        <View style={[
          styles.heatmapGrid,
          timeRange === "week" && styles.heatmapWeek,
          timeRange === "month" && styles.heatmapMonth,
          timeRange === "year" && styles.heatmapYear,
        ]}>
          {trendData.data.map((day, i) => {
            const isToday = i === trendData.data.length - 1;
            let bgColor = theme.textSecondary + "20";
            if (day.goal > 0) {
              if (day.hadBadHabits) {
                bgColor = RED;
              } else if (day.allGoalsMet) {
                bgColor = GREEN;
              } else {
                bgColor = YELLOW;
              }
            }
            return (
              <Pressable
                key={i}
                onPress={() => setSelectedDate(day.dateStr)}
                style={[
                  timeRange === "week" ? styles.weekSquare : 
                  timeRange === "month" ? styles.monthSquare : styles.yearSquare,
                  { backgroundColor: bgColor },
                  isToday && {
                    borderWidth: 2,
                    borderColor: theme.text,
                  },
                ]}
              />
            );
          })}
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
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  {stat.avgDay}{stat.unitLabel}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>daily avg</ThemedText>
              </View>
              <View style={styles.habitStatItem}>
                <ThemedText type="body" style={{ fontWeight: "600", color: GOLD }}>
                  {stat.bestDay}{stat.unitLabel}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>best</ThemedText>
              </View>
              <View style={styles.habitStatItem}>
                <ThemedText type="body" style={{ fontWeight: "600", color: stat.habit.color }}>
                  {stat.yearTotal.toLocaleString()}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>{new Date().getFullYear()}</ThemedText>
              </View>
              <View style={styles.habitStatItem}>
                <ThemedText type="body" style={{ fontWeight: "600", color: stat.habit.color }}>
                  {stat.allTimeTotal.toLocaleString()}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>all time</ThemedText>
              </View>
            </View>
          </Animated.View>
        ))
      )}

      {badHabitStats.length > 0 ? (
        <>
          <ThemedText type="h4" style={styles.sectionTitle}>Bad Habits</ThemedText>
          {badHabitStats.map((stat, index) => (
            <Animated.View
              key={stat.badHabit.id}
              entering={FadeInDown.delay(index * 30)}
              style={[
                styles.habitCard,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <View style={styles.habitHeader}>
                <View style={[styles.habitDot, { backgroundColor: RED }]} />
                <ThemedText type="body" style={{ fontWeight: "600", flex: 1 }}>
                  {stat.badHabit.name}
                </ThemedText>
                <View style={[
                  styles.goalBadge, 
                  { backgroundColor: stat.todayTaps === 0 ? GREEN + "20" : RED + "20" }
                ]}>
                  <Feather 
                    name={stat.todayTaps === 0 ? "check" : "x"} 
                    size={12} 
                    color={stat.todayTaps === 0 ? GREEN : RED} 
                  />
                </View>
              </View>
              
              <View style={styles.habitStats}>
                <View style={styles.habitStatItem}>
                  <ThemedText type="body" style={{ fontWeight: "600", color: stat.daysClean === stat.daysTracked ? GREEN : stat.daysClean >= stat.daysTracked * 0.8 ? GOLD : theme.text }}>
                    {stat.daysClean}/{stat.daysTracked}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>clean days</ThemedText>
                </View>
                <View style={styles.habitStatItem}>
                  <ThemedText type="body" style={{ fontWeight: "600", color: stat.totalTaps === 0 ? GREEN : RED }}>
                    {stat.totalTaps}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>total slips</ThemedText>
                </View>
              </View>
            </Animated.View>
          ))}
        </>
      ) : null}

      <Modal
        visible={selectedDate !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedDate(null)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setSelectedDate(null)}
        >
          <Pressable 
            style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="h4">
                Edit {selectedDate ? new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : ""}
              </ThemedText>
              <Pressable onPress={() => setSelectedDate(null)} style={styles.modalClose}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {selectedDate && activeHabits.filter(h => {
                const createdDate = getLocalDateFromISO(h.createdAt);
                return createdDate <= selectedDate;
              }).map((habit) => {
                const habitLogs = logs.filter(l => l.habitId === habit.id && l.date === selectedDate);
                const units = habitLogs.reduce((sum, l) => sum + l.count, 0);
                
                return (
                  <View key={habit.id} style={[styles.editHabitRow, { borderColor: theme.border }]}>
                    <View style={[styles.editHabitIcon, { backgroundColor: habit.color + "20" }]}>
                      <Feather name={habit.icon as any} size={18} color={habit.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="body" style={{ fontWeight: "500" }}>{habit.name}</ThemedText>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>
                        {units} / {habit.dailyGoal} {habit.unitName}
                      </ThemedText>
                    </View>
                    <View style={styles.editButtons}>
                      <Pressable
                        onPress={() => removeUnitsForDate(habit.id, habit.tapIncrement, selectedDate)}
                        style={[styles.editButton, { backgroundColor: RED + "20" }]}
                      >
                        <Feather name="minus" size={16} color={RED} />
                      </Pressable>
                      <ThemedText type="body" style={{ fontWeight: "600", minWidth: 32, textAlign: "center" }}>
                        {units}
                      </ThemedText>
                      <Pressable
                        onPress={() => addUnitsForDate(habit.id, habit.tapIncrement, selectedDate)}
                        style={[styles.editButton, { backgroundColor: GREEN + "20" }]}
                      >
                        <Feather name="plus" size={16} color={GREEN} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
              
              {selectedDate && activeHabits.filter(h => {
                const createdDate = getLocalDateFromISO(h.createdAt);
                return createdDate <= selectedDate;
              }).length === 0 ? (
                <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", padding: Spacing.xl }}>
                  No habits existed on this date
                </ThemedText>
              ) : null}
              
              {selectedDate && badHabits.filter(bh => {
                if (bh.isArchived) return false;
                const createdDate = getLocalDateFromISO(bh.createdAt);
                return createdDate <= selectedDate;
              }).length > 0 ? (
                <>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.lg, marginBottom: Spacing.sm, fontWeight: "600" }}>
                    Bad Habits
                  </ThemedText>
                  {badHabits.filter(bh => {
                    if (bh.isArchived) return false;
                    const createdDate = getLocalDateFromISO(bh.createdAt);
                    return selectedDate && createdDate <= selectedDate;
                  }).map((bh) => {
                    const taps = selectedDate ? getBadHabitTapsForDate(bh.id, selectedDate) : 0;
                    
                    return (
                      <View key={bh.id} style={[styles.editHabitRow, { borderColor: theme.border }]}>
                        <View style={[styles.editHabitIcon, { backgroundColor: RED + "20" }]}>
                          <Feather name="alert-circle" size={18} color={RED} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText type="body" style={{ fontWeight: "500" }}>{bh.name}</ThemedText>
                          <ThemedText type="small" style={{ color: taps > 0 ? RED : GREEN }}>
                            {taps > 0 ? "Slipped (-10%)" : "Resisted"}
                          </ThemedText>
                        </View>
                        <View style={styles.editButtons}>
                          <Pressable
                            onPress={() => selectedDate && undoBadHabitTapForDate(bh.id, selectedDate)}
                            style={[styles.editButton, { backgroundColor: GREEN + "20", opacity: taps > 0 ? 1 : 0.3 }]}
                            disabled={taps === 0}
                          >
                            <Feather name="check" size={16} color={GREEN} />
                          </Pressable>
                          <ThemedText type="body" style={{ fontWeight: "600", minWidth: 32, textAlign: "center", color: taps > 0 ? RED : GREEN }}>
                            {taps > 0 ? "-10%" : "OK"}
                          </ThemedText>
                          <Pressable
                            onPress={() => selectedDate && tapBadHabitForDate(bh.id, selectedDate)}
                            style={[styles.editButton, { backgroundColor: RED + "20", opacity: taps === 0 ? 1 : 0.3 }]}
                            disabled={taps > 0}
                          >
                            <Feather name="x" size={16} color={RED} />
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  heatmapGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  heatmapWeek: {
    gap: 8,
    justifyContent: "flex-start",
  },
  heatmapMonth: {
    gap: 4,
    justifyContent: "flex-start",
  },
  heatmapYear: {
    gap: 2,
    justifyContent: "flex-start",
  },
  weekSquare: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  monthSquare: {
    width: 28,
    height: 28,
    borderRadius: 4,
  },
  yearSquare: {
    width: 14,
    height: 14,
    borderRadius: 2,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxHeight: "80%",
    borderRadius: 20,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalClose: {
    padding: Spacing.xs,
  },
  modalScroll: {
    maxHeight: 400,
  },
  editHabitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  editHabitIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  editButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});
