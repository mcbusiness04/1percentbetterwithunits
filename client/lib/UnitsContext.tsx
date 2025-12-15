import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import * as Haptics from "expo-haptics";
import {
  Habit,
  UnitLog,
  Task,
  AppSettings,
  getHabits,
  saveHabits,
  getLogs,
  saveLogs,
  getTasks,
  saveTasks,
  getSettings,
  saveSettings,
  getIsPro,
  setIsPro as saveIsPro,
  addLog,
  removeLog,
  generateId,
  getTodayDate,
  getStartOfWeek,
  FREE_LIMITS,
  isOnboardingComplete,
  setOnboardingComplete,
} from "@/lib/storage";

interface UndoAction {
  type: "add_units";
  logId: string;
  habitId: string;
  count: number;
}

interface UnitsContextType {
  habits: Habit[];
  logs: UnitLog[];
  tasks: Task[];
  settings: AppSettings;
  isPro: boolean;
  loading: boolean;
  undoAction: UndoAction | null;
  hasCompletedOnboarding: boolean;
  
  addHabit: (habit: Omit<Habit, "id" | "createdAt" | "isArchived">) => Promise<boolean>;
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  
  addUnits: (habitId: string, count: number) => Promise<boolean>;
  undoLastAdd: () => Promise<void>;
  clearUndo: () => void;
  
  addTask: (task: Omit<Task, "id" | "createdAt" | "isCompleted">) => Promise<boolean>;
  completeTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  setIsPro: (isPro: boolean) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  
  getTodayUnits: (habitId: string) => number;
  getWeekUnits: (habitId: string) => number;
  getLifetimeUnits: (habitId: string) => number;
  getTodayTotalUnits: () => number;
  getWeekTotalUnits: () => number;
  getLifetimeTotalUnits: () => number;
  getLogsForDate: (date: string) => UnitLog[];
  isUnderPace: (habit: Habit) => boolean;
  
  canAddHabit: () => boolean;
  canAddTask: () => boolean;
  canAddUnits: (count: number) => boolean;
  
  refreshData: () => Promise<void>;
}

const UnitsContext = createContext<UnitsContextType | undefined>(undefined);

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<UnitLog[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    soundEnabled: true,
    hapticsEnabled: true,
    showGeneralEffort: false,
  });
  const [isPro, setIsProState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      const [loadedHabits, loadedLogs, loadedTasks, loadedSettings, loadedIsPro, loadedOnboarding] = await Promise.all([
        getHabits(),
        getLogs(),
        getTasks(),
        getSettings(),
        getIsPro(),
        isOnboardingComplete(),
      ]);
      setHabits(loadedHabits);
      setLogs(loadedLogs);
      setTasks(loadedTasks);
      setSettings(loadedSettings);
      setIsProState(loadedIsPro);
      setHasCompletedOnboarding(loadedOnboarding);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const triggerHaptic = useCallback(() => {
    if (settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [settings.hapticsEnabled]);

  const playFeedback = useCallback((type: "add" | "complete" | "undo") => {
    if (!settings.soundEnabled) return;
    
    try {
      switch (type) {
        case "add":
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case "complete":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case "undo":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
      }
    } catch (error) {
      // Haptics not supported
    }
  }, [settings.soundEnabled]);

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
    triggerHaptic();
    return true;
  }, [habits, isPro, triggerHaptic]);

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
    
    const updatedTasks = tasks.map((t) =>
      t.linkedHabitId === id ? { ...t, linkedHabitId: undefined } : t
    );
    setTasks(updatedTasks);
    await saveTasks(updatedTasks);
  }, [habits, logs, tasks]);

  const handleAddUnits = useCallback(async (habitId: string, count: number) => {
    const today = getTodayDate();
    const todayUnits = logs
      .filter((l) => l.date === today)
      .reduce((sum, l) => sum + l.count, 0);

    if (!isPro && todayUnits + count > FREE_LIMITS.MAX_UNITS_PER_DAY) {
      return false;
    }

    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return false;

    const currentVersion = habit.unitVersions[habit.unitVersions.length - 1];
    const newLog: UnitLog = {
      id: generateId(),
      habitId,
      unitVersionId: currentVersion.id,
      count: Math.min(count, 999),
      date: today,
      createdAt: new Date().toISOString(),
    };

    const updated = [...logs, newLog];
    setLogs(updated);
    await saveLogs(updated);

    setUndoAction({
      type: "add_units",
      logId: newLog.id,
      habitId,
      count: newLog.count,
    });

    triggerHaptic();
    playFeedback("add");
    return true;
  }, [habits, logs, isPro, triggerHaptic, playFeedback]);

  const handleUndoLastAdd = useCallback(async () => {
    if (!undoAction) return;

    const updated = logs.filter((l) => l.id !== undoAction.logId);
    setLogs(updated);
    await saveLogs(updated);
    setUndoAction(null);
    triggerHaptic();
    playFeedback("undo");
  }, [undoAction, logs, triggerHaptic, playFeedback]);

  const clearUndo = useCallback(() => {
    setUndoAction(null);
  }, []);

  const handleAddTask = useCallback(async (task: Omit<Task, "id" | "createdAt" | "isCompleted">) => {
    const incompleteTasks = tasks.filter((t) => !t.isCompleted);
    if (!isPro && incompleteTasks.length >= FREE_LIMITS.MAX_TASKS) {
      return false;
    }

    const newTask: Task = {
      ...task,
      id: generateId(),
      createdAt: new Date().toISOString(),
      isCompleted: false,
    };
    const updated = [...tasks, newTask];
    setTasks(updated);
    await saveTasks(updated);
    triggerHaptic();
    return true;
  }, [tasks, isPro, triggerHaptic]);

  const handleCompleteTask = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const updated = tasks.map((t) =>
      t.id === id ? { ...t, isCompleted: true, completedAt: new Date().toISOString() } : t
    );
    setTasks(updated);
    await saveTasks(updated);

    if (task.linkedHabitId) {
      await handleAddUnits(task.linkedHabitId, task.unitEstimate);
    }
    triggerHaptic();
    playFeedback("complete");
  }, [tasks, handleAddUnits, triggerHaptic, playFeedback]);

  const handleDeleteTask = useCallback(async (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    await saveTasks(updated);
  }, [tasks]);

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

  const getLifetimeUnits = useCallback((habitId: string) => {
    return logs
      .filter((l) => l.habitId === habitId)
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

  const getLifetimeTotalUnits = useCallback(() => {
    return logs.reduce((sum, l) => sum + l.count, 0);
  }, [logs]);

  const getLogsForDate = useCallback((date: string) => {
    return logs.filter((l) => l.date === date);
  }, [logs]);

  const isUnderPace = useCallback((habit: Habit) => {
    if (habit.softFloorPerWeek === 0) return false;
    const weekUnits = getWeekUnits(habit.id);
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysIntoWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    const expectedPace = (habit.softFloorPerWeek / 7) * daysIntoWeek;
    return weekUnits < expectedPace;
  }, [getWeekUnits]);

  const canAddHabit = useCallback(() => {
    if (isPro) return true;
    const activeHabits = habits.filter((h) => !h.isArchived);
    return activeHabits.length < FREE_LIMITS.MAX_HABITS;
  }, [habits, isPro]);

  const canAddTask = useCallback(() => {
    if (isPro) return true;
    const incompleteTasks = tasks.filter((t) => !t.isCompleted);
    return incompleteTasks.length < FREE_LIMITS.MAX_TASKS;
  }, [tasks, isPro]);

  const canAddUnits = useCallback((count: number) => {
    if (isPro) return true;
    const todayTotal = getTodayTotalUnits();
    return todayTotal + count <= FREE_LIMITS.MAX_UNITS_PER_DAY;
  }, [isPro, getTodayTotalUnits]);

  const handleCompleteOnboarding = useCallback(async () => {
    await setOnboardingComplete();
    setHasCompletedOnboarding(true);
  }, []);

  return (
    <UnitsContext.Provider
      value={{
        habits,
        logs,
        tasks,
        settings,
        isPro,
        loading,
        undoAction,
        hasCompletedOnboarding,
        addHabit: handleAddHabit,
        updateHabit: handleUpdateHabit,
        deleteHabit: handleDeleteHabit,
        addUnits: handleAddUnits,
        undoLastAdd: handleUndoLastAdd,
        clearUndo,
        addTask: handleAddTask,
        completeTask: handleCompleteTask,
        deleteTask: handleDeleteTask,
        updateSettings: handleUpdateSettings,
        setIsPro: handleSetIsPro,
        completeOnboarding: handleCompleteOnboarding,
        getTodayUnits,
        getWeekUnits,
        getLifetimeUnits,
        getTodayTotalUnits,
        getWeekTotalUnits,
        getLifetimeTotalUnits,
        getLogsForDate,
        isUnderPace,
        canAddHabit,
        canAddTask,
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
