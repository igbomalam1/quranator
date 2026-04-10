import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { handleOAuthCallback, demoLogin } from "@/lib/auth";
import { toast } from "sonner";

export default function CallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");

    if (code && state) {
      handleOAuthCallback(code, state).then((success) => {
        if (success) {
          toast.success("Successfully connected with Quran.com!");
          navigate("/dashboard");
        } else {
          toast.error("OAuth failed. Using demo mode.");
          demoLogin();
          navigate("/dashboard");
        }
      });
    } else {
      demoLogin();
      navigate("/dashboard");
    }
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="h-8 w-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-sm text-muted-foreground">Connecting...</p>
      </div>
    </div>
  );
}
