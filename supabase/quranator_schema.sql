-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access for simplicity during the OAuth2/Anon integration
CREATE POLICY "Allow public select profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update profiles" ON public.profiles FOR UPDATE USING (true);

-- 2. Goals Table
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT REFERENCES public.profiles(email) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_per_day INTEGER NOT NULL,
  completed_today INTEGER DEFAULT 0,
  last_updated TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  pledge_accepted BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read goals" ON public.goals FOR SELECT USING (true);
CREATE POLICY "Allow public insert goals" ON public.goals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update goals" ON public.goals FOR UPDATE USING (true);
CREATE POLICY "Allow public delete goals" ON public.goals FOR DELETE USING (true);

-- 3. Reflections Table
CREATE TABLE IF NOT EXISTS public.reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT REFERENCES public.profiles(email) ON DELETE CASCADE,
  verse_key TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read reflections" ON public.reflections FOR SELECT USING (true);
CREATE POLICY "Allow public insert reflections" ON public.reflections FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update reflections" ON public.reflections FOR UPDATE USING (true);
CREATE POLICY "Allow public delete reflections" ON public.reflections FOR DELETE USING (true);

-- 4. Bookmarks Table
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT REFERENCES public.profiles(email) ON DELETE CASCADE,
  verse_key TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read bookmarks" ON public.bookmarks FOR SELECT USING (true);
CREATE POLICY "Allow public insert bookmarks" ON public.bookmarks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete bookmarks" ON public.bookmarks FOR DELETE USING (true);

-- 5. Chat Sessions Table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT REFERENCES public.profiles(email) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read chat_sessions" ON public.chat_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert chat_sessions" ON public.chat_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update chat_sessions" ON public.chat_sessions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete chat_sessions" ON public.chat_sessions FOR DELETE USING (true);

-- 6. Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read chat_messages" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert chat_messages" ON public.chat_messages FOR INSERT WITH CHECK (true);

-- 7. Streaks Table
CREATE TABLE IF NOT EXISTS public.streaks (
  user_email TEXT PRIMARY KEY REFERENCES public.profiles(email) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date TEXT DEFAULT '',
  active_dates TEXT[] DEFAULT '{}'::TEXT[]
);

ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read streaks" ON public.streaks FOR SELECT USING (true);
CREATE POLICY "Allow public insert streaks" ON public.streaks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update streaks" ON public.streaks FOR UPDATE USING (true);

-- 8. Sadaqah Points Table
CREATE TABLE IF NOT EXISTS public.sadaqah_points (
  user_email TEXT PRIMARY KEY REFERENCES public.profiles(email) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0
);

ALTER TABLE public.sadaqah_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read sadaqah_points" ON public.sadaqah_points FOR SELECT USING (true);
CREATE POLICY "Allow public insert sadaqah_points" ON public.sadaqah_points FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update sadaqah_points" ON public.sadaqah_points FOR UPDATE USING (true);

-- 9. Sadaqah History Table
CREATE TABLE IF NOT EXISTS public.sadaqah_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT REFERENCES public.profiles(email) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  verse_key TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.sadaqah_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read sadaqah_history" ON public.sadaqah_history FOR SELECT USING (true);
CREATE POLICY "Allow public insert sadaqah_history" ON public.sadaqah_history FOR INSERT WITH CHECK (true);

-- 10. Recitation Scores Table
CREATE TABLE IF NOT EXISTS public.recitation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT REFERENCES public.profiles(email) ON DELETE CASCADE,
  goal_title TEXT NOT NULL,
  verse_key TEXT NOT NULL,
  arabic_text TEXT NOT NULL,
  user_transcript TEXT NOT NULL,
  accuracy INTEGER NOT NULL,
  tajweed_score INTEGER NOT NULL,
  fluency_score INTEGER NOT NULL,
  overall_score INTEGER NOT NULL,
  feedback TEXT NOT NULL,
  improvements TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.recitation_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read recitation_scores" ON public.recitation_scores FOR SELECT USING (true);
CREATE POLICY "Allow public insert recitation_scores" ON public.recitation_scores FOR INSERT WITH CHECK (true);

-- 11. Last Read Table
CREATE TABLE IF NOT EXISTS public.last_read (
  user_email TEXT PRIMARY KEY REFERENCES public.profiles(email) ON DELETE CASCADE,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.last_read ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read last_read" ON public.last_read FOR SELECT USING (true);
CREATE POLICY "Allow public insert last_read" ON public.last_read FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update last_read" ON public.last_read FOR UPDATE USING (true);
