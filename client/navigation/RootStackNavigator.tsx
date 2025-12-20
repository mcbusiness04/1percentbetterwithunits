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
 * 3. After auth → Premium validation check (uses isPro as single source of truth)
 * 4. If premium valid → Main app
 * 
 * SINGLE SOURCE OF TRUTH: isPro
 * - Onboarding sets isPro = true when purchase succeeds
 * - validatePremiumAccess updates isPro via storage
 * - If isPro is false after auth, show paywall
 * 
 * ============================================================================
 */

import React, { useEffect, useState, useCallback } from "react";
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
  const { hasCompletedOnboarding, isPro, setIsPro, loading: unitsLoading } = useUnits();
  const { session, user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  
  // Validation state - only tracks if we've attempted validation this session
  const [hasValidated, setHasValidated] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationRetries, setValidationRetries] = useState(0);
  const MAX_RETRIES = 3;

  // Run premium validation when user is authenticated but isPro is false
  const runValidation = useCallback(async () => {
    if (!user || isPro || hasValidated || validating) {
      return;
    }
    
    if (validationRetries >= MAX_RETRIES) {
      // Max retries reached - mark as validated to stop trying
      // User will see paywall but can use restore button
      console.log("[RootStack] Max validation retries reached - showing paywall");
      setHasValidated(true);
      return;
    }
    
    setValidating(true);
    console.log("[RootStack] Running premium validation for user:", user.id, "attempt:", validationRetries + 1);
    
    try {
      const isValid = await validatePremiumAccess(user.id);
      
      if (isValid) {
        // validatePremiumAccess already updates local storage, but also update context
        await setIsPro(true);
        console.log("[RootStack] Premium validated successfully - user has active subscription");
      } else {
        console.log("[RootStack] No valid subscription found - will show paywall");
      }
      // Only mark validated on success (valid or not valid) - NOT on errors
      setHasValidated(true);
    } catch (error) {
      // On network error, increment retry count but don't block
      // This allows a few retries before showing paywall
      console.log("[RootStack] Premium validation error (will retry):", error);
      setValidationRetries((prev) => prev + 1);
    }
    
    setValidating(false);
  }, [user, isPro, hasValidated, validating, validationRetries, setIsPro]);

  // Trigger validation when conditions are right
  useEffect(() => {
    if (user && hasCompletedOnboarding && !isPro && !hasValidated && !validating) {
      runValidation();
    }
  }, [user, hasCompletedOnboarding, isPro, hasValidated, validating, runValidation]);

  // Reset validation state when user changes
  useEffect(() => {
    if (!user) {
      setHasValidated(false);
      setValidationRetries(0);
    }
  }, [user]);

  const loading = unitsLoading || authLoading || validating;

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
  // GATE 3: PREMIUM VALIDATION (catches edge cases)
  // ============================================================================
  // If user completed onboarding but doesn't have premium, show paywall
  // DEV ONLY: Bypass for test account – REMOVE BEFORE TESTFLIGHT
  const isDevBypass = __DEV__ && user?.email === "rappacarlos1@gmail.com";
  
  if (!isPro && hasValidated && !isDevBypass) {
    return (
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: false,
          }}
          initialParams={{ reason: "subscription_required" }}
        />
      </Stack.Navigator>
    );
  }

  // ============================================================================
  // MAIN APP (all gates passed)
  // ============================================================================
  // User has completed onboarding, is authenticated, AND has premium access
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
