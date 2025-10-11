import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
export default function BrandAuth() {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    phoneNumber: "",
    firstName: ""
  });
  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    // Listen for auth changes
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const {
        error
      } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: formData.firstName,
            phone_number: formData.phoneNumber,
            account_type: 'brand'
          }
        }
      });
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Brand account created successfully! Please check your email to confirm your account."
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        

        <Card className="border-primary/20 shadow-xl backdrop-blur-sm bg-card/95">
          <form onSubmit={handleSignUp}>
            <CardContent className="space-y-5 pt-6">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-foreground/90">First Name</Label>
                <Input id="firstName" type="text" placeholder="Enter your first name" value={formData.firstName} onChange={e => setFormData({
                ...formData,
                firstName: e.target.value
              })} required className="h-11" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground/90">Email</Label>
                <Input id="email" type="email" placeholder="brand@example.com" value={formData.email} onChange={e => setFormData({
                ...formData,
                email: e.target.value
              })} required className="h-11" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-foreground/90">Phone Number</Label>
                <Input id="phoneNumber" type="tel" placeholder="+1 (555) 000-0000" value={formData.phoneNumber} onChange={e => setFormData({
                ...formData,
                phoneNumber: e.target.value
              })} required className="h-11" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground/90">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="Create a secure password" value={formData.password} onChange={e => setFormData({
                  ...formData,
                  password: e.target.value
                })} required className="h-11 pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pb-6">
              <Button type="submit" className="w-full h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg" disabled={loading}>
                {loading ? "Creating account..." : "Create Brand Account"}
              </Button>

              <div className="flex items-center gap-4 w-full">
                <div className="h-px flex-1 bg-border"></div>
                <span className="text-xs text-muted-foreground">OR</span>
                <div className="h-px flex-1 bg-border"></div>
              </div>

              <div className="text-center text-sm space-y-2">
                <div className="text-muted-foreground">
                  Already have an account?{" "}
                  <a href="/auth" className="text-primary hover:underline font-medium">
                    Sign in
                  </a>
                </div>

                <div className="text-muted-foreground">
                  Are you a creator?{" "}
                  <a href="/auth?tab=signup" className="text-primary hover:underline font-medium">
                    Create creator account
                  </a>
                </div>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>;
}