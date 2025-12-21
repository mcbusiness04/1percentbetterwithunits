/**
 * ============================================================================
 * ROOT STACK NAVIGATOR - CENTRALIZED APP GATING
 * ============================================================================
 * 
 * FLOW (strict paywall enforcement):
 * 1. First launch → Onboarding (shown once, never again)
 * 2. After onboarding → Paywall (HARD GATE - no skip/dismiss/back)
 *    - From paywall: Purchase, Restore, Sign In, Log Out
 * 3. If active subscription → Main app
 * 
 * SUBSCRIPTION CHECKS occur on:
 * - App launch
 * - App resume  
 * - Login
 * - Restore purchases
 * 
 * ============================================================================
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, ActivityIndicator, AppState, AppStateStatus } from "react-native";
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
  Auth: { fromPaywall?: boolean };
  Main: undefined;
  Onboarding: undefined;
  NewHabit: undefined;
  QuickAdd: { habitId: string; mode?: "add" | "remove" };
  Paywall: { reason?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { hasCompletedOnboarding, isPro, setIsPro, loading: unitsLoading, clearAllHabitData } = useUnits();
  const { session, user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  
  // Validation state
  const [validating, setValidating] = useState(false);
  const [initialValidationDone, setInitialValidationDone] = useState(false);
  const lastUserId = useRef<string | null>(null);
  const appState = useRef(AppState.currentState);

  // Run premium validation
  const runValidation = useCallback(async (userId: string, reason: string) => {
    if (validating) return;
    
    setValidating(true);
    console.log(`[RootStack] Running premium validation (${reason}) for user:`, userId);
    
    try {
      const isValid = await validatePremiumAccess(userId);
      
      if (isValid) {
        await setIsPro(true);
        console.log("[RootStack] Premium validated - user has active subscription");
      } else {
        await setIsPro(false);
        console.log("[RootStack] No valid subscription - showing paywall");
      }
    } catch (error) {
      console.log("[RootStack] Premium validation error:", error);
      // On error, don't change isPro state - will show paywall if isPro is false
    }
    
    setValidating(false);
  }, [validating, setIsPro]);

  // Subscription check on app launch (when user is authenticated)
  useEffect(() => {
    if (user && hasCompletedOnboarding && !initialValidationDone) {
      runValidation(user.id, "app_launch");
      setInitialValidationDone(true);
    }
  }, [user, hasCompletedOnboarding, initialValidationDone, runValidation]);

  // Subscription check on login (when user changes)
  useEffect(() => {
    if (user && lastUserId.current !== user.id) {
      // Clear previous user's data if switching accounts
      if (lastUserId.current !== null) {
        console.log("[RootStack] Account switch detected - clearing previous data");
        clearAllHabitData();
      }
      lastUserId.current = user.id;
      
      if (hasCompletedOnboarding) {
        runValidation(user.id, "login");
      }
    }
    
    if (!user) {
      lastUserId.current = null;
      setInitialValidationDone(false);
    }
  }, [user, hasCompletedOnboarding, runValidation, clearAllHabitData]);

  // Subscription check on app resume
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active" &&
        user &&
        hasCompletedOnboarding
      ) {
        runValidation(user.id, "app_resume");
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [user, hasCompletedOnboarding, runValidation]);

  const loading = unitsLoading || authLoading;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.backgroundRoot }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  // Show validating spinner only on initial validation
  if (validating && !initialValidationDone) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.backgroundRoot }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  // ============================================================================
  // GATE 1: ONBOARDING (first install only, never shown again)
  // ============================================================================
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
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
            presentation: "modal",
          }}
          initialParams={{ fromPaywall: true }}
        />
      </Stack.Navigator>
    );
  }

  // ============================================================================
  // GATE 2: PREMIUM VALIDATION (HARD GATE - must have active subscription)
  // ============================================================================
  // DEV ONLY: Bypass for test accounts – REMOVE BEFORE TESTFLIGHT
  const devBypassEmails = ["rappacarlos1@gmail.com", "christosmachos@gmail.com"];
  const isDevBypass = user?.email && devBypassEmails.includes(user.email);
  
  console.log("[RootStack] Gate check - user:", user?.email, "isPro:", isPro, "isDevBypass:", isDevBypass);
  
  if (!isPro && !isDevBypass) {
    // Show paywall with sign-in option for existing subscribers
    // No dismiss, no skip, no back navigation
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
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
            presentation: "modal",
          }}
          initialParams={{ fromPaywall: true }}
        />
      </Stack.Navigator>
    );
  }

  // ============================================================================
  // GATE 3: AUTHENTICATION (premium users need account to sync data)
  // ============================================================================
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
  // User has: completed onboarding, active subscription, authenticated
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
    </Stack.Navigator>
  );
}
