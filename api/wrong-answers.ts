import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { supabase } from "./_supabase.js";
import { isRateLimited } from "./_ratelimit.js";
import questionsData from "../src/data/questions.json";

interface QuestionData {
  id: number;
  tokens: { easy: string[]; hard: string[] };
}

const questions = questionsData as QuestionData[];

// ─── 스키마 ───────────────────────────────────────────────────

const postSchema = z.object({
  questionId: z.number().int().positive(),
  userUuid: z.string().uuid(),
  answerTokens: z.array(z.string()).min(1).max(50),
  correctTokens: z.array(z.string()).min(1).max(50),
  difficulty: z.enum(["easy", "hard"]),
});

const getSchema = z.object({
  questionIds: z.string().regex(/^\d+(,\d+)*$/, "questionIds 형식이 올바르지 않습니다."),
  userUuid: z.string().uuid("userUuid 가 올바른 UUID 형식이 아닙니다."),
  difficulty: z.enum(["easy", "hard"]),
});

// ─── 핸들러 진입점 ────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "POST") return handlePost(req, res);
  if (req.method === "GET") return handleGet(req, res);
  return res.status(405).json({ error: "Method not allowed" });
}

// ─── POST /api/wrong-answers — 오답 저장 ─────────────────────

async function handlePost(req: VercelRequest, res: VercelResponse) {
  // Rate limit: IP 기준 분당 20회
  const ip = getClientIp(req);
  if (isRateLimited(ip, "wrong-answers", 20, 60)) {
    return res.status(429).json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." });
  }

  // 입력 유효성 검증
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { questionId, userUuid, answerTokens, correctTokens, difficulty } = parsed.data;

  // 문제 ID 존재 확인
  const question = questions.find((q) => q.id === questionId);
  if (!question) {
    return res.status(400).json({ error: "존재하지 않는 문제입니다." });
  }

  // answerTokens 가 해당 문제·난이도의 토큰 범위 안에 있는지 확인
  const validTokens = new Set(question.tokens[difficulty]);
  if (!answerTokens.every((t) => validTokens.has(t))) {
    return res.status(400).json({ error: "유효하지 않은 토큰이 포함되어 있습니다." });
  }

  // INSERT 시도
  const { data: inserted, error } = await supabase
    .from("wrong_answers")
    .insert({
      question_id: questionId,
      user_uuid: userUuid,
      answer_tokens: answerTokens,
      correct_tokens: correctTokens,
      difficulty,
    })
    .select("id")
    .single();

  // UNIQUE 제약 위반 → 이미 존재하는 오답 반환
  if (error) {
    if (error.code === "23505") {
      const existing = await findExistingWrongAnswer(questionId, userUuid, answerTokens);
      return res.status(200).json({ id: existing, alreadyExists: true });
    }
    console.error("[wrong-answers POST] DB error:", error);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }

  return res.status(201).json({ id: inserted.id, alreadyExists: false });
}

async function findExistingWrongAnswer(
  questionId: number,
  userUuid: string,
  answerTokens: string[]
): Promise<string | null> {
  // question_id + user_uuid 로 후보를 좁힌 뒤 JS 에서 answer_tokens 를 비교
  const { data } = await supabase
    .from("wrong_answers")
    .select("id, answer_tokens")
    .eq("question_id", questionId)
    .eq("user_uuid", userUuid);

  if (!data) return null;
  const target = JSON.stringify(answerTokens);
  const found = data.find((row) => JSON.stringify(row.answer_tokens) === target);
  return found?.id ?? null;
}

// ─── GET /api/wrong-answers — 오답 목록 조회 ─────────────────

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const parsed = getSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { questionIds, userUuid, difficulty } = parsed.data;
  const questionIdList = questionIds.split(",").map(Number);

  // 해당 문제들의 오답 전체 조회
  const { data: wrongAnswers, error: waError } = await supabase
    .from("wrong_answers")
    .select("id, question_id, user_uuid, answer_tokens")
    .in("question_id", questionIdList)
    .eq("difficulty", difficulty);

  if (waError) {
    console.error("[wrong-answers GET] DB error:", waError);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }

  // 빈 결과 조기 반환
  if (!wrongAnswers || wrongAnswers.length === 0) {
    const empty: Record<number, []> = {};
    questionIdList.forEach((id) => (empty[id] = []));
    return res.status(200).json(empty);
  }

  // 해당 오답들의 좋아요 조회
  const wrongAnswerIds = wrongAnswers.map((wa) => wa.id);
  const { data: likes } = await supabase
    .from("likes")
    .select("wrong_answer_id, user_uuid")
    .in("wrong_answer_id", wrongAnswerIds);

  const likesData = likes ?? [];

  // questionId 별로 그룹화
  const result: Record<
    number,
    Array<{
      id: string;
      answerTokens: string[];
      likesCount: number;
      isMyAnswer: boolean;
      iLiked: boolean;
    }>
  > = {};
  questionIdList.forEach((id) => (result[id] = []));

  for (const wa of wrongAnswers) {
    const waLikes = likesData.filter((l) => l.wrong_answer_id === wa.id);
    result[wa.question_id].push({
      id: wa.id,
      answerTokens: wa.answer_tokens as string[],
      likesCount: waLikes.length,
      isMyAnswer: wa.user_uuid === userUuid,
      iLiked: waLikes.some((l) => l.user_uuid === userUuid),
    });
  }

  // 각 문제별: 상위 2개(좋아요 순) + 나머지 중 랜덤 3개
  for (const id of questionIdList) {
    result[id].sort((a, b) => b.likesCount - a.likesCount);
    const top2 = result[id].slice(0, 2);
    const rest = result[id].slice(2);
    // Fisher-Yates 셔플
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    result[id] = [...top2, ...rest.slice(0, 3)];
  }

  return res.status(200).json(result);
}

// ─── 유틸 ─────────────────────────────────────────────────────

function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}
