# Units - Mobile Effort Tracker

## Overview
Units is a local-first mobile effort tracker built with Expo React Native. It allows users to log habit progress with one-tap interactions and physics-inspired visual feedback. The app promotes a "zero guilt" approach by using soft floors instead of streaks. It is a fully paid app, emphasizing a liquid glass iOS 26 design aesthetic, and integrates with StoreKit for purchases.

## User Preferences
- No emojis in the UI
- SF Symbols / Feather icons only
- Liquid glass iOS 26 design aesthetic
- Minimal color in controls, let content shine through

## System Architecture
The application is built with Expo React Native. Data is stored locally using AsyncStorage with background synchronization to Supabase for backup.

### Navigation Flow (State-Based, No Bypasses)

**Three States That Control Navigation:**
- `hasCompletedOnboarding`: Has user completed onboarding?
- `isAuthenticated`: Does user have active session?
- `hasActiveSubscription`: Does user have valid subscription (validated via StoreKit)?

**Flow:**
1. First-time install → Onboarding → Paywall (Sign In only, no Sign Up)
2. From paywall: Purchase, Restore Purchases, or Sign In (for existing subscribers)
3. Sign-in is ALWAYS allowed (even without subscription)
4. After sign-in → Check subscription → If active → Main app; If not → Paywall
5. After successful purchase → isPro=true → Auth (Sign In/Sign Up) → Main app
6. Reinstall → Sign In first → Check subscription → Main app or Paywall

**Hard Rules:**
- Paywall NEVER blocks sign-in
- Paywall blocks app access if subscription inactive
- Sign-in ≠ premium (subscription checked AFTER sign-in)
- All gating logic centralized in RootStackNavigator.tsx

### Core Features:
-   **Habit Tracking**: Users can create habits with custom icons, colors, unit definitions, and daily goals. Progress is logged with a single tap, and visual feedback includes color-coded habit rows (red for 0 units, yellow for in progress, green for goal met) and falling blocks animations.
-   **Bad Habit Tracking**: Users can track bad habits, which, when logged, apply a penalty by removing a percentage of total logged units from the daily score, distributed evenly across good habits. Bad habits can only be tapped once per day.
-   **Stats & Analytics**: The app provides a "Today" screen with current progress, a "Stats" screen with detailed analytics including pie charts, heatmaps, and historical data, and a "Settings" screen.
-   **"Zero Guilt" Approach**: Focuses on daily goals and visual feedback rather than streaks, with a "soft floor" system.
-   **Monetization**: Fully paid app with all features unlocked for subscribers, integrating StoreKit for in-app purchases.
-   **Physics-inspired UI**: Features like falling blocks animations and a "PileTray" visualization for units.
-   **Design**: Emphasizes a "liquid glass" iOS 26 design aesthetic.
-   **Daily Renewal**: Automatically detects day changes to reset daily progress.
-   **Historical Editing**: Allows editing previous days' unit logs through the HabitWall.

### Supabase Integration:
-   **Authentication**: Handles user sign-in/sign-up (email/password).
-   **Data Storage**: Used for storing user profiles, habits, unit logs, bad habits, and bad habit logs, with Row Level Security (RLS) configured.

### Data Models:
-   **Habit**: `id`, `name`, `icon`, `color`, `unitName`, `dailyGoal`, `tapIncrement`, `habitType` ("count" | "time"), `createdAt`, `isArchived`.
-   **UnitLog**: `id`, `habitId`, `count`, `date`, `createdAt`.
-   **BadHabit**: `id`, `name`, `createdAt`, `isArchived`.
-   **BadHabitLog**: `id`, `badHabitId`, `count`, `date`, `createdAt`, `penaltyAdjustments`, `isUndone`.

## External Dependencies
-   **Expo React Native**: Core framework for mobile development.
-   **AsyncStorage**: Local data persistence.
-   **Supabase**: Backend for authentication and data storage/backup.
    -   **URL**: `https://rleheeagukbgovoywnlb.supabase.co`
    -   **Environment Variables**: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
-   **expo-iap**: StoreKit integration for Apple in-app purchases.

## Database Setup
Run `supabase/migrations/001_create_tables.sql` in your Supabase SQL Editor to create the required tables (habits, habit_logs, bad_habits, bad_habit_logs, subscriptions).

## Supabase Email Configuration
To disable email confirmation for development:
1. Go to Supabase Dashboard → Authentication → Providers → Email
2. Toggle OFF "Confirm email"

## Testing Notes
- IAP is not available in Expo Go - requires development build for real subscription testing
- On web platform, purchase/restore returns an error (no bypass) - use demo account with ALLOW_DEMO_REVIEW_LOGIN=true for testing
- The `validatePremiumAccess` function in `client/lib/storekit.ts` validates subscriptions with the server

## Demo Account (App Store Review / TestFlight)
A demo account is available for Apple App Store review and TestFlight testing.

**Credentials:**
- Email: `demo@unitsapp.review`
- Password: `UnitsDemo2024!`

**Security Control: ALLOW_DEMO_REVIEW_LOGIN Environment Variable**

Demo bypass is controlled **EXCLUSIVELY** by an explicit environment variable. Default is OFF.

**CRITICAL SECURITY REQUIREMENT:**
- Demo bypass is NOT dependent on `__DEV__` (would allow bypass in dev builds)
- Demo bypass is NOT dependent on `Platform.OS === "web"` (would allow bypass on web)
- Demo bypass is NOT dependent on Expo Go detection
- Demo bypass ONLY works when `ALLOW_DEMO_REVIEW_LOGIN === true`

| Environment | ALLOW_DEMO_REVIEW_LOGIN | Demo Bypass |
|-------------|-------------------------|-------------|
| Local dev (without env var) | Not set (false) | **BLOCKED** |
| Local dev (with env var) | `true` | Works |
| Web (Replit, without env var) | Not set (false) | **BLOCKED** |
| Expo Go (without env var) | Not set (false) | **BLOCKED** |
| EAS development build | `true` (set in eas.json) | Works |
| EAS preview build (TestFlight) | `true` (set in eas.json) | Works |
| EAS production build (App Store) | `false` (set in eas.json) | **BLOCKED** |

**For Local/Replit Testing:**
To test demo login locally or on Replit, you must explicitly set the environment variable:
```bash
ALLOW_DEMO_REVIEW_LOGIN=true npm run all:dev
```

**Files involved:**
1. `eas.json` - Sets env var per build profile (development/preview: true, production: false)
2. `app.config.js` - Reads `process.env.ALLOW_DEMO_REVIEW_LOGIN` and injects into extra config
3. `client/lib/demo-account.ts` - Reads from `Constants.expoConfig.extra.ALLOW_DEMO_REVIEW_LOGIN`
4. `client/lib/storekit.ts` - Calls `isDemoUser()` BEFORE any StoreKit checks

**How it works:**
1. EAS build reads env var from eas.json profile
2. app.config.js injects it into `expo.extra.ALLOW_DEMO_REVIEW_LOGIN`
3. `isDemoModeAllowed()` checks this value via expo-constants (NO OTHER FALLBACKS)
4. `isDemoUser()` is called during `validatePremiumAccess()` in storekit.ts
5. If ALLOW_DEMO_REVIEW_LOGIN=true AND email matches → premium access granted
6. Production builds have ALLOW_DEMO_REVIEW_LOGIN=false → demo NEVER works

**Important:**
- Demo account must sign in normally via the "Sign In" flow on the paywall
- No UI exposes demo account existence
- Normal users still require paid subscription
- Production App Store builds will NEVER grant demo access
- There are NO fallback paths - the env var is the ONLY gate

## Product IDs (App Store Connect)
- `units.subscription.monthly` - $4.99/month subscription
- `units.subscription.yearly` - $19.99/year subscription
