/**
 * ============================================================================
 * ROOT STACK NAVIGATOR - CENTRALIZED APP GATING
 * ============================================================================
 * 
 * NAVIGATION ORDER (CRITICAL):
 * 1. Check authentication FIRST
 * 2. Check subscription SECOND
 * 3. Onboarding ONLY for unauthenticated first-time users
 * 
 * FLOW:
 * - if (!isAuthenticated) → Auth Stack (includes onboarding for first-time users)
 * - else if (!hasActiveSubscription) → Paywall Stack
 * - else → App Stack
 * 
 * RULES:
 * - Signing in ALWAYS allowed (paywall blocks app, NOT sign-in)
 * - Signing in auto-completes onboarding (never loops back)
 * - Onboarding NEVER runs for authenticated users
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
import Constants from "expo-constants";
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
  const { 
    hasCompletedOnboarding, 
    completeOnboarding,
    isPro, 
    setIsPro, 
    loading: unitsLoading, 
    clearAllHabitData 
  } = useUnits();
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

  // ============================================================================
  // CRITICAL: When user signs in, auto-complete onboarding
  // This prevents the infinite loop back to onboarding after sign-in
  // ============================================================================
  useEffect(() => {
    if (isAuthenticated && !hasCompletedOnboarding) {
      console.log("[RootStack] User authenticated - auto-completing onboarding");
      completeOnboarding();
    }
  }, [isAuthenticated, hasCompletedOnboarding, completeOnboarding]);

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
      await setIsPro(false);
    }
    
    setValidating(false);
  }, [validating, setIsPro]);

  // Subscription check on login (when user authenticates)
  useEffect(() => {
    if (user && lastUserId.current !== user.id) {
      // Clear previous user's data if switching accounts
      if (lastUserId.current !== null) {
        console.log("[RootStack] Account switch detected - clearing previous data");
        clearAllHabitData();
      }
      lastUserId.current = user.id;
      
      // Always validate when user changes (regardless of onboarding state)
      runValidation(user.id, "login");
      setInitialValidationDone(true);
    }
    
    if (!user) {
      lastUserId.current = null;
      setInitialValidationDone(false);
    }
  }, [user, runValidation, clearAllHabitData]);

  // Subscription check on app resume
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active" &&
        user
      ) {
        runValidation(user.id, "app_resume");
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [user, runValidation]);

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

  // ============================================================================
  // GATE 1: AUTHENTICATION (checked FIRST)
  // ============================================================================
  
  if (!isAuthenticated) {
    // User is NOT authenticated
    
    // First-time user: Show onboarding → paywall → auth (sign-in only pre-purchase)
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
    
    // Returning user (onboarding done, but not signed in): Show paywall with auth
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

  // ============================================================================
  // GATE 2: SUBSCRIPTION (checked SECOND, only for authenticated users)
  // ============================================================================
  
  // ============================================================================
  // DEV ONLY – REMOVE BEFORE TESTFLIGHT
  // Expo Go bypass: allows testing without IAP (purchases unavailable in Expo Go)
  // Constants.appOwnership === "expo" ONLY in Expo Go, never in standalone builds
  // ============================================================================
  const IS_EXPO_GO = __DEV__ && Constants.appOwnership === "expo";
  
  if (IS_EXPO_GO && isAuthenticated) {
    console.log("[RootStack] EXPO GO BYPASS ACTIVE - Skipping subscription check");
  }
  // ============================================================================
  // END DEV ONLY BLOCK
  // ============================================================================
  
  // Show loading while validating subscription after login
  if (validating && !initialValidationDone) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.backgroundRoot }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }
  
  // User is authenticated but no subscription → Show paywall (NOT onboarding)
  // BYPASS: Skip this gate entirely when IS_EXPO_GO is true
  if (!hasActiveSubscription && !IS_EXPO_GO) {
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
      </Stack.Navigator>
    );
  }

  // ============================================================================
  // MAIN APP (authenticated + subscribed)
  // ============================================================================
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
