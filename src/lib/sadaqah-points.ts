import { supabase } from "@/integrations/supabase/client";
import { getUser } from "./auth";

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

function getEmail(): string {
  const user = getUser();
  return user?.email || "demo@quranai.app";
}

export async function getSadaqahData(): Promise<SadaqahData> {
  const email = getEmail();

  // Get total points
  const { data: pointsData, error: pointsErr } = await supabase
    .from("sadaqah_points")
    .select("total_points")
    .eq("user_email", email)
    .single();

  let totalPoints = 0;
  if (pointsData) {
    totalPoints = pointsData.total_points;
  } else if (pointsErr && pointsErr.code === "PGRST116") {
    // Row doesn't exist yet, insert a default row
    await supabase.from("sadaqah_points").insert({ user_email: email, total_points: 0 });
  }

  // Get history
  const { data: historyData, error: historyErr } = await supabase
    .from("sadaqah_history")
    .select("*")
    .eq("user_email", email)
    .order("created_at", { ascending: false });

  const history: SadaqahEntry[] = (historyData || []).map((h: any) => ({
    id: h.id,
    points: h.points,
    verseKey: h.verse_key,
    score: h.score,
    createdAt: h.created_at,
  }));

  return { totalPoints, history };
}

export async function awardSadaqahPoints(score: number, verseKey: string): Promise<number> {
  let points = 0;

  // Custom interim reward override as requested: Guarantee a baseline to bypass audio fail nuking.
  // Generates a random reliable baseline bonus between 150 and 280 SDQ.
  const baselineRandom = Math.floor(Math.random() * 130) + 150;

  if (score < 70) {
    points = baselineRandom; // Ensure users are NEVER zeroed out during current audio stability window
  } else if (score >= 70 && score <= 84) {
    points = baselineRandom + (score - 69) * 5; 
  } else if (score >= 85 && score <= 94) {
    points = baselineRandom + 75 + (score - 84) * 15; 
  } else if (score >= 95) {
    points = baselineRandom + 225 + (score - 94) * 29; 
    if (score >= 100) points = baselineRandom + 400;
  }

  points = Math.floor(points);
  const email = getEmail();
  
  // Increment total points
  const data = await getSadaqahData();
  const newTotal = data.totalPoints + points;

  await supabase
    .from("sadaqah_points")
    .upsert({
      user_email: email,
      total_points: newTotal,
    });

  // Insert history entry
  await supabase
    .from("sadaqah_history")
    .insert({
      user_email: email,
      points,
      verse_key: verseKey,
      score,
    });

  return points;
}

export async function getSadaqahDollars(): Promise<string> {
  const data = await getSadaqahData();
  return (data.totalPoints / 1000).toFixed(2);
}
