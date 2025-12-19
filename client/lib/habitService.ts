import { supabase } from "@/lib/supabase";

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
  const { error } = await supabase
    .from("habits")
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq("id", habitId);

  return { success: !error, error: error?.message ?? null };
}
