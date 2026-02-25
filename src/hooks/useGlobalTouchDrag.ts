import { useEffect, useRef } from "react";
import { useGame } from "../context/GameContext";
import { touchDragState } from "../utils/touchDragState";

// 드래그로 간주할 최소 이동 거리(px)
const DRAG_THRESHOLD = 8;

export function useGlobalTouchDrag() {
  const { state, dispatch } = useGame();

  // 최신 inputTokens를 ref로 유지 (클로저 stale 방지)
  const inputTokensRef = useRef(state.inputTokens);
  inputTokensRef.current = state.inputTokens;

  useEffect(() => {
    function onTouchMove(e: TouchEvent) {
      const drag = touchDragState.current;
      if (!drag) return;

      const touch = e.touches[0];
      const dx = touch.clientX - drag.startX;
      const dy = touch.clientY - drag.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!drag.isDragging) {
        if (dist <= DRAG_THRESHOLD) return; // 아직 임계값 미달 → 스크롤 허용

        // 임계값 초과 → 드래그 시작
        drag.isDragging = true;
        dispatch({ type: "SET_DRAGGING", payload: true });

        // ghost 요소 생성 (원본 버튼 스타일 복사)
        const src = drag.sourceEl;
        const rect = src.getBoundingClientRect();
        const cs = window.getComputedStyle(src);

        const ghost = document.createElement("div");
        ghost.textContent = src.textContent;
        ghost.style.cssText = [
          "position:fixed",
          "pointer-events:none",
          "z-index:9999",
          "opacity:0.85",
          `width:${rect.width}px`,
          `padding:${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
          `border-radius:${cs.borderRadius}`,
          `font-size:${cs.fontSize}`,
          `font-weight:${cs.fontWeight}`,
          `background-color:${cs.backgroundColor}`,
          `color:${cs.color}`,
          "box-shadow:0 6px 16px rgba(0,0,0,0.2)",
          "text-align:center",
          `left:${touch.clientX - rect.width / 2}px`,
          `top:${touch.clientY - rect.height / 2}px`,
        ].join(";");
        document.body.appendChild(ghost);
        drag.ghostEl = ghost;
      }

      // 드래그 중 스크롤 방지
      e.preventDefault();

      // ghost 위치 업데이트
      if (drag.ghostEl) {
        const g = drag.ghostEl;
        g.style.left = `${touch.clientX - g.offsetWidth / 2}px`;
        g.style.top = `${touch.clientY - g.offsetHeight / 2}px`;
      }
    }

    function onTouchEnd(e: TouchEvent) {
      const drag = touchDragState.current;
      if (!drag) return;
      touchDragState.current = null;

      // ghost 숨긴 뒤 elementFromPoint로 드롭 대상 탐색
      // (ghost에 pointer-events:none이 있어도 안전하게 hide)
      if (drag.ghostEl) drag.ghostEl.style.display = "none";

      if (!drag.isDragging) {
        // 탭(tap) → onClick이 처리하므로 여기서는 아무것도 안 함
        if (drag.ghostEl) drag.ghostEl.remove();
        return;
      }

      dispatch({ type: "SET_DRAGGING", payload: false });

      const touch = e.changedTouches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (drag.ghostEl) drag.ghostEl.remove();
      if (!el) return;

      // DOM을 위로 탐색: data-dropzone, data-token-id 찾기
      let node: Element | null = el;
      let targetZone: "pool" | "input" | null = null;
      let targetTokenId: string | null = null;

      while (node) {
        if (!targetTokenId) {
          const tid = node.getAttribute("data-token-id");
          if (tid) targetTokenId = tid;
        }
        const zone = node.getAttribute("data-dropzone");
        if (zone === "pool" || zone === "input") {
          targetZone = zone;
          break;
        }
        node = node.parentElement;
      }

      if (!targetZone) return;

      const { tokenId, from } = drag;

      if (from !== targetZone) {
        // 영역 간 이동 (pool↔input)
        dispatch({ type: "MOVE_TOKEN", payload: { tokenId, from, to: targetZone } });
      } else if (
        from === "input" &&
        targetZone === "input" &&
        targetTokenId &&
        targetTokenId !== tokenId
      ) {
        // 입력 영역 내 순서 변경
        const currentIds = inputTokensRef.current.map((t) => t.id);
        const fromIndex = currentIds.indexOf(tokenId);
        const toIndex = currentIds.indexOf(targetTokenId);
        if (fromIndex !== -1 && toIndex !== -1) {
          const newIds = [...currentIds];
          newIds.splice(fromIndex, 1);
          newIds.splice(toIndex, 0, tokenId);
          dispatch({ type: "REORDER_INPUT_TOKENS", payload: newIds });
        }
      }
    }

    function onTouchCancel() {
      const drag = touchDragState.current;
      if (!drag) return;
      touchDragState.current = null;
      if (drag.ghostEl) drag.ghostEl.remove();
      if (drag.isDragging) {
        dispatch({ type: "SET_DRAGGING", payload: false });
      }
    }

    // passive: false → touchmove에서 preventDefault() 호출 가능
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchCancel);

    return () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [dispatch]); // dispatch는 안정적이므로 의존성 배열에만 포함
}
