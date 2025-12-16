import React, { useState, useCallback } from "react";
import { View, StyleSheet, TextInput, Alert, Pressable, ScrollView, Modal } from "react-native";
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
import { HABIT_COLORS, HABIT_ICONS, HabitType, suggestIconAndColor } from "@/lib/storage";

type CreationMode = "count" | "time" | "bad";

export default function NewHabitScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { addHabit, addBadHabit, habits, badHabits, canAddHabit } = useUnits();

  const [creationMode, setCreationMode] = useState<CreationMode>("count");
  const [unitName, setUnitName] = useState("");
  const [dailyGoal, setDailyGoal] = useState("5");
  const [tapIncrement, setTapIncrement] = useState("1");
  const [selectedIcon, setSelectedIcon] = useState<string>(HABIT_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState<string>(HABIT_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasManuallySetIcon, setHasManuallySetIcon] = useState(false);
  const [hasManuallySetColor, setHasManuallySetColor] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleUnitNameChange = useCallback((text: string) => {
    setUnitName(text);
    if (text.trim().length > 0) {
      const suggestion = suggestIconAndColor(text);
      if (!hasManuallySetIcon) {
        setSelectedIcon(suggestion.icon);
      }
      if (!hasManuallySetColor) {
        setSelectedColor(suggestion.color);
      }
    }
  }, [hasManuallySetIcon, hasManuallySetColor]);

  const handleIconSelect = useCallback((icon: string) => {
    setSelectedIcon(icon);
    setHasManuallySetIcon(true);
  }, []);

  const handleColorSelect = useCallback((color: string) => {
    setSelectedColor(color);
    setHasManuallySetColor(true);
  }, []);

  const isValid = unitName.trim().length > 0;
  const habitType: HabitType = creationMode === "time" ? "time" : "count";

  const capitalizeWords = (str: string) => {
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const handleModeChange = useCallback((mode: CreationMode) => {
    setCreationMode(mode);
    setUnitName("");
    setDailyGoal("5");
    setTapIncrement("1");
    setHasManuallySetIcon(false);
    setHasManuallySetColor(false);
    const suggestion = suggestIconAndColor("");
    setSelectedIcon(suggestion.icon);
    setSelectedColor(suggestion.color);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!isValid || isSubmitting) return;

    const habitName = capitalizeWords(unitName.trim());
    
    if (creationMode === "bad") {
      const existingBadHabit = badHabits.find(
        (h) => h.name.toLowerCase() === habitName.toLowerCase()
      );
      if (existingBadHabit) {
        Alert.alert("Duplicate", `You already have a bad habit named "${habitName}".`);
        return;
      }

      setIsSubmitting(true);
      try {
        await addBadHabit(habitName);
        navigation.goBack();
      } catch (error) {
        Alert.alert("Error", "Failed to create bad habit. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
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
          habitType,
        });

        navigation.goBack();
      } catch (error) {
        Alert.alert("Error", "Failed to create habit. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [
    isValid,
    isSubmitting,
    creationMode,
    habits,
    badHabits,
    unitName,
    dailyGoal,
    tapIncrement,
    habitType,
    selectedIcon,
    selectedColor,
    addHabit,
    addBadHabit,
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
          Tracking type
        </ThemedText>
        <View style={styles.typeToggle}>
          <Pressable
            onPress={() => handleModeChange("count")}
            style={[
              styles.typeButton,
              {
                backgroundColor: creationMode === "count" ? theme.link : theme.backgroundDefault,
              },
            ]}
          >
            <Feather name="hash" size={18} color={creationMode === "count" ? theme.buttonText : theme.text} />
            <ThemedText
              type="body"
              style={{ color: creationMode === "count" ? theme.buttonText : theme.text, marginLeft: Spacing.xs }}
            >
              Count
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => handleModeChange("time")}
            style={[
              styles.typeButton,
              {
                backgroundColor: creationMode === "time" ? theme.link : theme.backgroundDefault,
              },
            ]}
          >
            <Feather name="clock" size={18} color={creationMode === "time" ? theme.buttonText : theme.text} />
            <ThemedText
              type="body"
              style={{ color: creationMode === "time" ? theme.buttonText : theme.text, marginLeft: Spacing.xs }}
            >
              Time
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => handleModeChange("bad")}
            style={[
              styles.typeButton,
              {
                backgroundColor: creationMode === "bad" ? theme.danger : theme.backgroundDefault,
              },
            ]}
          >
            <Feather name="x-circle" size={18} color={creationMode === "bad" ? theme.buttonText : theme.text} />
            <ThemedText
              type="body"
              style={{ color: creationMode === "bad" ? theme.buttonText : theme.text, marginLeft: Spacing.xs }}
            >
              Bad
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
          {creationMode === "bad" 
            ? "What bad habit are you avoiding?" 
            : creationMode === "time" 
              ? "What are you timing?" 
              : "What are you counting?"}
        </ThemedText>
        <TextInput
          value={unitName}
          onChangeText={handleUnitNameChange}
          placeholder={
            creationMode === "bad" 
              ? "e.g., soda, social media, snacking" 
              : creationMode === "time" 
                ? "e.g., reading, meditation, exercise" 
                : "e.g., push ups, pages, glasses of water"
          }
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
        {creationMode === "time" ? (
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
            Time habits track minutes and glow brighter
          </ThemedText>
        ) : creationMode === "bad" ? (
          <ThemedText type="small" style={{ color: theme.danger, marginTop: Spacing.xs }}>
            Each tap deducts 5% from your daily progress
          </ThemedText>
        ) : null}
      </View>

      {creationMode !== "bad" ? (
        <>
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
                {creationMode === "time" ? "minutes" : unitName || "units"} per day
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
                {creationMode === "time" ? "min" : unitName || "units"} per tap
              </ThemedText>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
              Icon & Color (auto-assigned)
            </ThemedText>
            <View style={styles.customizeRow}>
              <Pressable
                onPress={() => setShowIconPicker(true)}
                style={[styles.customizeButton, { backgroundColor: selectedColor + "20", borderColor: selectedColor }]}
              >
                <Feather name={selectedIcon as any} size={24} color={selectedColor} />
                <View style={styles.editBadge}>
                  <Feather name="edit-2" size={10} color={theme.buttonText} />
                </View>
              </Pressable>
              <Pressable
                onPress={() => setShowColorPicker(true)}
                style={[styles.customizeButton, { backgroundColor: selectedColor }]}
              >
                <View style={styles.editBadge}>
                  <Feather name="edit-2" size={10} color={theme.buttonText} />
                </View>
              </Pressable>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.md, flex: 1 }}>
                Tap to change
              </ThemedText>
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
                  Goal: {dailyGoal} {creationMode === "time" ? "min" : unitName || "units"}/day | +{tapIncrement} {creationMode === "time" ? "min" : unitName || "units"} per tap
                </ThemedText>
              </View>
            </View>
          </View>
        </>
      ) : (
        <View style={[styles.preview, { backgroundColor: theme.dangerLight, borderColor: theme.danger }]}>
          <View style={styles.previewRow}>
            <View style={[styles.previewIcon, { backgroundColor: theme.dangerLight }]}>
              <Feather name="x-circle" size={24} color={theme.danger} />
            </View>
            <View style={styles.previewText}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {capitalizeWords(unitName) || "Your Bad Habit"}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.danger }}>
                -5% penalty per tap
              </ThemedText>
            </View>
          </View>
        </View>
      )}

      <Modal
        visible={showIconPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowIconPicker(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <ThemedText type="body" style={{ fontWeight: "600", fontSize: 18 }}>Pick an Icon</ThemedText>
            <Pressable onPress={() => setShowIconPicker(false)}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.pickerGrid}>
            {HABIT_ICONS.map((icon) => (
              <Pressable
                key={icon}
                onPress={() => {
                  handleIconSelect(icon);
                  setShowIconPicker(false);
                }}
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
      </Modal>

      <Modal
        visible={showColorPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowColorPicker(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <ThemedText type="body" style={{ fontWeight: "600", fontSize: 18 }}>Pick a Color</ThemedText>
            <Pressable onPress={() => setShowColorPicker(false)}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          <View style={styles.pickerGrid}>
            {HABIT_COLORS.map((color) => (
              <Pressable
                key={color}
                onPress={() => {
                  handleColorSelect(color);
                  setShowColorPicker(false);
                }}
                style={[
                  styles.colorOptionLarge,
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
      </Modal>
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
  typeToggle: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
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
  colorOptionLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  customizeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  customizeButton: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    position: "relative",
  },
  editBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  pickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
});
