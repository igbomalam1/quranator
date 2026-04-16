import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Flame, Award, Heart, Medal } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  sdqPoints: number;
  avgScore: number;
  streak: number;
  daysActive: number;
}

const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, name: "Abdullah M.", avatar: "A", sdqPoints: 12500, avgScore: 92, streak: 45, daysActive: 60 },
  { rank: 2, name: "Fatima K.", avatar: "F", sdqPoints: 10800, avgScore: 88, streak: 38, daysActive: 52 },
  { rank: 3, name: "Omar H.", avatar: "O", sdqPoints: 9200, avgScore: 85, streak: 30, daysActive: 48 },
  { rank: 4, name: "Aisha R.", avatar: "A", sdqPoints: 7600, avgScore: 82, streak: 25, daysActive: 40 },
  { rank: 5, name: "Yusuf S.", avatar: "Y", sdqPoints: 6400, avgScore: 79, streak: 22, daysActive: 35 },
  { rank: 6, name: "Maryam T.", avatar: "M", sdqPoints: 5100, avgScore: 76, streak: 18, daysActive: 30 },
  { rank: 7, name: "Ibrahim D.", avatar: "I", sdqPoints: 4200, avgScore: 74, streak: 15, daysActive: 28 },
  { rank: 8, name: "Khadija N.", avatar: "K", sdqPoints: 3500, avgScore: 71, streak: 12, daysActive: 22 },
  { rank: 9, name: "Hassan B.", avatar: "H", sdqPoints: 2800, avgScore: 68, streak: 10, daysActive: 18 },
  { rank: 10, name: "Zaynab L.", avatar: "Z", sdqPoints: 2100, avgScore: 65, streak: 7, daysActive: 14 },
];

const rankIcons: Record<number, React.ReactNode> = {
  1: <Trophy className="h-5 w-5 text-yellow-400" />,
  2: <Medal className="h-5 w-5 text-gray-300" />,
  3: <Medal className="h-5 w-5 text-amber-600" />,
};

export default function LeaderboardPage() {
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

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-3">
        {[mockLeaderboard[1], mockLeaderboard[0], mockLeaderboard[2]].map((entry, idx) => {
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
                  <Flame className="h-3 w-3" /> {entry.streak}d streak
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Full leaderboard */}
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
          {mockLeaderboard.map((entry) => (
            <div
              key={entry.rank}
              className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 items-center px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
            >
              <span className="text-sm font-medium w-6 text-center">
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

      <Card className="bg-card border-border">
        <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground text-sm">How Rankings Work</p>
          <p>Learners are ranked primarily by Sadaqah Points (SDQ) earned through consistent, quality recitation practice.</p>
          <p>Streak bonuses and high Quranator scores contribute to climbing the leaderboard. Stay consistent to rise!</p>
          <p className="italic">Note: This leaderboard currently shows sample data. Real-time rankings will be available when cloud sync is enabled.</p>
        </CardContent>
      </Card>
    </div>
  );
}
