import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { login, hasRegistered } from "@/lib/store";
import { LogIn, UserPlus } from "lucide-react";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const registered = hasRegistered();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !password.trim()) {
      setError("ইউজার আইডি এবং পাসওয়ার্ড দিন");
      return;
    }
    if (login(userId.trim(), password)) {
      onLogin();
    } else {
      setError("ইউজার আইডি বা পাসওয়ার্ড ভুল হয়েছে");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <LogIn className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-xl">খরচের হিসাব</CardTitle>
          <CardDescription>
            {registered ? "আপনার অ্যাকাউন্টে লগইন করুন" : "নতুন অ্যাকাউন্ট তৈরি করুন"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Input
                placeholder="ইউজার আইডি"
                value={userId}
                onChange={(e) => { setUserId(e.target.value); setError(""); }}
              />
              <Input
                type="password"
                placeholder="পাসওয়ার্ড"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
              />
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button type="submit" className="w-full gap-2">
              {registered ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {registered ? "লগইন" : "রেজিস্টার ও লগইন"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
