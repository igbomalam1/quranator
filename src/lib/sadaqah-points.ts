// Sadaqah Points (SDQ) system
// 1000 SDQ = $1 worth of sadaqah

export interface SadaqahData {
  totalPoints: number;
  history: SadaqahEntry[];
}

export interface SadaqahEntry {
  id: string;
  points: number;
  verseKey: string;
  score: number;
  createdAt: string;
}

const SDQ_KEY = "sadaqah_points";

export function getSadaqahData(): SadaqahData {
  const raw = localStorage.getItem(SDQ_KEY);
  if (raw) return JSON.parse(raw);
  return { totalPoints: 0, history: [] };
}

function saveSadaqahData(data: SadaqahData) {
  localStorage.setItem(SDQ_KEY, JSON.stringify(data));
}

export function awardSadaqahPoints(score: number, verseKey: string): number {
  if (score < 50) return 0;
  
  // Points scale: 50-100% → 50-500 points per verse
  const points = Math.round((score / 100) * 500);
  
  const data = getSadaqahData();
  data.totalPoints += points;
  data.history.unshift({
    id: crypto.randomUUID(),
    points,
    verseKey,
    score,
    createdAt: new Date().toISOString(),
  });
  saveSadaqahData(data);
  return points;
}

export function getSadaqahDollars(): string {
  const data = getSadaqahData();
  return (data.totalPoints / 1000).toFixed(2);
}
