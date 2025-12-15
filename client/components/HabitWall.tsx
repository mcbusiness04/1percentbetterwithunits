import React, { useMemo } from "react";
import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, FREE_LIMITS } from "@/constants/theme";
import { Habit, UnitLog } from "@/lib/storage";
import { useUnits } from "@/lib/UnitsContext";

interface HabitWallProps {
  habit: Habit;
  logs: UnitLog[];
  onDayPress?: (date: string, units: number) => void;
}

const BLOCK_SIZE = 8;
const COLUMN_WIDTH = 28;
const MAX_VISIBLE_BLOCKS = 50;
const BUNDLE_SIZE = 5;

export function HabitWall({ habit, logs, onDayPress }: HabitWallProps) {
  const { theme } = useTheme();
  const { isPro } = useUnits();

  const daysToShow = isPro ? 14 : FREE_LIMITS.WALL_HISTORY_DAYS;

  const dayData = useMemo(() => {
    const result: { date: string; units: number; displayDate: string }[] = [];
    const today = new Date();

    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      
      const dayLogs = logs.filter((l) => l.date === dateStr);
      const units = dayLogs.reduce((sum, l) => sum + l.count, 0);

      const displayDate = date.getDate().toString();

      result.push({
        date: dateStr,
        units,
        displayDate,
      });
    }

    return result;
  }, [logs, daysToShow]);

  const renderBlocks = (units: number) => {
    if (units === 0) return null;

    const blocks: React.ReactNode[] = [];
    let remainingUnits = units;
    let blockIndex = 0;

    if (units > MAX_VISIBLE_BLOCKS) {
      while (remainingUnits > 0) {
        const bundleUnits = Math.min(BUNDLE_SIZE, remainingUnits);
        blocks.push(
          <View
            key={blockIndex}
            style={[
              styles.block,
              {
                width: BLOCK_SIZE,
                height: BLOCK_SIZE * 0.7,
                backgroundColor: habit.color,
              },
            ]}
          >
            {bundleUnits > 1 ? (
              <ThemedText style={styles.bundleText}>{bundleUnits}</ThemedText>
            ) : null}
          </View>
        );
        remainingUnits -= bundleUnits;
        blockIndex++;
      }
    } else {
      for (let i = 0; i < units; i++) {
        blocks.push(
          <View
            key={i}
            style={[
              styles.block,
              {
                width: BLOCK_SIZE,
                height: BLOCK_SIZE * 0.7,
                backgroundColor: habit.color,
              },
            ]}
          />
        );
      }
    }

    return blocks;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.header}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Last {daysToShow} days
        </ThemedText>
        {!isPro ? (
          <ThemedText type="small" style={{ color: theme.accent, fontSize: 11 }}>
            Pro unlocks full history
          </ThemedText>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {dayData.map((day, index) => {
          const isWeekStart = new Date(day.date).getDay() === 1;
          return (
            <Pressable
              key={day.date}
              onPress={() => onDayPress?.(day.date, day.units)}
              style={[
                styles.column,
                isWeekStart && styles.weekStart,
                { borderColor: theme.border },
              ]}
            >
              <View style={styles.blocksContainer}>
                {renderBlocks(day.units)}
              </View>
              <ThemedText type="small" style={[styles.dateLabel, { color: theme.textSecondary }]}>
                {day.displayDate}
              </ThemedText>
              {day.units > 0 ? (
                <ThemedText style={[styles.unitCount, { color: theme.textSecondary }]}>
                  {day.units}
                </ThemedText>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  scrollContent: {
    paddingRight: Spacing.md,
  },
  column: {
    width: COLUMN_WIDTH,
    alignItems: "center",
    paddingVertical: Spacing.xs,
    marginRight: 2,
  },
  weekStart: {
    borderLeftWidth: 1,
    paddingLeft: Spacing.xs,
  },
  blocksContainer: {
    minHeight: 80,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  block: {
    borderRadius: 2,
    marginVertical: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bundleText: {
    fontSize: 6,
    color: "white",
    fontWeight: "600",
  },
  dateLabel: {
    fontSize: 10,
    marginTop: Spacing.xs,
  },
  unitCount: {
    fontSize: 9,
    opacity: 0.6,
  },
});
