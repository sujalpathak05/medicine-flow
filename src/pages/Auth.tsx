import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [pharmacyName, setPharmacyName] = useState("Sharma Pharmacy");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in successfully!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              pharmacy_name: pharmacyName.trim() || "Sharma Pharmacy",
            },
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to confirm.");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
            <Pill className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Sharma Pharmacy</h1>
            <p className="text-xs text-muted-foreground">Medicine Management System</p>
          </div>
        </div>

        <Card className="glass-card">
          <CardHeader className="text-center">
            <CardTitle className="font-display">{isLogin ? "Welcome Back" : "Create Account"}</CardTitle>
            <CardDescription>
              {isLogin ? "Sign in to manage your inventory" : "Set up your new pharmacy workspace"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Dr. John Smith"
                      required={!isLogin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pharmacyName">Pharmacy Name</Label>
                    <Input
                      id="pharmacyName"
                      value={pharmacyName}
                      onChange={(e) => setPharmacyName(e.target.value)}
                      placeholder="Sharma Pharmacy"
                      required={!isLogin}
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-primary hover:underline"
              >
                {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
