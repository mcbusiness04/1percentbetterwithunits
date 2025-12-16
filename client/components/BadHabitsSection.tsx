import React, { useCallback } from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { useUnits } from "@/lib/UnitsContext";
import { BadHabit } from "@/lib/storage";

interface BadHabitRowProps {
  badHabit: BadHabit;
  todayTaps: number;
  onTap: () => void;
  onUndo: () => void;
  onDelete: () => void;
}

function BadHabitRow({ badHabit, todayTaps, onTap, onUndo, onDelete }: BadHabitRowProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const isActive = todayTaps > 0;

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.95, { damping: 15 }, () => {
      scale.value = withSpring(1, { damping: 12 });
    });
    onTap();
  }, [onTap, scale]);

  const handleLongPress = useCallback(() => {
    Alert.alert(
      "Delete Bad Habit",
      `Remove "${badHabit.name}" from tracking?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ]
    );
  }, [badHabit.name, onDelete]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const backgroundColor = isActive ? theme.dangerLight : theme.successLight;
  const borderColor = isActive ? theme.danger : theme.success;
  const textColor = isActive ? theme.danger : theme.success;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        style={[
          styles.badHabitRow,
          {
            backgroundColor,
            borderColor,
            borderWidth: 1,
          },
        ]}
      >
        <View style={styles.badHabitContent}>
          <Feather 
            name={isActive ? "x-circle" : "check-circle"} 
            size={20} 
            color={textColor} 
          />
          <ThemedText type="body" style={[styles.badHabitName, { color: textColor }]}>
            {badHabit.name}
          </ThemedText>
        </View>
        <View style={styles.rightContent}>
          {todayTaps > 0 ? (
            <>
              <Pressable
                onPress={onUndo}
                style={[styles.undoButton, { backgroundColor: theme.backgroundDefault }]}
              >
                <Feather name="rotate-ccw" size={14} color={theme.textSecondary} />
              </Pressable>
              <View style={[styles.tapCount, { backgroundColor: theme.danger }]}>
                <ThemedText type="small" style={{ color: theme.buttonText, fontWeight: "600" }}>
                  -{todayTaps * 5}%
                </ThemedText>
              </View>
            </>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function BadHabitsSection() {
  const { theme } = useTheme();
  const { badHabits, deleteBadHabit, tapBadHabit, undoBadHabitTap, getTodayBadHabitTaps } = useUnits();

  const activeBadHabits = badHabits.filter((h) => !h.isArchived);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="h4">Bad Habits</ThemedText>
      </View>

      {activeBadHabits.length === 0 ? (
        <Animated.View 
          entering={FadeIn}
          style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}
        >
          <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
            Track bad habits you want to quit.{"\n"}Use the + button to add one.
          </ThemedText>
        </Animated.View>
      ) : (
        activeBadHabits.map((badHabit, index) => (
          <Animated.View key={badHabit.id} entering={FadeInDown.delay(100 + index * 50)}>
            <BadHabitRow
              badHabit={badHabit}
              todayTaps={getTodayBadHabitTaps(badHabit.id)}
              onTap={() => tapBadHabit(badHabit.id)}
              onUndo={() => undoBadHabitTap(badHabit.id)}
              onDelete={() => deleteBadHabit(badHabit.id)}
            />
          </Animated.View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  emptyState: {
    padding: Spacing.lg,
    borderRadius: 12,
    alignItems: "center",
  },
  badHabitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.sm,
  },
  badHabitContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  badHabitName: {
    fontWeight: "500",
  },
  rightContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  undoButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tapCount: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
  },
});
