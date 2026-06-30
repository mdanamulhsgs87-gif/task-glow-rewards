import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    let active = true;
    const fallbackTimer = window.setTimeout(() => setShowFallback(true), 1200);

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      navigate({ to: data.session ? "/home" : "/auth", replace: true });
    });

    return () => {
      active = false;
      window.clearTimeout(fallbackTimer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="glass w-full max-w-sm rounded-2xl p-6 text-center">
        <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-cyan" />
        <h1 className="text-lg font-black text-cyan">FaceMine</h1>
        <p className="mt-1 text-xs text-muted-foreground">App load hocche...</p>
        {showFallback && (
          <Link to="/auth" className="gradient-cta mt-4 inline-flex rounded-xl px-4 py-2 text-xs font-black">
            Login page khulun
          </Link>
        )}
      </div>
    </div>
  );
}
