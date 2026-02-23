import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { supabase } from "./_supabase.js";
import questionsData from "../src/data/questions.json" with { type: "json" };

interface QuestionData {
  id: number;
  title: string;
}

const questions = questionsData as QuestionData[];

const POPULAR_MIN_LIKES = 5;
const POOL_SIZE = 200;
const RETURN_COUNT = 5; // 클라이언트가 자기 오답 필터 후 최대 3개 표시하므로 여유 있게 반환

const querySchema = z.object({
  userUuid: z.string().uuid("userUuid 가 올바른 UUID 형식이 아닙니다."),
});

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { userUuid } = parsed.data;

  // 최근 wrong_answers 풀 조회
  const { data: wrongAnswers, error } = await supabase
    .from("wrong_answers")
    .select("id, question_id, user_uuid, answer_tokens")
    .order("created_at", { ascending: false })
    .limit(POOL_SIZE);

  if (error) {
    console.error("[featured-wrong-answers] DB error:", error);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }

  if (!wrongAnswers || wrongAnswers.length === 0) {
    return res.status(200).json({ popular: [], random: [] });
  }

  // 해당 오답들의 좋아요 조회
  const waIds = wrongAnswers.map((wa) => wa.id);
  const { data: likes } = await supabase
    .from("likes")
    .select("wrong_answer_id, user_uuid")
    .in("wrong_answer_id", waIds);

  const likesData = likes ?? [];

  // 문제 제목 맵
  const titleMap = new Map(questions.map((q) => [q.id, q.title]));

  // 각 오답에 좋아요 수 등 정보 추가
  const enriched = wrongAnswers.map((wa) => {
    const waLikes = likesData.filter((l) => l.wrong_answer_id === wa.id);
    return {
      id: wa.id,
      questionId: wa.question_id as number,
      title: titleMap.get(wa.question_id as number) ?? "",
      answerTokens: wa.answer_tokens as string[],
      likesCount: waLikes.length,
      isMyAnswer: wa.user_uuid === userUuid,
      iLiked: waLikes.some((l) => l.user_uuid === userUuid),
    };
  });

  // 인기 오답 (좋아요 5개 이상): 셔플 후 5개 반환
  const popular = shuffle(
    enriched.filter((e) => e.likesCount >= POPULAR_MIN_LIKES)
  ).slice(0, RETURN_COUNT);

  // 랜덤 오답 (인기 오답 제외): 셔플 후 5개 반환
  const popularIds = new Set(popular.map((e) => e.id));
  const random = shuffle(
    enriched.filter((e) => !popularIds.has(e.id))
  ).slice(0, RETURN_COUNT);

  return res.status(200).json({ popular, random });
}
