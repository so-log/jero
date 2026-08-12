import type { PlaceCard } from "../types";

/**
 * 어시스턴트 스트림 와이어 포맷 — **서버·클라 공유 단일 출처**.
 *
 * Phase 2 는 순수 텍스트 스트림이었지만, Phase 3 부터 답변과 함께 **구조화 데이터(추천 카드)**를
 * 실어 보내야 한다. 카드는 도구 실행 시점(스트림 도중)에 생기므로 헤더로는 보낼 수 없다.
 *
 * 그래서 텍스트 사이에 프레임을 끼워 넣는다:
 *
 *   ...텍스트... <RS> {"cards":[...]} <RS> ...텍스트...
 *
 * 구분자는 ``(ASCII Record Separator) — 사람이 읽는 한국어 답변에 등장할 일이 없고,
 * 모델도 생성하지 않는다. 만약 들어오더라도 JSON 파싱에 실패해 **텍스트로 되돌려** 표시한다
 * (프레임 오인으로 답변이 사라지지 않는다).
 */

/** 프레임 구분자. */
export const FRAME = "";

/** 프레임 payload — 지금은 카드뿐이고, Phase 4 에서 코스 제안이 추가된다. */
export interface StreamFrame {
  cards?: PlaceCard[];
}

/** 서버: payload 를 프레임 문자열로 만든다. */
export function encodeFrame(frame: StreamFrame): string {
  return `${FRAME}${JSON.stringify(frame)}${FRAME}`;
}

export interface DecodedChunk {
  /** 표시할 텍스트(프레임 제거됨). */
  text: string;
  /** 이 청크에서 발견된 프레임들. */
  frames: StreamFrame[];
  /** 닫히지 않은 프레임 조각 — 다음 청크 앞에 이어 붙여야 한다. */
  pending: string;
}

function parseFrame(raw: string): StreamFrame | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    // 배열·null 은 프레임이 아니다(`typeof [] === "object"` 라 명시적으로 걸러낸다).
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as StreamFrame;
  } catch {
    return null;
  }
}

/**
 * 클라: 스트림 청크에서 텍스트와 프레임을 분리한다.
 *
 * 프레임이 청크 경계에 걸릴 수 있으므로(네트워크는 임의 지점에서 쪼갠다) 미완성 조각은
 * `pending` 으로 돌려주고 다음 호출 때 앞에 붙인다. 호출자는 `pending` 을 계속 이어 넘긴다.
 */
export function decodeChunk(chunk: string, pending = ""): DecodedChunk {
  const buffer = pending + chunk;
  const parts = buffer.split(FRAME);

  // 구분자가 짝수 개면 마지막 조각은 완결된 텍스트, 홀수 개면 프레임이 열린 채 끝났다.
  const openFrame = parts.length % 2 === 0;
  const carry = openFrame ? parts.pop() ?? "" : "";

  let text = "";
  const frames: StreamFrame[] = [];

  parts.forEach((part, index) => {
    if (index % 2 === 0) {
      text += part;
      return;
    }
    const frame = parseFrame(part);
    if (frame) {
      frames.push(frame);
    } else {
      // 프레임처럼 보였지만 JSON 이 아니다 — 원문 그대로 텍스트에 되돌린다(손실 방지).
      text += FRAME + part + FRAME;
    }
  });

  return { text, frames, pending: openFrame ? FRAME + carry : "" };
}
