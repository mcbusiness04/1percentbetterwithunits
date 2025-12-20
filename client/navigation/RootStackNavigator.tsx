/**
 * ============================================================================
 * ROOT STACK NAVIGATOR - CENTRALIZED APP GATING
 * ============================================================================
 * 
 * This component controls the entire app flow and enforces the paywall gate.
 * 
 * FLOW:
 * 1. First launch → Onboarding (with paywall at final step)
 * 2. After purchase → Auth screen (sign up / log in)
 * 3. After auth → Main app (if premium validated)
 * 4. Future launches → Skip onboarding/paywall for premium users
 * 
 * GATING LOGIC:
 * - Onboarding completion persisted in AsyncStorage
 * - Premium status checked from local storage AND Supabase
 * - All gates are HARD gates with no back navigation
 * 
 * ============================================================================
 */

import React, { useEffect, useState } from "react";
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
import { validatePremiumAccess } from "@/lib/storekit";

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
  const { session, user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  
  // Additional validation state
  const [validatingPremium, setValidatingPremium] = useState(false);
  const [premiumValidated, setPremiumValidated] = useState(false);

  // Validate premium access when user logs in
  useEffect(() => {
    async function validateOnLogin() {
      if (user && hasCompletedOnboarding && !premiumValidated) {
        setValidatingPremium(true);
        try {
          const isValid = await validatePremiumAccess(user.id);
          setPremiumValidated(isValid);
        } catch (error) {
          console.log("[RootStack] Premium validation error:", error);
        } finally {
          setValidatingPremium(false);
        }
      }
    }
    
    validateOnLogin();
  }, [user, hasCompletedOnboarding, premiumValidated]);

  // Reset validation when user changes
  useEffect(() => {
    if (!user) {
      setPremiumValidated(false);
    }
  }, [user]);

  const loading = unitsLoading || authLoading || validatingPremium;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.backgroundRoot }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  // ============================================================================
  // GATE 1: ONBOARDING (includes paywall as final step)
  // ============================================================================
  // First-time users must complete onboarding AND purchase to proceed
  if (!hasCompletedOnboarding) {
    return (
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: false, // Prevent swipe back
          }}
        />
      </Stack.Navigator>
    );
  }

  // ============================================================================
  // GATE 2: AUTHENTICATION (after onboarding/purchase)
  // ============================================================================
  // User must sign in to sync their subscription
  if (!session) {
    return (
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: false, // Prevent swipe back
          }}
        />
      </Stack.Navigator>
    );
  }

  // ============================================================================
  // GATE 3: PREMIUM VALIDATION (after auth)
  // ============================================================================
  // User must have premium access (validated from local, Supabase, or App Store)
  // DEV ONLY: Bypass for test account – REMOVE BEFORE TESTFLIGHT
  const isDevBypass = __DEV__ && user?.email === "rappacarlos1@gmail.com";
  if (!isPro && !premiumValidated && !isDevBypass) {
    return (
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: false, // HARD GATE - No back navigation
          }}
          initialParams={{ reason: "subscription_required" }}
        />
      </Stack.Navigator>
    );
  }

  // ============================================================================
  // MAIN APP (all gates passed)
  // ============================================================================
  // User is authenticated AND has premium access
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
