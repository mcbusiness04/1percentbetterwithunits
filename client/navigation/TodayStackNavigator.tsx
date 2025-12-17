import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { Alert, View, Text, StyleSheet } from "react-native";
import TodayScreen from "@/screens/TodayScreen";
import HabitDetailScreen from "@/screens/HabitDetailScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTheme } from "@/hooks/useTheme";
import { useUnits } from "@/lib/UnitsContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

export type TodayStackParamList = {
  Today: undefined;
  HabitDetail: { habitId: string };
};

const Stack = createNativeStackNavigator<TodayStackParamList>();

function AddHabitButton() {
  const { theme } = useTheme();
  const { canAddHabit } = useUnits();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handlePress = () => {
    if (!canAddHabit()) {
      Alert.alert(
        "Upgrade to Pro",
        "You've reached the free limit of 3 habits. Upgrade to Pro for unlimited habits!",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Upgrade", onPress: () => navigation.navigate("Paywall", { reason: "habits" }) },
        ]
      );
      return;
    }
    navigation.navigate("NewHabit");
  };

  return (
    <HeaderButton onPress={handlePress}>
      <View style={styles.addButton}>
        <Feather name="plus" size={18} color={theme.accent} />
        <Text style={[styles.addButtonText, { color: theme.accent }]}>Add Habit</Text>
      </View>
    </HeaderButton>
  );
}

const styles = StyleSheet.create({
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});

export default function TodayStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Today"
        component={TodayScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Units" />,
          headerRight: () => <AddHabitButton />,
        }}
      />
      <Stack.Screen
        name="HabitDetail"
        component={HabitDetailScreen}
        options={({ route }) => ({
          headerTitle: "",
        })}
      />
    </Stack.Navigator>
  );
}
