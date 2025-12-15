# Units - Mobile Effort Tracker

## Overview
Units is a local-first mobile effort tracker built with Expo React Native. Users log habit progress via one-tap interactions, with physics-inspired visual feedback. The app emphasizes a "zero guilt" approach using soft floors instead of streaks.

## Current State
The app is fully functional with the following features:
- 3-tab navigation (Today, Stats, Settings)
- Habit creation with custom icons, colors, and unit definitions
- Single-tap to add units (tap habit = +1 unit)
- Color-coded habit rows: red (0 units), yellow (in progress), green (goal met)
- Falling blocks animation with pile visualization at bottom of Today screen
- Stats strip showing Today's total and Best Day (previous record)
- Remove units available in habit detail screen (-1, -5 buttons)
- Local-first data persistence with AsyncStorage
- Freemium model with Pro tier for unlimited access
- iOS 26 liquid glass design aesthetic
- Pie chart and enhanced analytics on Stats screen

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
    FallingBlocks.tsx        # Falling block animation with pile
    HabitActionMenu.tsx      # Action menu for Add 1, Add 5, Remove 1
    HabitRow.tsx             # Habit list item with action menu
    PieChart.tsx             # Pie chart for habit distribution
    GoalMeter.tsx            # Animated goal progress meter
    AnimatedBlocks.tsx       # Inline block visualization
    HabitWall.tsx            # Calendar heat map
    UndoToast.tsx            # Undo notification
    IconPicker.tsx           # Icon selection for habits
    ColorPicker.tsx          # Color selection for habits
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
2. **Zero guilt approach**: Daily goals with visual feedback, no streaks
3. **Goal visualization**: Red glow when under daily goal, gold glow when goal is met
4. **Freemium limits**: Free tier has 3 habits, 50 units/day, 7-day history

### Data Models
- **Habit**: id, name, icon, color, unitName, dailyGoal, createdAt, isArchived
- **UnitLog**: id, habitId, count, date, createdAt

## Recent Changes
- December 2025: Initial implementation with full feature set
- Implemented all screens with navigation
- Added physics-based PileTray visualization
- Created HabitWall calendar view
- Integrated freemium paywall
- Added onboarding flow with starter habit templates
- Added sound effects (haptic feedback) for unit logging
- Added navigation from HabitRow to HabitDetail screen
- Simplified data model: removed unitVersions/softFloorPerWeek, added unitName and dailyGoal
- Removed all task-related functionality (purely habit tracker now)
- Added GoalMeter component with animated glow effects (red below goal, gold when met)
- Added AnimatedBlocks for 3D block visualization
- **New: Simplified HabitRow** - Single tap adds 1 unit, color states (red/yellow/green)
- **New: FallingBlocks** - Animated blocks falling into pile at bottom of Today screen
- **New: Stats strip** - Shows Today's total and Best Day (previous record, excludes today)
- **New: Remove units in detail** - HabitDetailScreen has -1/-5 buttons for removing units
- **New: removeUnits function** - Ability to delete accidentally added units
- **New: PieChart component** - Habit distribution visualization
- **New: Enhanced StatsScreen** - Overview grid (Today, This Week, Daily Avg, Streak), bar charts, pie chart, habit progress cards

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
