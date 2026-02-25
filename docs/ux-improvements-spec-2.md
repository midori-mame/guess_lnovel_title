# UX 개선 기능 구현 명세서 (2차)

> **오늘 개발할 범위:**
> "틀려도 괜찮아" 탭 모바일 가로 넘침 수정 (이월),
> 토큰 드래그 이동 구현,
> 드래그 중 화면 스크롤 억제,
> 결과 화면 소설 제목 구글 검색 연결
>
> ⚠️ **이전 명세 정정:** `ux-improvements-spec.md` 섹션 1("드래그 제거 + 탭으로 통일")은
> **폐기**한다. 드래그 기능은 제거하지 않고 유지하며, 스크롤 충돌만 해결한다.
> 해당 섹션이 이미 코드에 반영됐다면 반드시 **되돌린 뒤** 이 명세를 적용할 것.
>
> 백엔드 변경 없음. 프론트엔드 전용 작업.

---

## 목차

1. ["틀려도 괜찮아" 탭 — 모바일 가로 넘침 수정 (이월)](#1-틀려도-괜찮아-탭--모바일-가로-넘침-수정-이월)
2. [토큰 드래그 이동 구현](#2-토큰-드래그-이동-구현)
3. [드래그 중 화면 스크롤 억제](#3-드래그-중-화면-스크롤-억제)
4. [결과 화면 — 소설 제목 구글 검색 연결](#4-결과-화면--소설-제목-구글-검색-연결)
5. [구현 순서](#5-구현-순서)

---

## 1. "틀려도 괜찮아" 탭 — 모바일 가로 넘침 수정 (이월)

어제 요구된 기능이나 미반영 상태. **오늘 최우선으로 처리할 것.**

### 문제 상황

모바일에서 "틀려도 괜찮아" 탭의 오답 토큰 목록이 화면 가로 너비를 초과하여
잘리거나 화면 밖으로 튀어나온다.

### 해결 방법

오답 토큰 카드들을 감싸는 flex 컨테이너에 아래를 적용한다.

```tsx
// 변경 전 (예시)
<div className="flex gap-1">

// 변경 후
<div className="flex flex-wrap gap-1 w-full max-w-full overflow-hidden">
```

- `flex-wrap` : 토큰이 한 줄을 넘으면 자동 줄바꿈
- `w-full max-w-full` : 컨테이너가 부모 너비를 초과하지 않도록 제한
- `overflow-hidden` : 넘치는 요소가 화면 밖으로 나가지 않도록 차단

### 적용 위치

"틀려도 괜찮아" 탭 내 오답 항목을 렌더링하는 컴포넌트(OtherWrongAnswers 또는
이에 준하는 컴포넌트)에서, 토큰 카드들을 감싸는 flex 컨테이너.

### 검증 조건

- DevTools iPhone SE(375px) 기준으로 확인
- 토큰이 10개 이상인 긴 제목의 오답도 가로 스크롤 없이 줄바꿈 표시될 것
- 줄바꿈 후 다음 오답 항목과 겹치지 않을 것

---

## 2. 토큰 드래그 이동 구현

### 현황 및 목표

현재 토큰은 클릭(탭)으로만 이동 가능하다.
**드래그 앤 드롭으로도 토큰을 이동**할 수 있도록 추가한다.
클릭 동작은 그대로 유지한다. (드래그와 클릭 둘 다 지원)

### 지원 동작

| 드래그 출발지 | 드래그 도착지 | 결과 |
|---|---|---|
| `TokenPool` 토큰 | `InputArea` | 해당 토큰이 `inputTokens` 끝에 추가 |
| `InputArea` 토큰 | `TokenPool` | 해당 토큰이 `poolTokens` 끝에 반환 |
| `InputArea` 토큰 | `InputArea` 내 다른 위치 | 이번 범위 제외 (순서 변경 미구현) |

> `InputArea` 내부 순서 변경은 복잡도가 높아 이번 범위에서 제외한다.
> `InputArea` 안으로 드래그하면 항상 끝에 추가된다.

### 구현 방식: HTML5 Drag and Drop API

별도 라이브러리 없이 브라우저 내장 HTML5 DnD API를 사용한다.
(`react-dnd`, `dnd-kit` 등 외부 라이브러리 추가 금지 — 번들 크기 최소화)

### 토큰 카드 변경

```tsx
<div
  draggable
  onDragStart={(e) => handleDragStart(e, token, from)}  // from: "pool" | "input"
  onDragEnd={handleDragEnd}
  onClick={() => handleClick(token)}
>
  {token.text}
</div>
```

`onDragStart`에서 토큰 id와 출발지를 `dataTransfer`에 저장한다.

```typescript
const handleDragStart = (
  e: React.DragEvent,
  token: Token,
  from: "pool" | "input"
) => {
  e.dataTransfer.setData("tokenId", token.id);
  e.dataTransfer.setData("from", from);
  e.dataTransfer.effectAllowed = "move";
};
```

### 드롭 영역 설정

`TokenPool`과 `InputArea` 컨테이너에 `onDragOver`와 `onDrop`을 추가한다.

```typescript
const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();                   // 드롭 허용 선언 (필수)
  e.dataTransfer.dropEffect = "move";
};

const handleDrop = (e: React.DragEvent, to: "pool" | "input") => {
  e.preventDefault();
  const tokenId = e.dataTransfer.getData("tokenId");
  const from    = e.dataTransfer.getData("from") as "pool" | "input";
  if (from === to) return;              // 같은 영역 내 드롭은 무시
  dispatch({ type: "MOVE_TOKEN", payload: { tokenId, from, to } });
};
```

### State 액션 추가

```typescript
// types/index.ts에 추가
| {
    type: "MOVE_TOKEN";
    payload: {
      tokenId: string;
      from: "pool" | "input";
      to:   "pool" | "input";
    };
  }
```

리듀서 처리:

```typescript
case "MOVE_TOKEN": {
  const { tokenId, from, to } = action.payload;
  if (from === "pool" && to === "input") {
    const token = state.poolTokens.find(t => t.id === tokenId);
    if (!token) return state;
    return {
      ...state,
      poolTokens:  state.poolTokens.filter(t => t.id !== tokenId),
      inputTokens: [...state.inputTokens, token],
    };
  }
  if (from === "input" && to === "pool") {
    const token = state.inputTokens.find(t => t.id === tokenId);
    if (!token) return state;
    return {
      ...state,
      inputTokens: state.inputTokens.filter(t => t.id !== tokenId),
      poolTokens:  [...state.poolTokens, token],
    };
  }
  return state;
}
```

### 드래그 중 시각 피드백

드래그 중인 토큰 카드에 반투명 효과를 주어 이동 중임을 표시한다.
`draggingId`는 각 컴포넌트의 로컬 `useState`로 관리한다.

```typescript
const [draggingId, setDraggingId] = useState<string | null>(null);

// onDragStart에서
setDraggingId(token.id);

// onDragEnd에서 (드롭 성공/실패 무관하게 항상 호출)
setDraggingId(null);
```

```tsx
<div className={draggingId === token.id ? "opacity-40" : "opacity-100"}>
```

드롭 영역에 토큰이 진입할 때(`onDragEnter`) 테두리 강조 효과도 추가한다.

### 검증 조건

- `TokenPool` → `InputArea` 드래그 후 토큰이 `inputTokens` 끝에 추가될 것
- `InputArea` → `TokenPool` 드래그 후 토큰이 `poolTokens`로 반환될 것
- 클릭(탭) 동작이 기존과 동일하게 작동할 것
- 드래그 도중 해당 토큰이 반투명하게 표시될 것

---

## 3. 드래그 중 화면 스크롤 억제

### 문제 상황

모바일에서 토큰을 드래그할 때 손가락 움직임이 페이지 스크롤로 동시에 인식되어
드래그 도중 화면이 함께 스크롤된다.

### 원인

HTML5 DnD API는 PC 환경 기준으로 설계됐다. 모바일에서는 `touchmove`와 브라우저
기본 스크롤이 경쟁하며, `draggable` 속성만으로는 스크롤을 막을 수 없다.

### 해결 방법: 드래그 중에만 `touch-action: none` 동적 적용

드래그가 시작되면 게임 화면 최상위 컨테이너의 `touch-action`을 `none`으로 변경하고,
드래그가 끝나면 즉시 복원한다.

**isDragging 상태 추가**

`GameContext`에 `isDragging`을 추가한다. (토큰 컴포넌트와 최상위 컨테이너가 공유해야 하기 때문)

```typescript
// GameState에 추가
isDragging: boolean;  // 기본값: false

// 액션 추가
| { type: "SET_DRAGGING"; payload: boolean }
```

**토큰 카드에서 드래그 시작/종료 시 dispatch**

```typescript
onDragStart={() => {
  dispatch({ type: "SET_DRAGGING", payload: true });
  // 기존 handleDragStart 로직
}}

onDragEnd={() => {
  dispatch({ type: "SET_DRAGGING", payload: false });
  // 기존 handleDragEnd 로직
}}
```

**최상위 컨테이너에 동적 적용**

```tsx
// App.tsx 또는 GameScreen.tsx의 최상위 div
<div style={{ touchAction: isDragging ? "none" : "auto" }}>
```

### ⚠️ 복원 누락 주의

`touch-action: none`은 드래그 **중에만** 적용해야 한다.
`onDragEnd`는 드롭 성공·실패·취소 모두에서 호출되므로, 반드시 여기서 `false`로 복원할 것.
복원을 빠뜨리면 드래그 이후 화면 전체 스크롤이 영구적으로 막힌다.

### 검증 조건

- 모바일 에뮬레이터에서 토큰을 드래그하는 동안 화면이 스크롤되지 않을 것
- 드래그를 마친 후(손가락을 뗀 후) 화면 스크롤이 정상적으로 다시 작동할 것
- PC 환경에서 기존 동작이 영향받지 않을 것

---

## 4. 결과 화면 — 소설 제목 구글 검색 연결

### 기능 설명

`ResultScreen`의 문제별 복기 목록에서 소설 제목을 탭(클릭)하면
해당 제목으로 구글 검색 결과 페이지가 새 탭에서 열린다.

### 구현 방법

소설 제목 텍스트를 `<a>` 태그로 감싼다.

```tsx
<a
  href={`https://www.google.com/search?q=${encodeURIComponent(title)}`}
  target="_blank"
  rel="noopener noreferrer"
  className="underline hover:text-blue-600 cursor-pointer"
>
  {title}
</a>
```

- `target="_blank"` : 새 탭에서 열기
- `rel="noopener noreferrer"` : 보안 속성 (`target="_blank"` 사용 시 필수)
- `encodeURIComponent(title)` : 한글·특수문자 URL 인코딩 처리

### 적용 위치

`ResultScreen` 컴포넌트의 문제별 복기 목록에서 각 문제 제목을 표시하는 부분.
현재 `<span>` 또는 일반 텍스트로 표시된 제목을 위의 `<a>` 태그로 교체한다.

### 시각적 힌트

링크임을 인식할 수 있도록 아래 중 하나를 적용한다.

- 밑줄 + 호버 시 파란색으로 색상 변경 (기본 링크 스타일)
- 또는 제목 우측에 외부 링크 아이콘(↗) 추가

---

## 5. 구현 순서

각 항목이 독립적이므로 아래 순서대로 처리한다.

```
[1단계] "틀려도 괜찮아" 탭 모바일 가로 넘침 수정 (이월 최우선)
  → 오답 토큰 컨테이너에 flex-wrap, w-full, overflow-hidden 적용
  → DevTools iPhone SE(375px)에서 긴 제목 오답 확인

[2단계] 결과 화면 소설 제목 구글 검색 연결 (독립적, 단순)
  → ResultScreen 제목 텍스트를 <a> 태그로 교체
  → encodeURIComponent 적용 확인
  → 새 탭으로 열리는지 확인

[3단계] 토큰 드래그 이동 구현
  → MOVE_TOKEN 액션 및 리듀서 추가
  → 토큰 카드에 draggable + onDragStart + onDragEnd 추가
  → TokenPool, InputArea에 onDragOver + onDrop 추가
  → draggingId 시각 피드백 확인
  → pool → input, input → pool 양방향 드래그 동작 확인
  → 클릭 동작이 기존과 동일한지 확인

[4단계] 드래그 중 화면 스크롤 억제
  → GameState에 isDragging + SET_DRAGGING 액션 추가
  → onDragStart → isDragging: true 연결
  → onDragEnd → isDragging: false 복원 (필수)
  → 최상위 컨테이너에 동적 touch-action 적용
  → 모바일 에뮬레이터에서 드래그 중 스크롤 억제 확인
  → 드래그 종료 후 스크롤 복구 확인
```
