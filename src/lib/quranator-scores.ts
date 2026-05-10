import { supabase } from "@/integrations/supabase/client";
import { getUser } from "./auth";

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

function getEmail(): string {
  const user = getUser();
  return user?.email || "demo@quranai.app";
}

export async function getScores(): Promise<RecitationScore[]> {
  const email = getEmail();
  const { data, error } = await supabase
    .from("recitation_scores")
    .select("*")
    .eq("user_email", email)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error getting recitation scores:", error);
    return [];
  }

  return (data || []).map((s: any) => ({
    id: s.id,
    goalTitle: s.goal_title,
    verseKey: s.verse_key,
    arabicText: s.arabic_text,
    userTranscript: s.user_transcript,
    accuracy: s.accuracy,
    tajweedScore: s.tajweed_score,
    fluencyScore: s.fluency_score,
    overallScore: s.overall_score,
    feedback: s.feedback,
    improvements: s.improvements || [],
    createdAt: s.created_at,
  }));
}

export async function saveScore(score: Omit<RecitationScore, "id" | "createdAt">): Promise<RecitationScore> {
  const email = getEmail();
  const { data, error } = await supabase
    .from("recitation_scores")
    .insert({
      user_email: email,
      goal_title: score.goalTitle,
      verse_key: score.verseKey,
      arabic_text: score.arabicText,
      user_transcript: score.userTranscript,
      accuracy: score.accuracy,
      tajweed_score: score.tajweedScore,
      fluency_score: score.fluencyScore,
      overall_score: score.overallScore,
      feedback: score.feedback,
      improvements: score.improvements,
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving recitation score:", error);
    throw error;
  }

  return {
    id: data.id,
    goalTitle: data.goal_title,
    verseKey: data.verse_key,
    arabicText: data.arabic_text,
    userTranscript: data.user_transcript,
    accuracy: data.accuracy,
    tajweedScore: data.tajweed_score,
    fluencyScore: data.fluency_score,
    overallScore: data.overall_score,
    feedback: data.feedback,
    improvements: data.improvements || [],
    createdAt: data.created_at,
  };
}

export async function getAverageScore(): Promise<number> {
  const scores = await getScores();
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length);
}

export async function getTodayScores(): Promise<RecitationScore[]> {
  const today = new Date().toISOString().split("T")[0];
  const scores = await getScores();
  return scores.filter((s) => s.createdAt.startsWith(today));
}
