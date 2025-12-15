import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  HABITS: "@units/habits",
  LOGS: "@units/logs",
  TASKS: "@units/tasks",
  SETTINGS: "@units/settings",
  IS_PRO: "@units/is_pro",
  ONBOARDING_COMPLETE: "@units/onboarding_complete",
} as const;

export interface UnitVersion {
  id: string;
  unitName: string;
  unitSize: number;
  unitDescriptor?: string;
  effectiveStartDate: string;
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  softFloorPerWeek: number;
  unitVersions: UnitVersion[];
  createdAt: string;
  isArchived: boolean;
}

export interface UnitLog {
  id: string;
  habitId: string;
  unitVersionId: string;
  count: number;
  date: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  unitEstimate: number;
  linkedHabitId?: string;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface AppSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  showGeneralEffort: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  showGeneralEffort: false,
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

export async function addHabit(habit: Omit<Habit, "id" | "createdAt" | "isArchived">): Promise<Habit> {
  const habits = await getHabits();
  const newHabit: Habit = {
    ...habit,
    id: generateId(),
    createdAt: new Date().toISOString(),
    isArchived: false,
  };
  habits.push(newHabit);
  await saveHabits(habits);
  return newHabit;
}

export async function updateHabit(id: string, updates: Partial<Habit>): Promise<void> {
  const habits = await getHabits();
  const index = habits.findIndex((h) => h.id === id);
  if (index !== -1) {
    habits[index] = { ...habits[index], ...updates };
    await saveHabits(habits);
  }
}

export async function deleteHabit(id: string): Promise<void> {
  const habits = await getHabits();
  await saveHabits(habits.filter((h) => h.id !== id));
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

export async function addLog(habitId: string, unitVersionId: string, count: number): Promise<UnitLog> {
  const logs = await getLogs();
  const newLog: UnitLog = {
    id: generateId(),
    habitId,
    unitVersionId,
    count,
    date: getTodayDate(),
    createdAt: new Date().toISOString(),
  };
  logs.push(newLog);
  await saveLogs(logs);
  return newLog;
}

export async function removeLog(id: string): Promise<void> {
  const logs = await getLogs();
  await saveLogs(logs.filter((l) => l.id !== id));
}

export async function getLogsForHabit(habitId: string): Promise<UnitLog[]> {
  const logs = await getLogs();
  return logs.filter((l) => l.habitId === habitId);
}

export async function getLogsForDate(date: string): Promise<UnitLog[]> {
  const logs = await getLogs();
  return logs.filter((l) => l.date === date);
}

export async function getTodayUnitsForHabit(habitId: string): Promise<number> {
  const logs = await getLogs();
  const today = getTodayDate();
  return logs
    .filter((l) => l.habitId === habitId && l.date === today)
    .reduce((sum, l) => sum + l.count, 0);
}

export async function getWeekUnitsForHabit(habitId: string): Promise<number> {
  const logs = await getLogs();
  const startOfWeek = getStartOfWeek();
  return logs
    .filter((l) => l.habitId === habitId && l.date >= startOfWeek)
    .reduce((sum, l) => sum + l.count, 0);
}

export async function getLifetimeUnitsForHabit(habitId: string): Promise<number> {
  const logs = await getLogs();
  return logs
    .filter((l) => l.habitId === habitId)
    .reduce((sum, l) => sum + l.count, 0);
}

export async function getTodayTotalUnits(): Promise<number> {
  const logs = await getLogs();
  const today = getTodayDate();
  return logs.filter((l) => l.date === today).reduce((sum, l) => sum + l.count, 0);
}

export async function getWeekTotalUnits(): Promise<number> {
  const logs = await getLogs();
  const startOfWeek = getStartOfWeek();
  return logs.filter((l) => l.date >= startOfWeek).reduce((sum, l) => sum + l.count, 0);
}

export async function getLifetimeTotalUnits(): Promise<number> {
  const logs = await getLogs();
  return logs.reduce((sum, l) => sum + l.count, 0);
}

export async function getTasks(): Promise<Task[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.TASKS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
}

export async function addTask(task: Omit<Task, "id" | "createdAt" | "isCompleted">): Promise<Task> {
  const tasks = await getTasks();
  const newTask: Task = {
    ...task,
    id: generateId(),
    createdAt: new Date().toISOString(),
    isCompleted: false,
  };
  tasks.push(newTask);
  await saveTasks(tasks);
  return newTask;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  const tasks = await getTasks();
  const index = tasks.findIndex((t) => t.id === id);
  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...updates };
    await saveTasks(tasks);
  }
}

export async function deleteTask(id: string): Promise<void> {
  const tasks = await getTasks();
  await saveTasks(tasks.filter((t) => t.id !== id));
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
    KEYS.TASKS,
    KEYS.SETTINGS,
    KEYS.IS_PRO,
    KEYS.ONBOARDING_COMPLETE,
  ]);
}

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
