import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AppDataProvider } from "@/lib/app-data/app-data-provider";
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

  return (
    <AppDataProvider userId={user.id}>
      <ParaBoard userEmail={user.email ?? ""} googleConnected={googleConnected} />
    </AppDataProvider>
  );
}
