import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, ShieldCheck } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate("/");
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Account created. You're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen aurora-bg flex items-center justify-center px-4">
      <form onSubmit={submit} className="glass rounded-2xl p-8 w-full max-w-md space-y-5">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 shadow-neon">
            <Eye className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-display text-2xl text-glow gradient-text">Smart Vision Cart</h1>
          <p className="text-xs text-muted-foreground">
            {mode === "signup" ? "Create an account to track orders" : "Sign in to continue"}
          </p>
        </div>
        <div className="space-y-3">
          <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "..." : mode === "signup" ? "Create account" : "Sign in"}
        </Button>
        <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="w-full text-xs text-primary hover:underline">
          {mode === "signin" ? "New here? Create an account" : "Have an account? Sign in"}
        </button>
        <div className="flex justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
          <Link to="/" className="hover:text-primary">← Back to shop</Link>
          <Link to="/admin" className="hover:text-primary inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Worker portal</Link>
        </div>
      </form>
    </div>
  );
}
