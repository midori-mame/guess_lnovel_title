// HTML5 DnD는 모바일에서 동작하지 않으므로 터치 이벤트로 직접 구현한다.
// TokenPool과 InputArea가 공유해야 하므로 모듈 레벨 싱글톤으로 관리한다.

export interface ActiveTouchDrag {
  tokenId: string;
  from: "pool" | "input";
  startX: number;
  startY: number;
  isDragging: boolean;      // 실제로 드래그 중인지 (임계값 초과 후 true)
  ghostEl: HTMLElement | null;
  sourceEl: HTMLElement;    // 원본 버튼 DOM 참조 (ghost 스타일 복사용)
}

export const touchDragState = {
  current: null as ActiveTouchDrag | null,
};
