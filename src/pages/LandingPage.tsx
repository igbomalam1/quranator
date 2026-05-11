import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, MessageSquare, BarChart3, Bookmark, ArrowRight, ChevronDown, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { initiateOAuth, demoLogin, isAuthenticated, REDIRECT_URI } from "@/lib/auth";
import { useEffect } from "react";

const features = [
  { icon: BookOpen, title: "Daily Ayah", desc: "Start each day with a personalized verse and audio recitation" },
  { icon: MessageSquare, title: "AI Mentor Chat", desc: "Ask anything about the Quran — grounded in real verses and tafsir" },
  { icon: BarChart3, title: "Habit Dashboard", desc: "Track your streaks, goals, and reading sessions over time" },
  { icon: Bookmark, title: "Reflections & Bookmarks", desc: "Save verses, write reflections, and build your personal collection" },
];

const steps = [
  { num: "01", title: "Connect", desc: "Sign in with your Quran.com account" },
  { num: "02", title: "Explore", desc: "Chat with AI, read daily verses, and take notes" },
  { num: "03", title: "Grow", desc: "Build habits and deepen your relationship with the Quran" },
];

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) navigate("/dashboard");
  }, [navigate]);

  const handleProductionLogin = () => {
    // Reverting back to production endpoint channel as requested
    initiateOAuth(false);
  };

  const handleDemoBypass = () => {
    demoLogin();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <span className="font-semibold text-sm tracking-tight">Quranator</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate("/docs")}>
            <FileText className="h-3.5 w-3.5" /> Docs
          </Button>
          <Button variant="outline" size="sm" onClick={handleProductionLogin}>
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24 md:py-32 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight text-balance">
          Your Personal Quran AI Tutor
        </h1>
        <p className="mt-4 text-muted-foreground text-lg max-w-xl text-balance">
          Chat with an AI grounded in the real Quran. Build lifelong habits. Track your journey.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center justify-center">
          <Button size="lg" onClick={handleProductionLogin} className="gap-2">
            Connect with Quran.com
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="ghost" onClick={handleDemoBypass} className="text-muted-foreground hover:text-foreground">
            Demo Bypass
          </Button>
        </div>

        <button
          onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
          className="mt-16 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </button>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold text-center mb-12">Everything you need</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <Card key={f.title} className="bg-card border-border">
              <CardContent className="p-6">
                <f.icon className="h-5 w-5 mb-3 text-muted-foreground" />
                <h3 className="font-medium mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 max-w-3xl mx-auto border-t border-border">
        <h2 className="text-2xl font-semibold text-center mb-12">How it works</h2>
        <div className="space-y-8">
          {steps.map((s) => (
            <div key={s.num} className="flex gap-4 items-start">
              <span className="text-2xl font-bold text-muted-foreground/40 shrink-0">{s.num}</span>
              <div>
                <h3 className="font-medium">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Button size="lg" onClick={handleProductionLogin} className="gap-2">
            Get Started <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>


    </div>
  );
}
