// 로그인 없이 유저를 구별하기 위한 익명 UUID 유틸
// localStorage 에 저장되므로 같은 브라우저에서는 동일한 UUID 가 유지됩니다.
// 시크릿 모드, 브라우저 데이터 삭제, 다른 기기에서는 새 UUID 가 생성됩니다.
// 개인을 식별할 수 없는 순수 익명 데이터입니다.

const USER_UUID_KEY = "novel_game_user_uuid";

export function getUserUuid(): string {
  let uuid = localStorage.getItem(USER_UUID_KEY);
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem(USER_UUID_KEY, uuid);
  }
  return uuid;
}
