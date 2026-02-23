// Supabase 무료 플랜은 7일 비활성 시 자동 중지됩니다.
// Vercel Cron Job 으로 매일 이 엔드포인트를 호출하여 DB 를 활성 상태로 유지합니다.
// vercel.json 의 crons 설정을 참고하세요.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "./_supabase";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const { error } = await supabase.from("wrong_answers").select("id").limit(1);

  if (error) {
    console.error("[health] Supabase ping 실패:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }

  return res.status(200).json({ ok: true, timestamp: new Date().toISOString() });
}
