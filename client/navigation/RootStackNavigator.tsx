import React from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import NewHabitScreen from "@/screens/NewHabitScreen";
import QuickAddScreen from "@/screens/QuickAddScreen";
import PaywallScreen from "@/screens/PaywallScreen";
import OnboardingScreen from "@/screens/OnboardingScreen";
import AuthScreen from "@/screens/AuthScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useUnits } from "@/lib/UnitsContext";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/hooks/useTheme";

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Onboarding: undefined;
  NewHabit: undefined;
  QuickAdd: { habitId: string; mode?: "add" | "remove" };
  Paywall: { reason: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { hasCompletedOnboarding, loading: unitsLoading } = useUnits();
  const { session, loading: authLoading, isPremium } = useAuth();
  const { theme } = useTheme();

  const loading = unitsLoading || authLoading;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.backgroundRoot }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!session ? (
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ headerShown: false }}
        />
      ) : !hasCompletedOnboarding ? (
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
      ) : !isPremium ? (
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{ headerShown: false }}
        />
      ) : (
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
      )}
    </Stack.Navigator>
  );
}
