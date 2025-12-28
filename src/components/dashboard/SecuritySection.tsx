import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Laptop, Smartphone, Tablet, Monitor, Lock, LogOut, Loader2, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
interface UserSession {
  id: string;
  session_id: string;
  device_type: string | null;
  os: string | null;
  browser: string | null;
  browser_version: string | null;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  is_current: boolean;
  last_active_at: string;
  created_at: string;
}
export function SecuritySection() {
  const {
    user,
    session
  } = useAuth();
  const {
    toast
  } = useToast();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReset, setSendingReset] = useState(false);
  const [signingOut, setSigningOut] = useState<string | null>(null);
  useEffect(() => {
    fetchSessions();
  }, [user]);
  const fetchSessions = async () => {
    if (!user) return;
    try {
      const {
        data,
        error
      } = await supabase.from("user_sessions").select("*").eq("user_id", user.id).order("last_active_at", {
        ascending: false
      });
      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleSetPassword = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "No email found for your account",
        variant: "destructive"
      });
      return;
    }
    setSendingReset(true);
    try {
      const {
        error
      } = await supabase.functions.invoke("send-password-reset", {
        body: {
          email: user.email
        }
      });
      if (error) throw error;
      toast({
        title: "Password reset email sent",
        description: "Check your inbox for instructions to set your password"
      });
    } catch (error) {
      console.error("Error sending password reset:", error);
      toast({
        title: "Error",
        description: "Failed to send password reset email",
        variant: "destructive"
      });
    } finally {
      setSendingReset(false);
    }
  };
  const handleSignOutSession = async (sessionToRemove: UserSession) => {
    if (sessionToRemove.is_current) {
      // Sign out current session
      await supabase.auth.signOut();
      return;
    }
    setSigningOut(sessionToRemove.id);
    try {
      const {
        error
      } = await supabase.from("user_sessions").delete().eq("id", sessionToRemove.id);
      if (error) throw error;
      setSessions(sessions.filter(s => s.id !== sessionToRemove.id));
      toast({
        title: "Session removed",
        description: "The device has been signed out"
      });
    } catch (error) {
      console.error("Error removing session:", error);
      toast({
        title: "Error",
        description: "Failed to remove session",
        variant: "destructive"
      });
    } finally {
      setSigningOut(null);
    }
  };
  const handleSignOutAllOther = async () => {
    const otherSessions = sessions.filter(s => !s.is_current);
    if (otherSessions.length === 0) return;
    try {
      const {
        error
      } = await supabase.from("user_sessions").delete().eq("user_id", user?.id).eq("is_current", false);
      if (error) throw error;
      setSessions(sessions.filter(s => s.is_current));
      toast({
        title: "All other sessions removed",
        description: "You've been signed out from all other devices"
      });
    } catch (error) {
      console.error("Error signing out all sessions:", error);
      toast({
        title: "Error",
        description: "Failed to sign out from other devices",
        variant: "destructive"
      });
    }
  };
  const getDeviceIcon = (deviceType: string | null, os: string | null) => {
    if (deviceType === "Mobile" || os === "iOS" || os === "Android") {
      return <Smartphone className="h-5 w-5" />;
    }
    if (deviceType === "Tablet") {
      return <Tablet className="h-5 w-5" />;
    }
    if (os === "macOS") {
      return <Laptop className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };
  const getDeviceName = (session: UserSession): string => {
    const {
      os,
      device_type
    } = session;
    if (os === "macOS") return "Macintosh";
    if (os === "Windows") return "Windows PC";
    if (os === "iOS" && device_type === "Mobile") return "iPhone";
    if (os === "iOS" && device_type === "Tablet") return "iPad";
    if (os === "Android" && device_type === "Mobile") return "Android Phone";
    if (os === "Android" && device_type === "Tablet") return "Android Tablet";
    if (os === "Linux") return "Linux PC";
    if (os === "Chrome OS") return "Chromebook";
    return os || "Unknown Device";
  };
  const formatLastActive = (lastActive: string): string => {
    return formatDistanceToNow(new Date(lastActive), {
      addSuffix: true
    });
  };
  const getLocationDisplay = (session: UserSession): string | null => {
    if (session.city && session.country) {
      return `${session.city}, ${session.country}`;
    }
    if (session.country) {
      return session.country;
    }
    return null;
  };
  if (loading) {
    return <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-6">
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-4 w-64 mb-4" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>;
  }
  return <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-0">
        <h3 className="text-base font-semibold text-foreground mb-1" style={{
        fontFamily: "Inter",
        letterSpacing: "-0.3px"
      }}>
          Security
        </h3>
        <p className="text-sm text-muted-foreground mb-4" style={{
        fontFamily: "Inter",
        letterSpacing: "-0.3px"
      }}>
          Manage your password and view devices where you're signed in
        </p>
      </div>

      {/* Content */}
      <div className="px-6 pb-6 space-y-6">
        {/* Password Section */}
        <div className="flex items-center justify-between p-4 rounded-lg border px-0 py-0 bg-[#1f1f1f]/0 border-[#141414]/0">
          <div className="flex items-center gap-3">
            
            <div>
              <p className="font-medium text-sm" style={{
              fontFamily: "Inter",
              letterSpacing: "-0.3px"
            }}>Password</p>
              <p className="text-xs text-muted-foreground" style={{
              fontFamily: "Inter",
              letterSpacing: "-0.3px"
            }}>
                Set or update your password
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleSetPassword} disabled={sendingReset} className="border-transparent hover:bg-muted text-foreground hover:text-foreground" style={{
          fontFamily: "Inter",
          letterSpacing: "-0.3px"
        }}>
            {sendingReset ? <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Sending...
              </> : "Reset password"}
          </Button>
        </div>

        {/* Active Devices Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm" style={{
            fontFamily: "Inter",
            letterSpacing: "-0.3px"
          }}>Active Devices</h4>
            {sessions.filter(s => !s.is_current).length > 0 && <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 text-xs" onClick={handleSignOutAllOther} style={{
            fontFamily: "Inter",
            letterSpacing: "-0.3px"
          }}>
                Sign out all other devices
              </Button>}
          </div>

          <div className="space-y-2">
            {sessions.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center" style={{
            fontFamily: "Inter",
            letterSpacing: "-0.3px"
          }}>
                No active sessions found
              </p> : sessions.map(sessionItem => <div key={sessionItem.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-background border border-border mt-0.5">
                      {getDeviceIcon(sessionItem.device_type, sessionItem.os)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm" style={{
                    fontFamily: "Inter",
                    letterSpacing: "-0.3px"
                  }}>
                          {getDeviceName(sessionItem)}
                        </p>
                        {sessionItem.is_current && <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary/10 text-primary" style={{ fontFamily: "Inter", letterSpacing: "-0.5px" }}>
                            This device
                          </span>}
                      </div>
                      <p className="text-xs text-muted-foreground" style={{
                  fontFamily: "Inter",
                  letterSpacing: "-0.3px"
                }}>
                        {sessionItem.browser}
                        {sessionItem.browser_version && ` ${sessionItem.browser_version}`}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground" style={{
                  fontFamily: "Inter",
                  letterSpacing: "-0.3px"
                }}>
                        {getLocationDisplay(sessionItem) && <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {getLocationDisplay(sessionItem)}
                          </span>}
                        <span>Active {formatLastActive(sessionItem.last_active_at)}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleSignOutSession(sessionItem)} disabled={signingOut === sessionItem.id}>
                    {signingOut === sessionItem.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  </Button>
                </div>)}
          </div>
        </div>
      </div>
    </div>;
}