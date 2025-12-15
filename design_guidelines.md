# Units App - Design Guidelines

## Authentication
**No authentication required** - Units is a local-first app with no account system in MVP.

**Settings Screen Required:**
- No user profile/avatar (app is local-only)
- App preferences: Sound effects toggle, Haptics toggle, Show General Effort habit toggle
- Data management: "Erase All Data", "Export Data (Pro)", "iCloud Sync (Pro)"
- Subscription: "Upgrade to Units Pro", "Restore Purchases", "Manage Subscription"
- Legal: Privacy Policy, Terms, Contact Support

## Navigation Architecture
**Tab Bar Navigation (3 tabs):**
1. **Today** - Main screen with pile visualization, habit list, and tasks
2. **Stats** - Weekly/lifetime statistics and rolling averages
3. **Settings** - Preferences and subscription management

**Modal Screens:**
- New Habit (modal form)
- New Task (modal form)
- Quick Add (bottom sheet)
- Paywall (modal)

## Design Principles
1. **One-handed, one-tap logging** - Primary interaction must be instant
2. **Zero guilt** - No streaks, no red warnings, no shame
3. **Physical feedback** - Every interaction feels tangible (blocks + haptics)
4. **Minimal text** - No quotes, no badges, clean interface
5. **Fast launch** - App must open instantly to Today screen

## Screen Specifications

### Today (Home)
**Header:**
- Left: "Units" title
- Right: "+" button (opens action sheet: "New Habit" / "New Task")
- Transparent background

**Pile Module (top, fixed):**
- Header: "Today"
- Subheader: "Total Units: {N}"
- Pile tray visualization (fixed height container)
- Small toggle icon for sound/haptics settings
- Safe area: top inset = headerHeight + Spacing.xl

**Habit List (scrollable):**
- Each row (≥44pt tap target):
  - Icon (left) + Habit name
  - Secondary line: unit name (e.g., "page")
  - Right side: "Today {x} • Week {y}"
  - Small text below: "Lifetime {z}"
  - Row tint based on habit color
  - Soft floor indicator: small yellow dot + "Under pace" if below weekly minimum
- Tap gesture: +1 unit instantly
- Long-press: opens Quick Add bottom sheet

**Tasks Section:**
- Header: "Tasks"
- Checkbox rows with title, unit estimate, optional linked habit tag
- Completed tasks collapse into "Completed (n)" accordion
- Safe area: bottom inset = tabBarHeight + Spacing.xl

**Empty States:**
- No habits: Title "Start with one unit." + "Add a habit" button
- No tasks: "Tasks are optional. Keep it light." + "Add a task" button

### Habit Detail (push screen)
**Header:**
- Habit name (title)
- Transparent background
- Right: three-dot menu (Edit/Change unit/Archive/Delete)

**Content (scrollable):**
- Top safe area: headerHeight + Spacing.xl
- Quick add buttons: "+1", "+5" (Pro only), "Add…"
- Stats chips: "Today {x}", "Week {y}", "Lifetime {z}", "Avg 7d {a}"
- Wall visualization (horizontal scroll):
  - Default 14-day view
  - Columns = days, rows = stacked unit blocks
  - Weekly separators (subtle vertical lines)
  - Tap day column → popover showing "Dec 14: 8 units" + "Remove…"
  - After 50 blocks/day: compress to bundles (×5 per visual block)
- Bottom safe area: tabBarHeight + Spacing.xl

### New Habit Modal
**Form fields:**
- "Habit name" text input
- "Unit" section: unit name + unit size (numeric + optional descriptor)
- "Soft floor" stepper with helper text: "Yellow when under pace. No streaks."
- Icon picker (SF Symbols grid)
- Color picker (system palette)

**Buttons:**
- Header: "Cancel" (left), "Create" (right, disabled until name + unit filled)

### Quick Add Bottom Sheet
**Layout:**
- Large "+/–" buttons
- Current count display (center)
- Keypad toggle for 1–99 input
- "Add" button (primary)
- Caps at 999 per add

### Stats Tab
**Sections (scrollable):**
- "This week" card: Units this week, Avg/day, Top habit
- "Rolling averages": 7/30/90 day (30/90 blurred in Free tier)
- "All time": Lifetime units, Total active habits
- Safe area: top = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl

### Paywall Modal
**Layout:**
- Title: "Make Units unlimited."
- Bullet points: Unlimited habits/history, Widgets + share cards, Rolling averages, Export + iCloud sync
- Primary button: "Start Pro"
- Secondary button: "Not now"
- Footer: Auto-renew disclaimer + Terms/Privacy/Restore links

## Visual Design System

### Color Palette
- System palette for habit colors (user-selectable)
- Yellow indicator for "under pace" (no red warnings)
- Subtle tints for habit rows based on selected color

### Typography
- Clear hierarchy: Habit names prominent, stats secondary
- Dynamic Type support (rows expand vertically)
- No decorative quotes or badges

### Iconography
- SF Symbols for habit icons (user-selectable subset)
- Standard system icons for navigation and actions
- NO emojis

### Interaction Design
**Haptics:**
- Subtle haptic on unit drop
- Toggleable in Settings

**Sound:**
- Optional satisfying sound on unit add
- Toggleable in Settings

**Animations:**
- Block drop physics (simple, fast)
- Pile height updates smoothly
- Quick burst for multi-add (visually capped)

**Feedback:**
- 5-second undo toast: "Added 1 unit • Undo"
- Immediate visual update (pile + counters)
- Soft floor indicator appears/disappears based on weekly pace

**Shadows:**
- Minimal use - only for floating Quick Add sheet
- Exact specs for bottom sheet shadow:
  - shadowOffset: {width: 0, height: -2}
  - shadowOpacity: 0.10
  - shadowRadius: 8

### Component Behavior
**Habit Row:**
- Tap: instant +1 with haptic/sound
- Long-press: opens Quick Add sheet
- Visual feedback: subtle press state (no heavy shadow)

**Pile Tray:**
- Fixed height container at top of Today
- Blocks stack with simple physics
- Scrolls independently if pile grows tall

**Wall Visualization:**
- Horizontal scroll (swipe left/right for time)
- Default shows 14 days (Free limited to 7)
- Tap day column → info popover

## Accessibility
- All tap targets ≥44×44pt
- VoiceOver labels:
  - Habit row: "Reading. Tap to add one unit. Today 3. This week 11."
  - Task row: "Finish outline. 2 units. Linked to Writing."
- Dynamic Type support with vertical row expansion
- Pile tray fixed height (scrolls below if needed)

## Critical Assets
**Generated Assets:**
- None required for MVP - use SF Symbols for all habit icons
- Pile visualization is code-based (simple rectangles with physics)
- Wall grid is code-based (stacked blocks)

**System Icons:**
- SF Symbols for habit icons (provide curated subset: book, dumbbell, pencil, running figure, code brackets, etc.)
- Tab bar icons: house.fill (Today), chart.bar.fill (Stats), gearshape.fill (Settings)
- Plus icon for adding habits/tasks

## Free vs Paid UI Differences
**Visual Indicators:**
- Free limits shown contextually: "Free allows 2 habits. Pro unlocks unlimited."
- Blurred content for locked features (30/90 averages, wall beyond 7 days)
- "+5" quick add button hidden in Free (show only +1)
- Pro badge in Settings near upgrade option

**Limit Enforcement:**
- When limit hit, show inline message + upgrade CTA
- No blocking modals until user attempts action
- Downgraded users see archived habits grayed out with lock icon