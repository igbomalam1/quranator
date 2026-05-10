import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Flame, Award, Heart, Medal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  sdqPoints: number;
  avgScore: number;
  streak: number;
  daysActive: number;
}



const rankIcons: Record<number, React.ReactNode> = {
  1: <Trophy className="h-5 w-5 text-yellow-400" />,
  2: <Medal className="h-5 w-5 text-gray-300" />,
  3: <Medal className="h-5 w-5 text-amber-600" />,
};

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const { data: profiles, error: pErr } = await supabase
          .from("profiles")
          .select("*");

        if (pErr) throw pErr;

        const entries: LeaderboardEntry[] = [];
        for (const p of profiles || []) {
          // Get SDQ
          const { data: sdq } = await supabase
            .from("sadaqah_points")
            .select("total_points")
            .eq("user_email", p.email)
            .maybeSingle();

          // Get Streak
          const { data: streakData } = await supabase
            .from("streaks")
            .select("current_streak, active_dates")
            .eq("user_email", p.email)
            .maybeSingle();

          // Get Average Score
          const { data: scores } = await supabase
            .from("recitation_scores")
            .select("overall_score")
            .eq("user_email", p.email);

          const avgScore = scores && scores.length > 0
            ? Math.round(scores.reduce((sum, s) => sum + s.overall_score, 0) / scores.length)
            : 0;

          entries.push({
            rank: 0,
            name: p.name || "Anonymous Learner",
            avatar: (p.name || "A").charAt(0).toUpperCase(),
            sdqPoints: sdq?.total_points || 0,
            avgScore,
            streak: streakData?.current_streak || 0,
            daysActive: streakData?.active_dates?.length || 0,
          });
        }

        // Sort primarily by sdqPoints, then streak, then avgScore
        entries.sort((a, b) => b.sdqPoints - a.sdqPoints || b.streak - a.streak || b.avgScore - a.avgScore);
        
        // Assign ranks
        const finalEntries = entries.map((entry, idx) => ({
          ...entry,
          rank: idx + 1,
        }));

        setLeaderboard(finalEntries);
      } catch (err) {
        console.error("Error loading leaderboard:", err);
        setLeaderboard([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6" /> Progress Leaderboard
        </h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Top learners ranked by Sadaqah Points, Quranator scores, and consistency. Keep learning to climb the ranks!
      </p>

      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {leaderboard.length >= 3 && (
            <div className="grid grid-cols-3 gap-3">
              {[leaderboard[1], leaderboard[0], leaderboard[2]].map((entry, idx) => {
                const order = [2, 1, 3][idx];
                const isFirst = order === 1;
                return (
                  <Card key={entry.rank} className={`bg-card border-border ${isFirst ? "ring-1 ring-yellow-500/30" : ""}`}>
                    <CardContent className="p-4 text-center space-y-2">
                      <div className="flex justify-center">{rankIcons[order]}</div>
                      <div className={`h-12 w-12 mx-auto rounded-full flex items-center justify-center text-lg font-bold ${
                        isFirst ? "bg-yellow-500/20 text-yellow-400" : "bg-secondary text-foreground"
                      }`}>
                        {entry.avatar}
                      </div>
                      <p className="text-sm font-medium truncate">{entry.name}</p>
                      <p className="text-xs text-muted-foreground">{entry.sdqPoints.toLocaleString()} SDQ</p>
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <Flame className="h-3 w-3 text-orange-400" /> {entry.streak}d streak
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Full leaderboard */}
          {leaderboard.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-card text-muted-foreground">
              <p className="text-sm">No data recorded in the community leaderboard yet.</p>
              <p className="text-xs mt-1">Start reciting to become the first entry on the list! 🏆</p>
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 px-4 py-2 text-xs text-muted-foreground border-b border-border">
                  <span>#</span>
                  <span>Learner</span>
                  <span className="text-right">SDQ</span>
                  <span className="text-right">Score</span>
                  <span className="text-right">Streak</span>
                  <span className="text-right">Days</span>
                </div>
                {leaderboard.map((entry) => (
                  <div
                    key={entry.rank}
                    className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 items-center px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                  >
                    <span className="text-sm font-medium w-6 text-center flex items-center justify-center">
                      {rankIcons[entry.rank] || entry.rank}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
                        {entry.avatar}
                      </div>
                      <span className="text-sm font-medium truncate">{entry.name}</span>
                    </div>
                    <div className="text-right flex items-center gap-1 justify-end">
                      <Heart className="h-3 w-3 text-green-500" />
                      <span className="text-sm">{entry.sdqPoints.toLocaleString()}</span>
                    </div>
                    <div className="text-right flex items-center gap-1 justify-end">
                      <Award className="h-3 w-3 text-primary" />
                      <span className="text-sm">{entry.avgScore}%</span>
                    </div>
                    <div className="text-right flex items-center gap-1 justify-end">
                      <Flame className="h-3 w-3 text-orange-400" />
                      <span className="text-sm">{entry.streak}</span>
                    </div>
                    <span className="text-sm text-right text-muted-foreground">{entry.daysActive}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Card className="bg-card border-border">
        <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground text-sm">How Rankings Work</p>
          <p>Learners are ranked primarily by Sadaqah Points (SDQ) earned through consistent, quality recitation practice.</p>
          <p>Streak bonuses and high Quranator scores contribute to climbing the leaderboard. Stay consistent to rise!</p>
          <p className="italic">Note: Real-time user rankings are fully connected and powered by Supabase PostgreSQL databases.</p>
        </CardContent>
      </Card>
    </div>
  );
}
