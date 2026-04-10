import { QURAN_API_BASE } from "./auth";

// Quran.com Pre-Production API helpers

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

export async function fetchChapters(): Promise<Chapter[]> {
  try {
    const res = await fetch(`${QURAN_API_BASE}/content/api/v4/chapters`);
    const data = await res.json();
    return data.chapters || [];
  } catch {
    return [];
  }
}

export async function fetchVerseByKey(verseKey: string): Promise<Verse | null> {
  try {
    const res = await fetch(
      `${QURAN_API_BASE}/content/api/v4/verses/by_key/${verseKey}?translations=131,33&language=en`
    );
    const data = await res.json();
    return data.verse || null;
  } catch {
    return null;
  }
}

export async function fetchVersesByChapter(chapter: number, page = 1): Promise<Verse[]> {
  try {
    const res = await fetch(
      `${QURAN_API_BASE}/content/api/v4/verses/by_chapter/${chapter}?translations=131&language=en&page=${page}&per_page=10`
    );
    const data = await res.json();
    return data.verses || [];
  } catch {
    return [];
  }
}

export async function searchQuran(query: string): Promise<Verse[]> {
  try {
    const res = await fetch(
      `${QURAN_API_BASE}/content/api/v4/search?q=${encodeURIComponent(query)}&language=en`
    );
    const data = await res.json();
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
