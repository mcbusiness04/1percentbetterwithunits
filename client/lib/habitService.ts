import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface DbHabit {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  unit_name: string;
  daily_goal: number;
  tap_increment: number;
  habit_type: "count" | "time";
  is_archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbHabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  date: string;
  count: number;
  created_at: string;
  updated_at: string;
}

export interface HabitWithProgress extends DbHabit {
  todayCount: number;
  todayLogId: string | null;
}

export function getTodayDateLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function fetchHabitsWithTodayProgress(
  userId: string
): Promise<{ habits: HabitWithProgress[]; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { habits: [], error: "Supabase not configured" };
  }
  
  const today = getTodayDateLocal();

  const { data: habits, error: habitsError } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("sort_order", { ascending: true });

  if (habitsError) {
    return { habits: [], error: habitsError.message };
  }

  if (!habits || habits.length === 0) {
    return { habits: [], error: null };
  }

  const habitIds = habits.map((h) => h.id);
  const { data: todayLogs, error: logsError } = await supabase
    .from("habit_logs")
    .select("*")
    .in("habit_id", habitIds)
    .eq("date", today);

  if (logsError) {
    return { habits: [], error: logsError.message };
  }

  const logsByHabitId = new Map<string, DbHabitLog>();
  (todayLogs || []).forEach((log) => {
    logsByHabitId.set(log.habit_id, log);
  });

  const habitsToCreateLogsFor: string[] = [];
  habits.forEach((habit) => {
    if (!logsByHabitId.has(habit.id)) {
      habitsToCreateLogsFor.push(habit.id);
    }
  });

  if (habitsToCreateLogsFor.length > 0) {
    const newLogs = habitsToCreateLogsFor.map((habitId) => ({
      habit_id: habitId,
      user_id: userId,
      date: today,
      count: 0,
    }));

    const { data: insertedLogs, error: insertError } = await supabase
      .from("habit_logs")
      .upsert(newLogs, { onConflict: "habit_id,date" })
      .select();

    if (!insertError && insertedLogs) {
      insertedLogs.forEach((log) => {
        logsByHabitId.set(log.habit_id, log);
      });
    }
  }

  const habitsWithProgress: HabitWithProgress[] = habits.map((habit) => {
    const log = logsByHabitId.get(habit.id);
    return {
      ...habit,
      todayCount: log?.count ?? 0,
      todayLogId: log?.id ?? null,
    };
  });

  return { habits: habitsWithProgress, error: null };
}

export async function addUnitsToHabit(
  habitId: string,
  userId: string,
  count: number,
  date?: string
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: "Supabase not configured" };
  }
  
  const targetDate = date || getTodayDateLocal();

  const { data: existingLog } = await supabase
    .from("habit_logs")
    .select("id, count")
    .eq("habit_id", habitId)
    .eq("date", targetDate)
    .single();

  if (existingLog) {
    const { error } = await supabase
      .from("habit_logs")
      .update({
        count: existingLog.count + count,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingLog.id);

    return { success: !error, error: error?.message ?? null };
  } else {
    const { error } = await supabase.from("habit_logs").insert({
      habit_id: habitId,
      user_id: userId,
      date: targetDate,
      count: count,
    });

    return { success: !error, error: error?.message ?? null };
  }
}

export async function setUnitsForHabit(
  habitId: string,
  userId: string,
  count: number,
  date?: string
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: "Supabase not configured" };
  }
  
  const targetDate = date || getTodayDateLocal();

  const { error } = await supabase
    .from("habit_logs")
    .upsert(
      {
        habit_id: habitId,
        user_id: userId,
        date: targetDate,
        count: Math.max(0, count),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "habit_id,date" }
    );

  return { success: !error, error: error?.message ?? null };
}

export async function fetchHabitLogsForDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ logs: DbHabitLog[]; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { logs: [], error: "Supabase not configured" };
  }
  
  const { data, error } = await supabase
    .from("habit_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });

  return { logs: data || [], error: error?.message ?? null };
}

export async function createHabit(
  userId: string,
  habit: {
    name: string;
    icon: string;
    color: string;
    unit_name: string;
    daily_goal: number;
    tap_increment: number;
    habit_type: "count" | "time";
  }
): Promise<{ habit: DbHabit | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { habit: null, error: "Supabase not configured" };
  }
  
  const { data, error } = await supabase
    .from("habits")
    .insert({
      user_id: userId,
      ...habit,
    })
    .select()
    .single();

  return { habit: data, error: error?.message ?? null };
}

export async function updateHabit(
  habitId: string,
  updates: Partial<DbHabit>
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: "Supabase not configured" };
  }
  
  const { error } = await supabase
    .from("habits")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", habitId);

  return { success: !error, error: error?.message ?? null };
}

export async function deleteHabit(
  habitId: string
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: "Supabase not configured" };
  }
  
  const { error } = await supabase
    .from("habits")
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq("id", habitId);

  return { success: !error, error: error?.message ?? null };
}

// Bad Habits
export interface DbBadHabit {
  id: string;
  user_id: string;
  name: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbBadHabitLog {
  id: string;
  bad_habit_id: string;
  user_id: string;
  date: string;
  count: number;
  penalty_units: number;
  is_undone: boolean;
  created_at: string;
  updated_at: string;
}

export async function createBadHabit(
  userId: string,
  name: string
): Promise<{ badHabit: DbBadHabit | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { badHabit: null, error: "Supabase not configured" };
  }
  
  const { data, error } = await supabase
    .from("bad_habits")
    .insert({
      user_id: userId,
      name,
    })
    .select()
    .single();

  return { badHabit: data, error: error?.message ?? null };
}

export async function deleteBadHabit(
  badHabitId: string
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: "Supabase not configured" };
  }
  
  const { error } = await supabase
    .from("bad_habits")
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq("id", badHabitId);

  return { success: !error, error: error?.message ?? null };
}

export async function createBadHabitLog(
  userId: string,
  badHabitId: string,
  date: string,
  penaltyUnits: number
): Promise<{ log: DbBadHabitLog | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { log: null, error: "Supabase not configured" };
  }
  
  const { data, error } = await supabase
    .from("bad_habit_logs")
    .insert({
      bad_habit_id: badHabitId,
      user_id: userId,
      date,
      count: 1,
      penalty_units: penaltyUnits,
      is_undone: false,
    })
    .select()
    .single();

  return { log: data, error: error?.message ?? null };
}

export async function undoBadHabitLog(
  logId: string
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: "Supabase not configured" };
  }
  
  const { error } = await supabase
    .from("bad_habit_logs")
    .update({ is_undone: true, updated_at: new Date().toISOString() })
    .eq("id", logId);

  return { success: !error, error: error?.message ?? null };
}

export async function fetchBadHabits(
  userId: string
): Promise<{ badHabits: DbBadHabit[]; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { badHabits: [], error: "Supabase not configured" };
  }
  
  const { data, error } = await supabase
    .from("bad_habits")
    .select("*")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("created_at", { ascending: true });

  return { badHabits: data || [], error: error?.message ?? null };
}

export async function fetchBadHabitLogs(
  userId: string
): Promise<{ logs: DbBadHabitLog[]; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { logs: [], error: "Supabase not configured" };
  }
  
  const { data, error } = await supabase
    .from("bad_habit_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return { logs: data || [], error: error?.message ?? null };
}

export interface DailyStats {
  todayTotal: number;
  bestDayTotal: number;
  bestDayDate: string | null;
  sevenDayAverage: number;
}

export async function fetchDailyStats(userId: string): Promise<{ stats: DailyStats; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { stats: { todayTotal: 0, bestDayTotal: 0, bestDayDate: null, sevenDayAverage: 0 }, error: "Supabase not configured" };
  }
  
  const today = getTodayDateLocal();
  
  const { data: todayLogs, error: todayError } = await supabase
    .from("habit_logs")
    .select("count")
    .eq("user_id", userId)
    .eq("date", today);

  if (todayError) {
    return { stats: { todayTotal: 0, bestDayTotal: 0, bestDayDate: null, sevenDayAverage: 0 }, error: todayError.message };
  }

  const todayTotal = (todayLogs || []).reduce((sum, log) => sum + (log.count || 0), 0);

  const { data: allLogs, error: allError } = await supabase
    .from("habit_logs")
    .select("date, count")
    .eq("user_id", userId);

  if (allError) {
    return { stats: { todayTotal, bestDayTotal: 0, bestDayDate: null, sevenDayAverage: 0 }, error: allError.message };
  }

  const dailyTotals = new Map<string, number>();
  (allLogs || []).forEach((log) => {
    const current = dailyTotals.get(log.date) || 0;
    dailyTotals.set(log.date, current + (log.count || 0));
  });

  let bestDayTotal = 0;
  let bestDayDate: string | null = null;
  dailyTotals.forEach((total, date) => {
    if (total > bestDayTotal) {
      bestDayTotal = total;
      bestDayDate = date;
    }
  });

  const now = new Date();
  const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  const sevenDayDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo.getFullYear(), sevenDaysAgo.getMonth(), sevenDaysAgo.getDate() + i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    sevenDayDates.push(`${year}-${month}-${day}`);
  }

  let sevenDaySum = 0;
  let daysWithData = 0;
  sevenDayDates.forEach((date) => {
    const total = dailyTotals.get(date) || 0;
    sevenDaySum += total;
    if (total > 0) daysWithData++;
  });

  const sevenDayAverage = daysWithData > 0 ? Math.round((sevenDaySum / 7) * 10) / 10 : 0;

  return {
    stats: { todayTotal, bestDayTotal, bestDayDate, sevenDayAverage },
    error: null,
  };
}
