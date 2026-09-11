"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.replace("/");
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setNotice("가입 확인 이메일을 보냈어요. 메일함을 확인한 뒤 로그인해주세요.");
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-[0_1px_1px_rgba(0,0,0,0.03)] ring-1 ring-border">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">주간 Todo Planner</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {mode === "signin" ? "로그인해서 계속하기" : "계정 만들기"}
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            type="email"
            required
            autoComplete="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {notice ? <p className="text-sm text-primary">{notice}</p> : null}
          <Button type="submit" disabled={loading} className="mt-1">
            {loading ? "처리 중..." : mode === "signin" ? "로그인" : "가입하기"}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "signin" ? "signup" : "signin"));
            setError(null);
            setNotice(null);
          }}
          className="mt-4 w-full text-center text-sm text-primary"
        >
          {mode === "signin" ? "계정이 없으신가요? 가입하기" : "이미 계정이 있으신가요? 로그인"}
        </button>
      </div>
    </div>
  );
}
