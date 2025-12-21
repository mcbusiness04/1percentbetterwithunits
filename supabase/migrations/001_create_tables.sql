-- Units App Database Schema
-- Run this in your Supabase SQL Editor to create the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (stores user profile data)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  onboarding_answers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habits table
CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'target',
  color TEXT NOT NULL DEFAULT '#6366F1',
  unit_name TEXT NOT NULL DEFAULT 'units',
  daily_goal INTEGER NOT NULL DEFAULT 10,
  tap_increment INTEGER NOT NULL DEFAULT 1,
  habit_type TEXT NOT NULL DEFAULT 'count' CHECK (habit_type IN ('count', 'time')),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habit logs table
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(habit_id, date)
);

-- Bad habits table
CREATE TABLE IF NOT EXISTS public.bad_habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bad habit logs table
CREATE TABLE IF NOT EXISTS public.bad_habit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bad_habit_id UUID NOT NULL REFERENCES public.bad_habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  penalty_units INTEGER NOT NULL DEFAULT 0,
  is_undone BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bad_habit_id, date)
);

-- Premium subscriptions table (for tracking purchases)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  product_id TEXT NOT NULL,
  transaction_id TEXT,
  original_transaction_id TEXT,
  purchase_date TIMESTAMPTZ,
  expires_date TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bad_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bad_habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policies for habits
CREATE POLICY "Users can view own habits" ON public.habits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habits" ON public.habits
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habits" ON public.habits
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habits" ON public.habits
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for habit_logs
CREATE POLICY "Users can view own habit logs" ON public.habit_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habit logs" ON public.habit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habit logs" ON public.habit_logs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habit logs" ON public.habit_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for bad_habits
CREATE POLICY "Users can view own bad habits" ON public.bad_habits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bad habits" ON public.bad_habits
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bad habits" ON public.bad_habits
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bad habits" ON public.bad_habits
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for bad_habit_logs
CREATE POLICY "Users can view own bad habit logs" ON public.bad_habit_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bad habit logs" ON public.bad_habit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bad habit logs" ON public.bad_habit_logs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bad habit logs" ON public.bad_habit_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for subscriptions
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscription" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON public.habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_bad_habits_user_id ON public.bad_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_bad_habit_logs_user_date ON public.bad_habit_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_habits_updated_at ON public.habits;
CREATE TRIGGER update_habits_updated_at
  BEFORE UPDATE ON public.habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_habit_logs_updated_at ON public.habit_logs;
CREATE TRIGGER update_habit_logs_updated_at
  BEFORE UPDATE ON public.habit_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bad_habits_updated_at ON public.bad_habits;
CREATE TRIGGER update_bad_habits_updated_at
  BEFORE UPDATE ON public.bad_habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bad_habit_logs_updated_at ON public.bad_habit_logs;
CREATE TRIGGER update_bad_habit_logs_updated_at
  BEFORE UPDATE ON public.bad_habit_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
