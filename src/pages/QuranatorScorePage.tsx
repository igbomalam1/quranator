import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Award, TrendingUp, BookOpen, Heart } from "lucide-react";
import { getScores, getAverageScore, getTodayScores, type RecitationScore } from "@/lib/quranator-scores";
import { getSadaqahData, getSadaqahDollars, type SadaqahData } from "@/lib/sadaqah-points";

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 80 ? "bg-green-500" : value >= 60 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function QuranatorScorePage() {
  const [filter, setFilter] = useState<"all" | "today">("today");
  const [allScores, setAllScores] = useState<RecitationScore[]>([]);
  const [todayScores, setTodayScores] = useState<RecitationScore[]>([]);
  const [sdqData, setSdqData] = useState<SadaqahData>({ totalPoints: 0, history: [] });
  const [sdqDollars, setSdqDollars] = useState<string>("0.00");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const scores = await getScores();
        const todayS = await getTodayScores();
        const sdq = await getSadaqahData();
        const dollars = await getSadaqahDollars();

        setAllScores(scores);
        setTodayScores(todayS);
        setSdqData(sdq);
        setSdqDollars(dollars);
      } catch (err) {
        console.error("Error loading scores/Sadaqah details:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const scores = filter === "today" ? todayScores : allScores;

  const stats = useMemo(() => {
    if (scores.length === 0) return null;
    const avgAccuracy = Math.round(scores.reduce((s, sc) => s + sc.accuracy, 0) / scores.length);
    const avgTajweed = Math.round(scores.reduce((s, sc) => s + sc.tajweedScore, 0) / scores.length);
    const avgFluency = Math.round(scores.reduce((s, sc) => s + sc.fluencyScore, 0) / scores.length);
    const avgOverall = Math.round(scores.reduce((s, sc) => s + sc.overallScore, 0) / scores.length);
    const bestScore = Math.max(...scores.map((s) => s.overallScore));
    return { avgAccuracy, avgTajweed, avgFluency, avgOverall, bestScore, total: scores.length };
  }, [scores]);

  const getGrade = (score: number) => {
    if (score >= 90) return { grade: "A+", label: "Excellent", color: "text-green-400" };
    if (score >= 80) return { grade: "A", label: "Great", color: "text-green-500" };
    if (score >= 70) return { grade: "B", label: "Good", color: "text-yellow-400" };
    if (score >= 60) return { grade: "C", label: "Fair", color: "text-yellow-500" };
    return { grade: "D", label: "Keep Practicing", color: "text-red-400" };
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="h-6 w-6" /> Quranator Score
        </h1>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* SDQ Points Card */}
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-lg font-bold">{sdqData.totalPoints} SDQ</p>
                  <p className="text-xs text-muted-foreground">Sadaqah Points</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">${sdqDollars}</p>
                <p className="text-xs text-muted-foreground">Sadaqah value</p>
              </div>
            </CardContent>
          </Card>

          {/* Filter tabs */}
          <div className="flex gap-2">
            <Button
              variant={filter === "today" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("today")}
            >
              Today
            </Button>
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All Time
            </Button>
          </div>

          {/* Overall grade */}
          {stats ? (
            <>
              <Card className="bg-card border-border">
                <CardContent className="p-6 text-center space-y-3">
                  <div className={`text-5xl font-bold ${getGrade(stats.avgOverall).color}`}>
                    {getGrade(stats.avgOverall).grade}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getGrade(stats.avgOverall).label} — {stats.avgOverall}% average
                  </p>
                  <div className="flex justify-center gap-6 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" /> {stats.total} recitations
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Best: {stats.bestScore}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Breakdown */}
              <Card className="bg-card border-border">
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-medium">Score Breakdown</h3>
                  <ScoreBar label="Accuracy" value={stats.avgAccuracy} />
                  <ScoreBar label="Tajweed" value={stats.avgTajweed} />
                  <ScoreBar label="Fluency" value={stats.avgFluency} />
                </CardContent>
              </Card>

              {/* Recent scores */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Recent Recitations</h3>
                {scores.slice(0, 20).map((score) => (
                  <Card key={score.id} className="bg-card border-border">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{score.verseKey}</p>
                          <p className="text-xs text-muted-foreground">{score.goalTitle}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-lg font-bold ${getGrade(score.overallScore).color}`}>
                            {score.overallScore}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {new Date(score.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {score.feedback && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          {score.feedback}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <Award className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground text-sm mb-4">
                No scores yet. Go to Quranator and read some verses to get scored!
              </p>
              <Button variant="outline" size="sm" onClick={() => (window.location.href = "/quranator")}>
                Start Learning
              </Button>
            </div>
          )}
        </>
      )}

      {/* SDQ Info */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground text-sm">About Sadaqah Points (SDQ)</p>
          <p>Score above 49% on any recitation to earn SDQ points. Higher scores earn more points.</p>
          <p>1,000 SDQ = $1 worth of suggested sadaqah donation. This is a faithful conversion to encourage sincere giving — fii sabilillah. 🤲</p>
        </CardContent>
      </Card>
    </div>
  );
}
