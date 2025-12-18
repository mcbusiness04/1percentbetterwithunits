-- Supabase SQL Setup for Units App
-- Run this SQL in your Supabase SQL Editor (https://rleheeagukbgovoywnlb.supabase.co)

-- Create profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  is_premium BOOLEAN DEFAULT FALSE,
  onboarding_answers JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Users can insert their own profile (for new signups)
CREATE POLICY "Users can insert own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_premium, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    FALSE,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create habits table for syncing user habits to Supabase
CREATE TABLE IF NOT EXISTS public.habits (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  unit_name TEXT NOT NULL,
  daily_goal INTEGER NOT NULL DEFAULT 1,
  tap_increment INTEGER NOT NULL DEFAULT 1,
  habit_type TEXT NOT NULL DEFAULT 'count',
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for habits
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

-- Habits policies
CREATE POLICY "Users can view own habits" 
  ON public.habits 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habits" 
  ON public.habits 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits" 
  ON public.habits 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits" 
  ON public.habits 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create unit_logs table for tracking habit progress
CREATE TABLE IF NOT EXISTS public.unit_logs (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  habit_id TEXT REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
  count INTEGER NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for unit_logs
ALTER TABLE public.unit_logs ENABLE ROW LEVEL SECURITY;

-- Unit logs policies
CREATE POLICY "Users can view own unit logs" 
  ON public.unit_logs 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own unit logs" 
  ON public.unit_logs 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own unit logs" 
  ON public.unit_logs 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own unit logs" 
  ON public.unit_logs 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create bad_habits table
CREATE TABLE IF NOT EXISTS public.bad_habits (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for bad_habits
ALTER TABLE public.bad_habits ENABLE ROW LEVEL SECURITY;

-- Bad habits policies
CREATE POLICY "Users can view own bad habits" 
  ON public.bad_habits 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bad habits" 
  ON public.bad_habits 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bad habits" 
  ON public.bad_habits 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bad habits" 
  ON public.bad_habits 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create bad_habit_logs table
CREATE TABLE IF NOT EXISTS public.bad_habit_logs (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bad_habit_id TEXT REFERENCES public.bad_habits(id) ON DELETE CASCADE NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  date TEXT NOT NULL,
  penalty_adjustments JSONB DEFAULT '[]',
  is_undone BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for bad_habit_logs
ALTER TABLE public.bad_habit_logs ENABLE ROW LEVEL SECURITY;

-- Bad habit logs policies
CREATE POLICY "Users can view own bad habit logs" 
  ON public.bad_habit_logs 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bad habit logs" 
  ON public.bad_habit_logs 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bad habit logs" 
  ON public.bad_habit_logs 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bad habit logs" 
  ON public.bad_habit_logs 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_unit_logs_user_id ON public.unit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_unit_logs_habit_id ON public.unit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_unit_logs_date ON public.unit_logs(date);
CREATE INDEX IF NOT EXISTS idx_bad_habits_user_id ON public.bad_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_bad_habit_logs_user_id ON public.bad_habit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_bad_habit_logs_date ON public.bad_habit_logs(date);
