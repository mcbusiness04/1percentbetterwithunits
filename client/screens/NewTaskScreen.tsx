import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, TextInput, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { HeaderButton } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useUnits } from "@/lib/UnitsContext";

const UNIT_OPTIONS = [1, 2, 3, 4, 5];

export default function NewTaskScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { addTask, habits, canAddTask } = useUnits();

  const [title, setTitle] = useState("");
  const [unitEstimate, setUnitEstimate] = useState(1);
  const [linkedHabitId, setLinkedHabitId] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeHabits = useMemo(
    () => habits.filter((h) => !h.isArchived),
    [habits]
  );

  const isValid = title.trim().length > 0;

  const handleCreate = useCallback(async () => {
    if (!isValid || isSubmitting) return;

    if (!canAddTask()) {
      Alert.alert("Limit Reached", "Free tier allows 3 tasks. Upgrade to Pro for unlimited tasks.");
      return;
    }

    setIsSubmitting(true);

    try {
      await addTask({
        title: title.trim(),
        unitEstimate,
        linkedHabitId,
      });

      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to create task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [isValid, isSubmitting, title, unitEstimate, linkedHabitId, addTask, canAddTask, navigation]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <HeaderButton onPress={() => navigation.goBack()}>
          <ThemedText type="body" style={{ color: theme.link }}>
            Cancel
          </ThemedText>
        </HeaderButton>
      ),
      headerRight: () => (
        <HeaderButton onPress={handleCreate} disabled={!isValid || isSubmitting}>
          <ThemedText
            type="body"
            style={{
              color: isValid && !isSubmitting ? theme.link : theme.textSecondary,
              fontWeight: "600",
            }}
          >
            Create
          </ThemedText>
        </HeaderButton>
      ),
    });
  }, [navigation, theme, isValid, isSubmitting, handleCreate]);

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <View style={styles.inputGroup}>
        <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
          Task Title
        </ThemedText>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="What do you need to do?"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            {
              backgroundColor: theme.backgroundDefault,
              color: theme.text,
            },
          ]}
          autoFocus
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
          Unit Estimate
        </ThemedText>
        <View style={styles.unitOptions}>
          {UNIT_OPTIONS.map((units) => (
            <Pressable
              key={units}
              onPress={() => setUnitEstimate(units)}
              style={[
                styles.unitOption,
                {
                  backgroundColor:
                    unitEstimate === units ? theme.accent : theme.backgroundDefault,
                },
              ]}
            >
              <ThemedText
                type="body"
                style={{
                  color: unitEstimate === units ? "white" : theme.text,
                  fontWeight: "600",
                }}
              >
                {units}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
          Link to Habit (optional)
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
          Completing this task will log units to the linked habit
        </ThemedText>

        {activeHabits.length === 0 ? (
          <View style={[styles.noHabits, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="inbox" size={24} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              No habits yet. Create a habit first to link tasks.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.habitOptions}>
            <Pressable
              onPress={() => setLinkedHabitId(undefined)}
              style={[
                styles.habitOption,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor:
                    linkedHabitId === undefined ? theme.accent : theme.border,
                },
              ]}
            >
              <ThemedText type="small">No link</ThemedText>
            </Pressable>
            {activeHabits.map((habit) => (
              <Pressable
                key={habit.id}
                onPress={() => setLinkedHabitId(habit.id)}
                style={[
                  styles.habitOption,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor:
                      linkedHabitId === habit.id ? habit.color : theme.border,
                  },
                ]}
              >
                <View
                  style={[styles.habitDot, { backgroundColor: habit.color }]}
                />
                <ThemedText type="small">{habit.name}</ThemedText>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing["2xl"],
  },
  label: {
    marginBottom: Spacing.sm,
    fontWeight: "500",
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  unitOptions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  unitOption: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  habitOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  habitOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    gap: Spacing.xs,
  },
  habitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  noHabits: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
});
