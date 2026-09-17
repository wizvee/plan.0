import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ParaBoard } from "@/components/para-board";

export default async function ParaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <ParaBoard userId={user.id} userEmail={user.email ?? ""} />;
}
