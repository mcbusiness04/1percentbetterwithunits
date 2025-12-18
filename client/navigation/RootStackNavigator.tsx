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
  Paywall: { reason?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { hasCompletedOnboarding, isPro, loading: unitsLoading } = useUnits();
  const { session, loading: authLoading } = useAuth();
  const { theme } = useTheme();

  const loading = unitsLoading || authLoading;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.backgroundRoot }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  // Flow: Onboarding (with paywall) → Auth → Main
  // 1. First show onboarding if not completed (includes paywall at step 5)
  if (!hasCompletedOnboarding) {
    return (
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  // 2. After onboarding, require sign in
  if (!session) {
    return (
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  // 3. Require premium status (from local storage, set during onboarding)
  if (!isPro) {
    return (
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  // 4. Main app (user is signed in, has completed onboarding, and has premium)
  return (
    <Stack.Navigator screenOptions={screenOptions}>
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
    </Stack.Navigator>
  );
}
