import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as Haptics from "expo-haptics";
import {
  Habit,
  UnitLog,
  AppSettings,
  BadHabit,
  BadHabitLog,
  PenaltyAdjustment,
  getHabits,
  saveHabits,
  getLogs,
  saveLogs,
  getSettings,
  saveSettings,
  getIsPro,
  setIsPro as saveIsPro,
  getBadHabits,
  saveBadHabits,
  getBadHabitLogs,
  saveBadHabitLogs,
  generateId,
  getTodayDate,
  getStartOfWeek,
  FREE_LIMITS,
  isOnboardingComplete,
  setOnboardingComplete,
  resetOnboarding as resetOnboardingStorage,
} from "@/lib/storage";
import { useAuth } from "@/lib/AuthContext";
import {
  fetchHabitsWithTodayProgress,
  addUnitsToHabit,
  createHabit as createDbHabit,
  updateHabit as updateDbHabit,
  deleteHabit as deleteDbHabit,
  HabitWithProgress,
} from "@/lib/habitService";

interface UndoAction {
  type: "add_units" | "remove_units";
  logId: string;
  habitId: string;
  count: number;
}

interface UnitsContextType {
  habits: Habit[];
  logs: UnitLog[];
  settings: AppSettings;
  isPro: boolean;
  loading: boolean;
  undoAction: UndoAction | null;
  hasCompletedOnboarding: boolean;
  badHabits: BadHabit[];
  badHabitLogs: BadHabitLog[];
  currentDate: string;
  
  addHabit: (habit: Omit<Habit, "id" | "createdAt" | "isArchived">) => Promise<boolean>;
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  
  addUnits: (habitId: string, count: number) => Promise<boolean>;
  removeUnits: (habitId: string, count: number) => Promise<boolean>;
  addUnitsForDate: (habitId: string, count: number, date: string) => Promise<boolean>;
  removeUnitsForDate: (habitId: string, count: number, date: string) => Promise<boolean>;
  undoLastAdd: () => Promise<void>;
  clearUndo: () => void;
  
  addBadHabit: (name: string) => Promise<boolean>;
  deleteBadHabit: (id: string) => Promise<void>;
  tapBadHabit: (badHabitId: string) => Promise<void>;
  undoBadHabitTap: (badHabitId: string) => Promise<boolean>;
  tapBadHabitForDate: (badHabitId: string, date: string) => Promise<void>;
  undoBadHabitTapForDate: (badHabitId: string, date: string) => Promise<boolean>;
  getBadHabitTapsForDate: (badHabitId: string, date: string) => number;
  getTodayBadHabitTaps: (badHabitId: string) => number;
  getTodayTotalBadTaps: () => number;
  getPenaltyMultiplier: () => number;
  getTodayTotalPenalty: () => number;
  getDailyProgress: () => { percentage: number; allGoalsMet: boolean; rawAllGoalsMet: boolean; hasBadHabits: boolean; improvementPercent: number; rawImprovementPercent: number; hasDoubledGoal: boolean; allGoalsDoubled: boolean; doubledCount: number; penaltyPercent: number; rawPercentage: number; rawTotalUnits: number; effectiveTotalUnits: number; totalGoal: number };
  
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  setIsPro: (isPro: boolean) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  
  getTodayUnits: (habitId: string) => number;
  getEffectiveTodayUnits: (habitId: string) => number;
  getEffectiveTodayTotalUnits: () => number;
  getEffectiveUnitsDistribution: () => Record<string, number>;
  getWeekUnits: (habitId: string) => number;
  getTodayTotalUnits: () => number;
  getWeekTotalUnits: () => number;
  getMonthUnits: (habitId: string) => number;
  getYearUnits: (habitId: string) => number;
  getLogsForDate: (date: string) => UnitLog[];
  getHighestDailyTotal: () => number;
  
  canAddHabit: () => boolean;
  canAddUnits: (count: number) => boolean;
  
  refreshData: () => Promise<void>;
}

const UnitsContext = createContext<UnitsContextType | undefined>(undefined);

function dbHabitToLocal(dbHabit: HabitWithProgress): Habit {
  return {
    id: dbHabit.id,
    name: dbHabit.name,
    icon: dbHabit.icon,
    color: dbHabit.color,
    unitName: dbHabit.unit_name,
    dailyGoal: dbHabit.daily_goal,
    tapIncrement: dbHabit.tap_increment,
    habitType: dbHabit.habit_type,
    createdAt: dbHabit.created_at,
    isArchived: dbHabit.is_archived,
  };
}

function dbHabitToLog(dbHabit: HabitWithProgress, date: string): UnitLog {
  return {
    id: dbHabit.todayLogId || generateId(),
    habitId: dbHabit.id,
    count: dbHabit.todayCount,
    date,
    createdAt: new Date().toISOString(),
  };
}

export function UnitsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<UnitLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    soundEnabled: true,
    hapticsEnabled: true,
  });
  const [isPro, setIsProState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [badHabits, setBadHabits] = useState<BadHabit[]>([]);
  const [badHabitLogs, setBadHabitLogs] = useState<BadHabitLog[]>([]);
  const [currentDate, setCurrentDate] = useState(getTodayDate());
  const appState = useRef(AppState.currentState);

  // Day change detection - check if date has changed
  const checkDayChange = useCallback(() => {
    const today = getTodayDate();
    if (today !== currentDate) {
      setCurrentDate(today);
      setUndoAction(null); // Clear undo on new day
      return true;
    }
    return false;
  }, [currentDate]);

  // Listen for app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        // App came to foreground - check if day changed
        checkDayChange();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [checkDayChange]);

  // Set up midnight timer to detect day change
  useEffect(() => {
    const checkMidnight = () => {
      checkDayChange();
    };

    // Calculate ms until next midnight
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    // Set timeout for midnight, then check every minute after
    const midnightTimeout = setTimeout(() => {
      checkMidnight();
      // After midnight, check every minute in case timeout was slightly off
      const intervalId = setInterval(checkMidnight, 60000);
      return () => clearInterval(intervalId);
    }, msUntilMidnight);

    // Also check every minute as a fallback
    const intervalId = setInterval(checkMidnight, 60000);

    return () => {
      clearTimeout(midnightTimeout);
      clearInterval(intervalId);
    };
  }, [checkDayChange]);

  const refreshData = useCallback(async () => {
    try {
      const [loadedSettings, loadedIsPro, loadedOnboarding, loadedBadHabits, loadedBadHabitLogs] = await Promise.all([
        getSettings(),
        getIsPro(),
        isOnboardingComplete(),
        getBadHabits(),
        getBadHabitLogs(),
      ]);

      setSettings(loadedSettings);
      setIsProState(loadedIsPro);
      setHasCompletedOnboarding(loadedOnboarding);
      setBadHabits(loadedBadHabits);
      setBadHabitLogs(loadedBadHabitLogs);

      // Always load from local storage first (local-first approach)
      const [loadedHabits, loadedLogs] = await Promise.all([
        getHabits(),
        getLogs(),
      ]);
      
      const normalizedHabits = loadedHabits.map((h) => ({
        ...h,
        tapIncrement: h.tapIncrement ?? 1,
        habitType: h.habitType ?? "count",
      }));
      
      const needsMigration = loadedHabits.some((h) => h.tapIncrement === undefined || h.habitType === undefined);
      if (needsMigration) {
        await saveHabits(normalizedHabits);
      }
      
      const habitIds = new Set(normalizedHabits.map((h) => h.id));
      const cleanedLogs = loadedLogs.filter((l) => habitIds.has(l.habitId));
      if (cleanedLogs.length !== loadedLogs.length) {
        await saveLogs(cleanedLogs);
      }
      
      setHabits(normalizedHabits);
      setLogs(cleanedLogs);

      // Try to sync with Supabase in background if logged in
      if (user) {
        fetchHabitsWithTodayProgress(user.id).then(({ habits: dbHabits, error }) => {
          if (!error && dbHabits) {
            // Merge Supabase habits with local if needed (background sync)
            // For now, local storage is source of truth
          }
        }).catch(() => {
          // Silently ignore Supabase errors
        });
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const triggerHaptic = useCallback((style: "light" | "medium" | "heavy" = "light") => {
    if (settings.hapticsEnabled) {
      const feedbackStyle = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      }[style];
      Haptics.impactAsync(feedbackStyle);
    }
  }, [settings.hapticsEnabled]);

  const triggerSuccess = useCallback(() => {
    if (settings.hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [settings.hapticsEnabled]);

  const handleAddHabit = useCallback(async (habit: Omit<Habit, "id" | "createdAt" | "isArchived">) => {
    const activeHabits = habits.filter((h) => !h.isArchived);
    if (!isPro && activeHabits.length >= FREE_LIMITS.MAX_HABITS) {
      return false;
    }

    const newHabit: Habit = {
      ...habit,
      id: generateId(),
      createdAt: new Date().toISOString(),
      isArchived: false,
    };

    // Always update local state first
    const updated = [...habits, newHabit];
    setHabits(updated);
    await saveHabits(updated);

    // Try to sync to Supabase in background (non-blocking)
    if (user) {
      createDbHabit(user.id, {
        name: habit.name,
        icon: habit.icon,
        color: habit.color,
        unit_name: habit.unitName,
        daily_goal: habit.dailyGoal,
        tap_increment: habit.tapIncrement,
        habit_type: habit.habitType,
      }).catch(() => {
        // Silently ignore Supabase errors - local storage is source of truth for now
      });
    }

    triggerSuccess();
    return true;
  }, [habits, user, isPro, triggerSuccess]);

  const handleUpdateHabit = useCallback(async (id: string, updates: Partial<Habit>) => {
    const updated = habits.map((h) => (h.id === id ? { ...h, ...updates } : h));
    setHabits(updated);
    await saveHabits(updated);
  }, [habits]);

  const handleDeleteHabit = useCallback(async (id: string) => {
    const updated = habits.filter((h) => h.id !== id);
    setHabits(updated);
    await saveHabits(updated);
    
    const updatedLogs = logs.filter((l) => l.habitId !== id);
    setLogs(updatedLogs);
    await saveLogs(updatedLogs);
  }, [habits, logs]);

  const handleAddUnits = useCallback(async (habitId: string, count: number) => {
    const today = getTodayDate();
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return false;

    const existingLog = logs.find((l) => l.habitId === habitId && l.date === today);
    const oldTotal = existingLog?.count ?? 0;
    const newTotal = oldTotal + count;

    // Always update local state first (local-first approach)
    let updatedLogs: UnitLog[];
    if (existingLog) {
      updatedLogs = logs.map((l) =>
        l.habitId === habitId && l.date === today
          ? { ...l, count: newTotal }
          : l
      );
    } else {
      const newLog: UnitLog = {
        id: generateId(),
        habitId,
        count,
        date: today,
        createdAt: new Date().toISOString(),
      };
      updatedLogs = [...logs, newLog];
    }
    
    setLogs(updatedLogs);
    await saveLogs(updatedLogs);

    // Try to sync to Supabase in background (non-blocking)
    if (user) {
      addUnitsToHabit(habitId, user.id, count, today).catch(() => {
        // Silently ignore Supabase errors - local storage is source of truth
      });
    }

    if (newTotal >= habit.dailyGoal && oldTotal < habit.dailyGoal) {
      triggerSuccess();
    } else {
      triggerHaptic("medium");
    }

    return true;
  }, [habits, logs, user, triggerHaptic, triggerSuccess]);

  const handleRemoveUnits = useCallback(async (habitId: string, count: number) => {
    const today = getTodayDate();
    const todayLogs = logs
      .filter((l) => l.habitId === habitId && l.date === today)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (todayLogs.length === 0) return false;

    const totalAvailable = todayLogs.reduce((sum, l) => sum + l.count, 0);
    if (totalAvailable === 0) return false;

    const actualCountToRemove = Math.min(count, totalAvailable);

    let remaining = actualCountToRemove;
    const logsToRemove: string[] = [];
    const logsToUpdate: { id: string; newCount: number }[] = [];

    for (const log of todayLogs) {
      if (remaining <= 0) break;
      
      if (log.count <= remaining) {
        logsToRemove.push(log.id);
        remaining -= log.count;
      } else {
        logsToUpdate.push({ id: log.id, newCount: log.count - remaining });
        remaining = 0;
      }
    }

    const updated = logs
      .filter((l) => !logsToRemove.includes(l.id))
      .map((l) => {
        const update = logsToUpdate.find((u) => u.id === l.id);
        if (update) {
          return { ...l, count: update.newCount };
        }
        return l;
      });

    setLogs(updated);
    await saveLogs(updated);
    triggerHaptic("light");
    return true;
  }, [logs, triggerHaptic]);

  const handleAddUnitsForDate = useCallback(async (habitId: string, count: number, date: string) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return false;

    const newLog: UnitLog = {
      id: generateId(),
      habitId,
      count: Math.max(1, Math.min(count, 9999)),
      date,
      createdAt: new Date().toISOString(),
    };

    const updated = [...logs, newLog];
    setLogs(updated);
    await saveLogs(updated);
    triggerHaptic("medium");
    return true;
  }, [habits, logs, triggerHaptic]);

  const handleRemoveUnitsForDate = useCallback(async (habitId: string, count: number, date: string) => {
    const dateLogs = logs
      .filter((l) => l.habitId === habitId && l.date === date)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (dateLogs.length === 0) return false;

    const totalAvailable = dateLogs.reduce((sum, l) => sum + l.count, 0);
    if (totalAvailable <= 0) return false;

    const actualCountToRemove = Math.min(count, totalAvailable);

    let remaining = actualCountToRemove;
    const logsToRemove: string[] = [];
    const logsToUpdate: { id: string; newCount: number }[] = [];

    for (const log of dateLogs) {
      if (remaining <= 0) break;
      
      if (log.count <= remaining) {
        logsToRemove.push(log.id);
        remaining -= log.count;
      } else {
        logsToUpdate.push({ id: log.id, newCount: log.count - remaining });
        remaining = 0;
      }
    }

    const updated = logs
      .filter((l) => !logsToRemove.includes(l.id))
      .map((l) => {
        const update = logsToUpdate.find((u) => u.id === l.id);
        if (update) {
          return { ...l, count: update.newCount };
        }
        return l;
      });

    setLogs(updated);
    await saveLogs(updated);
    triggerHaptic("light");
    return true;
  }, [logs, triggerHaptic]);

  const handleUndoLastAdd = useCallback(async () => {
    if (!undoAction) return;

    const updated = logs.filter((l) => l.id !== undoAction.logId);
    setLogs(updated);
    await saveLogs(updated);
    setUndoAction(null);
    triggerHaptic("light");
  }, [undoAction, logs, triggerHaptic]);

  const clearUndo = useCallback(() => {
    setUndoAction(null);
  }, []);

  const handleUpdateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    await saveSettings(updated);
  }, [settings]);

  const handleSetIsPro = useCallback(async (value: boolean) => {
    setIsProState(value);
    await saveIsPro(value);
  }, []);

  const getTodayUnits = useCallback((habitId: string) => {
    return logs
      .filter((l) => l.habitId === habitId && l.date === currentDate)
      .reduce((sum, l) => sum + l.count, 0);
  }, [logs, currentDate]);

  const getWeekUnits = useCallback((habitId: string) => {
    const startOfWeek = getStartOfWeek();
    return logs
      .filter((l) => l.habitId === habitId && l.date >= startOfWeek)
      .reduce((sum, l) => sum + l.count, 0);
  }, [logs]);

  const getMonthUnits = useCallback((habitId: string) => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const y = first.getFullYear();
    const m = String(first.getMonth() + 1).padStart(2, "0");
    const startOfMonth = `${y}-${m}-01`;
    return logs
      .filter((l) => l.habitId === habitId && l.date >= startOfMonth)
      .reduce((sum, l) => sum + l.count, 0);
  }, [logs]);

  const getYearUnits = useCallback((habitId: string) => {
    const now = new Date();
    const startOfYear = `${now.getFullYear()}-01-01`;
    return logs
      .filter((l) => l.habitId === habitId && l.date >= startOfYear)
      .reduce((sum, l) => sum + l.count, 0);
  }, [logs]);

  const getTodayTotalUnits = useCallback(() => {
    // Only count logs for habits that still exist
    const habitIds = new Set(habits.map((h) => h.id));
    return logs
      .filter((l) => l.date === currentDate && habitIds.has(l.habitId))
      .reduce((sum, l) => sum + l.count, 0);
  }, [logs, currentDate, habits]);

  // Get effective units for a habit after penalty multiplier applied
  const getEffectiveTodayUnits = useCallback((habitId: string) => {
    // Get all active habits and their raw units
    const activeHabits = habits.filter((h) => !h.isArchived);
    const habitCount = activeHabits.length;
    
    if (habitCount === 0) return 0;
    
    // Calculate total raw units across all habits
    let totalRawUnits = 0;
    const habitRawUnits: Record<string, number> = {};
    
    for (const h of activeHabits) {
      const raw = logs
        .filter((l) => l.habitId === h.id && l.date === currentDate)
        .reduce((sum, l) => sum + l.count, 0);
      habitRawUnits[h.id] = raw;
      totalRawUnits += raw;
    }
    
    // Get penalty
    const totalBadTaps = badHabitLogs
      .filter((l) => l.date === currentDate && !l.isUndone)
      .reduce((sum, l) => sum + l.count, 0);
    const multiplier = Math.pow(0.9, totalBadTaps);
    
    // Calculate effective total (with penalty)
    const effectiveTotal = Math.round(totalRawUnits * multiplier);
    const penaltyAmount = totalRawUnits - effectiveTotal;
    
    // Distribute penalty EVENLY across all habits
    // Each habit loses an equal share of the penalty
    const penaltyPerHabit = Math.floor(penaltyAmount / habitCount);
    const remainder = penaltyAmount % habitCount;
    
    // Find position of this habit for remainder distribution
    const habitIndex = activeHabits.findIndex((h) => h.id === habitId);
    const extraPenalty = habitIndex < remainder ? 1 : 0;
    
    const rawUnits = habitRawUnits[habitId] || 0;
    const effectiveUnits = Math.max(0, rawUnits - penaltyPerHabit - extraPenalty);
    
    return effectiveUnits;
  }, [logs, currentDate, badHabitLogs, habits]);

  // Get effective total units after penalty multiplier applied
  const getEffectiveTodayTotalUnits = useCallback(() => {
    const activeHabits = habits.filter((h) => !h.isArchived);
    const rawTotal = logs
      .filter((l) => l.date === currentDate && activeHabits.some((h) => h.id === l.habitId))
      .reduce((sum, l) => sum + l.count, 0);
    const totalBadTaps = badHabitLogs
      .filter((l) => l.date === currentDate && !l.isUndone)
      .reduce((sum, l) => sum + l.count, 0);
    const multiplier = Math.pow(0.9, totalBadTaps);
    // Use round for accurate display (44 * 0.9 = 39.6 → 40)
    return Math.round(rawTotal * multiplier);
  }, [logs, currentDate, badHabitLogs, habits]);

  // Get effective distribution of units across all habits (for blocks visualization)
  const getEffectiveUnitsDistribution = useCallback(() => {
    const activeHabits = habits.filter((h) => !h.isArchived);
    const habitCount = activeHabits.length;
    
    if (habitCount === 0) return {};
    
    // Calculate raw totals per habit
    let rawTotal = 0;
    const habitRawUnits: Record<string, number> = {};
    
    for (const h of activeHabits) {
      const raw = logs
        .filter((l) => l.habitId === h.id && l.date === currentDate)
        .reduce((sum, l) => sum + l.count, 0);
      habitRawUnits[h.id] = raw;
      rawTotal += raw;
    }
    
    // Get penalty
    const totalBadTaps = badHabitLogs
      .filter((l) => l.date === currentDate && !l.isUndone)
      .reduce((sum, l) => sum + l.count, 0);
    const multiplier = Math.pow(0.9, totalBadTaps);
    
    // Calculate effective total (round for accurate display)
    const effectiveTotal = Math.round(rawTotal * multiplier);
    const penaltyAmount = rawTotal - effectiveTotal;
    
    // Distribute penalty evenly (round-robin for remainder)
    const penaltyPerHabit = Math.floor(penaltyAmount / habitCount);
    const remainder = penaltyAmount % habitCount;
    
    const result: Record<string, number> = {};
    activeHabits.forEach((h, idx) => {
      const extraPenalty = idx < remainder ? 1 : 0;
      result[h.id] = Math.max(0, habitRawUnits[h.id] - penaltyPerHabit - extraPenalty);
    });
    
    return result;
  }, [logs, currentDate, badHabitLogs, habits]);

  const getWeekTotalUnits = useCallback(() => {
    const startOfWeek = getStartOfWeek();
    const habitIds = new Set(habits.map((h) => h.id));
    return logs
      .filter((l) => l.date >= startOfWeek && habitIds.has(l.habitId))
      .reduce((sum, l) => sum + l.count, 0);
  }, [logs, habits]);

  const getLogsForDate = useCallback((date: string) => {
    const habitIds = new Set(habits.map((h) => h.id));
    return logs.filter((l) => l.date === date && habitIds.has(l.habitId));
  }, [logs, habits]);

  const getHighestDailyTotal = useCallback(() => {
    // Only count logs for habits that still exist
    const habitIds = new Set(habits.map((h) => h.id));
    const dailyTotals: Record<string, number> = {};
    logs.forEach((log) => {
      if (log.date !== currentDate && habitIds.has(log.habitId)) {
        dailyTotals[log.date] = (dailyTotals[log.date] || 0) + log.count;
      }
    });
    const totals = Object.values(dailyTotals);
    return totals.length > 0 ? Math.max(...totals) : 0;
  }, [logs, currentDate, habits]);

  const canAddHabit = useCallback(() => {
    if (isPro) return true;
    const activeHabits = habits.filter((h) => !h.isArchived);
    return activeHabits.length < FREE_LIMITS.MAX_HABITS;
  }, [habits, isPro]);

  const canAddUnits = useCallback((count: number) => {
    return true;
  }, []);

  const handleCompleteOnboarding = useCallback(async () => {
    await setOnboardingComplete();
    setHasCompletedOnboarding(true);
  }, []);

  const handleResetOnboarding = useCallback(async () => {
    await resetOnboardingStorage();
    setHasCompletedOnboarding(false);
    setIsProState(false);
  }, []);

  const handleAddBadHabit = useCallback(async (name: string) => {
    const newBadHabit: BadHabit = {
      id: generateId(),
      name,
      createdAt: new Date().toISOString(),
      isArchived: false,
    };
    const updated = [...badHabits, newBadHabit];
    setBadHabits(updated);
    await saveBadHabits(updated);
    triggerHaptic("medium");
    return true;
  }, [badHabits, triggerHaptic]);

  const handleDeleteBadHabit = useCallback(async (id: string) => {
    const updated = badHabits.filter((h) => h.id !== id);
    setBadHabits(updated);
    await saveBadHabits(updated);
    const updatedLogs = badHabitLogs.filter((l) => l.badHabitId !== id);
    setBadHabitLogs(updatedLogs);
    await saveBadHabitLogs(updatedLogs);
  }, [badHabits, badHabitLogs]);

  const handleTapBadHabit = useCallback(async (badHabitId: string) => {
    const today = getTodayDate();
    
    const alreadyTappedToday = badHabitLogs.some(
      (l) => l.badHabitId === badHabitId && l.date === today && !l.isUndone
    );
    if (alreadyTappedToday) return;
    
    const newLog: BadHabitLog = {
      id: generateId(),
      badHabitId,
      count: 1,
      date: today,
      createdAt: new Date().toISOString(),
      penaltyAdjustments: [],
      isUndone: false,
    };
    const updatedBadLogs = [...badHabitLogs, newLog];
    setBadHabitLogs(updatedBadLogs);
    await saveBadHabitLogs(updatedBadLogs);
    
    if (settings.hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [badHabitLogs, settings.hapticsEnabled]);

  const handleUndoBadHabitTap = useCallback(async (badHabitId: string): Promise<boolean> => {
    const today = getTodayDate();
    const todayLog = badHabitLogs.find(
      (l) => l.badHabitId === badHabitId && l.date === today && !l.isUndone
    );
    if (!todayLog) return false;
    
    const updatedBadLogs = badHabitLogs.map((l) =>
      l.id === todayLog.id ? { ...l, isUndone: true } : l
    );
    setBadHabitLogs(updatedBadLogs);
    await saveBadHabitLogs(updatedBadLogs);
    
    if (settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    return true;
  }, [badHabitLogs, settings.hapticsEnabled]);

  const handleTapBadHabitForDate = useCallback(async (badHabitId: string, date: string) => {
    const alreadyTapped = badHabitLogs.some(
      (l) => l.badHabitId === badHabitId && l.date === date && !l.isUndone
    );
    if (alreadyTapped) return;
    
    const newLog: BadHabitLog = {
      id: generateId(),
      badHabitId,
      count: 1,
      date,
      createdAt: new Date().toISOString(),
      penaltyAdjustments: [],
      isUndone: false,
    };
    const updatedBadLogs = [...badHabitLogs, newLog];
    setBadHabitLogs(updatedBadLogs);
    await saveBadHabitLogs(updatedBadLogs);
  }, [badHabitLogs]);

  const handleUndoBadHabitTapForDate = useCallback(async (badHabitId: string, date: string): Promise<boolean> => {
    const dateLog = badHabitLogs.find(
      (l) => l.badHabitId === badHabitId && l.date === date && !l.isUndone
    );
    if (!dateLog) return false;
    
    const updatedBadLogs = badHabitLogs.map((l) =>
      l.id === dateLog.id ? { ...l, isUndone: true } : l
    );
    setBadHabitLogs(updatedBadLogs);
    await saveBadHabitLogs(updatedBadLogs);
    return true;
  }, [badHabitLogs]);

  const getBadHabitTapsForDate = useCallback((badHabitId: string, date: string) => {
    return badHabitLogs
      .filter((l) => l.badHabitId === badHabitId && l.date === date && !l.isUndone)
      .reduce((sum, l) => sum + l.count, 0);
  }, [badHabitLogs]);

  const getTodayBadHabitTaps = useCallback((badHabitId: string) => {
    return badHabitLogs
      .filter((l) => l.badHabitId === badHabitId && l.date === currentDate && !l.isUndone)
      .reduce((sum, l) => sum + l.count, 0);
  }, [badHabitLogs, currentDate]);

  const getTodayTotalBadTaps = useCallback(() => {
    return badHabitLogs
      .filter((l) => l.date === currentDate && !l.isUndone)
      .reduce((sum, l) => sum + l.count, 0);
  }, [badHabitLogs, currentDate]);

  const getPenaltyMultiplier = useCallback(() => {
    const totalBadTaps = badHabitLogs
      .filter((l) => l.date === currentDate && !l.isUndone)
      .reduce((sum, l) => sum + l.count, 0);
    return Math.pow(0.9, totalBadTaps);
  }, [badHabitLogs, currentDate]);

  const getTodayTotalPenalty = useCallback(() => {
    const totalBadTaps = badHabitLogs
      .filter((l) => l.date === currentDate && !l.isUndone)
      .reduce((sum, l) => sum + l.count, 0);
    return totalBadTaps * 10;
  }, [badHabitLogs, currentDate]);

  const getDailyProgress = useCallback(() => {
    const activeHabits = habits.filter((h) => !h.isArchived);
    if (activeHabits.length === 0) {
      return { percentage: 100, allGoalsMet: true, rawAllGoalsMet: true, hasBadHabits: false, improvementPercent: 0, rawImprovementPercent: 0, hasDoubledGoal: false, allGoalsDoubled: false, doubledCount: 0, penaltyPercent: 0, rawPercentage: 100, rawTotalUnits: 0, effectiveTotalUnits: 0, totalGoal: 0 };
    }
    
    const totalBadTaps = badHabitLogs
      .filter((l) => l.date === currentDate && !l.isUndone)
      .reduce((sum, l) => sum + l.count, 0);
    const hasBadHabits = totalBadTaps > 0;
    const penaltyPercent = totalBadTaps * 10;
    const penaltyMultiplier = Math.pow(0.9, totalBadTaps);
    
    // Calculate raw totals
    let rawTotalUnits = 0;
    let totalGoal = 0;
    let rawAllGoalsMet = true;
    let anyGoalDoubled = false;
    let doubledCount = 0;
    
    for (const habit of activeHabits) {
      const todayUnits = logs
        .filter((l) => l.habitId === habit.id && l.date === currentDate)
        .reduce((sum, l) => sum + l.count, 0);
      rawTotalUnits += todayUnits;
      totalGoal += habit.dailyGoal;
      
      if (todayUnits < habit.dailyGoal) {
        rawAllGoalsMet = false;
      }
      
      if (todayUnits >= habit.dailyGoal * 2) {
        anyGoalDoubled = true;
        doubledCount++;
      }
    }
    
    // Effective units after penalty (use round for accurate display)
    const effectiveTotalUnits = Math.round(rawTotalUnits * penaltyMultiplier);
    
    // Raw percentage (0-100 scale for completion)
    const rawPercent = totalGoal > 0 ? (rawTotalUnits / totalGoal) * 100 : 0;
    const finalPercent = Math.round(rawPercent * penaltyMultiplier * 10) / 10;
    
    // Improvement % = (total_units / total_goal) where 100% completion = 1%
    // So 10/10 = 1%, 20/10 = 2%, etc.
    // With bad habits: multiply by 0.9 per tap (2% becomes 1.8%)
    const rawImprovementPercent = totalGoal > 0 ? rawTotalUnits / totalGoal : 0;
    const improvementPercent = rawImprovementPercent * penaltyMultiplier;
    
    return { 
      percentage: finalPercent,
      allGoalsMet: rawAllGoalsMet && !hasBadHabits,
      rawAllGoalsMet,
      hasBadHabits,
      improvementPercent, // After penalty (e.g., 1.8%)
      rawImprovementPercent, // Before penalty (e.g., 2%)
      hasDoubledGoal: anyGoalDoubled,
      allGoalsDoubled: doubledCount === activeHabits.length && doubledCount > 0,
      doubledCount,
      penaltyPercent,
      rawPercentage: Math.round(rawPercent),
      rawTotalUnits,
      effectiveTotalUnits,
      totalGoal,
    };
  }, [habits, logs, badHabitLogs, currentDate]);

  return (
    <UnitsContext.Provider
      value={{
        habits,
        logs,
        settings,
        isPro,
        loading,
        undoAction,
        hasCompletedOnboarding,
        badHabits,
        badHabitLogs,
        currentDate,
        addHabit: handleAddHabit,
        updateHabit: handleUpdateHabit,
        deleteHabit: handleDeleteHabit,
        addUnits: handleAddUnits,
        removeUnits: handleRemoveUnits,
        addUnitsForDate: handleAddUnitsForDate,
        removeUnitsForDate: handleRemoveUnitsForDate,
        undoLastAdd: handleUndoLastAdd,
        clearUndo,
        addBadHabit: handleAddBadHabit,
        deleteBadHabit: handleDeleteBadHabit,
        tapBadHabit: handleTapBadHabit,
        undoBadHabitTap: handleUndoBadHabitTap,
        tapBadHabitForDate: handleTapBadHabitForDate,
        undoBadHabitTapForDate: handleUndoBadHabitTapForDate,
        getBadHabitTapsForDate,
        getTodayBadHabitTaps,
        getTodayTotalBadTaps,
        getPenaltyMultiplier,
        getTodayTotalPenalty,
        getDailyProgress,
        updateSettings: handleUpdateSettings,
        setIsPro: handleSetIsPro,
        completeOnboarding: handleCompleteOnboarding,
        resetOnboarding: handleResetOnboarding,
        getTodayUnits,
        getEffectiveTodayUnits,
        getEffectiveTodayTotalUnits,
        getEffectiveUnitsDistribution,
        getWeekUnits,
        getMonthUnits,
        getYearUnits,
        getTodayTotalUnits,
        getWeekTotalUnits,
        getLogsForDate,
        getHighestDailyTotal,
        canAddHabit,
        canAddUnits,
        refreshData,
      }}
    >
      {children}
    </UnitsContext.Provider>
  );
}

export function useUnits() {
  const context = useContext(UnitsContext);
  if (!context) {
    throw new Error("useUnits must be used within a UnitsProvider");
  }
  return context;
}
