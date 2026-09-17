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
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute left-6 top-6 flex items-center gap-2 sm:left-10 sm:top-10">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M5 12.5l4.5 4.5L19 7" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-[14px] font-bold text-muted-foreground">주간 Todo Planner</span>
      </div>

      <div className="flex w-full max-w-[340px] flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-[25px] font-bold tracking-tight">
            {mode === "signin" ? "다시 오신 걸 환영해요" : "계정 만들기"}
          </h1>
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            {mode === "signin" ? "이번 주 할 일, 어디까지 했는지 볼까요?" : "개인용 계정을 만들어요"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
          <div className="flex flex-col gap-[22px]">
            <Input
              type="email"
              required
              autoComplete="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-auto rounded-none border-0 border-b border-input bg-transparent px-0.5 pb-2.5 text-[15px] shadow-none focus-visible:border-primary focus-visible:ring-0"
            />
            <Input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="비밀번호 (6자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-auto rounded-none border-0 border-b border-input bg-transparent px-0.5 pb-2.5 text-[15px] shadow-none focus-visible:border-primary focus-visible:ring-0"
            />
          </div>

          {error ? <p className="text-[13.5px] text-destructive">{error}</p> : null}
          {notice ? <p className="text-[13.5px] text-primary">{notice}</p> : null}

          <Button type="submit" disabled={loading} className="h-[46px] w-full text-[14.5px] font-bold">
            {loading ? "처리 중..." : mode === "signin" ? "로그인" : "가입하기"}
          </Button>
        </form>

        {/* 개인용으로만 쓸 계획이라 가입 버튼은 막아둠. 다시 열려면 아래 주석 해제. */}
        {/* <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "signin" ? "signup" : "signin"));
            setError(null);
            setNotice(null);
          }}
          className="text-center text-[13.5px] text-muted-foreground"
        >
          {mode === "signin" ? "계정이 없으신가요? 가입하기" : "이미 계정이 있으신가요? 로그인"}
        </button> */}
      </div>
    </div>
  );
}
