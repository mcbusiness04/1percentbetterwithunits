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