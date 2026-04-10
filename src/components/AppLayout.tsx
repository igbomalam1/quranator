import { BookOpen, MessageSquare, BarChart3, Bookmark, Flame, LogOut, Menu } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getUser, logout } from "@/lib/auth";
import { getStreakData } from "@/lib/storage";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: BarChart3 },
  { label: "AI Mentor", path: "/chat", icon: MessageSquare },
  { label: "Reflections", path: "/reflections", icon: BookOpen },
  { label: "Bookmarks", path: "/bookmarks", icon: Bookmark },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();
  const streak = getStreakData();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top navbar */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link to="/dashboard" className="font-semibold text-sm tracking-tight">
            Quran AI Mentor
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Flame className="h-4 w-4 text-foreground" />
            <span>{streak.currentStreak}</span>
          </div>
          <div className="relative group">
            <Avatar className="h-8 w-8 cursor-pointer border border-border">
              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                {user?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-md py-1 hidden group-hover:block min-w-[120px]">
              <button
                onClick={() => { logout(); navigate("/"); }}
                className="flex items-center gap-2 px-3 py-2 text-sm w-full hover:bg-secondary transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" /> Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-52 border-r border-border bg-background py-4">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-secondary text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </aside>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background z-50 flex">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
