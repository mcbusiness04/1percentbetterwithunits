import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useUnits } from "@/lib/UnitsContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type ScreenRouteProp = RouteProp<RootStackParamList, "QuickAdd">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const QUICK_VALUES = [1, 5, 10, 25, 50];
const MAX_UNITS = 999;

export default function QuickAddScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const { habitId, mode = "add" } = route.params;
  const isRemoveMode = mode === "remove";

  const { habits, addUnits, removeUnits, canAddUnits, getTodayUnits } = useUnits();
  const [count, setCount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const habit = useMemo(
    () => habits.find((h) => h.id === habitId),
    [habits, habitId]
  );

  const todayUnits = habit ? getTodayUnits(habit.id) : 0;
  const maxRemovable = todayUnits;

  const handleIncrement = useCallback(() => {
    const max = isRemoveMode ? maxRemovable : MAX_UNITS;
    setCount((prev) => Math.min(prev + 1, max));
  }, [isRemoveMode, maxRemovable]);

  const handleDecrement = useCallback(() => {
    setCount((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleQuickValue = useCallback((value: number) => {
    const max = isRemoveMode ? maxRemovable : MAX_UNITS;
    setCount((prev) => Math.min(prev + value, max));
  }, [isRemoveMode, maxRemovable]);

  const handleSubmit = useCallback(async () => {
    if (count === 0 || isSubmitting) return;

    if (isRemoveMode) {
      if (count > todayUnits) {
        Alert.alert("Not Enough Units", `You only have ${todayUnits} units to remove.`);
        return;
      }
      setIsSubmitting(true);
      try {
        const success = await removeUnits(habitId, count);
        if (success) {
          navigation.goBack();
        }
      } catch (error) {
        Alert.alert("Error", "Failed to remove units. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!canAddUnits(count)) {
        navigation.navigate("Paywall", { reason: "units" });
        return;
      }
      setIsSubmitting(true);
      try {
        const success = await addUnits(habitId, count);
        if (success) {
          navigation.goBack();
        } else {
          Alert.alert("Limit Reached", "You've reached the daily unit limit. Upgrade to Pro for unlimited units.");
        }
      } catch (error) {
        Alert.alert("Error", "Failed to add units. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [count, isSubmitting, isRemoveMode, todayUnits, canAddUnits, addUnits, removeUnits, habitId, navigation]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: isRemoveMode ? "Remove Units" : (habit?.name || "Quick Add"),
      headerLeft: () => (
        <HeaderButton onPress={() => navigation.goBack()}>
          <ThemedText type="body" style={{ color: theme.link }}>
            Cancel
          </ThemedText>
        </HeaderButton>
      ),
    });
  }, [navigation, theme, habit, isRemoveMode]);

  if (!habit) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <ThemedText type="body">Habit not found</ThemedText>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.habitHeader, { backgroundColor: habit.color + "15" }]}>
          <Feather name={habit.icon as any} size={24} color={habit.color} />
          <ThemedText type="body" style={{ fontWeight: "500", color: habit.color }}>
            {habit.name}
          </ThemedText>
        </View>

        <View style={styles.countSection}>
          <Pressable
            onPress={handleDecrement}
            disabled={count <= 0}
            style={[
              styles.controlButton,
              {
                backgroundColor: theme.backgroundDefault,
                opacity: count <= 0 ? 0.5 : 1,
              },
            ]}
          >
            <Feather name="minus" size={32} color={theme.text} />
          </Pressable>

          <View style={styles.countDisplay}>
            <ThemedText type="h1" style={[styles.countValue, { color: habit.color }]}>
              {count}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {habit.unitName}
            </ThemedText>
          </View>

          <Pressable
            onPress={handleIncrement}
            disabled={count >= MAX_UNITS}
            style={[
              styles.controlButton,
              {
                backgroundColor: theme.backgroundDefault,
                opacity: count >= MAX_UNITS ? 0.5 : 1,
              },
            ]}
          >
            <Feather name="plus" size={32} color={theme.text} />
          </Pressable>
        </View>

        <View style={styles.quickValues}>
          {QUICK_VALUES.map((value) => (
            <Pressable
              key={value}
              onPress={() => handleQuickValue(value)}
              style={[styles.quickButton, { 
                backgroundColor: isRemoveMode ? "#FF444420" : theme.backgroundDefault,
              }]}
            >
              <ThemedText type="body" style={{ 
                fontWeight: "500",
                color: isRemoveMode ? "#FF4444" : theme.text,
              }}>
                {isRemoveMode ? "-" : "+"}{value}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {!isRemoveMode && count > MAX_UNITS ? (
          <ThemedText
            type="small"
            style={{ color: theme.warning, textAlign: "center", marginTop: Spacing.md }}
          >
            Max 999 per add
          </ThemedText>
        ) : null}
        {isRemoveMode && todayUnits === 0 ? (
          <ThemedText
            type="small"
            style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.md }}
          >
            No units to remove today
          </ThemedText>
        ) : null}
      </View>

      <Button
        onPress={handleSubmit}
        disabled={count === 0 || isSubmitting || (isRemoveMode && todayUnits === 0)}
        style={[styles.addButton, { backgroundColor: isRemoveMode ? "#FF4444" : habit.color }]}
      >
        {isRemoveMode ? `Remove ${count}` : `Add ${count}`} {habit.unitName}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  habitHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 9999,
    alignSelf: "center",
    marginBottom: Spacing["3xl"],
  },
  countSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["3xl"],
  },
  controlButton: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  countDisplay: {
    alignItems: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  countValue: {
    fontSize: 64,
  },
  quickValues: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  quickButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 18,
  },
  addButton: {
    marginTop: Spacing.lg,
  },
});
