import type { ParaKind } from "@/lib/types";

/**
 * Jev(TypeSafe AI System One 모델)로 스크랩(공유하기) 항목의 PARA 카테고리를 분류한다.
 * TYPESAFE_API_KEY가 없거나 호출이 실패하면 null을 반환 — /api/clip 저장 자체는 항상 성공해야
 * 하므로 이 함수는 절대 throw하지 않는다.
 */

interface ClipInput {
  title: string;
  url: string;
  memo: string | null;
}

export interface ParaContainerRef {
  kind: ParaKind;
  id: string;
  name: string;
}

const NONE_OPTION = "none";
const CONFIDENCE_THRESHOLD = 0.8;

interface ChoiceAnswer {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

interface SystemOneResponse {
  answers: {
    category?: ChoiceAnswer;
  };
}

export async function classifyParaCategory(
  input: ClipInput,
  containers: ParaContainerRef[],
): Promise<{ kind: ParaKind; id: string } | null> {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey || containers.length === 0) return null;

  const criteria: Record<string, string> = { [NONE_OPTION]: "해당하는 프로젝트/영역/자료가 없음" };
  for (const container of containers) {
    criteria[`${container.kind}:${container.id}`] = `${container.name} (${container.kind})`;
  }

  try {
    const res = await fetch("https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        state: { title: input.title, url: input.url, memo: input.memo },
        model: "jev-latest",
        questions: {
          category: {
            type: "choice",
            instructions: "이 항목(제목/URL/메모)이 어느 프로젝트/영역/자료에 속하는지 고르세요. 어울리는 게 없으면 none을 고르세요.",
            criteria,
          },
        },
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error(`Jev classification failed: ${res.status} ${await res.text()}`);
      return null;
    }

    const data = (await res.json()) as SystemOneResponse;
    const answer = data.answers.category;
    if (!answer || answer.choice === NONE_OPTION || answer.confidence < CONFIDENCE_THRESHOLD) {
      return null;
    }

    const [kind, id] = answer.choice.split(":") as [ParaKind, string];
    if (!containers.some((c) => c.kind === kind && c.id === id)) return null;
    return { kind, id };
  } catch (error) {
    console.error("Jev classification error:", error);
    return null;
  }
}
