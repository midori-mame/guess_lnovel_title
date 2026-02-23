import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl ) {
  console.error(
    "[Supabase] SUPABASE_URL 환경변수가 설정되지 않았습니다."
  );
}

if (!supabaseKey) {
  console.error(
    "[Supabase] SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다."
  );
} 

// service_role key 를 사용하는 서버 전용 클라이언트
// 절대 프론트엔드에 노출하지 마세요.
export const supabase = createClient(supabaseUrl, supabaseKey);
