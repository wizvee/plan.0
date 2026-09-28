import { notFound } from "next/navigation";

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

  return <ContainerDetailScreen kind={kind as ParaKind} id={id} />;
}
