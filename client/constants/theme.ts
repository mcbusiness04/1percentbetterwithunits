import { Platform } from "react-native";

const tintColorLight = "#5B7FE1";
const tintColorDark = "#7B9FFF";

export const Colors = {
  light: {
    text: "#11181C",
    textSecondary: "#687076",
    buttonText: "#FFFFFF",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    link: "#5B7FE1",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#F5F7FA",
    backgroundSecondary: "#EDF0F5",
    backgroundTertiary: "#E4E8EF",
    accent: "#5B7FE1",
    accentLight: "#E8EEF4",
    warning: "#F5A623",
    warningLight: "#FEF5E6",
    success: "#34C759",
    successLight: "#E8F9ED",
    border: "#E4E8EF",
    cardBackground: "#FFFFFF",
  },
  dark: {
    text: "#ECEDEE",
    textSecondary: "#9BA1A6",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
    link: "#7B9FFF",
    backgroundRoot: "#1F2123",
    backgroundDefault: "#2A2C2E",
    backgroundSecondary: "#353739",
    backgroundTertiary: "#404244",
    accent: "#7B9FFF",
    accentLight: "#2A3550",
    warning: "#F5A623",
    warningLight: "#3D3020",
    success: "#34C759",
    successLight: "#1F3325",
    border: "#404244",
    cardBackground: "#2A2C2E",
  },
};

export const HabitColors = [
  "#5B7FE1",
  "#E15B5B",
  "#5BE1A3",
  "#E1A35B",
  "#A35BE1",
  "#5BE1E1",
  "#E15BA3",
  "#7FE15B",
];

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 24,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 20,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
};

export const FREE_LIMITS = {
  MAX_HABITS: 2,
  MAX_UNITS_PER_DAY: 20,
  MAX_TASKS: 3,
  WALL_HISTORY_DAYS: 7,
} as const;

export const HABIT_ICONS = [
  "book",
  "activity",
  "edit-3",
  "code",
  "music",
  "coffee",
  "sun",
  "moon",
  "heart",
  "star",
  "zap",
  "target",
  "compass",
  "award",
  "feather",
  "globe",
] as const;

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
