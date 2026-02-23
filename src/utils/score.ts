import type { Token, QuestionResult } from "../types";

/**
 * 완답 모드: 전체가 일치해야 1점
 */
export function scoreExact(input: Token[], answer: string[]): number {
  const inputTexts = input.map((t) => t.text);
  const isCorrect =
    inputTexts.length === answer.length &&
    inputTexts.every((text, i) => text === answer[i]);
  return isCorrect ? 1 : 0;
}

/**
 * 부분 점수 모드: 위치가 맞는 토큰 수 / 전체 토큰 수
 */
export function scorePartial(input: Token[], answer: string[]): number {
  if (answer.length === 0) return 0;
  const correctCount = input.reduce((acc, token, i) => {
    return acc + (token.text === answer[i] ? 1 : 0);
  }, 0);
  return parseFloat((correctCount / answer.length).toFixed(2));
}

/**
 * 총점 계산 (소수점 2자리)
 */
export function calcTotalScore(results: QuestionResult[]): number {
  const sum = results.reduce((acc, r) => acc + r.score, 0);
  return parseFloat(sum.toFixed(2));
}

/**
 * 점수 등급 계산
 */
export function getGrade(score: number): {
  grade: string;
  message: string;
} {
  if (score >= 9.0) {
    return { grade: "S", message: "완벽해요! 제목 박사님!" };
  }
  if (score >= 7.0) {
    return { grade: "A", message: "훌륭해요! 꽤 많이 읽으셨군요!" };
  }
  if (score >= 5.0) {
    return { grade: "B", message: "괜찮아요! 조금 더 읽어봐요!" };
  }
  if (score >= 3.0) {
    return { grade: "C", message: "분발이 필요해요!" };
  }
  return { grade: "D", message: "긴 제목 작품 감상을 추천드려요!" };
}
