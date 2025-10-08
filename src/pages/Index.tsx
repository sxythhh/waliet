import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
const Index = () => {
  const navigate = useNavigate();
  useEffect(() => {
    // Check if user is already logged in and redirect to dashboard
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    // Listen for auth state changes
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  return <div className="relative w-full h-screen overflow-hidden">
      {/* Embedded website */}
      <iframe src="https://www.virality.cc/lander" className="w-full h-full border-0" title="Virality Landing Page" />
      
      {/* Floating auth buttons */}
      <div className="fixed top-6 right-6 flex gap-3 z-50">
        <Button onClick={() => navigate("/auth")} variant="outline" style={{
        letterSpacing: '-0.5px'
      }} className="font-chakra font-semibold tracking-tight backdrop-blur-xl border-0 transition-all duration-300 px-8 shadow-[0_4px_0_0_hsl(var(--muted))] hover:shadow-[0_2px_0_0_hsl(var(--muted))] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none bg-[#181818]/80">
          Login
        </Button>
        <Button onClick={() => navigate("/auth?tab=signup")} className="font-chakra font-semibold tracking-tight backdrop-blur-xl bg-primary hover:bg-primary-glow transition-all duration-300 px-8 shadow-[0_4px_0_0_hsl(var(--primary))] hover:shadow-[0_2px_0_0_hsl(var(--primary)),0_0_20px_hsl(var(--primary)/0.5)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-[0_0_20px_hsl(var(--primary)/0.5)]" style={{
        letterSpacing: '-0.5px'
      }}>
          Create Account
        </Button>
      </div>
    </div>;
};
export default Index;