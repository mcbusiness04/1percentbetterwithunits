# Units App - Design Guidelines

## Authentication
**No authentication required** - Local-first app with no account system.

**Settings Screen:**
- App preferences: Sound effects, Haptics, Dark mode (Auto/Light/Dark)
- Data management: Export Data (Pro), iCloud Sync (Pro), Erase All Data
- Subscription: Upgrade to Pro, Restore Purchases, Manage Subscription
- Legal: Privacy Policy, Terms, Contact Support

## Navigation Architecture
**Tab Bar (3 tabs):**
1. **Today** - Animated pile, habit list, tasks
2. **Stats** - Visualizations and rolling averages
3. **Settings** - Preferences and subscription

**Modal Screens:**
- New Habit (modal form)
- New Task (modal form)
- Quick Add (bottom sheet)
- Paywall (modal)

## Design Principles
1. **One-tap logging** - Instant gratification with animated feedback
2. **Zero guilt, high celebration** - No streaks/shame, big rewards for wins
3. **Physical + magical** - 3D blocks feel tangible but delightfully animated
4. **Vibrant minimalism** - Clean interface with bold, playful accents
5. **Fast launch** - Immediate access to animated Today view

## Screen Specifications

### Today (Home)
**Header:**
- Transparent background
- Left: "Units" title with subtle gradient
- Right: "+" button (opens action sheet: New Habit/New Task)
- Top safe area: headerHeight + Spacing.xl

**Pile Visualization (fixed top module):**
- 3D animated container showing stacked blocks
- Header: "Today" with glow effect
- Subheader: "Total Units: {N}" with animated count-up
- Blocks drop with spring physics, scale in, settle with bounce
- Glow intensity increases as pile grows
- Each block uses habit's gradient color
- Tap pile → satisfying wobble animation

**Habit List (scrollable):**
- Card-style rows with gradient backgrounds (habit color)
- Each row (≥56pt height):
  - Icon (SF Symbol) with glow ring
  - Habit name (bold, white text)
  - Unit name subtitle (semi-transparent white)
  - Right side: Progress meter (circular or linear)
    - Below soft floor: red glow
    - Above soft floor: gold glow + shimmer
  - Stats row: "Today {x} • Week {y}" with subtle icons
- Tap: +1 with burst particle effect + haptic
- Long-press: Quick Add sheet with spring animation
- Bottom safe area: tabBarHeight + Spacing.xl

**Tasks Section:**
- Card-style with subtle gradient border
- Checkbox (animated check with spring)
- Task title, unit estimate badge, optional habit tag (tinted)
- Completed: collapse into accordion with celebration confetti on complete
- Empty state: "Keep it light." with ghost card illustration

### Habit Detail (push screen)
**Header:**
- Gradient title bar (habit color)
- Habit name + current streak icon (if exists)
- Right: menu (Edit/Archive/Delete)
- Top safe area: headerHeight + Spacing.xl

**Content (scrollable):**
- Quick Add section:
  - Large gradient buttons: "+1", "+5" (Pro), "Add…"
  - Tap triggers 3D block animation + glow pulse
- Goal meter (large circular progress):
  - Red glow when below soft floor
  - Gold glow + animated rays when surpassed
  - Center shows today's count with scale animation
- Stats chips (gradient cards):
  - Today, Week, Lifetime, 7-day avg
  - Tap for micro-celebration (confetti if record broken)
- Wall Visualization:
  - Horizontal scroll (14 days default)
  - Each day: vertical stack of 3D blocks
  - Gradient backgrounds per habit
  - Tap day → popover with glow outline
  - Weekly separators with subtle shimmer
- Bottom safe area: tabBarHeight + Spacing.xl

### New Habit Modal
**Form (gradient overlay background):**
- Habit name input (large, with focus glow)
- Unit section: name + size with picker
- Soft floor stepper (animated ±)
- Icon picker (SF Symbols grid with preview glow)
- Color picker (gradient swatches)
- Header: Cancel (left), Create (right, gradient button when valid)

### Quick Add Sheet
**Bottom sheet with backdrop blur:**
- Large "+/–" buttons (gradient, glow on press)
- Center display (3D number with scale animation)
- Numeric keypad (optional, animated slide-in)
- Primary "Add" button (full-width gradient)
- Shadow specs:
  - shadowOffset: {width: 0, height: -2}
  - shadowOpacity: 0.15
  - shadowRadius: 12

### Stats Tab
**Scrollable sections with gradient cards:**
- "This Week" hero card (large, animated count-ups)
- Rolling averages: 7/30/90 day (blur lock for Free)
- All-time stats with trophy icons + glow
- Visual charts with gradient fills
- Safe areas: top = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl

### Paywall Modal
**Gradient background with animated features:**
- Title: "Make Units unlimited."
- Feature bullets with animated icons + glow
- Primary button: gradient "Start Pro" with shimmer
- Secondary: "Not now" (text-only)
- Footer: Terms/Privacy/Restore

## Visual Design System

### Color Palette
**Vibrant gradients for habit themes:**
- Fire: Red (#FF3B30) → Orange (#FF9500)
- Ocean: Blue (#007AFF) → Cyan (#5AC8FA)
- Forest: Green (#34C759) → Teal (#30D158)
- Sunset: Purple (#AF52DE) → Pink (#FF2D55)
- Gold: Yellow (#FFCC00) → Orange (#FF9500)
- User selects gradient from 8-12 presets

**System colors:**
- Under pace glow: Red (#FF3B30) with 40% opacity
- Goal surpassed glow: Gold (#FFCC00) with 60% opacity
- Celebration: Multi-color particle effects

**Dark Mode:**
- Dark backgrounds (#1C1C1E, #2C2C2E)
- Glowing accents more prominent (60% opacity)
- Gradients slightly desaturated but vibrant
- White text with subtle glow

### Typography
- System font (SF Pro) with Dynamic Type
- Habit names: Bold, 17-20pt
- Stats: Medium, 15pt with tabular numbers
- Subtle glow effect on white text in dark mode

### Iconography
- SF Symbols for all icons
- Habit icons render with glow ring in habit color
- Tab bar: house.fill, chart.bar.fill, gearshape.fill
- Action icons with press-state glow

### Animation & Interaction

**3D Block Physics:**
- Blocks drop from top with spring (damping: 0.6, stiffness: 200)
- Scale in (0.8 → 1.0) with slight rotation
- Settle bounce on landing
- Stack with subtle offset for depth
- Glow increases with pile height

**Goal Meters:**
- Circular or linear progress bars
- Smooth fill animation (duration: 0.8s, easing: easeInOutCubic)
- Below target: pulsing red glow (1.5s cycle)
- Above target: gold shimmer sweep (2s cycle)
- Milestone hit: burst effect + scale pulse

**Celebration Effects:**
- Goal met: confetti particles (12-16) with physics
- Record broken: radial burst + haptic (medium impact)
- Undo toast: slide up from bottom with spring

**Haptics:**
- Light impact: +1 add
- Medium impact: goal milestone
- Heavy impact: big celebration
- Toggleable in Settings

**Sound:**
- Satisfying "pop" on block drop
- Chime on goal surpass
- Toggleable in Settings

**Feedback:**
- Undo toast (5s): "Added 1 unit • Undo" with gradient background
- Immediate visual: pile animates, counters scale-update
- Button press: scale down (0.95) + glow increase

### Component Specifications

**Habit Row Card:**
- Height: 72pt minimum (expands with Dynamic Type)
- Gradient background (habit color, 45° angle)
- Corner radius: 16pt
- No shadow (gradient provides depth)
- Press state: scale 0.98, brightness +10%

**3D Block:**
- Base: 24×24pt square
- Depth illusion: subtle gradient + inner shadow
- Drop animation: 0.6s spring from y: -100
- Max visible: 20 blocks, then compress to bundles

**Glow Effect:**
- Blur radius: 8-12pt depending on intensity
- Color: habit color at 40-60% opacity
- Pulsing glow: opacity 40% ↔ 60%, 1.5s cycle

**Progress Meter:**
- Circular: 48pt diameter, 6pt stroke
- Linear: full-width, 8pt height, rounded caps
- Background: white 20% opacity
- Fill: gradient matching habit color

## Accessibility
- All tap targets ≥56×56pt (larger than standard for playful feel)
- VoiceOver: "Reading habit. Tap to add one unit. Today 3 units. This week 11 units. Above goal."
- Reduce motion: disable physics, use fade transitions
- Glow effects respect Increase Contrast setting (reduce opacity)
- Dynamic Type with vertical expansion
- Color contrast: gradients ensure 4.5:1 minimum on text

## Critical Assets
**None required** - All visuals are code-based:
- 3D blocks: gradient rectangles with shadow/highlight layers
- Pile visualization: spring physics animations
- Glow effects: blur + opacity animations
- Particle systems: native animation framework
- SF Symbols for all icons (curated subset: book.fill, dumbbell, pencil, figure.run, chevron.left.forwardslash.chevron.right, etc.)

## Free vs Pro UI
**Visual differentiation:**
- Free limits: inline message with gradient "Upgrade" button
- Locked features: blur effect + lock icon overlay
- Pro badge: subtle gold shimmer in Settings
- "+5" quick add hidden in Free
- 30/90 day averages blurred with glow outline
- Wall beyond 7 days: gradient fade + lock icon