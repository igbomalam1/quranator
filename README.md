# Quranator — Your Personal Quran AI Tutor

Quranator is an AI-powered Quran companion designed to help users build lifelong Quran habits **beyond Ramadan**. It combines interactive learning, recitation scoring, streak accountability, and Sadaqah-driven motivation into a single app.

Built for the **Quran.com Hackathon**.

## ✨ Features

### 🎓 Quranator AI Tutor
Set daily goals and let Quranator guide you verse-by-verse. Listen to recitations with word-by-word highlighting, practice reading with speech recognition, and get AI-scored feedback on accuracy, tajweed, and fluency.

### 💬 AI Mentor Chat
Chat with an AI grounded in real Quran verses. Ask about tajweed rules, get deep tafsir analysis, or explore any topic — all responses cite actual verses with links to Quran.com.

### 📖 Daily Ayah & Deep Learning
Start each day with a new verse, audio playback, and translation. Use the Deep Learning button for in-depth AI-powered tafsir and context.

### 🎯 Goals & Sadaqah Pledge
Set daily Quran study goals with AI suggestions. Each goal requires a Sadaqah pledge — miss your streak and you're reminded to donate locally.

### 🏆 Quranator Score & SDQ Points
AI-powered recitation scoring with grades (A+ to D). Earn Sadaqah Points (SDQ) for scores above 49%. 1000 SDQ = $1 worth of suggested sadaqah donation.

### 🔥 Streak Tracking & Accountability
Daily activity tracking with streak counter, 30-day heatmap, and missed-streak punishment requiring sincere local sadaqah before proceeding.

### 🔊 Multiple Reciters
Browse and switch between Quran reciters fetched from the Quran.com Recitations API.

### 🔐 OAuth2 Authentication
Quran.com Pre-Production OAuth2 with PKCE flow. Demo mode available for testing.

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase Edge Functions (chat proxy, Quran API proxy, recitation scoring)
- **AI**: Gemini models for chat, verse analysis, and recitation scoring
- **APIs**: Quran.com API v4 (Content, Audio, Translations)
- **Speech**: Web Speech API for Arabic recitation capture
- **Storage**: LocalStorage (offline-first; cloud database planned for production)

## 📦 API Usage

### Content API Category ✅
- **Quran Verses API** — Fetches verses by chapter and by key
- **Audio/Recitations API** — Streams audio with word-by-word highlighting
- **Translations API** — Sahih International (ID: 20)
- **Tafsir** — AI-powered deep verse analysis

### User API Category ✅
- **Bookmarks** — Save and manage verse bookmarks
- **Streak Tracking** — Daily streaks with accountability
- **Activity & Goals** — Daily goals with Sadaqah pledges
- **Post APIs (Reflections)** — Personal verse reflections

### OAuth2 Authentication ✅
- Authorization Code + PKCE flow
- Scopes: `openid offline_access`
- `x-auth-token` + `x-client-id` headers

## 🚀 Getting Started

```bash
npm install
npm run dev
```

## 🌙 Beyond Ramadan

Quranator is built to keep users engaged with the Quran year-round — not just during Ramadan. Every feature (streaks, pledges, scoring, AI tutoring) is designed to make Quran study a daily habit.

## 👥 Team

Developed by **DevI Software Solution** and team.
