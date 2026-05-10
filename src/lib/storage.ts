import { supabase } from "@/integrations/supabase/client";
import { getUser } from "./auth";

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

// Helper to get active user email
function getEmail(): string {
  const user = getUser();
  return user?.email || "demo@quranai.app";
}

// Reflections
export async function getReflections(): Promise<Reflection[]> {
  const email = getEmail();
  const { data, error } = await supabase
    .from("reflections")
    .select("*")
    .eq("user_email", email)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error getting reflections:", error);
    return [];
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    verseKey: r.verse_key,
    text: r.text,
    createdAt: r.created_at,
  }));
}

export async function saveReflection(r: Omit<Reflection, "id" | "createdAt">): Promise<Reflection> {
  const email = getEmail();
  const { data, error } = await supabase
    .from("reflections")
    .insert({
      user_email: email,
      verse_key: r.verseKey,
      text: r.text,
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving reflection:", error);
    throw error;
  }

  if (!data) throw new Error("DB request failed to return the new row.");

  return {
    id: data.id,
    verseKey: data.verse_key,
    text: data.text,
    createdAt: data.created_at,
  };
}

// Bookmarks
export async function getBookmarks(): Promise<Bookmark[]> {
  const email = getEmail();
  const { data, error } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("user_email", email)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error getting bookmarks:", error);
    return [];
  }

  return (data || []).map((b: any) => ({
    id: b.id,
    verseKey: b.verse_key,
    note: b.note || undefined,
    createdAt: b.created_at,
  }));
}

export async function saveBookmark(b: Omit<Bookmark, "id" | "createdAt">): Promise<Bookmark> {
  const email = getEmail();
  const { data, error } = await supabase
    .from("bookmarks")
    .insert({
      user_email: email,
      verse_key: b.verseKey,
      note: b.note || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving bookmark:", error);
    throw error;
  }

  if (!data) throw new Error("DB request failed to return the new row.");

  return {
    id: data.id,
    verseKey: data.verse_key,
    note: data.note || undefined,
    createdAt: data.created_at,
  };
}

export async function removeBookmark(id: string): Promise<void> {
  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error removing bookmark:", error);
    throw error;
  }
}

// Chat Sessions
export async function getChatSessions(): Promise<ChatSession[]> {
  const email = getEmail();
  const { data: sessions, error: sessionErr } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_email", email)
    .order("updated_at", { ascending: false });

  if (sessionErr) {
    console.error("Error getting sessions:", sessionErr);
    return [];
  }

  const result: ChatSession[] = [];
  for (const s of sessions || []) {
    const { data: messages, error: msgErr } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", s.id)
      .order("created_at", { ascending: true });

    if (msgErr) {
      console.error(`Error getting messages for session ${s.id}:`, msgErr);
      continue;
    }

    result.push({
      id: s.id,
      title: s.title,
      messages: (messages || []).map((m: any) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: m.created_at,
      })),
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    });
  }

  return result;
}

export function getActiveSessionId(): string | null {
  return localStorage.getItem("active_session_id");
}

export function setActiveSessionId(id: string | null) {
  if (id) localStorage.setItem("active_session_id", id);
  else localStorage.removeItem("active_session_id");
}

export async function createChatSession(firstMessage?: string): Promise<ChatSession> {
  const email = getEmail();
  const title = firstMessage?.slice(0, 50) || "New Chat";

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({
      user_email: email,
      title,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating session:", error);
    throw error;
  }

  const session: ChatSession = {
    id: data.id,
    title: data.title,
    messages: [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  setActiveSessionId(session.id);
  return session;
}

export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error getting session messages:", error);
    return [];
  }

  return (data || []).map((m: any) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    timestamp: m.created_at,
  }));
}

export async function addMessageToSession(sessionId: string, msg: Omit<ChatMessage, "id" | "timestamp">): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      session_id: sessionId,
      role: msg.role,
      content: msg.content,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding message:", error);
    throw error;
  }

  // Update session updatedAt and title if it's the first user message
  if (msg.role === "user") {
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("id")
      .eq("session_id", sessionId);

    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (messages && messages.length === 1) {
      updatePayload.title = msg.content.slice(0, 50);
    }

    await supabase
      .from("chat_sessions")
      .update(updatePayload)
      .eq("id", sessionId);
  }

  return {
    id: data.id,
    role: data.role as "user" | "assistant",
    content: data.content,
    timestamp: data.created_at,
  };
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) {
    console.error("Error deleting session:", error);
    throw error;
  }

  const activeId = getActiveSessionId();
  if (activeId === sessionId) setActiveSessionId(null);
}

// Legacy helpers (kept for backward compatibility where possible, but now returning Promises)
export async function getChatHistory(): Promise<ChatMessage[]> {
  const activeId = getActiveSessionId();
  if (activeId) return getSessionMessages(activeId);
  return [];
}

export async function saveChatMessage(msg: Omit<ChatMessage, "id" | "timestamp">): Promise<ChatMessage> {
  let activeId = getActiveSessionId();
  if (!activeId) {
    const session = await createChatSession(msg.role === "user" ? msg.content : undefined);
    activeId = session.id;
  }
  return addMessageToSession(activeId, msg);
}

export async function clearChatHistory(): Promise<void> {
  const activeId = getActiveSessionId();
  if (activeId) await deleteChatSession(activeId);
  setActiveSessionId(null);
}

// Streaks
export async function getStreakData(): Promise<StreakData> {
  const email = getEmail();
  const { data, error } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_email", email)
    .single();

  if (error) {
    if (error.code !== "PGRST116") { // Ignore record not found error code
      console.error("Error getting streak data:", error);
    }
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: "", activeDates: [] };
  }

  return {
    currentStreak: data.current_streak,
    longestStreak: data.longest_streak,
    lastActiveDate: data.last_active_date,
    activeDates: data.active_dates || [],
  };
}

export async function recordActivity(): Promise<StreakData> {
  const today = new Date().toISOString().split("T")[0];
  const data = await getStreakData();
  if (data.lastActiveDate === today) return data;

  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const newStreak = data.lastActiveDate === yesterday ? data.currentStreak + 1 : 1;

  const updated: StreakData = {
    currentStreak: newStreak,
    longestStreak: Math.max(newStreak, data.longestStreak),
    lastActiveDate: today,
    activeDates: [...new Set([...data.activeDates, today])],
  };

  const email = getEmail();
  const { error } = await supabase
    .from("streaks")
    .upsert({
      user_email: email,
      current_streak: updated.currentStreak,
      longest_streak: updated.longestStreak,
      last_active_date: updated.lastActiveDate,
      active_dates: updated.activeDates,
    });

  if (error) {
    console.error("Error updating streak:", error);
  }

  return updated;
}
