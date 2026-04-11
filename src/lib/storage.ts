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

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
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

// Chat Sessions
function getSessions(): ChatSession[] {
  return JSON.parse(localStorage.getItem("chat_sessions") || "[]");
}
function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem("chat_sessions", JSON.stringify(sessions));
}

export function getChatSessions(): ChatSession[] {
  // Migrate old flat chat_history to a session if it exists
  const oldHistory = localStorage.getItem("chat_history");
  if (oldHistory) {
    const oldMessages: ChatMessage[] = JSON.parse(oldHistory);
    if (oldMessages.length > 0) {
      const sessions = getSessions();
      const title = oldMessages[0]?.content?.slice(0, 50) || "Previous Chat";
      sessions.unshift({
        id: crypto.randomUUID(),
        title,
        messages: oldMessages,
        createdAt: oldMessages[0]?.timestamp || new Date().toISOString(),
        updatedAt: oldMessages[oldMessages.length - 1]?.timestamp || new Date().toISOString(),
      });
      saveSessions(sessions);
    }
    localStorage.removeItem("chat_history");
  }
  return getSessions();
}

export function getActiveSessionId(): string | null {
  return localStorage.getItem("active_session_id");
}
export function setActiveSessionId(id: string | null) {
  if (id) localStorage.setItem("active_session_id", id);
  else localStorage.removeItem("active_session_id");
}

export function createChatSession(firstMessage?: string): ChatSession {
  const session: ChatSession = {
    id: crypto.randomUUID(),
    title: firstMessage?.slice(0, 50) || "New Chat",
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const sessions = getSessions();
  sessions.unshift(session);
  saveSessions(sessions);
  setActiveSessionId(session.id);
  return session;
}

export function getSessionMessages(sessionId: string): ChatMessage[] {
  const session = getSessions().find((s) => s.id === sessionId);
  return session?.messages || [];
}

export function addMessageToSession(sessionId: string, msg: Omit<ChatMessage, "id" | "timestamp">): ChatMessage {
  const sessions = getSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error("Session not found");
  const newMsg: ChatMessage = { ...msg, id: crypto.randomUUID(), timestamp: new Date().toISOString() };
  session.messages.push(newMsg);
  if (session.messages.length === 1 && msg.role === "user") {
    session.title = msg.content.slice(0, 50);
  }
  session.updatedAt = new Date().toISOString();
  saveSessions(sessions);
  return newMsg;
}

export function deleteChatSession(sessionId: string) {
  const sessions = getSessions().filter((s) => s.id !== sessionId);
  saveSessions(sessions);
  const activeId = getActiveSessionId();
  if (activeId === sessionId) setActiveSessionId(null);
}

// Legacy helpers (kept for backward compat with DashboardPage etc.)
export function getChatHistory(): ChatMessage[] {
  const activeId = getActiveSessionId();
  if (activeId) return getSessionMessages(activeId);
  return [];
}
export function saveChatMessage(msg: Omit<ChatMessage, "id" | "timestamp">): ChatMessage {
  let activeId = getActiveSessionId();
  if (!activeId) {
    const session = createChatSession(msg.role === "user" ? msg.content : undefined);
    activeId = session.id;
  }
  return addMessageToSession(activeId, msg);
}
export function clearChatHistory() {
  const activeId = getActiveSessionId();
  if (activeId) deleteChatSession(activeId);
  setActiveSessionId(null);
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
