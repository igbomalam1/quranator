import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isAuthenticated } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import LandingPage from "./pages/LandingPage";
import CallbackPage from "./pages/CallbackPage";
import DashboardPage from "./pages/DashboardPage";
import ChatPage from "./pages/ChatPage";
import ReflectionsPage from "./pages/ReflectionsPage";
import BookmarksPage from "./pages/BookmarksPage";
import QuranReaderPage from "./pages/QuranReaderPage";
import GoalsPage from "./pages/GoalsPage";
import QuranatorPage from "./pages/QuranatorPage";
import QuranatorScorePage from "./pages/QuranatorScorePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/" replace />;
  return <AppLayout>{children}</AppLayout>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner
        position="top-right"
        toastOptions={{
          style: {
            background: "hsl(0 0% 6.7%)",
            border: "1px solid hsl(0 0% 13.3%)",
            color: "hsl(0 0% 100%)",
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/callback" element={<CallbackPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/quran" element={<ProtectedRoute><QuranReaderPage /></ProtectedRoute>} />
          <Route path="/goals" element={<ProtectedRoute><GoalsPage /></ProtectedRoute>} />
          <Route path="/quranator" element={<ProtectedRoute><QuranatorPage /></ProtectedRoute>} />
          <Route path="/quranator-score" element={<ProtectedRoute><QuranatorScorePage /></ProtectedRoute>} />
          <Route path="/reflections" element={<ProtectedRoute><ReflectionsPage /></ProtectedRoute>} />
          <Route path="/bookmarks" element={<ProtectedRoute><BookmarksPage /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
