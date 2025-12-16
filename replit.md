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
    BadHabitsSection.tsx     # Bad habits with penalty tracking
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
- **Habit**: id, name, icon, color, unitName, dailyGoal, tapIncrement, habitType ("count" | "time"), createdAt, isArchived
- **UnitLog**: id, habitId, count, date, createdAt
- **BadHabit**: id, name, createdAt, isArchived
- **BadHabitLog**: id, badHabitId, count, date, createdAt

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
- **New: Simplified HabitRow** - Single tap adds 1 unit, color states (red/yellow/green), chevron for navigation only
- **New: FallingBlocks** - Animated blocks falling into pile, unlimited blocks with dynamic sizing
- **New: Stats strip** - Shows Today's total and Best Day (previous record, excludes today)
- **New: Remove units in detail** - HabitDetailScreen has -1/-5 buttons for removing units
- **New: removeUnits function** - Ability to delete accidentally added units
- **New: Unlimited units** - No daily unit limit, blocks shrink dynamically to fit all
- **New: PieChart component** - Habit distribution visualization
- **New: Enhanced StatsScreen** - Overview grid (Today, This Week, Daily Avg, Streak), bar charts, pie chart, habit progress cards
- **New: Simplified habit creation** - Single field "What are you counting?" with auto-generated title-cased habit name
- **New: Custom tap increment** - Users can set how many units each tap adds (e.g., +3, +5)
- **New: Expanded customization** - 100+ icons and 27 colors to choose from
- **New: Data migration** - Legacy habits automatically get tapIncrement: 1 and habitType: "count" on load
- **New: Habit types** - Count habits (default) allow custom tap increments; Time habits track minutes with gold-bordered blocks
- **New: Time vs Count toggle** - NewHabitScreen shows toggle to switch between count and time tracking modes
- **New: Per-block glow** - Time-based habit blocks have gold border glow in FallingBlocks animation
- **New: Tap increment editor** - HabitDetailScreen allows editing tap increment for count habits post-creation
- **New: Curated icons** - Self-improvement focused icons (exercise, mindfulness, productivity, nutrition, sleep)
- **New: Time habit custom increments** - Time habits now support custom minute increments (e.g., +5 min, +10 min per tap)
- **New: Edit button in HabitRow** - Pencil icon on each habit row for quick access to habit settings
- **New: Bad Habits Section** - Track bad habits with green/red toggle states and 5% penalty deduction per tap
- **New: Progress messaging** - Shows "1% better today" when goals met, or calculated percentage with penalty status
- **New: Editable daily goals** - Stepper controls in HabitDetailScreen to adjust daily goals
- **New: Smart icon/color suggestions** - Auto-suggests icons and colors based on habit name keywords with user override
- **New: 3-mode creation** - NewHabitScreen has Count, Time, and Bad Habit tabs in a single unified creation flow
- **New: Auto-assigned appearance** - Icons and colors are automatically assigned during creation; users can edit via small edit buttons
- **New: Simplified bad habit creation** - Bad habits created through the unified NewHabitScreen with simplified form (name only)
- **New: Bad habit undo** - Undo button appears next to penalty badge to remove accidental taps
- **New: Always-visible Bad Habits section** - Section shows even when empty with helpful message
- **New: Bad habit green state** - Untapped bad habits show green with "Resisted today" text to encourage positive behavior
- **New: One-tap limit** - Bad habits can only be tapped once per day; shows "-5% failed" permanently until undone
- **New: Actual unit removal** - Bad habit penalties remove 5% of total daily goal evenly from all habits (actual units, not just display)
- **New: Stats improvement card** - Shows "X% better/behind than yesterday" comparing totals, "2% bonus" for doubled goals
- **New: Enhanced penalty** - Bad habit penalty now removes 5% of TOTAL LOGGED UNITS (not daily goal), distributed evenly across habits
- **New: Most improved insight** - Stats shows which habit improved the most vs yesterday
- **New: Doubled goals tracking** - Stats shows count of doubled goals with golden highlight

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
