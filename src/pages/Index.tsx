import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in and redirect to dashboard
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Embedded website */}
      <iframe
        src="https://www.virality.cc/lander"
        className="w-full h-full border-0"
        title="Virality Landing Page"
      />
      
      {/* Floating auth buttons */}
      <div className="fixed top-6 right-6 flex gap-3 z-50">
        <Button
          onClick={() => navigate("/auth")}
          variant="outline"
          className="font-chakra font-semibold tracking-tight backdrop-blur-xl bg-card/80 border-0 hover:bg-card/90 transition-all duration-300"
          style={{ letterSpacing: '-0.5px' }}
        >
          Login
        </Button>
        <Button
          onClick={() => navigate("/auth")}
          className="font-chakra font-semibold tracking-tight backdrop-blur-xl bg-primary hover:bg-primary-glow transition-all duration-300"
          style={{ letterSpacing: '-0.5px' }}
        >
          Sign Up
        </Button>
      </div>
    </div>
  );
};

export default Index;
