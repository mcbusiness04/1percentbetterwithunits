import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, TextInput, Alert, Modal } from "react-native";
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
  onDelete: () => void;
}

function BadHabitRow({ badHabit, todayTaps, onTap, onDelete }: BadHabitRowProps) {
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

  const backgroundColor = isActive ? "#FF444420" : "#34C75920";
  const borderColor = isActive ? "#FF4444" : "#34C759";
  const textColor = isActive ? "#FF4444" : "#34C759";

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
        {todayTaps > 0 ? (
          <View style={[styles.tapCount, { backgroundColor: "#FF4444" }]}>
            <ThemedText type="small" style={{ color: "#fff", fontWeight: "600" }}>
              -{todayTaps * 5}%
            </ThemedText>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export function BadHabitsSection() {
  const { theme } = useTheme();
  const { badHabits, addBadHabit, deleteBadHabit, tapBadHabit, getTodayBadHabitTaps } = useUnits();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBadHabitName, setNewBadHabitName] = useState("");

  const activeBadHabits = badHabits.filter((h) => !h.isArchived);

  const handleAddBadHabit = useCallback(async () => {
    if (newBadHabitName.trim().length === 0) return;
    await addBadHabit(newBadHabitName.trim());
    setNewBadHabitName("");
    setShowAddModal(false);
  }, [newBadHabitName, addBadHabit]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="h4">Bad Habits</ThemedText>
        <Pressable
          onPress={() => setShowAddModal(true)}
          style={[styles.addButton, { backgroundColor: theme.backgroundDefault }]}
        >
          <Feather name="plus" size={16} color={theme.text} />
        </Pressable>
      </View>

      {activeBadHabits.length === 0 ? (
        <Animated.View 
          entering={FadeIn}
          style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}
        >
          <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
            Track bad habits you want to quit.{"\n"}Tapping them deducts 5% from your progress.
          </ThemedText>
        </Animated.View>
      ) : (
        activeBadHabits.map((badHabit, index) => (
          <Animated.View key={badHabit.id} entering={FadeInDown.delay(100 + index * 50)}>
            <BadHabitRow
              badHabit={badHabit}
              todayTaps={getTodayBadHabitTaps(badHabit.id)}
              onTap={() => tapBadHabit(badHabit.id)}
              onDelete={() => deleteBadHabit(badHabit.id)}
            />
          </Animated.View>
        ))
      )}

      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowAddModal(false)}
        >
          <Pressable 
            style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText type="h4" style={styles.modalTitle}>
              Add Bad Habit
            </ThemedText>
            <TextInput
              value={newBadHabitName}
              onChangeText={setNewBadHabitName}
              placeholder="e.g., Smoking, Junk food, Social media"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.backgroundRoot,
                  color: theme.text,
                },
              ]}
              autoFocus
              onSubmitEditing={handleAddBadHabit}
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowAddModal(false)}
                style={[styles.modalButton, { backgroundColor: theme.backgroundRoot }]}
              >
                <ThemedText type="body" style={{ color: theme.textSecondary }}>
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleAddBadHabit}
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: newBadHabitName.trim() ? "#FF4444" : theme.backgroundRoot,
                  },
                ]}
                disabled={!newBadHabitName.trim()}
              >
                <ThemedText
                  type="body"
                  style={{
                    color: newBadHabitName.trim() ? "#fff" : theme.textSecondary,
                    fontWeight: "600",
                  }}
                >
                  Add
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
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
  },
  badHabitName: {
    fontWeight: "500",
  },
  tapCount: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    width: "85%",
    maxWidth: 360,
    padding: Spacing.xl,
    borderRadius: 20,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  modalInput: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
