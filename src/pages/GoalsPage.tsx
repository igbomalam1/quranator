import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

export interface Goal {
  id: string;
  title: string;
  targetPerDay: number;
  completedToday: number;
  lastUpdated: string;
  createdAt: string;
}

function getGoals(): Goal[] {
  return JSON.parse(localStorage.getItem("goals") || "[]");
}

function saveGoals(goals: Goal[]) {
  localStorage.setItem("goals", JSON.stringify(goals));
}

function resetIfNewDay(goals: Goal[]): Goal[] {
  const today = new Date().toISOString().split("T")[0];
  let changed = false;
  const updated = goals.map((g) => {
    if (g.lastUpdated !== today) {
      changed = true;
      return { ...g, completedToday: 0, lastUpdated: today };
    }
    return g;
  });
  if (changed) saveGoals(updated);
  return updated;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newTarget, setNewTarget] = useState("5");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setGoals(resetIfNewDay(getGoals()));
  }, []);

  const addGoal = () => {
    if (!newTitle.trim()) return;
    const goal: Goal = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      targetPerDay: Math.max(1, parseInt(newTarget) || 5),
      completedToday: 0,
      lastUpdated: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
    };
    const updated = [goal, ...goals];
    saveGoals(updated);
    setGoals(updated);
    setNewTitle("");
    setNewTarget("5");
    setShowForm(false);
    toast.success("Goal created!");
  };

  const increment = (id: string) => {
    const updated = goals.map((g) => {
      if (g.id !== id) return g;
      const newCount = Math.min(g.completedToday + 1, g.targetPerDay);
      if (newCount === g.targetPerDay && g.completedToday < g.targetPerDay) {
        toast.success(`🎉 Goal "${g.title}" completed for today!`);
      }
      return { ...g, completedToday: newCount, lastUpdated: new Date().toISOString().split("T")[0] };
    });
    saveGoals(updated);
    setGoals(updated);
  };

  const removeGoal = (id: string) => {
    const updated = goals.filter((g) => g.id !== id);
    saveGoals(updated);
    setGoals(updated);
    toast.success("Goal removed");
  };

  const totalTarget = goals.reduce((s, g) => s + g.targetPerDay, 0);
  const totalDone = goals.reduce((s, g) => s + g.completedToday, 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Goals</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> New Goal
        </Button>
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
              <Button size="sm" onClick={addGoal}>Create</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goals list */}
      {goals.length === 0 && !showForm && (
        <div className="text-center py-16">
          <Target className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">No goals yet. Set a daily reading target to get started.</p>
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
    </div>
  );
}
