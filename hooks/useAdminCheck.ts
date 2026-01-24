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

    const checkAdmin = async () => {
      // Get user ID from context or fetch directly if context is stale
      let userId = user?.id;

      if (!userId) {
        // Context might be stale - fetch session directly
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id;
      }

      // No user = not admin
      if (!userId) {
        setIsAdmin(false);
        setLoading(false);
        lastCheckedUserId.current = null;
        return;
      }

      // Skip if we already checked this user
      if (lastCheckedUserId.current === userId) {
        setLoading(false);
        return;
      }

      // Check cache first
      if (adminCache.has(userId)) {
        setIsAdmin(adminCache.get(userId)!);
        setLoading(false);
        lastCheckedUserId.current = userId;
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();

        if (error) throw error;

        const adminStatus = !!data;
        adminCache.set(userId, adminStatus);
        setIsAdmin(adminStatus);
        lastCheckedUserId.current = userId;
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
