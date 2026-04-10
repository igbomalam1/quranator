// Local storage helpers for app data

export interface Reflection {
  id: string;
  verseKey: string;
  text: string;
  createdAt: string;
}

export interface Bookmark {
  id: string;
  verseKey: string;
  note?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  activeDates: string[];
}

// Reflections
export function getReflections(): Reflection[] {
  return JSON.parse(localStorage.getItem("reflections") || "[]");
}
export function saveReflection(r: Omit<Reflection, "id" | "createdAt">): Reflection {
  const reflections = getReflections();
  const newR: Reflection = { ...r, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  reflections.unshift(newR);
  localStorage.setItem("reflections", JSON.stringify(reflections));
  return newR;
}

// Bookmarks
export function getBookmarks(): Bookmark[] {
  return JSON.parse(localStorage.getItem("bookmarks") || "[]");
}
export function saveBookmark(b: Omit<Bookmark, "id" | "createdAt">): Bookmark {
  const bookmarks = getBookmarks();
  const newB: Bookmark = { ...b, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  bookmarks.unshift(newB);
  localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
  return newB;
}
export function removeBookmark(id: string) {
  const bookmarks = getBookmarks().filter((b) => b.id !== id);
  localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
}

// Chat history
export function getChatHistory(): ChatMessage[] {
  return JSON.parse(localStorage.getItem("chat_history") || "[]");
}
export function saveChatMessage(msg: Omit<ChatMessage, "id" | "timestamp">): ChatMessage {
  const history = getChatHistory();
  const newMsg: ChatMessage = { ...msg, id: crypto.randomUUID(), timestamp: new Date().toISOString() };
  history.push(newMsg);
  localStorage.setItem("chat_history", JSON.stringify(history));
  return newMsg;
}
export function clearChatHistory() {
  localStorage.setItem("chat_history", "[]");
}

// Streaks
export function getStreakData(): StreakData {
  const raw = localStorage.getItem("streak_data");
  if (raw) return JSON.parse(raw);
  return { currentStreak: 0, longestStreak: 0, lastActiveDate: "", activeDates: [] };
}
export function recordActivity() {
  const today = new Date().toISOString().split("T")[0];
  const data = getStreakData();
  if (data.lastActiveDate === today) return data;

  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const newStreak = data.lastActiveDate === yesterday ? data.currentStreak + 1 : 1;

  const updated: StreakData = {
    currentStreak: newStreak,
    longestStreak: Math.max(newStreak, data.longestStreak),
    lastActiveDate: today,
    activeDates: [...new Set([...data.activeDates, today])],
  };
  localStorage.setItem("streak_data", JSON.stringify(updated));
  return updated;
}
