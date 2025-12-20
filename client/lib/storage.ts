import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  HABITS: "@units/habits",
  LOGS: "@units/logs",
  SETTINGS: "@units/settings",
  IS_PRO: "@units/is_pro",
  ONBOARDING_COMPLETE: "@units/onboarding_complete",
  BAD_HABITS: "@units/bad_habits",
  BAD_HABIT_LOGS: "@units/bad_habit_logs",
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
  showGeneralEffort?: boolean;
}

export interface BadHabit {
  id: string;
  name: string;
  createdAt: string;
  isArchived: boolean;
}

export interface PenaltyAdjustment {
  habitId: string;
  unitsRemoved: number;
}

export interface BadHabitLog {
  id: string;
  badHabitId: string;
  count: number;
  date: string;
  createdAt: string;
  penaltyAdjustments?: PenaltyAdjustment[];
  penaltyUnits?: number; // Fixed penalty captured at tap time (10% of raw total at that moment)
  isUndone?: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
};

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getStartOfWeek(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diff);
  const year = startOfWeek.getFullYear();
  const month = String(startOfWeek.getMonth() + 1).padStart(2, "0");
  const day = String(startOfWeek.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function getHabits(): Promise<Habit[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.HABITS);
    const habits = data ? JSON.parse(data) : [];
    console.log("[Storage] getHabits: Retrieved", habits.length, "habits from AsyncStorage");
    return habits;
  } catch (error) {
    console.error("[Storage] getHabits: Error reading habits", error);
    return [];
  }
}

export async function saveHabits(habits: Habit[]): Promise<void> {
  console.log("[Storage] saveHabits: Saving", habits.length, "habits to AsyncStorage");
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

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.ONBOARDING_COMPLETE);
  await AsyncStorage.removeItem(KEYS.IS_PRO);
}

export async function getBadHabits(): Promise<BadHabit[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.BAD_HABITS);
    const badHabits = data ? JSON.parse(data) : [];
    console.log("[Storage] getBadHabits: Retrieved", badHabits.length, "bad habits from AsyncStorage");
    return badHabits;
  } catch (error) {
    console.error("[Storage] getBadHabits: Error reading bad habits", error);
    return [];
  }
}

export async function saveBadHabits(badHabits: BadHabit[]): Promise<void> {
  console.log("[Storage] saveBadHabits: Saving", badHabits.length, "bad habits to AsyncStorage");
  await AsyncStorage.setItem(KEYS.BAD_HABITS, JSON.stringify(badHabits));
}

export async function getBadHabitLogs(): Promise<BadHabitLog[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.BAD_HABIT_LOGS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveBadHabitLogs(logs: BadHabitLog[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.BAD_HABIT_LOGS, JSON.stringify(logs));
}

export async function clearAllData(): Promise<void> {
  console.log("[Storage] clearAllData: CLEARING ALL DATA!");
  await AsyncStorage.multiRemove([
    KEYS.HABITS,
    KEYS.LOGS,
    KEYS.SETTINGS,
    KEYS.IS_PRO,
    KEYS.ONBOARDING_COMPLETE,
    KEYS.BAD_HABITS,
    KEYS.BAD_HABIT_LOGS,
  ]);
}

export async function clearUserData(): Promise<void> {
  console.log("[Storage] clearUserData: Clearing user-specific data (habits, logs, bad habits)");
  await AsyncStorage.multiRemove([
    KEYS.HABITS,
    KEYS.LOGS,
    KEYS.BAD_HABITS,
    KEYS.BAD_HABIT_LOGS,
  ]);
}

export type IconColorSuggestion = { icon: string; color: string };

const HABIT_SUGGESTIONS: Record<string, IconColorSuggestion> = {
  water: { icon: "droplet", color: "#45B7D1" },
  drink: { icon: "droplet", color: "#45B7D1" },
  hydrate: { icon: "droplet", color: "#45B7D1" },
  exercise: { icon: "activity", color: "#06D6A0" },
  workout: { icon: "activity", color: "#06D6A0" },
  gym: { icon: "activity", color: "#06D6A0" },
  fitness: { icon: "activity", color: "#06D6A0" },
  run: { icon: "zap", color: "#FF6B6B" },
  running: { icon: "zap", color: "#FF6B6B" },
  jog: { icon: "zap", color: "#FF6B6B" },
  walk: { icon: "navigation", color: "#4ECDC4" },
  walking: { icon: "navigation", color: "#4ECDC4" },
  steps: { icon: "navigation", color: "#4ECDC4" },
  read: { icon: "book-open", color: "#7B68EE" },
  reading: { icon: "book-open", color: "#7B68EE" },
  book: { icon: "book", color: "#7B68EE" },
  meditate: { icon: "sun", color: "#FFD166" },
  meditation: { icon: "sun", color: "#FFD166" },
  mindful: { icon: "sun", color: "#FFD166" },
  sleep: { icon: "moon", color: "#073B4C" },
  rest: { icon: "moon", color: "#073B4C" },
  nap: { icon: "moon", color: "#073B4C" },
  coffee: { icon: "coffee", color: "#795548" },
  tea: { icon: "coffee", color: "#4CAF50" },
  write: { icon: "edit-3", color: "#BB8FCE" },
  writing: { icon: "edit-3", color: "#BB8FCE" },
  journal: { icon: "feather", color: "#DDA0DD" },
  code: { icon: "code", color: "#3F51B5" },
  coding: { icon: "code", color: "#3F51B5" },
  program: { icon: "terminal", color: "#607D8B" },
  study: { icon: "book", color: "#2196F3" },
  learn: { icon: "bookmark", color: "#00BCD4" },
  practice: { icon: "target", color: "#E91E63" },
  stretch: { icon: "activity", color: "#8BC34A" },
  yoga: { icon: "heart", color: "#FF69B4" },
  push: { icon: "trending-up", color: "#FF5722" },
  pushup: { icon: "trending-up", color: "#FF5722" },
  situp: { icon: "award", color: "#FF8C42" },
  plank: { icon: "clock", color: "#009688" },
  squat: { icon: "zap", color: "#9C27B0" },
  music: { icon: "music", color: "#673AB7" },
  piano: { icon: "music", color: "#9E9E9E" },
  guitar: { icon: "music", color: "#795548" },
  sing: { icon: "mic", color: "#FF69B4" },
  call: { icon: "phone", color: "#4CAF50" },
  email: { icon: "mail", color: "#2196F3" },
  work: { icon: "briefcase", color: "#607D8B" },
  focus: { icon: "target", color: "#FF6B6B" },
  money: { icon: "dollar-sign", color: "#4CAF50" },
  save: { icon: "dollar-sign", color: "#06D6A0" },
  clean: { icon: "home", color: "#45B7D1" },
  cook: { icon: "thermometer", color: "#FF8C42" },
  eat: { icon: "coffee", color: "#CDDC39" },
  fruit: { icon: "sun", color: "#FF9800" },
  vegetable: { icon: "sun", color: "#4CAF50" },
  vitamin: { icon: "heart", color: "#E91E63" },
  medicine: { icon: "heart", color: "#FF6B6B" },
  breathe: { icon: "wind", color: "#4ECDC4" },
  breathing: { icon: "wind", color: "#4ECDC4" },
  gratitude: { icon: "heart", color: "#FFD166" },
  affirmation: { icon: "star", color: "#FFC107" },
  positive: { icon: "smile", color: "#FFD166" },
  social: { icon: "users", color: "#118AB2" },
  friend: { icon: "users", color: "#7B68EE" },
  language: { icon: "globe", color: "#00BCD4" },
  spanish: { icon: "globe", color: "#FF5722" },
  french: { icon: "globe", color: "#3F51B5" },
  draw: { icon: "pen-tool", color: "#9C27B0" },
  drawing: { icon: "pen-tool", color: "#9C27B0" },
  art: { icon: "layers", color: "#E91E63" },
  photo: { icon: "camera", color: "#607D8B" },
  floss: { icon: "check-circle", color: "#4ECDC4" },
  teeth: { icon: "smile", color: "#45B7D1" },
  skincare: { icon: "droplet", color: "#DDA0DD" },
  screen: { icon: "monitor", color: "#607D8B" },
  phone: { icon: "smartphone", color: "#9E9E9E" },
};

export function suggestIconAndColor(habitName: string): IconColorSuggestion {
  const normalized = habitName.toLowerCase().trim();
  for (const [keyword, suggestion] of Object.entries(HABIT_SUGGESTIONS)) {
    if (normalized.includes(keyword)) {
      return suggestion;
    }
  }
  const randomIcon = HABIT_ICONS[Math.floor(Math.random() * 20)];
  const randomColor = HABIT_COLORS[Math.floor(Math.random() * HABIT_COLORS.length)];
  return { icon: randomIcon, color: randomColor };
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
