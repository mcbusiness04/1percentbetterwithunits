# Units - Mobile Effort Tracker

## Overview
Units is a local-first mobile effort tracker built with Expo React Native. Users log habit progress via one-tap interactions, with physics-inspired visual feedback. The app emphasizes a "zero guilt" approach using soft floors instead of streaks.

## Current State
The app is fully functional with the following features:
- 3-tab navigation (Today, Stats, Settings)
- Habit creation with custom icons, colors, and unit definitions
- One-tap unit logging with undo functionality
- Task management linked to habits
- Local-first data persistence with AsyncStorage
- Freemium model with Pro tier for unlimited access
- iOS 26 liquid glass design aesthetic

## Project Architecture

### Directory Structure
```
client/
  App.tsx                    # Main app entry with ErrorBoundary
  navigation/
    RootStackNavigator.tsx   # Root stack with modals
    MainTabNavigator.tsx     # Bottom tabs (Today, Stats, Settings)
    TodayStackNavigator.tsx  # Today tab stack
  screens/
    TodayScreen.tsx          # Main screen with habits and tasks
    HabitDetailScreen.tsx    # Habit detail with wall visualization
    StatsScreen.tsx          # Statistics and rolling averages
    SettingsScreen.tsx       # App settings and subscription
    NewHabitScreen.tsx       # Modal for creating habits
    NewTaskScreen.tsx        # Modal for creating tasks
    QuickAddScreen.tsx       # Modal for adding multiple units
    PaywallScreen.tsx        # Pro upgrade screen
  components/
    PileTray.tsx             # Physics-based block visualization
    HabitRow.tsx             # Habit list item
    TaskRow.tsx              # Task list item
    HabitWall.tsx            # Calendar heat map
    UndoToast.tsx            # Undo notification
    IconPicker.tsx           # Icon selection for habits
    ColorPicker.tsx          # Color selection for habits
    SoftFloorStepper.tsx     # Weekly goal stepper
    StatCard.tsx             # Statistics display card
    SettingsRow.tsx          # Settings list item
  lib/
    UnitsContext.tsx         # Global state management
    storage.ts               # AsyncStorage persistence
  constants/
    theme.ts                 # Design tokens and colors
server/
  index.ts                   # Express server (minimal, local-first)
```

### Key Design Decisions
1. **Local-first**: All data stored in AsyncStorage, no authentication required
2. **Zero guilt approach**: Soft floors (weekly goals) instead of streaks
3. **Yellow warnings only**: No red/failure colors to reduce pressure
4. **Freemium limits**: Free tier has 2 habits, 20 units/day, 3 tasks, 7-day history

### Data Models
- **Habit**: name, icon, color, unitVersions[], softFloorPerWeek
- **UnitLog**: habitId, count, date, timestamp (for undo)
- **Task**: title, unitEstimate, linkedHabitId, isCompleted

## Recent Changes
- December 2025: Initial implementation with full feature set
- Implemented all screens with navigation
- Added physics-based PileTray visualization
- Created HabitWall calendar view
- Integrated freemium paywall

## User Preferences
- No emojis in the UI
- SF Symbols / Feather icons only
- Liquid glass iOS 26 design aesthetic
- Minimal color in controls, let content shine through

## Development Notes
- Run with `npm run all:dev`
- Expo dev server on port 8081
- Express server on port 5000
- Web version available but native (Expo Go) is primary target
- Shadow style deprecation warnings are cosmetic only
