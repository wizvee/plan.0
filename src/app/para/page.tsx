import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isGoogleConnected } from "@/lib/google-account";
import { ParaBoard } from "@/components/para-board";

export default async function ParaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const googleConnected = await isGoogleConnected(supabase, user.id);

  return <ParaBoard userId={user.id} userEmail={user.email ?? ""} googleConnected={googleConnected} />;
}
