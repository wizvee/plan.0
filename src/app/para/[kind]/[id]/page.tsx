import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isGoogleConnected } from "@/lib/google-account";
import { ContainerDetailScreen } from "@/components/para/container-detail-screen";
import { PARA_KINDS, type ParaKind } from "@/lib/types";

interface ParaDetailPageProps {
  params: Promise<{ kind: string; id: string }>;
}

export default async function ParaDetailPage({ params }: ParaDetailPageProps) {
  const { kind, id } = await params;

  if (!PARA_KINDS.includes(kind as ParaKind)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const googleConnected = await isGoogleConnected(supabase, user.id);

  return (
    <ContainerDetailScreen
      kind={kind as ParaKind}
      id={id}
      userId={user.id}
      userEmail={user.email ?? ""}
      googleConnected={googleConnected}
    />
  );
}
