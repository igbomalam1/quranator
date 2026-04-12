// Quranator score storage

export interface RecitationScore {
  id: string;
  goalTitle: string;
  verseKey: string;
  arabicText: string;
  userTranscript: string;
  accuracy: number; // 0-100
  tajweedScore: number; // 0-100
  fluencyScore: number; // 0-100
  overallScore: number; // 0-100
  feedback: string;
  improvements: string[];
  createdAt: string;
}

export function getScores(): RecitationScore[] {
  return JSON.parse(localStorage.getItem("quranator_scores") || "[]");
}

export function saveScore(score: Omit<RecitationScore, "id" | "createdAt">): RecitationScore {
  const scores = getScores();
  const newScore: RecitationScore = {
    ...score,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  scores.unshift(newScore);
  localStorage.setItem("quranator_scores", JSON.stringify(scores));
  return newScore;
}

export function getAverageScore(): number {
  const scores = getScores();
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length);
}

export function getTodayScores(): RecitationScore[] {
  const today = new Date().toISOString().split("T")[0];
  return getScores().filter((s) => s.createdAt.startsWith(today));
}
