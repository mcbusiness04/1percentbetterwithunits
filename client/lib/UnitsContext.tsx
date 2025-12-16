import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
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
} from "@/lib/storage";

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
  
  addHabit: (habit: Omit<Habit, "id" | "createdAt" | "isArchived">) => Promise<boolean>;
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  
  addUnits: (habitId: string, count: number) => Promise<boolean>;
  removeUnits: (habitId: string, count: number) => Promise<boolean>;
  undoLastAdd: () => Promise<void>;
  clearUndo: () => void;
  
  addBadHabit: (name: string) => Promise<boolean>;
  deleteBadHabit: (id: string) => Promise<void>;
  tapBadHabit: (badHabitId: string) => Promise<void>;
  undoBadHabitTap: (badHabitId: string) => Promise<boolean>;
  getTodayBadHabitTaps: (badHabitId: string) => number;
  getTodayTotalPenalty: () => number;
  getDailyProgress: () => { percentage: number; allGoalsMet: boolean; rawAllGoalsMet: boolean; hasBadHabits: boolean; improvementPercent: number; hasDoubledGoal: boolean; allGoalsDoubled: boolean; doubledCount: number; penaltyPercent: number };
  
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  setIsPro: (isPro: boolean) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  
  getTodayUnits: (habitId: string) => number;
  getWeekUnits: (habitId: string) => number;
  getTodayTotalUnits: () => number;
  getWeekTotalUnits: () => number;
  getMonthUnits: (habitId: string) => number;
  getLogsForDate: (date: string) => UnitLog[];
  getHighestDailyTotal: () => number;
  
  canAddHabit: () => boolean;
  canAddUnits: (count: number) => boolean;
  
  refreshData: () => Promise<void>;
}

const UnitsContext = createContext<UnitsContextType | undefined>(undefined);

export function UnitsProvider({ children }: { children: ReactNode }) {
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

  const refreshData = useCallback(async () => {
    try {
      const [loadedHabits, loadedLogs, loadedSettings, loadedIsPro, loadedOnboarding, loadedBadHabits, loadedBadHabitLogs] = await Promise.all([
        getHabits(),
        getLogs(),
        getSettings(),
        getIsPro(),
        isOnboardingComplete(),
        getBadHabits(),
        getBadHabitLogs(),
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
      
      setHabits(normalizedHabits);
      setLogs(loadedLogs);
      setSettings(loadedSettings);
      setIsProState(loadedIsPro);
      setHasCompletedOnboarding(loadedOnboarding);
      setBadHabits(loadedBadHabits);
      setBadHabitLogs(loadedBadHabitLogs);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

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
    const updated = [...habits, newHabit];
    setHabits(updated);
    await saveHabits(updated);
    triggerSuccess();
    return true;
  }, [habits, isPro, triggerSuccess]);

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

    const newLog: UnitLog = {
      id: generateId(),
      habitId,
      count: Math.min(count, 999),
      date: today,
      createdAt: new Date().toISOString(),
    };

    const updated = [...logs, newLog];
    setLogs(updated);
    await saveLogs(updated);

    const newTotal = logs
      .filter((l) => l.habitId === habitId && l.date === today)
      .reduce((sum, l) => sum + l.count, 0) + count;
    
    if (newTotal >= habit.dailyGoal && newTotal - count < habit.dailyGoal) {
      triggerSuccess();
    } else {
      triggerHaptic("medium");
    }

    return true;
  }, [habits, logs, isPro, triggerHaptic, triggerSuccess]);

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
    const today = getTodayDate();
    return logs
      .filter((l) => l.habitId === habitId && l.date === today)
      .reduce((sum, l) => sum + l.count, 0);
  }, [logs]);

  const getWeekUnits = useCallback((habitId: string) => {
    const startOfWeek = getStartOfWeek();
    return logs
      .filter((l) => l.habitId === habitId && l.date >= startOfWeek)
      .reduce((sum, l) => sum + l.count, 0);
  }, [logs]);

  const getMonthUnits = useCallback((habitId: string) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    return logs
      .filter((l) => l.habitId === habitId && l.date >= startOfMonth)
      .reduce((sum, l) => sum + l.count, 0);
  }, [logs]);

  const getTodayTotalUnits = useCallback(() => {
    const today = getTodayDate();
    return logs.filter((l) => l.date === today).reduce((sum, l) => sum + l.count, 0);
  }, [logs]);

  const getWeekTotalUnits = useCallback(() => {
    const startOfWeek = getStartOfWeek();
    return logs.filter((l) => l.date >= startOfWeek).reduce((sum, l) => sum + l.count, 0);
  }, [logs]);

  const getLogsForDate = useCallback((date: string) => {
    return logs.filter((l) => l.date === date);
  }, [logs]);

  const getHighestDailyTotal = useCallback(() => {
    const today = getTodayDate();
    const dailyTotals: Record<string, number> = {};
    logs.forEach((log) => {
      if (log.date !== today) {
        dailyTotals[log.date] = (dailyTotals[log.date] || 0) + log.count;
      }
    });
    const totals = Object.values(dailyTotals);
    return totals.length > 0 ? Math.max(...totals) : 0;
  }, [logs]);

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
    
    const activeHabits = habits.filter((h) => !h.isArchived);
    const penaltyAdjustments: PenaltyAdjustment[] = [];
    let updatedLogs = [...logs];
    
    if (activeHabits.length > 0) {
      const habitUnitsAvailable = activeHabits.map((habit) => {
        const todayUnits = logs
          .filter((l) => l.habitId === habit.id && l.date === today)
          .reduce((sum, l) => sum + l.count, 0);
        return { habit, available: Math.max(0, todayUnits) };
      });
      
      const totalLoggedUnits = habitUnitsAvailable.reduce((sum, h) => sum + h.available, 0);
      const targetPenalty = Math.max(1, Math.round(totalLoggedUnits * 0.10));
      const actualPenalty = Math.min(targetPenalty, totalLoggedUnits);
      
      if (actualPenalty > 0 && totalLoggedUnits > 0) {
        const habitsWithUnits = habitUnitsAvailable.filter((h) => h.available > 0);
        
        for (let i = 0; i < habitsWithUnits.length; i++) {
          const { habit, available } = habitsWithUnits[i];
          const proportion = available / totalLoggedUnits;
          const share = Math.max(1, Math.round(actualPenalty * proportion));
          const actualShare = Math.min(share, available);
          
          if (actualShare > 0) {
            const penaltyLog: UnitLog = {
              id: generateId(),
              habitId: habit.id,
              count: -actualShare,
              date: today,
              createdAt: new Date().toISOString(),
            };
            updatedLogs.push(penaltyLog);
            penaltyAdjustments.push({ habitId: habit.id, unitsRemoved: actualShare });
          }
        }
        
        setLogs(updatedLogs);
        await saveLogs(updatedLogs);
      }
    }
    
    const newLog: BadHabitLog = {
      id: generateId(),
      badHabitId,
      count: 1,
      date: today,
      createdAt: new Date().toISOString(),
      penaltyAdjustments,
      isUndone: false,
    };
    const updatedBadLogs = [...badHabitLogs, newLog];
    setBadHabitLogs(updatedBadLogs);
    await saveBadHabitLogs(updatedBadLogs);
    
    if (settings.hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [badHabitLogs, habits, logs, settings.hapticsEnabled]);

  const handleUndoBadHabitTap = useCallback(async (badHabitId: string): Promise<boolean> => {
    const today = getTodayDate();
    const todayLog = badHabitLogs.find(
      (l) => l.badHabitId === badHabitId && l.date === today && !l.isUndone
    );
    if (!todayLog) return false;
    
    if (todayLog.penaltyAdjustments && todayLog.penaltyAdjustments.length > 0) {
      let updatedLogs = [...logs];
      for (const adjustment of todayLog.penaltyAdjustments) {
        const restoreLog: UnitLog = {
          id: generateId(),
          habitId: adjustment.habitId,
          count: adjustment.unitsRemoved,
          date: today,
          createdAt: new Date().toISOString(),
        };
        updatedLogs.push(restoreLog);
      }
      setLogs(updatedLogs);
      await saveLogs(updatedLogs);
    }
    
    const updatedBadLogs = badHabitLogs.map((l) =>
      l.id === todayLog.id ? { ...l, isUndone: true } : l
    );
    setBadHabitLogs(updatedBadLogs);
    await saveBadHabitLogs(updatedBadLogs);
    
    if (settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    return true;
  }, [badHabitLogs, logs, settings.hapticsEnabled]);

  const getTodayBadHabitTaps = useCallback((badHabitId: string) => {
    const today = getTodayDate();
    return badHabitLogs
      .filter((l) => l.badHabitId === badHabitId && l.date === today && !l.isUndone)
      .reduce((sum, l) => sum + l.count, 0);
  }, [badHabitLogs]);

  const getTodayTotalPenalty = useCallback(() => {
    const today = getTodayDate();
    const totalBadTaps = badHabitLogs
      .filter((l) => l.date === today && !l.isUndone)
      .reduce((sum, l) => sum + l.count, 0);
    return totalBadTaps * 10;
  }, [badHabitLogs]);

  const getDailyProgress = useCallback(() => {
    const activeHabits = habits.filter((h) => !h.isArchived);
    if (activeHabits.length === 0) {
      return { percentage: 100, allGoalsMet: true, rawAllGoalsMet: true, hasBadHabits: false, improvementPercent: 0, hasDoubledGoal: false, allGoalsDoubled: false, doubledCount: 0, penaltyPercent: 0 };
    }
    
    const today = getTodayDate();
    const totalBadTaps = badHabitLogs
      .filter((l) => l.date === today && !l.isUndone)
      .reduce((sum, l) => sum + l.count, 0);
    const hasBadHabits = totalBadTaps > 0;
    const penaltyPercent = totalBadTaps * 10;
    
    let totalProgress = 0;
    let rawAllGoalsMet = true;
    let allGoalsDoubled = true;
    let anyGoalDoubled = false;
    let doubledCount = 0;
    
    for (const habit of activeHabits) {
      const todayUnits = logs
        .filter((l) => l.habitId === habit.id && l.date === today)
        .reduce((sum, l) => sum + l.count, 0);
      const progress = Math.min(todayUnits / habit.dailyGoal, 1);
      totalProgress += progress;
      if (todayUnits < habit.dailyGoal) {
        rawAllGoalsMet = false;
        allGoalsDoubled = false;
      }
      if (todayUnits >= habit.dailyGoal * 2) {
        anyGoalDoubled = true;
        doubledCount++;
      } else {
        allGoalsDoubled = false;
      }
    }
    
    const basePercent = (totalProgress / activeHabits.length) * 100;
    const finalPercent = Math.min(100, Math.max(0, basePercent - penaltyPercent));
    
    let improvementPercent = 0;
    if (rawAllGoalsMet && !hasBadHabits) {
      improvementPercent = allGoalsDoubled ? 2 : 1;
    }
    
    return { 
      percentage: Math.round(finalPercent), 
      allGoalsMet: rawAllGoalsMet && !hasBadHabits,
      rawAllGoalsMet,
      hasBadHabits,
      improvementPercent,
      hasDoubledGoal: anyGoalDoubled,
      allGoalsDoubled,
      doubledCount,
      penaltyPercent,
    };
  }, [habits, logs, badHabitLogs]);

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
        addHabit: handleAddHabit,
        updateHabit: handleUpdateHabit,
        deleteHabit: handleDeleteHabit,
        addUnits: handleAddUnits,
        removeUnits: handleRemoveUnits,
        undoLastAdd: handleUndoLastAdd,
        clearUndo,
        addBadHabit: handleAddBadHabit,
        deleteBadHabit: handleDeleteBadHabit,
        tapBadHabit: handleTapBadHabit,
        undoBadHabitTap: handleUndoBadHabitTap,
        getTodayBadHabitTaps,
        getTodayTotalPenalty,
        getDailyProgress,
        updateSettings: handleUpdateSettings,
        setIsPro: handleSetIsPro,
        completeOnboarding: handleCompleteOnboarding,
        getTodayUnits,
        getWeekUnits,
        getMonthUnits,
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
