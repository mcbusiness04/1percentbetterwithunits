import React from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import NewHabitScreen from "@/screens/NewHabitScreen";
import NewTaskScreen from "@/screens/NewTaskScreen";
import QuickAddScreen from "@/screens/QuickAddScreen";
import PaywallScreen from "@/screens/PaywallScreen";
import OnboardingScreen from "@/screens/OnboardingScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useUnits } from "@/lib/UnitsContext";
import { useTheme } from "@/hooks/useTheme";

export type RootStackParamList = {
  Main: undefined;
  Onboarding: undefined;
  NewHabit: undefined;
  NewTask: undefined;
  QuickAdd: { habitId: string };
  Paywall: { reason: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { hasCompletedOnboarding, loading } = useUnits();
  const { theme } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.backgroundRoot }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {hasCompletedOnboarding ? (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="NewHabit"
            component={NewHabitScreen}
            options={{
              presentation: "modal",
              headerTitle: "New Habit",
            }}
          />
          <Stack.Screen
            name="NewTask"
            component={NewTaskScreen}
            options={{
              presentation: "modal",
              headerTitle: "New Task",
            }}
          />
          <Stack.Screen
            name="QuickAdd"
            component={QuickAddScreen}
            options={{
              presentation: "formSheet",
              headerTitle: "Quick Add",
            }}
          />
          <Stack.Screen
            name="Paywall"
            component={PaywallScreen}
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}
