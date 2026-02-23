import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { supabase } from "./_supabase";
import { isRateLimited } from "./_ratelimit";

const postSchema = z.object({
  wrongAnswerId: z.string().uuid("wrongAnswerId 가 올바른 UUID 형식이 아닙니다."),
  userUuid: z.string().uuid("userUuid 가 올바른 UUID 형식이 아닙니다."),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Rate limit: IP 기준 분당 30회
  const ip = getClientIp(req);
  if (isRateLimited(ip, "likes", 30, 60)) {
    return res.status(429).json({ error: "요청이 너무 많습니다." });
  }

  // 입력 유효성 검증
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { wrongAnswerId, userUuid } = parsed.data;

  // 해당 오답의 작성자 확인 (본인 오답 좋아요 방지)
  const { data: wrongAnswer, error: waError } = await supabase
    .from("wrong_answers")
    .select("user_uuid")
    .eq("id", wrongAnswerId)
    .single();

  if (waError || !wrongAnswer) {
    return res.status(404).json({ error: "오답을 찾을 수 없습니다." });
  }

  if (wrongAnswer.user_uuid === userUuid) {
    return res.status(403).json({ error: "본인의 오답에는 좋아요를 누를 수 없습니다." });
  }

  // 기존 좋아요 존재 여부 확인
  const { data: existing } = await supabase
    .from("likes")
    .select("id")
    .eq("wrong_answer_id", wrongAnswerId)
    .eq("user_uuid", userUuid)
    .single();

  let action: "liked" | "unliked";

  if (existing) {
    // 이미 좋아요 → 취소 (DELETE)
    const { error: deleteError } = await supabase
      .from("likes")
      .delete()
      .eq("id", existing.id);

    if (deleteError) {
      console.error("[likes DELETE] DB error:", deleteError);
      return res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
    action = "unliked";
  } else {
    // 좋아요 없음 → 추가 (INSERT)
    const { error: insertError } = await supabase
      .from("likes")
      .insert({ wrong_answer_id: wrongAnswerId, user_uuid: userUuid });

    if (insertError) {
      console.error("[likes INSERT] DB error:", insertError);
      return res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
    action = "liked";
  }

  // 현재 좋아요 수 집계
  const { count } = await supabase
    .from("likes")
    .select("id", { count: "exact", head: true })
    .eq("wrong_answer_id", wrongAnswerId);

  return res.status(200).json({ action, likesCount: count ?? 0 });
}

function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}
