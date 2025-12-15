import React, { useCallback, useMemo } from "react";
import { View, ScrollView, StyleSheet, Pressable, ActionSheetIOS, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { PileTray } from "@/components/PileTray";
import { HabitRow } from "@/components/HabitRow";
import { TaskRow } from "@/components/TaskRow";
import { UndoToast } from "@/components/UndoToast";
import { Button } from "@/components/Button";
import { useUnits } from "@/lib/UnitsContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const {
    habits,
    tasks,
    loading,
    addUnits,
    completeTask,
    deleteTask,
    canAddHabit,
    canAddTask,
    canAddUnits,
    isPro,
  } = useUnits();

  const activeHabits = useMemo(
    () => habits.filter((h) => !h.isArchived),
    [habits]
  );

  const pendingTasks = useMemo(
    () => tasks.filter((t) => !t.isCompleted),
    [tasks]
  );

  const completedTasks = useMemo(
    () => tasks.filter((t) => t.isCompleted),
    [tasks]
  );

  const handleAddPress = useCallback(() => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "New Habit", "New Task"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            if (canAddHabit()) {
              navigation.navigate("NewHabit");
            } else {
              navigation.navigate("Paywall", { reason: "habits" });
            }
          } else if (buttonIndex === 2) {
            if (canAddTask()) {
              navigation.navigate("NewTask");
            } else {
              navigation.navigate("Paywall", { reason: "tasks" });
            }
          }
        }
      );
    } else {
      Alert.alert("Add", "What would you like to add?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "New Habit",
          onPress: () => {
            if (canAddHabit()) {
              navigation.navigate("NewHabit");
            } else {
              navigation.navigate("Paywall", { reason: "habits" });
            }
          },
        },
        {
          text: "New Task",
          onPress: () => {
            if (canAddTask()) {
              navigation.navigate("NewTask");
            } else {
              navigation.navigate("Paywall", { reason: "tasks" });
            }
          },
        },
      ]);
    }
  }, [canAddHabit, canAddTask, navigation]);

  const handleHabitPress = useCallback(
    async (habitId: string) => {
      if (!canAddUnits(1)) {
        navigation.navigate("Paywall", { reason: "units" });
        return;
      }
      await addUnits(habitId, 1);
    },
    [addUnits, canAddUnits, navigation]
  );

  const handleHabitLongPress = useCallback(
    (habitId: string) => {
      navigation.navigate("QuickAdd", { habitId });
    },
    [navigation]
  );

  const handleTaskComplete = useCallback(
    async (taskId: string) => {
      await completeTask(taskId);
    },
    [completeTask]
  );

  const handleTaskDelete = useCallback(
    (taskId: string) => {
      Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteTask(taskId),
        },
      ]);
    },
    [deleteTask]
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.loadingContainer}>
          <ThemedText type="body">Loading...</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing["4xl"],
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <PileTray />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h4">Habits</ThemedText>
            {!isPro && activeHabits.length >= 2 ? (
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {activeHabits.length}/2
              </ThemedText>
            ) : null}
          </View>

          {activeHabits.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText type="h4" style={styles.emptyTitle}>
                Start with one unit.
              </ThemedText>
              <ThemedText
                type="body"
                style={[styles.emptySubtitle, { color: theme.textSecondary }]}
              >
                Add your first habit to begin tracking your effort.
              </ThemedText>
              <Button
                onPress={() => navigation.navigate("NewHabit")}
                style={styles.emptyButton}
              >
                Add a habit
              </Button>
            </View>
          ) : (
            activeHabits.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                onPress={() => handleHabitPress(habit.id)}
                onLongPress={() => handleHabitLongPress(habit.id)}
              />
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h4">Tasks</ThemedText>
            {!isPro && pendingTasks.length >= 3 ? (
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {pendingTasks.length}/3
              </ThemedText>
            ) : null}
          </View>

          {pendingTasks.length === 0 && completedTasks.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText
                type="body"
                style={[styles.emptySubtitle, { color: theme.textSecondary }]}
              >
                Tasks are optional. Keep it light.
              </ThemedText>
              <Button
                onPress={() => {
                  if (canAddTask()) {
                    navigation.navigate("NewTask");
                  } else {
                    navigation.navigate("Paywall", { reason: "tasks" });
                  }
                }}
                style={styles.emptyButton}
              >
                Add a task
              </Button>
            </View>
          ) : (
            <>
              {pendingTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  linkedHabit={habits.find((h) => h.id === task.linkedHabitId)}
                  onComplete={() => handleTaskComplete(task.id)}
                  onDelete={() => handleTaskDelete(task.id)}
                />
              ))}
              {completedTasks.length > 0 ? (
                <View style={styles.completedSection}>
                  <ThemedText
                    type="small"
                    style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}
                  >
                    Completed ({completedTasks.length})
                  </ThemedText>
                  {completedTasks.slice(0, 3).map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      linkedHabit={habits.find((h) => h.id === task.linkedHabitId)}
                      onComplete={() => {}}
                      onDelete={() => handleTaskDelete(task.id)}
                    />
                  ))}
                </View>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      <Pressable
        onPress={handleAddPress}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: theme.accent,
            bottom: tabBarHeight + Spacing.xl,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Feather name="plus" size={24} color="white" />
      </Pressable>

      <UndoToast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  emptyState: {
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptySubtitle: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    minWidth: 160,
  },
  completedSection: {
    marginTop: Spacing.md,
    opacity: 0.7,
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
});
