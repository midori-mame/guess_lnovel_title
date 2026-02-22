/**
 * Fisher-Yates 셔플 알고리즘
 * 배열을 무작위로 섞어서 새 배열을 반환합니다.
 */
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
