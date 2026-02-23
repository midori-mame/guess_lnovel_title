// 간단한 인메모리 Rate Limiter
// ※ 각 Vercel Functions 인스턴스마다 독립적으로 동작합니다.
//   프로덕션 대규모 트래픽에서는 Upstash Redis + @upstash/ratelimit 으로 교체하세요.

interface Record {
  count: number;
  resetAt: number; // Unix ms
}

const store = new Map<string, Record>();

/**
 * @returns true 면 한도 초과(요청 차단), false 면 허용
 */
export function isRateLimited(
  ip: string,
  prefix: string,
  limit: number,
  windowSec: number
): boolean {
  const key = `${prefix}:${ip}`;
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const rec = store.get(key);

  if (!rec || now > rec.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (rec.count >= limit) return true;
  rec.count++;
  return false;
}
