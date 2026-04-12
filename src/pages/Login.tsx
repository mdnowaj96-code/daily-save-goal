import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, UserPlus, Loader2 } from "lucide-react";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("ইমেইল এবং পাসওয়ার্ড দিন");
      return;
    }
    setLoading(true);
    setError("");

    const { error: authError } = isSignUp
      ? await signUp(email.trim(), password)
      : await signIn(email.trim(), password);

    if (authError) {
      setError(isSignUp ? "রেজিস্ট্রেশন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।" : "ইমেইল বা পাসওয়ার্ড ভুল হয়েছে");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            {isSignUp ? <UserPlus className="h-7 w-7 text-primary" /> : <LogIn className="h-7 w-7 text-primary" />}
          </div>
          <CardTitle className="text-xl">খরচের হিসাব</CardTitle>
          <CardDescription>
            {isSignUp ? "নতুন অ্যাকাউন্ট তৈরি করুন" : "আপনার অ্যাকাউন্টে লগইন করুন"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="ইমেইল"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
              />
              <Input
                type="password"
                placeholder="পাসওয়ার্ড"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
              />
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isSignUp ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              {isSignUp ? "রেজিস্টার" : "লগইন"}
            </Button>
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSignUp ? "ইতোমধ্যে অ্যাকাউন্ট আছে? লগইন করুন" : "নতুন অ্যাকাউন্ট তৈরি করুন"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
