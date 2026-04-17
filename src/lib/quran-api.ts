import { supabase } from "@/integrations/supabase/client";

export interface Chapter {
  id: number;
  name_simple: string;
  name_arabic: string;
  revelation_place: string;
  verses_count: number;
}

export interface Verse {
  id: number;
  verse_key: string;
  text_uthmani: string;
  translations?: { text: string; resource_name: string }[];
  audio?: { url: string };
}

async function quranFetch(endpoint: string): Promise<any> {
  const { data, error } = await supabase.functions.invoke("quran-proxy", {
    body: { endpoint },
  });
  if (error) {
    console.error("quran-proxy error:", error);
    return null;
  }
  return data;
}

export async function fetchChapters(): Promise<Chapter[]> {
  try {
    const data = await quranFetch("/chapters");
    return data.chapters || [];
  } catch {
    return [];
  }
}

export async function fetchVerseByKey(verseKey: string): Promise<Verse | null> {
  try {
    // Use Sahih International (20) and Pickthall (19) for English translations
    const data = await quranFetch(`/verses/by_key/${verseKey}?translations=20,19&language=en&fields=text_uthmani,audio`);
    if (!data?.verse) return null;
    const verse = data.verse;

    // Fetch audio separately via recitations endpoint
    const audioData = await quranFetch(`/recitations/7/by_ayah/${verseKey}`);
    if (audioData?.audio_files?.[0]) {
      const audioFile = audioData.audio_files[0];
      verse.audio = { url: `https://verses.quran.com/${audioFile.url}` };
    }

    return verse;
  } catch {
    return null;
  }
}

export async function fetchVersesByChapter(chapter: number, page = 1): Promise<Verse[]> {
  try {
    const data = await quranFetch(`/verses/by_chapter/${chapter}?translations=20&language=en&page=${page}&per_page=10&fields=text_uthmani`);
    const verses = data.verses || [];

    // Fetch audio for the chapter page
    const audioData = await quranFetch(`/recitations/7/by_chapter/${chapter}?per_page=10&page=${page}`);
    if (audioData?.audio_files) {
      for (const af of audioData.audio_files) {
        const v = verses.find((v: Verse) => v.verse_key === af.verse_key || v.id === af.verse_id);
        if (v) v.audio = { url: `https://verses.quran.com/${af.url}` };
      }
    }

    return verses;
  } catch {
    return [];
  }
}

export async function searchQuran(query: string): Promise<Verse[]> {
  try {
    const data = await quranFetch(`/search?q=${encodeURIComponent(query)}&language=en`);
    return data.search?.results?.map((r: any) => ({
      id: r.verse_id,
      verse_key: r.verse_key,
      text_uthmani: r.text,
      translations: [{ text: r.translations?.[0]?.text || "", resource_name: "Translation" }],
    })) || [];
  } catch {
    return [];
  }
}

export function getRandomVerseKey(): string {
  const chapter = Math.floor(Math.random() * 114) + 1;
  const verse = Math.floor(Math.random() * 7) + 1;
  return `${chapter}:${verse}`;
}

export function getQuranComLink(verseKey: string): string {
  const [chapter, verse] = verseKey.split(":");
  return `https://quran.com/${chapter}/${verse}`;
}

// Cache ayah of the day for 24 hours
const AYAH_CACHE_KEY = "ayah_of_the_day";

interface AyahCache {
  verse: Verse;
  date: string;
}

export function getCachedAyah(): Verse | null {
  try {
    const raw = localStorage.getItem(AYAH_CACHE_KEY);
    if (!raw) return null;
    const cached: AyahCache = JSON.parse(raw);
    const today = new Date().toISOString().split("T")[0];
    if (cached.date === today) return cached.verse;
    return null;
  } catch {
    return null;
  }
}

export function cacheAyah(verse: Verse) {
  const today = new Date().toISOString().split("T")[0];
  localStorage.setItem(AYAH_CACHE_KEY, JSON.stringify({ verse, date: today }));
}

// ============================================================================
// QURAN FOUNDATION USER APIs (Bookmarks & Reading Progress)
// ============================================================================

export async function syncUserBookmarkToFoundation(verseKey: string, qfToken?: string): Promise<boolean> {
  // Secondary fallback: If no Foundation OAuth token is provided, fail silently
  if (!qfToken) return false;
  
  try {
    const response = await fetch("https://api.quran.com/api/v4/users/bookmarks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${qfToken}`
      },
      body: JSON.stringify({ verse_key: verseKey })
    });
    return response.ok;
  } catch (error) {
    console.error("Quran Foundation User API Error (Bookmarks):", error);
    return false;
  }
}

export async function syncReadingProgressToFoundation(chapter: number, verse: number, qfToken?: string): Promise<boolean> {
  if (!qfToken) return false;
  
  try {
    const response = await fetch("https://api.quran.com/api/v4/users/reading_sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${qfToken}`
      },
      body: JSON.stringify({ chapter_id: chapter, verse_id: verse })
    });
    return response.ok;
  } catch (error) {
    console.error("Quran Foundation User API Error (Reading Sessions):", error);
    return false;
  }
}

// Multi-layered sync mapping Local Storage First + Quran Foundation User API Second
export async function saveQuranBookmark(verseKey: string, qfToken?: string) {
  // 1. Primary Priority: Save locally 
  try {
    const existingStr = localStorage.getItem("quranator_bookmarks");
    const bookmarks = existingStr ? JSON.parse(existingStr) : [];
    if (!bookmarks.includes(verseKey)) {
      bookmarks.push(verseKey);
      localStorage.setItem("quranator_bookmarks", JSON.stringify(bookmarks));
    }
  } catch (e) {
    console.warn("Local storage unavailable", e);
  }

  // 2. Secondary Sync: Push to Quran Foundation Profile
  await syncUserBookmarkToFoundation(verseKey, qfToken);
}

export async function saveQuranReadingProgress(chapter: number, verse: number, qfToken?: string) {
  // 1. Primary Priority: Save locally
  try {
    localStorage.setItem("quranator_last_read", JSON.stringify({ 
      chapter, 
      verse, 
      timestamp: new Date().toISOString() 
    }));
  } catch (e) {
    console.warn("Local storage unavailable", e);
  }

  // 2. Secondary Sync: Push to Quran Foundation Profile
  await syncReadingProgressToFoundation(chapter, verse, qfToken);
}
