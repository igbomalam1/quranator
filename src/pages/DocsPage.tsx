import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, MessageSquare, Target, Bookmark, GraduationCap, Award, Flame, Shield, Mic, Database } from "lucide-react";
import { useNavigate } from "react-router-dom";

const sections = [
  {
    icon: GraduationCap,
    title: "Quranator AI Tutor",
    desc: "Interactive learning that fetches your goals, loads verses from the Quran Content API, plays audio recitations with word-by-word highlighting, and lets you practice reading with speech recognition. AI scores your recitation on accuracy, tajweed, and fluency.",
    apis: ["Quran Verses API (by_chapter, by_key)", "Audio/Recitations API", "Reciter metadata"],
  },
  {
    icon: MessageSquare,
    title: "AI Mentor Chat",
    desc: "Chat with an AI grounded in real Quran verses. Supports tajweed analysis, deep verse analysis, and reading mode. All responses cite actual verses with links to Quran.com.",
    apis: ["AI Integration (Gemini)", "Quran Content API for verse references"],
  },
  {
    icon: BookOpen,
    title: "Daily Ayah & Deep Learning",
    desc: "A new verse every day with audio playback, translation, and a Deep Learning button that opens AI chat for in-depth tafsir and context.",
    apis: ["Quran Verses API (by_key)", "Audio Recitations API", "Translations API (Sahih International)"],
  },
  {
    icon: Target,
    title: "Goals & Sadaqah Pledge",
    desc: "Set daily Quran study goals with AI suggestions. Each goal requires a Sadaqah pledge — miss your streak and you're reminded to donate locally.",
    apis: ["User Activity & Goals (local tracking)", "Streak Tracking"],
  },
  {
    icon: Award,
    title: "Quranator Score & SDQ Points",
    desc: "AI-powered recitation scoring with grades (A+ to D). Earn Sadaqah Points (SDQ) for scores above 49% — 1000 SDQ = $1 worth of suggested sadaqah donation.",
    apis: ["score-recitation Edge Function", "AI Integration"],
  },
  {
    icon: Bookmark,
    title: "Bookmarks & Reflections",
    desc: "Save verses, write personal reflections, and revisit them. Bookmarks open in AI chat for deeper exploration.",
    apis: ["Bookmarks (local storage)", "Post APIs (Reflections)"],
  },
  {
    icon: Flame,
    title: "Streak Tracking & Accountability",
    desc: "Daily activity tracking with streak counter, 30-day heatmap, and missed-streak punishment modal requiring sincere local sadaqah before proceeding.",
    apis: ["Streak Tracking", "Activity Days"],
  },
  {
    icon: Mic,
    title: "Change Reciter",
    desc: "Browse and switch between Quran reciters fetched from the Quran.com Recitations API. Available on Ayah of the Day and Quranator screens.",
    apis: ["Recitations API (reciter list)", "Audio streaming URLs"],
  },
  {
    icon: Shield,
    title: "OAuth2 Authentication",
    desc: "Quran.com Pre-Production OAuth2 with PKCE flow. Scopes: openid, offline_access. Uses x-auth-token and x-client-id headers on authenticated calls.",
    apis: ["OAuth2 Authorization Code + PKCE", "Token endpoint", "User profile"],
  },
];

export default function DocsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-sm">Quranator — Documentation</span>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quranator</h1>
          <p className="text-muted-foreground">
            A comprehensive Quran AI companion built for the Quran.com Hackathon. Quranator is designed to keep users deeply engaged with the Quran <strong>beyond Ramadan</strong> — building daily habits, accountability through Sadaqah pledges, and personalized AI-powered learning that makes Quran study a year-round commitment, not a seasonal one.
          </p>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-6 space-y-3">
            <h2 className="text-lg font-semibold">How the specific APIs were used</h2>
            <div className="space-y-2 text-sm">
              <div>
                <h3 className="font-medium">Content API Category ✅</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                  <li><strong>Quran Verses API</strong> — Fetches verses by chapter, by key, and for search. Used in Dashboard (Ayah of the Day), Quranator (learning sessions), and Quran Reader.</li>
                  <li><strong>Audio/Recitations API</strong> — Streams recitation audio from multiple reciters. Powers Listen buttons across the app with word-by-word highlighting.</li>
                  <li><strong>Translations API</strong> — Loads Sahih International (ID: 20) translations alongside Arabic text.</li>
                  <li><strong>Tafsir</strong> — AI Mentor provides tafsir-style deep analysis grounded in real verses with scholarly context.</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium">User API Category ✅</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                  <li><strong>Bookmarks</strong> — Users save and manage verse bookmarks with notes, accessible across sessions.</li>
                  <li><strong>Streak Tracking</strong> — Daily activity recorded with current/longest streak, 30-day heatmap, and missed-streak accountability.</li>
                  <li><strong>Activity & Goals</strong> — Daily goals with numeric targets, AI suggestions, completion tracking, and Sadaqah pledge system.</li>
                  <li><strong>Post APIs (Reflections)</strong> — Users write personal reflections on verses, displayed on dashboard and dedicated page.</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium">OAuth2 Authentication ✅</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                  <li>Authorization Code flow with PKCE using Quran.com Pre-Production OAuth2 endpoints.</li>
                  <li>Scopes: <code className="bg-secondary px-1 rounded">openid offline_access</code></li>
                  <li>All authenticated API calls use x-auth-token and x-client-id headers.</li>
                  <li>Demo mode available for testing without OAuth credentials.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="text-xl font-semibold">Features Overview</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((s) => (
            <Card key={s.title} className="bg-card border-border">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <s.icon className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-medium text-sm">{s.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
                <div className="flex flex-wrap gap-1">
                  {s.apis.map((api) => (
                    <span key={api} className="text-xs bg-secondary px-2 py-0.5 rounded">{api}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Data Storage Section */}
        <Card className="bg-card border-border">
          <CardContent className="p-6 space-y-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Database className="h-5 w-5" /> Data Storage Approach
            </h2>
            <p className="text-sm text-muted-foreground">
              User data (goals, scores, bookmarks, reflections, streaks) is currently stored in the browser's <strong>localStorage</strong>. This was a deliberate choice for the hackathon phase to ensure:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Zero-latency experience</strong> — all reads and writes are instant with no network round-trips, keeping the learning flow uninterrupted.</li>
              <li><strong>Offline-first capability</strong> — users can continue studying even without an internet connection; data syncs when they're back online.</li>
              <li><strong>Privacy by default</strong> — sensitive learning data stays on the user's device until they explicitly opt into cloud sync.</li>
              <li><strong>Rapid iteration</strong> — no database migrations needed during the hackathon, allowing faster feature development.</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              In the production release, localStorage will be replaced with a cloud database for cross-device sync, data backup, and multi-user features like leaderboards.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6 space-y-2">
            <h2 className="text-lg font-semibold">Technical Stack</h2>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>React 18 + TypeScript + Vite + Tailwind CSS</li>
              <li>Supabase Edge Functions (chat proxy, Quran API proxy, recitation scoring)</li>
              <li>AI integration for intelligent chat, verse analysis, and recitation scoring</li>
              <li>Quran.com API v4 (Content + Audio + Translations)</li>
              <li>Web Speech API (SpeechRecognition for Arabic recitation capture)</li>
              <li>LocalStorage for offline-first user data persistence (cloud database planned)</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6 space-y-2">
            <h2 className="text-lg font-semibold">🌙 Beyond Ramadan</h2>
            <p className="text-sm text-muted-foreground">
              Quranator isn't just a Ramadan tool — it's built to be your <strong>lifelong Quran companion</strong>. With daily goals, streak accountability, Sadaqah pledges, AI-powered tutoring, and recitation scoring, every feature is designed to make Quran study a consistent daily habit. Miss a day? The app holds you accountable with sincere sadaqah reminders. Score well? You earn SDQ points as motivation to keep going. The goal is simple: keep you connected to the Quran, every single day.
            </p>
          </CardContent>
        </Card>

        <footer className="text-center text-sm text-muted-foreground py-8 border-t border-border">
          Built for the Quran.com Hackathon · Developed by DevI Software Solution and team
        </footer>
      </div>
    </div>
  );
}
