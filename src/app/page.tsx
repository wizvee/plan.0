import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isGoogleConnected } from "@/lib/google-account";
import { WeekBoard } from "@/components/week-board";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const googleConnected = await isGoogleConnected(supabase, user.id);

  return <WeekBoard userId={user.id} userEmail={user.email ?? ""} googleConnected={googleConnected} />;
}
