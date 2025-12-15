import React, { useState, useCallback } from "react";
import { View, StyleSheet, TextInput, Alert, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { HeaderButton } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useUnits } from "@/lib/UnitsContext";
import { HABIT_COLORS, HABIT_ICONS } from "@/lib/storage";

export default function NewHabitScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { addHabit, habits, canAddHabit } = useUnits();

  const [unitName, setUnitName] = useState("");
  const [dailyGoal, setDailyGoal] = useState("5");
  const [tapIncrement, setTapIncrement] = useState("1");
  const [selectedIcon, setSelectedIcon] = useState<string>(HABIT_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState<string>(HABIT_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = unitName.trim().length > 0;

  const capitalizeWords = (str: string) => {
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const handleCreate = useCallback(async () => {
    if (!isValid || isSubmitting) return;

    const habitName = capitalizeWords(unitName.trim());
    
    const existingHabit = habits.find(
      (h) => h.name.toLowerCase() === habitName.toLowerCase()
    );
    if (existingHabit) {
      Alert.alert("Duplicate", `You already have a habit for "${habitName}".`);
      return;
    }

    if (!canAddHabit()) {
      Alert.alert("Limit Reached", "Free tier allows 3 habits. Upgrade to Pro for unlimited habits.");
      return;
    }

    setIsSubmitting(true);

    try {
      await addHabit({
        name: habitName,
        icon: selectedIcon,
        color: selectedColor,
        unitName: unitName.trim(),
        dailyGoal: parseInt(dailyGoal) || 5,
        tapIncrement: parseInt(tapIncrement) || 1,
      });

      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to create habit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isValid,
    isSubmitting,
    habits,
    unitName,
    dailyGoal,
    tapIncrement,
    selectedIcon,
    selectedColor,
    addHabit,
    canAddHabit,
    navigation,
  ]);

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
          What are you counting?
        </ThemedText>
        <TextInput
          value={unitName}
          onChangeText={setUnitName}
          placeholder="e.g., push ups, pages, minutes, glasses of water"
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
          Daily goal
        </ThemedText>
        <View style={styles.goalRow}>
          <Pressable
            onPress={() => setDailyGoal(String(Math.max(1, parseInt(dailyGoal) - 1)))}
            style={[styles.goalButton, { backgroundColor: theme.backgroundDefault }]}
          >
            <Feather name="minus" size={20} color={theme.text} />
          </Pressable>
          <TextInput
            value={dailyGoal}
            onChangeText={setDailyGoal}
            keyboardType="number-pad"
            style={[
              styles.goalInput,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
              },
            ]}
          />
          <Pressable
            onPress={() => setDailyGoal(String(parseInt(dailyGoal) + 1))}
            style={[styles.goalButton, { backgroundColor: theme.backgroundDefault }]}
          >
            <Feather name="plus" size={20} color={theme.text} />
          </Pressable>
          <ThemedText type="body" style={{ marginLeft: Spacing.sm, color: theme.textSecondary }}>
            {unitName || "units"} per day
          </ThemedText>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
          Add per tap
        </ThemedText>
        <View style={styles.goalRow}>
          <Pressable
            onPress={() => setTapIncrement(String(Math.max(1, parseInt(tapIncrement) - 1)))}
            style={[styles.goalButton, { backgroundColor: theme.backgroundDefault }]}
          >
            <Feather name="minus" size={20} color={theme.text} />
          </Pressable>
          <TextInput
            value={tapIncrement}
            onChangeText={setTapIncrement}
            keyboardType="number-pad"
            style={[
              styles.goalInput,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
              },
            ]}
          />
          <Pressable
            onPress={() => setTapIncrement(String(parseInt(tapIncrement) + 1))}
            style={[styles.goalButton, { backgroundColor: theme.backgroundDefault }]}
          >
            <Feather name="plus" size={20} color={theme.text} />
          </Pressable>
          <ThemedText type="body" style={{ marginLeft: Spacing.sm, color: theme.textSecondary }}>
            {unitName || "units"} per tap
          </ThemedText>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
          Pick an icon
        </ThemedText>
        <ScrollView 
          horizontal={false} 
          style={styles.iconScrollView}
          contentContainerStyle={styles.iconGrid}
          showsVerticalScrollIndicator={false}
        >
          {HABIT_ICONS.map((icon) => (
            <Pressable
              key={icon}
              onPress={() => setSelectedIcon(icon)}
              style={[
                styles.iconOption,
                {
                  backgroundColor: selectedIcon === icon ? selectedColor + "30" : theme.backgroundDefault,
                  borderColor: selectedIcon === icon ? selectedColor : "transparent",
                },
              ]}
            >
              <Feather name={icon as any} size={22} color={selectedIcon === icon ? selectedColor : theme.textSecondary} />
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
          Pick a color
        </ThemedText>
        <View style={styles.colorGrid}>
          {HABIT_COLORS.map((color) => (
            <Pressable
              key={color}
              onPress={() => setSelectedColor(color)}
              style={[
                styles.colorOption,
                {
                  backgroundColor: color,
                  borderColor: selectedColor === color ? theme.text : "transparent",
                  borderWidth: selectedColor === color ? 3 : 0,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={[styles.preview, { backgroundColor: selectedColor + "20", borderColor: selectedColor + "40" }]}>
        <View style={styles.previewRow}>
          <View style={[styles.previewIcon, { backgroundColor: selectedColor + "30" }]}>
            <Feather name={selectedIcon as any} size={24} color={selectedColor} />
          </View>
          <View style={styles.previewText}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {capitalizeWords(unitName) || "Your Habit"}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Goal: {dailyGoal} {unitName || "units"}/day | +{tapIncrement} per tap
            </ThemedText>
          </View>
        </View>
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
    marginBottom: Spacing.xl,
  },
  label: {
    marginBottom: Spacing.sm,
    fontWeight: "500",
  },
  input: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  goalButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  goalInput: {
    width: 60,
    height: 44,
    borderRadius: 12,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    marginHorizontal: Spacing.sm,
  },
  iconScrollView: {
    maxHeight: 200,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  preview: {
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  previewText: {
    flex: 1,
  },
});
