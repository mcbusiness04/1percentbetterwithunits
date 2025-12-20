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
  setUnitsForHabit,
  createHabit as createDbHabit,
  updateHabit as updateDbHabit,
  deleteHabit as deleteDbHabit,
  createBadHabit as createDbBadHabit,
  deleteBadHabit as deleteDbBadHabit,
  createBadHabitLog as createDbBadHabitLog,
  undoBadHabitLog as undoDbBadHabitLog,
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
  getDailyProgress: () => { percentage: number; allGoalsMet: boolean; rawAllGoalsMet: boolean; perfectDay: boolean; hasBadHabits: boolean; improvementPercent: number; rawImprovementPercent: number; hasDoubledGoal: boolean; allGoalsDoubled: boolean; doubledCount: number; penaltyPercent: number; rawPercentage: number; rawTotalUnits: number; effectiveTotalUnits: number; totalGoal: number };
  
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  setIsPro: (isPro: boolean) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  
  getTodayUnits: (habitId: string) => number;
  getEffectiveTodayUnits: (habitId: string) => number;
  getEffectiveTodayTotalUnits: () => number;
  getEffectiveUnitsDistribution: () => Record<string, number>;
  getEffectiveTotalForDate: (date: string) => number;
  getEffectiveHabitUnitsForDate: (habitId: string, date: string) => number;
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
      console.log("[Units] refreshData: Starting data load...");
      
      const [loadedSettings, loadedIsPro, loadedOnboarding, loadedBadHabits, loadedBadHabitLogs] = await Promise.all([
        getSettings(),
        getIsPro(),
        isOnboardingComplete(),
        getBadHabits(),
        getBadHabitLogs(),
      ]);

      console.log("[Units] refreshData: Loaded bad habits:", loadedBadHabits.length, "bad habit logs:", loadedBadHabitLogs.length);

      setSettings(loadedSettings);
      setIsProState(loadedIsPro);
      setHasCompletedOnboarding(loadedOnboarding);
      setBadHabits(loadedBadHabits);
      setBadHabitLogs(loadedBadHabitLogs);

      // Always load from local storage (local-first approach)
      // IMPORTANT: Never overwrite storage during load - only during explicit mutations
      const [loadedHabits, loadedLogs] = await Promise.all([
        getHabits(),
        getLogs(),
      ]);
      
      console.log("[Units] refreshData: Loaded habits:", loadedHabits.length, "logs:", loadedLogs.length);
      
      // Normalize habits with default values (in-memory only, save only if needed)
      const normalizedHabits = loadedHabits.map((h) => ({
        ...h,
        tapIncrement: h.tapIncrement ?? 1,
        habitType: h.habitType ?? "count",
      }));
      
      // Only save if actual migration is needed (one-time migration)
      const needsMigration = loadedHabits.some((h) => h.tapIncrement === undefined || h.habitType === undefined);
      if (needsMigration && loadedHabits.length > 0) {
        await saveHabits(normalizedHabits);
      }
      
      // Set state with all loaded data - DO NOT filter or clean during load
      // Logs for deleted habits are harmless and will be cleaned up on next habit deletion
      setHabits(normalizedHabits);
      setLogs(loadedLogs); // Keep ALL historical logs
      
      console.log("[Units] refreshData: Data loaded successfully. Habits:", normalizedHabits.length);

      // Try to sync with Supabase in background if logged in (non-blocking)
      if (user) {
        fetchHabitsWithTodayProgress(user.id).catch(() => {
          // Silently ignore Supabase errors - local storage is source of truth
        });
      }
    } catch (error) {
      console.error("[Units] Error loading data:", error);
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
    
    // Sync to Supabase in background
    if (user) {
      const dbUpdates: Partial<{ name: string; icon: string; color: string; unit_name: string; daily_goal: number; tap_increment: number; habit_type: "count" | "time"; is_archived: boolean }> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.unitName !== undefined) dbUpdates.unit_name = updates.unitName;
      if (updates.dailyGoal !== undefined) dbUpdates.daily_goal = updates.dailyGoal;
      if (updates.tapIncrement !== undefined) dbUpdates.tap_increment = updates.tapIncrement;
      if (updates.habitType !== undefined) dbUpdates.habit_type = updates.habitType;
      if (updates.isArchived !== undefined) dbUpdates.is_archived = updates.isArchived;
      
      if (Object.keys(dbUpdates).length > 0) {
        updateDbHabit(id, dbUpdates).catch(() => {});
      }
    }
  }, [habits, user]);

  const handleDeleteHabit = useCallback(async (id: string) => {
    const updated = habits.filter((h) => h.id !== id);
    setHabits(updated);
    await saveHabits(updated);
    
    const updatedLogs = logs.filter((l) => l.habitId !== id);
    setLogs(updatedLogs);
    await saveLogs(updatedLogs);
    
    // Sync to Supabase in background
    if (user) {
      deleteDbHabit(id).catch(() => {});
    }
  }, [habits, logs, user]);

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
    
    // Sync to Supabase - calculate new total and set it
    if (user) {
      const newTotal = totalAvailable - actualCountToRemove;
      setUnitsForHabit(habitId, user.id, newTotal, today).catch(() => {});
    }
    
    triggerHaptic("light");
    return true;
  }, [logs, user, triggerHaptic]);

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
    
    // Sync to Supabase
    if (user) {
      addUnitsToHabit(habitId, user.id, count, date).catch(() => {});
    }
    
    triggerHaptic("medium");
    return true;
  }, [habits, logs, user, triggerHaptic]);

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
    
    // Sync to Supabase - set new total for the date
    if (user) {
      const newTotal = totalAvailable - actualCountToRemove;
      setUnitsForHabit(habitId, user.id, newTotal, date).catch(() => {});
    }
    
    triggerHaptic("light");
    return true;
  }, [logs, user, triggerHaptic]);

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

  // Penalty: each bad habit tap removes 10% of total logged units from score (captured at tap time)
  const PENALTY_PERCENT_PER_TAP = 0.10;

  // Helper to get total stored penalty for a date (sum of penaltyUnits from non-undone bad habit logs)
  const getStoredPenaltyForDate = useCallback((dateStr: string): number => {
    return badHabitLogs
      .filter((l) => l.date === dateStr && !l.isUndone)
      .reduce((sum, l) => sum + (l.penaltyUnits || 0), 0);
  }, [badHabitLogs]);

  // Helper to distribute penalty EVENLY across all habits
  // Each habit gets penalized by: floor(totalPenalty / habitCount)
  // Remainder distributed 1 each to habits in alphabetical order
  // Guarantees: sum(effectiveUnits) = max(0, totalRawUnits - totalPenalty)
  const distributeEffectivePenalty = useCallback((
    habitRawUnits: Record<string, number>,
    totalRawUnits: number,
    totalPenalty: number,
    habitIds: string[]
  ): Record<string, number> => {
    if (totalPenalty === 0 || habitIds.length === 0) {
      return { ...habitRawUnits };
    }
    
    // Calculate actual penalty that can be applied (capped at total raw units)
    const actualPenalty = Math.min(totalPenalty, totalRawUnits);
    
    // Sort habit IDs deterministically (alphabetically) for consistent results
    const sortedHabitIds = [...habitIds].sort();
    const habitCount = sortedHabitIds.length;
    
    // Calculate EVEN share per habit
    const baseShare = Math.floor(actualPenalty / habitCount);
    let remainder = actualPenalty - (baseShare * habitCount);
    
    // Calculate penalty per habit, distributing remainder to first habits alphabetically
    const shares: Record<string, number> = {};
    for (const habitId of sortedHabitIds) {
      const rawUnits = habitRawUnits[habitId] || 0;
      let share = baseShare;
      
      // Add 1 from remainder if available
      if (remainder > 0) {
        share += 1;
        remainder -= 1;
      }
      
      // Cap share at the raw units available for this habit
      shares[habitId] = Math.min(share, rawUnits);
    }
    
    // If some habits couldn't absorb their full share, redistribute to others
    let totalAllocated = Object.values(shares).reduce((a, b) => a + b, 0);
    let unallocated = actualPenalty - totalAllocated;
    
    // Keep redistributing until all penalty is allocated or no more can be absorbed
    while (unallocated > 0) {
      let redistributed = false;
      for (const habitId of sortedHabitIds) {
        if (unallocated <= 0) break;
        const rawUnits = habitRawUnits[habitId] || 0;
        const canAbsorb = rawUnits - shares[habitId];
        if (canAbsorb > 0) {
          shares[habitId] += 1;
          unallocated -= 1;
          redistributed = true;
        }
      }
      if (!redistributed) break;
    }
    
    // Build result
    const result: Record<string, number> = {};
    for (const habitId of habitIds) {
      const rawUnits = habitRawUnits[habitId] || 0;
      result[habitId] = Math.max(0, rawUnits - (shares[habitId] || 0));
    }
    
    return result;
  }, []);

  // Get effective units for a habit after 10% penalty applied per bad tap
  const getEffectiveTodayUnits = useCallback((habitId: string) => {
    const activeHabits = habits.filter((h) => !h.isArchived);
    
    if (activeHabits.length === 0) return 0;
    
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
    
    // Use stored penalty (captured at tap time, doesn't grow with new units)
    const totalPenalty = getStoredPenaltyForDate(currentDate);
    
    // Distribute penalty using helper
    const effectiveUnits = distributeEffectivePenalty(
      habitRawUnits,
      totalRawUnits,
      totalPenalty,
      activeHabits.map((h) => h.id)
    );
    
    return effectiveUnits[habitId] || 0;
  }, [logs, currentDate, habits, distributeEffectivePenalty, getStoredPenaltyForDate]);

  // Get effective total units after 10% penalty applied per bad tap
  // TODAY'S SCORE = raw work - penalty (never negative)
  const getEffectiveTodayTotalUnits = useCallback(() => {
    const activeHabits = habits.filter((h) => !h.isArchived);
    const rawTotal = logs
      .filter((l) => l.date === currentDate && activeHabits.some((h) => h.id === l.habitId))
      .reduce((sum, l) => sum + l.count, 0);
    
    // Use stored penalty (captured at tap time, doesn't grow with new units)
    const totalPenalty = getStoredPenaltyForDate(currentDate);
    
    // Score = raw - penalty, minimum 0
    return Math.max(0, rawTotal - totalPenalty);
  }, [logs, currentDate, habits, getStoredPenaltyForDate]);

  // Get effective distribution of units across all habits (for blocks visualization)
  // Uses the same penalty distribution helper to ensure consistency
  const getEffectiveUnitsDistribution = useCallback(() => {
    const activeHabits = habits.filter((h) => !h.isArchived);
    
    if (activeHabits.length === 0) return {};
    
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
    
    // Use stored penalty (captured at tap time, doesn't grow with new units)
    const totalPenalty = getStoredPenaltyForDate(currentDate);
    
    // Use helper to distribute penalty (ensures sum equals total)
    return distributeEffectivePenalty(
      habitRawUnits,
      rawTotal,
      totalPenalty,
      activeHabits.map((h) => h.id)
    );
  }, [logs, currentDate, habits, distributeEffectivePenalty, getStoredPenaltyForDate]);

  const getWeekTotalUnits = useCallback(() => {
    const startOfWeek = getStartOfWeek();
    const habitIds = new Set(habits.map((h) => h.id));
    return logs
      .filter((l) => l.date >= startOfWeek && habitIds.has(l.habitId))
      .reduce((sum, l) => sum + l.count, 0);
  }, [logs, habits]);

  // Get effective (penalty-adjusted) total for any date
  // Uses same fixed penalty logic as getEffectiveTodayTotalUnits
  // For historical dates, uses logs as proof of activity (if a habit has logs on that date, it was active)
  const getEffectiveTotalForDate = useCallback((dateStr: string) => {
    // For today, delegate to existing function for consistency
    if (dateStr === currentDate) {
      return getEffectiveTodayTotalUnits();
    }
    
    // For historical dates, only include habits that have logs on that date
    // This serves as proof of activity and handles archived habits correctly
    // (if a habit has logs on a date, it was definitely active that day)
    const logsOnDate = logs.filter((l) => l.date === dateStr);
    const habitIdsWithLogs = new Set(logsOnDate.map((l) => l.habitId));
    
    const rawTotal = logsOnDate.reduce((sum, l) => sum + l.count, 0);
    
    // Use stored penalty (captured at tap time, doesn't grow with new units)
    const totalPenalty = getStoredPenaltyForDate(dateStr);
    
    return Math.max(0, rawTotal - totalPenalty);
  }, [logs, currentDate, getEffectiveTodayTotalUnits, getStoredPenaltyForDate]);

  // Get effective units for a specific habit on a specific date
  // Uses same fixed penalty logic; for historical dates uses logs as proof of activity
  const getEffectiveHabitUnitsForDate = useCallback((habitId: string, dateStr: string) => {
    // For today, delegate to existing function for consistency
    if (dateStr === currentDate) {
      return getEffectiveTodayUnits(habitId);
    }
    
    // For historical dates, only include habits that have logs on that date
    // This serves as proof of activity and handles archived habits correctly
    const logsOnDate = logs.filter((l) => l.date === dateStr);
    const habitIdsWithLogs = [...new Set(logsOnDate.map((l) => l.habitId))];
    
    if (habitIdsWithLogs.length === 0) return 0;
    
    // Calculate total raw units across habits with logs on this date
    let totalRawUnits = 0;
    const habitRawUnits: Record<string, number> = {};
    
    for (const hId of habitIdsWithLogs) {
      const raw = logsOnDate
        .filter((l) => l.habitId === hId)
        .reduce((sum, l) => sum + l.count, 0);
      habitRawUnits[hId] = raw;
      totalRawUnits += raw;
    }
    
    // Use stored penalty (captured at tap time, doesn't grow with new units)
    const totalPenalty = getStoredPenaltyForDate(dateStr);
    
    // Use helper to distribute penalty
    const effectiveUnits = distributeEffectivePenalty(
      habitRawUnits,
      totalRawUnits,
      totalPenalty,
      habitIdsWithLogs
    );
    
    return effectiveUnits[habitId] || 0;
  }, [logs, currentDate, getEffectiveTodayUnits, distributeEffectivePenalty, getStoredPenaltyForDate]);

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
    
    // Sync to Supabase in background
    if (user) {
      createDbBadHabit(user.id, name).catch(() => {});
    }
    
    triggerHaptic("medium");
    return true;
  }, [badHabits, triggerHaptic, user]);

  const handleDeleteBadHabit = useCallback(async (id: string) => {
    const updated = badHabits.filter((h) => h.id !== id);
    setBadHabits(updated);
    await saveBadHabits(updated);
    const updatedLogs = badHabitLogs.filter((l) => l.badHabitId !== id);
    setBadHabitLogs(updatedLogs);
    await saveBadHabitLogs(updatedLogs);
    
    // Sync to Supabase in background
    if (user) {
      deleteDbBadHabit(id).catch(() => {});
    }
  }, [badHabits, badHabitLogs, user]);

  const handleTapBadHabit = useCallback(async (badHabitId: string) => {
    const today = getTodayDate();
    
    const alreadyTappedToday = badHabitLogs.some(
      (l) => l.badHabitId === badHabitId && l.date === today && !l.isUndone
    );
    if (alreadyTappedToday) return;
    
    // Calculate current EFFECTIVE total (raw - existing penalties) to determine penalty
    // This ensures each bad habit takes 10% of what's LEFT, not 10% of original raw
    const activeHabits = habits.filter((h) => !h.isArchived);
    const currentRawTotal = logs
      .filter((l) => l.date === today && activeHabits.some((h) => h.id === l.habitId))
      .reduce((sum, l) => sum + l.count, 0);
    
    // Get existing penalties from other bad habit taps today
    const existingPenalty = badHabitLogs
      .filter((l) => l.date === today && !l.isUndone)
      .reduce((sum, l) => sum + (l.penaltyUnits || 0), 0);
    
    const currentEffectiveTotal = Math.max(0, currentRawTotal - existingPenalty);
    const penaltyUnits = Math.round(currentEffectiveTotal * PENALTY_PERCENT_PER_TAP);
    
    const newLog: BadHabitLog = {
      id: generateId(),
      badHabitId,
      count: 1,
      date: today,
      createdAt: new Date().toISOString(),
      penaltyAdjustments: [],
      penaltyUnits, // Store the fixed penalty captured at tap time
      isUndone: false,
    };
    const updatedBadLogs = [...badHabitLogs, newLog];
    setBadHabitLogs(updatedBadLogs);
    await saveBadHabitLogs(updatedBadLogs);
    
    // Sync to Supabase in background
    if (user) {
      createDbBadHabitLog(user.id, badHabitId, today, penaltyUnits).catch(() => {});
    }
    
    if (settings.hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [badHabitLogs, settings.hapticsEnabled, habits, logs, user]);

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
    
    // Sync to Supabase in background
    if (user) {
      undoDbBadHabitLog(todayLog.id).catch(() => {});
    }
    
    if (settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    return true;
  }, [badHabitLogs, settings.hapticsEnabled, user]);

  const handleTapBadHabitForDate = useCallback(async (badHabitId: string, date: string) => {
    const alreadyTapped = badHabitLogs.some(
      (l) => l.badHabitId === badHabitId && l.date === date && !l.isUndone
    );
    if (alreadyTapped) return;
    
    // Calculate EFFECTIVE total for that date (raw - existing penalties) to determine penalty
    // This ensures each bad habit takes 10% of what's LEFT, not 10% of original raw
    const activeHabits = habits.filter((h) => !h.isArchived);
    const dateRawTotal = logs
      .filter((l) => l.date === date && activeHabits.some((h) => h.id === l.habitId))
      .reduce((sum, l) => sum + l.count, 0);
    
    // Get existing penalties from other bad habit taps that date
    const existingPenalty = badHabitLogs
      .filter((l) => l.date === date && !l.isUndone)
      .reduce((sum, l) => sum + (l.penaltyUnits || 0), 0);
    
    const currentEffectiveTotal = Math.max(0, dateRawTotal - existingPenalty);
    const penaltyUnits = Math.round(currentEffectiveTotal * PENALTY_PERCENT_PER_TAP);
    
    const newLog: BadHabitLog = {
      id: generateId(),
      badHabitId,
      count: 1,
      date,
      createdAt: new Date().toISOString(),
      penaltyAdjustments: [],
      penaltyUnits, // Store the fixed penalty captured at tap time
      isUndone: false,
    };
    const updatedBadLogs = [...badHabitLogs, newLog];
    setBadHabitLogs(updatedBadLogs);
    await saveBadHabitLogs(updatedBadLogs);
    
    // Sync to Supabase in background
    if (user) {
      createDbBadHabitLog(user.id, badHabitId, date, penaltyUnits).catch(() => {});
    }
  }, [badHabitLogs, habits, logs, user]);

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
    
    // Sync to Supabase in background
    if (user) {
      undoDbBadHabitLog(dateLog.id).catch(() => {});
    }
    
    return true;
  }, [badHabitLogs, user]);

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
    // Legacy function - returns 1.0 (no multiplier) since we now use fixed subtraction
    // Kept for compatibility but penalty is now a fixed subtraction, not multiplication
    return 1.0;
  }, []);

  const getTodayTotalPenalty = useCallback(() => {
    // Return the stored penalty (captured at tap time)
    return getStoredPenaltyForDate(currentDate);
  }, [currentDate, getStoredPenaltyForDate]);

  const getDailyProgress = useCallback(() => {
    const activeHabits = habits.filter((h) => !h.isArchived);
    if (activeHabits.length === 0) {
      return { percentage: 100, allGoalsMet: true, rawAllGoalsMet: true, perfectDay: true, hasBadHabits: false, improvementPercent: 0, rawImprovementPercent: 0, hasDoubledGoal: false, allGoalsDoubled: false, doubledCount: 0, penaltyPercent: 0, rawPercentage: 100, rawTotalUnits: 0, effectiveTotalUnits: 0, totalGoal: 0 };
    }
    
    // Count bad habit taps today
    const totalBadTaps = badHabitLogs
      .filter((l) => l.date === currentDate && !l.isUndone)
      .reduce((sum, l) => sum + l.count, 0);
    const hasBadHabits = totalBadTaps > 0;
    
    // Use stored penalty (captured at tap time, doesn't grow with new units)
    const totalPenalty = getStoredPenaltyForDate(currentDate);
    
    // Calculate raw units per habit and total
    let rawTotalUnits = 0;
    let totalGoal = 0;
    const habitRawUnits: Record<string, number> = {};
    
    for (const habit of activeHabits) {
      const todayUnits = logs
        .filter((l) => l.habitId === habit.id && l.date === currentDate)
        .reduce((sum, l) => sum + l.count, 0);
      habitRawUnits[habit.id] = todayUnits;
      rawTotalUnits += todayUnits;
      totalGoal += habit.dailyGoal;
    }
    
    // Get effective units per habit (penalty distributed EVENLY)
    const effectiveUnitsPerHabit = distributeEffectivePenalty(
      habitRawUnits,
      rawTotalUnits,
      totalPenalty,
      activeHabits.map((h) => h.id)
    );
    
    // Calculate effective total
    const effectiveTotalUnits = Object.values(effectiveUnitsPerHabit).reduce((a, b) => a + b, 0);
    
    // Check if ALL individual habits meet their goals (after penalty)
    let allGoalsMetEffective = true;
    let rawAllGoalsMet = true;
    let anyGoalDoubled = false;
    let doubledCount = 0;
    
    for (const habit of activeHabits) {
      const rawUnits = habitRawUnits[habit.id] || 0;
      const effectiveUnits = effectiveUnitsPerHabit[habit.id] || 0;
      
      // Check raw goal completion
      if (rawUnits < habit.dailyGoal) {
        rawAllGoalsMet = false;
      }
      
      // Check effective goal completion (EACH habit must meet its goal)
      if (effectiveUnits < habit.dailyGoal) {
        allGoalsMetEffective = false;
      }
      
      // Check doubled goals (based on effective)
      if (effectiveUnits >= habit.dailyGoal * 2) {
        anyGoalDoubled = true;
        doubledCount++;
      }
    }
    
    // PROGRESS % = based on EFFECTIVE work toward goals
    // For 0-100% progress, cap each habit's contribution at its goal (no overages)
    // This ensures 23/20 + 18/20 = 95% (not 102.5%) because second habit hasn't met goal
    let cappedEffectiveTotal = 0;
    for (const habit of activeHabits) {
      const effectiveUnits = effectiveUnitsPerHabit[habit.id] || 0;
      cappedEffectiveTotal += Math.min(effectiveUnits, habit.dailyGoal);
    }
    
    const rawPercent = totalGoal > 0 ? (rawTotalUnits / totalGoal) * 100 : 0;
    const cappedPercent = totalGoal > 0 ? (cappedEffectiveTotal / totalGoal) * 100 : 0;
    
    // Use capped % until ALL goals met, then show actual effective %
    const finalPercent = allGoalsMetEffective 
      ? Math.round((effectiveTotalUnits / totalGoal) * 100 * 10) / 10 
      : Math.round(cappedPercent * 10) / 10;
    
    // IMPROVEMENT %: 
    // - Before ALL goals met: show 0-100%
    // - When ALL goals met: show "1% better" (improvementPercent = 1)
    // - When ALL goals doubled: show "2% better" (improvementPercent = 2)
    // The multiplier is the minimum multiplier across all habits
    let improvementPercent = 0;
    if (allGoalsMetEffective) {
      // Find the minimum multiplier across all habits (how many times goals are exceeded)
      let minMultiplier = Infinity;
      for (const habit of activeHabits) {
        const effectiveUnits = effectiveUnitsPerHabit[habit.id] || 0;
        const multiplier = habit.dailyGoal > 0 ? effectiveUnits / habit.dailyGoal : 0;
        minMultiplier = Math.min(minMultiplier, multiplier);
      }
      // Round to 1 decimal place
      improvementPercent = Math.round(minMultiplier * 10) / 10;
    }
    
    const rawImprovementPercent = totalGoal > 0 ? rawTotalUnits / totalGoal : 0;
    
    // Penalty percent for display
    const penaltyPercent = totalGoal > 0 ? (totalPenalty / totalGoal) * 100 : 0;
    
    // Perfect day = ALL goals met (effective) AND no bad habits
    const perfectDay = allGoalsMetEffective && !hasBadHabits;
    
    return { 
      percentage: finalPercent,                    // Progress toward goals (0-100%, or >100% when goals met)
      allGoalsMet: allGoalsMetEffective,           // ALL habits met their goals (after penalty)
      rawAllGoalsMet,                              // ALL habits met goals (raw, for reference)
      perfectDay,                                  // Perfect day = all goals met AND no bad habits
      hasBadHabits,                                // Whether any bad habits were tapped today
      improvementPercent,                          // 1.0 = "1% better", 2.0 = "2% better" (min multiplier)
      rawImprovementPercent,                       // Raw ratio (for analytics)
      hasDoubledGoal: anyGoalDoubled,
      allGoalsDoubled: doubledCount === activeHabits.length && doubledCount > 0,
      doubledCount,
      penaltyPercent: Math.round(penaltyPercent),  // How much penalty reduced score
      rawPercentage: Math.round(rawPercent),       // Progress based on raw work
      rawTotalUnits,                               // Actual work done (raw)
      effectiveTotalUnits,                         // Today's score (after penalty)
      totalGoal,
    };
  }, [habits, logs, badHabitLogs, currentDate, getStoredPenaltyForDate, distributeEffectivePenalty]);

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
        getEffectiveTotalForDate,
        getEffectiveHabitUnitsForDate,
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
