import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Habit } from "@/lib/storage";
import { useUnits } from "@/lib/UnitsContext";

interface HabitRowProps {
  habit: Habit;
  onPress: () => void;
  onLongPress: () => void;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function HabitRow({ habit, onPress, onLongPress }: HabitRowProps) {
  const { theme } = useTheme();
  const { getTodayUnits, getWeekUnits, getLifetimeUnits, isUnderPace } = useUnits();
  const scale = useSharedValue(1);

  const todayUnits = getTodayUnits(habit.id);
  const weekUnits = getWeekUnits(habit.id);
  const lifetimeUnits = getLifetimeUnits(habit.id);
  const underPace = isUnderPace(habit);

  const currentUnitVersion = habit.unitVersions[habit.unitVersions.length - 1];
  const unitName = currentUnitVersion?.unitName || "unit";

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const colorWithAlpha = habit.color + "15";

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      delayLongPress={300}
      style={[
        styles.container,
        {
          backgroundColor: theme.cardBackground,
          borderLeftColor: habit.color,
        },
        animatedStyle,
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: colorWithAlpha }]}>
        <Feather name={habit.icon as any} size={20} color={habit.color} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <ThemedText type="body" style={styles.habitName}>
            {habit.name}
          </ThemedText>
          {underPace ? (
            <View style={[styles.paceIndicator, { backgroundColor: theme.warningLight }]}>
              <View style={[styles.paceDot, { backgroundColor: theme.warning }]} />
              <ThemedText type="small" style={{ color: theme.warning }}>
                Under pace
              </ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {unitName}
        </ThemedText>
      </View>
      <View style={styles.stats}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Today {todayUnits} • Week {weekUnits}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary, opacity: 0.6, fontSize: 11 }}>
          Lifetime {lifetimeUnits}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    minHeight: 72,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 2,
  },
  habitName: {
    fontWeight: "600",
  },
  paceIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  paceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stats: {
    alignItems: "flex-end",
  },
});
