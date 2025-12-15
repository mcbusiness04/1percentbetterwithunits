import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, HabitColors } from "@/constants/theme";
import { useUnits } from "@/lib/UnitsContext";

const BLOCK_SIZE = 12;
const MAX_VISUAL_BLOCKS = 60;
const BUNDLE_THRESHOLD = 50;

export function PileTray() {
  const { theme } = useTheme();
  const { logs, habits, getTodayTotalUnits, getLogsForDate } = useUnits();
  const totalUnits = getTodayTotalUnits();

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const todayLogs = useMemo(() => getLogsForDate(today), [getLogsForDate, today]);

  const blocks = useMemo(() => {
    const result: { color: string; id: string }[] = [];
    
    todayLogs.forEach((log) => {
      const habit = habits.find((h) => h.id === log.habitId);
      const color = habit?.color || HabitColors[0];
      
      for (let i = 0; i < log.count; i++) {
        result.push({
          color,
          id: `${log.id}-${i}`,
        });
      }
    });

    if (result.length > MAX_VISUAL_BLOCKS) {
      const bundleSize = Math.ceil(result.length / MAX_VISUAL_BLOCKS);
      const bundled: { color: string; id: string }[] = [];
      for (let i = 0; i < result.length; i += bundleSize) {
        bundled.push(result[i]);
      }
      return bundled;
    }

    return result;
  }, [todayLogs, habits]);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.header}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Today
        </ThemedText>
        <ThemedText type="h4">Total Units: {totalUnits}</ThemedText>
      </View>
      <View style={styles.tray}>
        {blocks.length === 0 ? (
          <View style={styles.emptyTray}>
            <ThemedText type="small" style={{ color: theme.textSecondary, opacity: 0.5 }}>
              Tap a habit to drop your first unit
            </ThemedText>
          </View>
        ) : (
          <View style={styles.blockContainer}>
            {blocks.map((block) => (
              <View
                key={block.id}
                style={[
                  styles.block,
                  {
                    width: BLOCK_SIZE,
                    height: BLOCK_SIZE * 0.7,
                    backgroundColor: block.color,
                  },
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.md,
  },
  tray: {
    minHeight: 60,
    justifyContent: "flex-end",
  },
  emptyTray: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
  },
  blockContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
  },
  block: {
    borderRadius: 2,
    margin: 1,
  },
});
