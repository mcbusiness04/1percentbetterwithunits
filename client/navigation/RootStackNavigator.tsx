/**
 * ============================================================================
 * ROOT STACK NAVIGATOR - CENTRALIZED APP GATING
 * ============================================================================
 * 
 * This component controls the entire app flow and enforces the paywall gate.
 * 
 * FLOW:
 * 1. First launch → Onboarding (with HARD PAYWALL at final step)
 * 2. After purchase → Auth screen (sign up / log in)
 * 3. After auth → Main app
 * 
 * IMPORTANT: The ONLY paywall is in the Onboarding flow.
 * If users don't pay, they cannot proceed to Auth or Main app.
 * 
 * ============================================================================
 */

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
  const { hasCompletedOnboarding, loading: unitsLoading } = useUnits();
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

  // ============================================================================
  // GATE 1: ONBOARDING (includes HARD PAYWALL as final step)
  // ============================================================================
  // First-time users must complete onboarding AND purchase to proceed.
  // This is the ONLY paywall in the entire app.
  if (!hasCompletedOnboarding) {
    return (
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: false,
          }}
        />
      </Stack.Navigator>
    );
  }

  // ============================================================================
  // GATE 2: AUTHENTICATION (after onboarding/purchase)
  // ============================================================================
  // User must sign in to sync their data
  if (!session) {
    return (
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: false,
          }}
        />
      </Stack.Navigator>
    );
  }

  // ============================================================================
  // MAIN APP (all gates passed)
  // ============================================================================
  // User has completed onboarding (paid) AND is authenticated
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
