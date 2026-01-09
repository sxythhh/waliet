import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Cache admin status to prevent redundant queries
const adminCache = new Map<string, boolean>();

export const useAdminCheck = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastCheckedUserId = useRef<string | null>(null);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // No user = not admin
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      lastCheckedUserId.current = null;
      return;
    }

    // Skip if we already checked this user
    if (lastCheckedUserId.current === user.id) {
      return;
    }

    // Check cache first
    if (adminCache.has(user.id)) {
      setIsAdmin(adminCache.get(user.id)!);
      setLoading(false);
      lastCheckedUserId.current = user.id;
      return;
    }

    const checkAdmin = async () => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (error) throw error;

        const adminStatus = !!data;
        adminCache.set(user.id, adminStatus);
        setIsAdmin(adminStatus);
        lastCheckedUserId.current = user.id;
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [user, authLoading]);

  return { isAdmin, loading: loading || authLoading };
};
