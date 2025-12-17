import React, { useMemo, useCallback, useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, Alert, ActionSheetIOS, Platform, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { useUnits } from "@/lib/UnitsContext";
import { TodayStackParamList } from "@/navigation/TodayStackNavigator";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type ScreenRouteProp = RouteProp<TodayStackParamList, "HabitDetail">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HabitDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const { habitId } = route.params;

  const {
    habits,
    logs,
    addUnits,
    removeUnits,
    deleteHabit,
    updateHabit,
    getTodayUnits,
    getWeekUnits,
    getMonthUnits,
    canAddUnits,
  } = useUnits();

  const [customAmount, setCustomAmount] = useState("");

  const habit = useMemo(
    () => habits.find((h) => h.id === habitId),
    [habits, habitId]
  );

  const habitLogs = useMemo(
    () => logs.filter((l) => l.habitId === habitId),
    [logs, habitId]
  );

  const todayUnits = habit ? getTodayUnits(habit.id) : 0;
  const weekUnits = habit ? getWeekUnits(habit.id) : 0;
  const monthUnits = habit ? getMonthUnits(habit.id) : 0;

  const avg7d = useMemo(() => {
    if (!habit) return 0;
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const y = sevenDaysAgo.getFullYear();
    const m = String(sevenDaysAgo.getMonth() + 1).padStart(2, "0");
    const d = String(sevenDaysAgo.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;
    const recentLogs = habitLogs.filter((l) => l.date >= dateStr);
    const total = recentLogs.reduce((sum, l) => sum + l.count, 0);
    return Math.round((total / 7) * 10) / 10;
  }, [habit, habitLogs]);

  const statusColor = useMemo(() => {
    if (!habit) return theme.textSecondary;
    if (todayUnits === 0) return "#FF4444";
    if (todayUnits < habit.dailyGoal) return "#FFB800";
    return "#34C759";
  }, [todayUnits, habit, theme.textSecondary]);

  const handleAddUnits = useCallback(
    async (count: number) => {
      if (!habit) return;
      if (!canAddUnits(count)) {
        navigation.navigate("Paywall", { reason: "units" });
        return;
      }
      await addUnits(habit.id, count);
    },
    [habit, addUnits, canAddUnits, navigation]
  );

  const handleRemoveUnits = useCallback(
    async (count: number) => {
      if (!habit) return;
      if (todayUnits === 0) {
        Alert.alert("No Units", "You haven't logged any units today to remove.");
        return;
      }
      await removeUnits(habit.id, count);
    },
    [habit, todayUnits, removeUnits]
  );

  const handleCustomAdd = useCallback(async () => {
    if (!habit) return;
    const amount = parseInt(customAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a positive number.");
      return;
    }
    const MAX_PER_TAP = 500;
    const clampedAmount = Math.min(amount, MAX_PER_TAP);
    if (!canAddUnits(clampedAmount)) {
      navigation.navigate("Paywall", { reason: "units" });
      return;
    }
    await addUnits(habit.id, clampedAmount);
    setCustomAmount("");
    if (amount > MAX_PER_TAP) {
      Alert.alert("Limit Applied", `Added ${clampedAmount} units (max ${MAX_PER_TAP} per tap).`);
    }
  }, [habit, customAmount, addUnits, canAddUnits, navigation]);

  const handleCustomRemove = useCallback(async () => {
    if (!habit) return;
    const amount = parseInt(customAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a positive number.");
      return;
    }
    if (todayUnits === 0) {
      Alert.alert("No Units", "You haven't logged any units today to remove.");
      return;
    }
    const clampedAmount = Math.min(amount, todayUnits);
    await removeUnits(habit.id, clampedAmount);
    setCustomAmount("");
  }, [habit, customAmount, todayUnits, removeUnits]);

  const handleMenuPress = useCallback(() => {
    if (!habit) return;

    const options = ["Cancel", "Archive Habit", "Delete Habit"];
    const destructiveButtonIndex = 2;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          destructiveButtonIndex,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            updateHabit(habit.id, { isArchived: true });
            navigation.goBack();
          } else if (buttonIndex === 2) {
            Alert.alert(
              "Delete Habit",
              "This will permanently delete this habit and all its data. This cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    await deleteHabit(habit.id);
                    navigation.goBack();
                  },
                },
              ]
            );
          }
        }
      );
    } else {
      Alert.alert("Habit Options", undefined, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive Habit",
          onPress: () => {
            updateHabit(habit.id, { isArchived: true });
            navigation.goBack();
          },
        },
        {
          text: "Delete Habit",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Delete Habit",
              "This will permanently delete this habit and all its data.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    await deleteHabit(habit.id);
                    navigation.goBack();
                  },
                },
              ]
            );
          },
        },
      ]);
    }
  }, [habit, updateHabit, deleteHabit, navigation]);

  if (!habit) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.centerContent}>
          <ThemedText type="body">Habit not found</ThemedText>
        </View>
      </View>
    );
  }

  const isGoalMet = todayUnits >= habit.dailyGoal && habit.dailyGoal > 0;

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
      <Animated.View entering={FadeIn} style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: habit.color + "20" }]}>
          <Feather name={habit.icon as any} size={32} color={habit.color} />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="h3">{habit.name}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Goal: {habit.dailyGoal} {habit.habitType === "time" ? `min of ${habit.unitName}` : habit.unitName} per day
          </ThemedText>
        </View>
        <Pressable onPress={handleMenuPress} style={styles.menuButton}>
          <Feather name="more-vertical" size={24} color={theme.text} />
        </Pressable>
      </Animated.View>

      <Animated.View 
        entering={FadeIn.delay(100)}
        style={[styles.progressCard, { 
          backgroundColor: theme.backgroundDefault, 
          borderColor: statusColor + "40",
          borderLeftColor: statusColor,
          borderLeftWidth: 4,
        }]}
      >
        <View style={styles.progressRow}>
          <View style={styles.progressMain}>
            <ThemedText type="h1" style={{ color: statusColor, fontSize: 48 }}>
              {todayUnits}
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              / {habit.dailyGoal} {habit.habitType === "time" ? "min" : habit.unitName}
            </ThemedText>
          </View>
          {isGoalMet ? (
            <View style={[styles.goalBadge, { backgroundColor: "#34C759" }]}>
              <Feather name="check" size={16} color="#fff" />
            </View>
          ) : null}
        </View>
      </Animated.View>

      <ThemedText type="h4" style={styles.sectionTitle}>
        Add Units
      </ThemedText>
      <View style={styles.actionRow}>
        <Pressable
          onPress={() => handleAddUnits(1)}
          style={[styles.actionButton, { backgroundColor: habit.color }]}
        >
          <ThemedText type="body" style={{ color: "white", fontWeight: "600" }}>
            +1
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => handleAddUnits(5)}
          style={[styles.actionButton, { backgroundColor: habit.color + "CC" }]}
        >
          <ThemedText type="body" style={{ color: "white", fontWeight: "600" }}>
            +5
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate("QuickAdd", { habitId: habit.id })}
          style={[styles.actionButton, { backgroundColor: habit.color + "99" }]}
        >
          <ThemedText type="body" style={{ color: "white", fontWeight: "600" }}>
            +...
          </ThemedText>
        </Pressable>
      </View>

      <ThemedText type="h4" style={styles.sectionTitle}>
        Remove Units
      </ThemedText>
      <View style={styles.actionRow}>
        <Pressable
          onPress={() => handleRemoveUnits(1)}
          style={[styles.actionButton, styles.removeButton, { 
            backgroundColor: todayUnits > 0 ? "#FF444420" : theme.backgroundDefault,
            borderColor: todayUnits > 0 ? "#FF4444" : theme.border,
          }]}
        >
          <ThemedText type="body" style={{ 
            color: todayUnits > 0 ? "#FF4444" : theme.textSecondary, 
            fontWeight: "600" 
          }}>
            -1
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => handleRemoveUnits(5)}
          style={[styles.actionButton, styles.removeButton, { 
            backgroundColor: todayUnits >= 5 ? "#FF444420" : theme.backgroundDefault,
            borderColor: todayUnits >= 5 ? "#FF4444" : theme.border,
          }]}
        >
          <ThemedText type="body" style={{ 
            color: todayUnits >= 5 ? "#FF4444" : theme.textSecondary, 
            fontWeight: "600" 
          }}>
            -5
          </ThemedText>
        </Pressable>
      </View>

      <ThemedText type="h4" style={styles.sectionTitle}>
        Custom Amount
      </ThemedText>
      <View style={styles.customInputRow}>
        <TextInput
          style={[styles.customInput, { 
            backgroundColor: theme.backgroundDefault,
            color: theme.text,
            borderColor: theme.border,
          }]}
          value={customAmount}
          onChangeText={(text) => {
            const cleaned = text.replace(/[^0-9]/g, "");
            setCustomAmount(cleaned);
          }}
          placeholder="Enter amount"
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          maxLength={4}
        />
        <Pressable
          onPress={handleCustomAdd}
          style={[styles.customButton, { backgroundColor: habit.color }]}
        >
          <Feather name="plus" size={20} color="white" />
        </Pressable>
        <Pressable
          onPress={handleCustomRemove}
          style={[styles.customButton, styles.removeButton, { 
            backgroundColor: todayUnits > 0 ? "#FF444420" : theme.backgroundDefault,
            borderColor: todayUnits > 0 ? "#FF4444" : theme.border,
          }]}
        >
          <Feather name="minus" size={20} color={todayUnits > 0 ? "#FF4444" : theme.textSecondary} />
        </Pressable>
      </View>
      <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xl }}>
        Max 500 per tap. Cannot go below 0.
      </ThemedText>

      <ThemedText type="h4" style={styles.sectionTitle}>
        Daily Goal
      </ThemedText>
      <View style={styles.incrementRow}>
        <Pressable
          onPress={() => {
            const newGoal = Math.max(1, habit.dailyGoal - 1);
            updateHabit(habit.id, { dailyGoal: newGoal });
          }}
          style={[styles.incrementButton, { backgroundColor: theme.backgroundDefault }]}
        >
          <Feather name="minus" size={20} color={theme.text} />
        </Pressable>
        <View style={[styles.incrementDisplay, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h4">{habit.dailyGoal}</ThemedText>
        </View>
        <Pressable
          onPress={() => {
            const newGoal = habit.dailyGoal + 1;
            updateHabit(habit.id, { dailyGoal: newGoal });
          }}
          style={[styles.incrementButton, { backgroundColor: theme.backgroundDefault }]}
        >
          <Feather name="plus" size={20} color={theme.text} />
        </Pressable>
        <ThemedText type="body" style={{ marginLeft: Spacing.sm, color: theme.textSecondary }}>
          {habit.habitType === "time" ? "min" : habit.unitName} per day
        </ThemedText>
      </View>

      <ThemedText type="h4" style={styles.sectionTitle}>
        Tap Increment
      </ThemedText>
      <View style={styles.incrementRow}>
        <Pressable
          onPress={() => {
            const newIncrement = Math.max(1, (habit.tapIncrement || 1) - 1);
            updateHabit(habit.id, { tapIncrement: newIncrement });
          }}
          style={[styles.incrementButton, { backgroundColor: theme.backgroundDefault }]}
        >
          <Feather name="minus" size={20} color={theme.text} />
        </Pressable>
        <View style={[styles.incrementDisplay, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h4">+{habit.tapIncrement || 1}</ThemedText>
        </View>
        <Pressable
          onPress={() => {
            const newIncrement = (habit.tapIncrement || 1) + 1;
            updateHabit(habit.id, { tapIncrement: newIncrement });
          }}
          style={[styles.incrementButton, { backgroundColor: theme.backgroundDefault }]}
        >
          <Feather name="plus" size={20} color={theme.text} />
        </Pressable>
        <ThemedText type="body" style={{ marginLeft: Spacing.sm, color: theme.textSecondary }}>
          {habit.habitType === "time" ? "min" : habit.unitName} per tap
        </ThemedText>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statChip, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            This Week
          </ThemedText>
          <ThemedText type="h4">{weekUnits}</ThemedText>
        </View>
        <View style={[styles.statChip, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            This Month
          </ThemedText>
          <ThemedText type="h4">{monthUnits}</ThemedText>
        </View>
        <View style={[styles.statChip, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Avg 7d
          </ThemedText>
          <ThemedText type="h4">{avg7d}</ThemedText>
        </View>
      </View>

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
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  headerText: {
    flex: 1,
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  progressCard: {
    padding: Spacing.xl,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: Spacing["2xl"],
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressMain: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.sm,
  },
  goalBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  removeButton: {
    borderWidth: 1,
  },
  incrementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  incrementButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  incrementDisplay: {
    minWidth: 60,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: Spacing.sm,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing["2xl"],
  },
  statChip: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 14,
    alignItems: "center",
  },
  customInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  customInput: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  customButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
