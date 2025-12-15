import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  HABITS: "@units/habits",
  LOGS: "@units/logs",
  SETTINGS: "@units/settings",
  IS_PRO: "@units/is_pro",
  ONBOARDING_COMPLETE: "@units/onboarding_complete",
} as const;

export type HabitType = "count" | "time";

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  unitName: string;
  dailyGoal: number;
  tapIncrement: number;
  habitType: HabitType;
  createdAt: string;
  isArchived: boolean;
}

export interface UnitLog {
  id: string;
  habitId: string;
  count: number;
  date: string;
  createdAt: string;
}

export interface AppSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
};

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function getStartOfWeek(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const startOfWeek = new Date(now.setDate(diff));
  return startOfWeek.toISOString().split("T")[0];
}

export async function getHabits(): Promise<Habit[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.HABITS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveHabits(habits: Habit[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.HABITS, JSON.stringify(habits));
}

export async function getLogs(): Promise<UnitLog[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.LOGS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveLogs(logs: UnitLog[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const data = await AsyncStorage.getItem(KEYS.SETTINGS);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

export async function getIsPro(): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(KEYS.IS_PRO);
    return data === "true";
  } catch {
    return false;
  }
}

export async function setIsPro(isPro: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.IS_PRO, isPro.toString());
}

export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(KEYS.ONBOARDING_COMPLETE);
    return data === "true";
  } catch {
    return false;
  }
}

export async function setOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDING_COMPLETE, "true");
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEYS.HABITS,
    KEYS.LOGS,
    KEYS.SETTINGS,
    KEYS.IS_PRO,
    KEYS.ONBOARDING_COMPLETE,
  ]);
}

export const FREE_LIMITS = {
  MAX_HABITS: 3,
  MAX_UNITS_PER_DAY: 50,
} as const;

export const HABIT_COLORS = [
  "#FF6B6B",
  "#FF8C42",
  "#FFD166",
  "#06D6A0",
  "#4ECDC4",
  "#45B7D1",
  "#118AB2",
  "#073B4C",
  "#7B68EE",
  "#BB8FCE",
  "#DDA0DD",
  "#FF69B4",
  "#E91E63",
  "#9C27B0",
  "#673AB7",
  "#3F51B5",
  "#2196F3",
  "#00BCD4",
  "#009688",
  "#4CAF50",
  "#8BC34A",
  "#CDDC39",
  "#FFC107",
  "#FF9800",
  "#FF5722",
  "#795548",
  "#607D8B",
  "#9E9E9E",
] as const;

export const HABIT_ICONS = [
  "activity",
  "heart",
  "zap",
  "target",
  "award",
  "star",
  "sun",
  "moon",
  "droplet",
  "coffee",
  "book",
  "book-open",
  "feather",
  "edit-3",
  "pen-tool",
  "clock",
  "watch",
  "calendar",
  "check-circle",
  "check-square",
  "clipboard",
  "trending-up",
  "bar-chart-2",
  "flag",
  "bookmark",
  "bell",
  "smile",
  "thumbs-up",
  "user",
  "users",
  "home",
  "briefcase",
  "dollar-sign",
  "music",
  "headphones",
  "mic",
  "camera",
  "map",
  "compass",
  "navigation",
  "globe",
  "sunrise",
  "sunset",
  "thermometer",
  "wind",
  "cloud",
  "umbrella",
  "battery",
  "cpu",
  "code",
  "terminal",
  "tool",
  "settings",
  "sliders",
  "layers",
  "grid",
  "list",
  "file-text",
  "folder",
  "mail",
  "send",
  "phone",
  "message-circle",
  "eye",
  "search",
  "filter",
  "tag",
  "gift",
  "shopping-bag",
  "credit-card",
  "package",
  "box",
  "truck",
  "anchor",
  "link",
  "refresh-cw",
  "repeat",
  "rotate-cw",
  "shuffle",
  "play",
  "pause",
  "volume-2",
  "wifi",
  "bluetooth",
  "monitor",
  "smartphone",
  "tablet",
  "tv",
  "film",
  "scissors",
  "archive",
  "pie-chart",
  "type",
  "git-branch",
  "database",
  "server",
  "shopping-cart",
  "trash-2",
  "skip-forward",
] as const;
