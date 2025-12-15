import React, { useState, useCallback } from "react";
import { View, StyleSheet, TextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { HeaderButton } from "@react-navigation/elements";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, HabitColors, HABIT_ICONS } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { IconPicker } from "@/components/IconPicker";
import { ColorPicker } from "@/components/ColorPicker";
import { SoftFloorStepper } from "@/components/SoftFloorStepper";
import { Button } from "@/components/Button";
import { useUnits } from "@/lib/UnitsContext";
import { generateId } from "@/lib/storage";

export default function NewHabitScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { addHabit, habits, canAddHabit } = useUnits();

  const [name, setName] = useState("");
  const [unitName, setUnitName] = useState("");
  const [unitSize, setUnitSize] = useState("1");
  const [unitDescriptor, setUnitDescriptor] = useState("");
  const [softFloor, setSoftFloor] = useState(5);
  const [selectedIcon, setSelectedIcon] = useState(HABIT_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(HabitColors[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = name.trim().length > 0 && unitName.trim().length > 0;

  const handleCreate = useCallback(async () => {
    if (!isValid || isSubmitting) return;

    const existingHabit = habits.find(
      (h) => h.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (existingHabit) {
      Alert.alert("Duplicate Name", `You already have a habit named "${name.trim()}".`);
      return;
    }

    if (!canAddHabit()) {
      Alert.alert("Limit Reached", "Free tier allows 2 habits. Upgrade to Pro for unlimited habits.");
      return;
    }

    setIsSubmitting(true);

    try {
      const unitVersion = {
        id: generateId(),
        unitName: unitName.trim(),
        unitSize: parseFloat(unitSize) || 1,
        unitDescriptor: unitDescriptor.trim() || undefined,
        effectiveStartDate: new Date().toISOString().split("T")[0],
      };

      await addHabit({
        name: name.trim(),
        icon: selectedIcon,
        color: selectedColor,
        softFloorPerWeek: softFloor,
        unitVersions: [unitVersion],
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
    name,
    unitName,
    unitSize,
    unitDescriptor,
    selectedIcon,
    selectedColor,
    softFloor,
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
          Habit Name
        </ThemedText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g., Reading"
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
          Unit Name (singular)
        </ThemedText>
        <TextInput
          value={unitName}
          onChangeText={setUnitName}
          placeholder="e.g., page"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            {
              backgroundColor: theme.backgroundDefault,
              color: theme.text,
            },
          ]}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
            Unit Size
          </ThemedText>
          <TextInput
            value={unitSize}
            onChangeText={setUnitSize}
            placeholder="1"
            placeholderTextColor={theme.textSecondary}
            keyboardType="decimal-pad"
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
              },
            ]}
          />
        </View>
        <View style={[styles.inputGroup, { flex: 2, marginLeft: Spacing.md }]}>
          <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
            Descriptor (optional)
          </ThemedText>
          <TextInput
            value={unitDescriptor}
            onChangeText={setUnitDescriptor}
            placeholder="e.g., minutes, miles"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
              },
            ]}
          />
        </View>
      </View>

      <SoftFloorStepper value={softFloor} onChange={setSoftFloor} />

      <IconPicker
        selectedIcon={selectedIcon}
        onSelect={setSelectedIcon}
        color={selectedColor}
      />

      <ColorPicker selectedColor={selectedColor} onSelect={setSelectedColor} />

      <View style={[styles.preview, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
          Preview
        </ThemedText>
        <View style={styles.previewRow}>
          <View style={[styles.previewIcon, { backgroundColor: selectedColor + "20" }]}>
            <ThemedText style={{ color: selectedColor, fontSize: 24 }}>
              {selectedIcon ? "..." : "?"}
            </ThemedText>
          </View>
          <View>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {name || "Habit Name"}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {unitName || "unit"}
              {unitDescriptor ? ` (${unitSize} ${unitDescriptor})` : ""}
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
    marginBottom: Spacing.lg,
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
  row: {
    flexDirection: "row",
    marginBottom: Spacing.lg,
  },
  preview: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
