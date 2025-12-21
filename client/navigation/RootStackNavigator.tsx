/**
 * ============================================================================
 * ROOT STACK NAVIGATOR - CENTRALIZED APP GATING
 * ============================================================================
 * 
 * STATE-BASED NAVIGATION (no bypasses, no hacks):
 * - hasCompletedOnboarding: Has user completed onboarding?
 * - isAuthenticated: Does user have active session?
 * - hasActiveSubscription: Does user have valid subscription?
 * 
 * FLOW:
 * 1. First install → Onboarding → Paywall (Sign In only, no Sign Up)
 * 2. Paywall allows: Purchase, Restore, Sign In
 * 3. Sign-in ALWAYS allowed (even without subscription)
 * 4. After sign-in → Check subscription → If active → Main app, else → Paywall
 * 5. After purchase → Auth (Sign In/Sign Up) → Main app
 * 6. Reinstall → Sign In → Check subscription → Main app or Paywall
 * 
 * HARD RULES:
 * - Paywall NEVER blocks sign-in
 * - Paywall blocks app access if subscription inactive
 * - Sign-in ≠ premium (subscription checked AFTER sign-in)
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
  Auth: { fromPaywall?: boolean; signInOnly?: boolean };
  Main: undefined;
  Onboarding: undefined;
  NewHabit: undefined;
  QuickAdd: { habitId: string; mode?: "add" | "remove" };
  Paywall: { reason?: string; isFirstPaywall?: boolean };
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

  // Derived state
  const isAuthenticated = !!session && !!user;
  const hasActiveSubscription = isPro;

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
        console.log("[RootStack] No valid subscription - will show paywall");
      }
    } catch (error) {
      console.log("[RootStack] Premium validation error:", error);
      // On error, set to false to require re-validation
      await setIsPro(false);
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

  // Debug logging
  console.log("[RootStack] State:", {
    hasCompletedOnboarding,
    isAuthenticated,
    hasActiveSubscription,
    validating,
    initialValidationDone,
    userEmail: user?.email,
  });

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.backgroundRoot }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  // Show validating spinner only on initial validation after login
  if (validating && !initialValidationDone && isAuthenticated) {
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
      </Stack.Navigator>
    );
  }

  // ============================================================================
  // GATE 2: SUBSCRIPTION CHECK
  // After onboarding, check if user has active subscription
  // ============================================================================
  
  // Case A: User is authenticated but no subscription → Show paywall
  // They can sign out and try another account, or purchase
  if (isAuthenticated && !hasActiveSubscription) {
    return (
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: false,
          }}
          initialParams={{ reason: "subscription_required", isFirstPaywall: false }}
        />
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
            presentation: "modal",
          }}
          initialParams={{ fromPaywall: true, signInOnly: false }}
        />
      </Stack.Navigator>
    );
  }

  // Case B: User is NOT authenticated but HAS subscription → Show Auth (Sign In/Sign Up)
  // This happens after a successful purchase - user needs to create account to continue
  if (!isAuthenticated && hasActiveSubscription) {
    return (
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: false,
          }}
          initialParams={{ fromPaywall: false, signInOnly: false }}
        />
      </Stack.Navigator>
    );
  }

  // Case C: User is NOT authenticated and NO subscription → Show paywall with Sign In option
  // This is the "first paywall" after onboarding - Sign In only, no Sign Up
  // They must either: purchase (then create account), or sign in (if existing user)
  if (!isAuthenticated) {
    return (
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: false,
          }}
          initialParams={{ reason: "subscription_required", isFirstPaywall: true }}
        />
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: true,
            presentation: "modal",
          }}
          initialParams={{ fromPaywall: true, signInOnly: true }}
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
