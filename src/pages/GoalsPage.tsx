import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Target, Plus, Trash2, Check, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getStreakData } from "@/lib/storage";
import { streamChatMessage } from "@/lib/gemini";
import { supabase } from "@/integrations/supabase/client";
import { getUser } from "@/lib/auth";

export interface Goal {
  id: string;
  title: string;
  targetPerDay: number;
  completedToday: number;
  lastUpdated: string;
  createdAt: string;
  pledgeAccepted: boolean;
}

const AI_GOAL_SUGGESTIONS = [
  { title: "Read 5 pages of Quran daily", target: 5 },
  { title: "Memorize 3 new ayahs", target: 3 },
  { title: "Listen to 2 tafsir sessions", target: 2 },
  { title: "Write 1 Quran reflection", target: 1 },
  { title: "Review 10 previously memorized ayahs", target: 10 },
  { title: "Learn 5 new Arabic vocabulary words", target: 5 },
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newTarget, setNewTarget] = useState("5");
  const [showForm, setShowForm] = useState(false);
  const [showPledge, setShowPledge] = useState(false);
  const [pledgeAccepted, setPledgeAccepted] = useState(false);
  const [pendingGoal, setPendingGoal] = useState<{ title: string; target: number } | null>(null);
  const [showDonationReminder, setShowDonationReminder] = useState(false);
  const [missedDays, setMissedDays] = useState(0);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [aiGoals, setAiGoals] = useState<{ title: string; target: number }[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    const fetchGoals = async () => {
      const email = getUser()?.email || "demo@quranai.app";
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_email", email)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching goals:", error);
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const parsedGoals: Goal[] = (data || []).map((g: any) => {
        // Reset completed count if it's a new day
        let completedToday = g.completed_today;
        if (g.last_updated !== today) {
          completedToday = 0;
          supabase
            .from("goals")
            .update({ completed_today: 0, last_updated: today })
            .eq("id", g.id)
            .then(({ error: err }) => {
              if (err) console.error("Error resetting goal count:", err);
            });
        }

        return {
          id: g.id,
          title: g.title,
          targetPerDay: g.target_per_day,
          completedToday,
          lastUpdated: today,
          createdAt: g.created_at,
          pledgeAccepted: g.pledge_accepted,
        };
      });

      setGoals(parsedGoals);
    };

    fetchGoals();

    // Check for missed streak days
    getStreakData().then((streak) => {
      if (streak.lastActiveDate) {
        const lastActive = new Date(streak.lastActiveDate);
        const today = new Date();
        const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / 86400000);
        if (diffDays > 1) {
          setMissedDays(diffDays - 1);
          setShowDonationReminder(true);
        }
      }
    });
  }, []);

  const initiateGoalCreation = (title: string, target: number) => {
    setPendingGoal({ title, target });
    setPledgeAccepted(false);
    setShowPledge(true);
  };

  const confirmGoalCreation = async () => {
    if (!pledgeAccepted || !pendingGoal) return;
    const email = getUser()?.email || "demo@quranai.app";
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("goals")
      .insert({
        user_email: email,
        title: pendingGoal.title,
        target_per_day: Math.max(1, pendingGoal.target),
        completed_today: 0,
        last_updated: today,
        pledge_accepted: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating goal:", error);
      toast.error("Failed to create goal");
      return;
    }

    const goal: Goal = {
      id: data.id,
      title: data.title,
      targetPerDay: data.target_per_day,
      completedToday: data.completed_today,
      lastUpdated: data.last_updated,
      createdAt: data.created_at,
      pledgeAccepted: data.pledge_accepted,
    };

    setGoals([goal, ...goals]);
    setNewTitle("");
    setNewTarget("5");
    setShowForm(false);
    setShowPledge(false);
    setPendingGoal(null);
    setShowAiSuggestions(false);
    toast.success("Goal created with Sadaqah pledge! 🤲");
  };

  const handleAddGoal = () => {
    if (!newTitle.trim()) return;
    initiateGoalCreation(newTitle.trim(), Math.max(1, parseInt(newTarget) || 5));
  };

  const increment = async (id: string) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;

    const newCount = Math.min(goal.completedToday + 1, goal.targetPerDay);
    const today = new Date().toISOString().split("T")[0];

    const { error } = await supabase
      .from("goals")
      .update({ completed_today: newCount, last_updated: today })
      .eq("id", id);

    if (error) {
      console.error("Error updating goal:", error);
      return;
    }

    if (newCount === goal.targetPerDay && goal.completedToday < goal.targetPerDay) {
      toast.success(`🎉 Goal "${goal.title}" completed for today!`);
    }

    setGoals(goals.map((g) => g.id === id ? { ...g, completedToday: newCount, lastUpdated: today } : g));
  };

  const removeGoal = async (id: string) => {
    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting goal:", error);
      return;
    }

    setGoals(goals.filter((g) => g.id !== id));
    toast.success("Goal removed");
  };

  const fetchAiGoals = async () => {
    setLoadingAi(true);
    setShowAiSuggestions(true);
    try {
      let result = "";
      await streamChatMessage(
        "Suggest 4 personalized daily Quran study goals with specific numeric targets. Return ONLY a JSON array like: [{\"title\":\"...\",\"target\":3}]. No extra text.",
        [],
        (chunk) => { result += chunk; },
        () => {},
      );
      const match = result.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setAiGoals(parsed.slice(0, 4));
      } else {
        setAiGoals(AI_GOAL_SUGGESTIONS.slice(0, 4));
      }
    } catch {
      setAiGoals(AI_GOAL_SUGGESTIONS.slice(0, 4));
    } finally {
      setLoadingAi(false);
    }
  };

  const totalTarget = goals.reduce((s, g) => s + g.targetPerDay, 0);
  const totalDone = goals.reduce((s, g) => s + g.completedToday, 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Goals</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchAiGoals} className="gap-1">
            <Sparkles className="h-3.5 w-3.5" /> AI Suggest
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> New Goal
          </Button>
        </div>
      </div>

      {/* Overall progress */}
      {goals.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Today's Progress</span>
              <span className="text-sm text-muted-foreground">{totalDone}/{totalTarget}</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">{overallProgress}% complete</p>
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions */}
      {showAiSuggestions && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> AI-Suggested Goals
            </h3>
            {loadingAi ? (
              <div className="flex items-center justify-center py-6">
                <div className="h-5 w-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(aiGoals.length > 0 ? aiGoals : AI_GOAL_SUGGESTIONS.slice(0, 4)).map((sg, i) => (
                  <button
                    key={i}
                    onClick={() => initiateGoalCreation(sg.title, sg.target)}
                    className="text-left text-sm px-4 py-3 rounded-lg border border-border hover:bg-secondary transition-colors"
                  >
                    <p className="font-medium">{sg.title}</p>
                    <p className="text-xs text-muted-foreground">Target: {sg.target}/day</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add form */}
      {showForm && (
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-3">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g., Read 5 pages of Quran"
              className="bg-background border-border"
            />
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Daily target:</span>
              <Input
                type="number"
                min="1"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                className="bg-background border-border w-20"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddGoal}>Create</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goals list */}
      {goals.length === 0 && !showForm && !showAiSuggestions && (
        <div className="text-center py-16">
          <Target className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground text-sm mb-4">No goals yet. Set a daily reading target to get started.</p>
          <Button variant="outline" size="sm" onClick={fetchAiGoals} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Get AI Suggestions
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {goals.map((g) => {
          const pct = Math.round((g.completedToday / g.targetPerDay) * 100);
          const done = g.completedToday >= g.targetPerDay;
          return (
            <Card key={g.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
                      {g.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{g.completedToday}/{g.targetPerDay} today</p>
                  </div>
                  <div className="flex gap-1">
                    {!done && (
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => increment(g.id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => removeGoal(g.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <Progress value={pct} className="h-1.5" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sadaqah Pledge Dialog */}
      <Dialog open={showPledge} onOpenChange={setShowPledge}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Sadaqah Pledge 🤲
            </DialogTitle>
            <DialogDescription className="text-left space-y-3 pt-2">
              <p>
                By creating this goal, you are making a sincere commitment to your Quran journey.
              </p>
              <p className="font-medium text-foreground">
                If you intentionally miss this goal, you are mandated to donate Sadaqah worth $5 to the needy in your area — fii sabilillah.
              </p>
              <p className="text-xs">
                Donations go straight to Quran.com who will facilitate the outreach, but this hasn't been implemented yet — so you are mandated to do Sadaqah worth $5 in your area sincerely from your heart.
              </p>
              <p className="text-xs text-muted-foreground">
                We do not collect any money as developers. This is purely between you and Allah ﷻ.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 py-2">
            <Checkbox
              id="pledge"
              checked={pledgeAccepted}
              onCheckedChange={(checked) => setPledgeAccepted(checked === true)}
            />
            <label htmlFor="pledge" className="text-sm leading-relaxed cursor-pointer">
              I understand and accept the Sadaqah pledge. I commit to fulfilling my goal or giving Sadaqah if I miss it.
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPledge(false)}>Cancel</Button>
            <Button onClick={confirmGoalCreation} disabled={!pledgeAccepted}>
              Accept & Create Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Missed Streak Donation Reminder */}
      <Dialog open={showDonationReminder} onOpenChange={setShowDonationReminder}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Streak Missed — Sadaqah Reminder 🤲
            </DialogTitle>
            <DialogDescription className="text-left space-y-3 pt-2">
              <p>
                You missed <strong className="text-foreground">{missedDays} day{missedDays > 1 ? "s" : ""}</strong> of your streak.
              </p>
              <p className="font-medium text-foreground">
                As per your pledge, you are encouraged to donate Sadaqah worth ${missedDays * 5} (${missedDays} × $5) to the needy in your area — fii sabilillah.
              </p>
              <p className="text-xs text-muted-foreground">
                This is a sincere commitment between you and Allah ﷻ. We do not collect any money. Please donate locally to those in need.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowDonationReminder(false)}>
              I will fulfill my Sadaqah, In Shaa Allah 🤲
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
