import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { WeekBoard } from "@/components/week-board";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <WeekBoard userId={user.id} userEmail={user.email ?? ""} />;
}
