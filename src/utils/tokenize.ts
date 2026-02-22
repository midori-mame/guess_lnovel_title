import type { Token } from "../types";

// 토큰 색상 팔레트
export const TOKEN_COLORS = [
  "bg-red-200",
  "bg-blue-200",
  "bg-green-200",
  "bg-yellow-200",
  "bg-purple-200",
  "bg-pink-200",
  "bg-orange-200",
  "bg-teal-200",
];

/**
 * 문자열 배열을 Token 객체 배열로 변환
 * 각 토큰에 고유 id와 색상을 부여합니다.
 */
export function createTokens(rawTokens: string[]): Token[] {
  const timestamp = Date.now();
  return rawTokens.map((text, index) => ({
    id: `token-${index}-${timestamp}`,
    text,
    color: TOKEN_COLORS[index % TOKEN_COLORS.length],
    isPlaced: false,
  }));
}

/**
 * 토큰 검증: 토큰을 합쳤을 때 원본 제목의 공백 제거 결과와 동일한지 확인
 */
export function validateTokens(tokens: string[], title: string): boolean {
  return tokens.join("") === title.replace(/\s/g, "");
}
