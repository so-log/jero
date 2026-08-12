import { describe, expect, it } from "vitest";

import { decodeChunk, encodeFrame, FRAME } from "./streamProtocol";

/**
 * 와이어 포맷 (Phase 3). 텍스트와 카드가 한 스트림에 섞여 오므로,
 * **청크가 임의 지점에서 쪼개져도** 텍스트가 유실되거나 프레임이 깨지면 안 된다.
 */

const card = {
  name: "블루보틀",
  address: "아오야마",
  lat: 35.6,
  lng: 139.7,
  googlePlaceId: "ChIJ_a",
  category: "cafe",
};

describe("encodeFrame", () => {
  it("구분자로 감싼 JSON 을 만든다", () => {
    expect(encodeFrame({ cards: [] })).toBe(`${FRAME}{"cards":[]}${FRAME}`);
  });
});

describe("decodeChunk — 기본", () => {
  it("텍스트만 있으면 그대로 통과", () => {
    const r = decodeChunk("안녕하세요");
    expect(r).toEqual({ text: "안녕하세요", frames: [], pending: "" });
  });

  it("텍스트 뒤 프레임을 분리한다", () => {
    const r = decodeChunk("추천이에요" + encodeFrame({ cards: [card] }));
    expect(r.text).toBe("추천이에요");
    expect(r.frames).toEqual([{ cards: [card] }]);
    expect(r.pending).toBe("");
  });

  it("프레임 앞뒤 텍스트를 모두 살린다", () => {
    const r = decodeChunk("앞" + encodeFrame({ cards: [] }) + "뒤");
    expect(r.text).toBe("앞뒤");
    expect(r.frames).toHaveLength(1);
  });

  it("프레임 여러 개도 처리한다", () => {
    const r = decodeChunk(encodeFrame({ cards: [card] }) + encodeFrame({ cards: [] }));
    expect(r.frames).toHaveLength(2);
  });
});

describe("decodeChunk — 청크 경계 (네트워크는 임의 지점에서 쪼갠다)", () => {
  it("★ 프레임이 두 청크에 걸쳐도 복원한다", () => {
    const whole = "답변" + encodeFrame({ cards: [card] });
    const cut = whole.indexOf("cards") + 3; // 프레임 한가운데서 자른다

    const first = decodeChunk(whole.slice(0, cut));
    expect(first.frames).toEqual([]);
    expect(first.text).toBe("답변");
    expect(first.pending).not.toBe("");

    const second = decodeChunk(whole.slice(cut), first.pending);
    expect(second.frames).toEqual([{ cards: [card] }]);
    expect(second.pending).toBe("");
  });

  it("★ 구분자 바로 뒤에서 잘려도 복원한다", () => {
    const whole = "답변" + encodeFrame({ cards: [card] });
    const cut = whole.indexOf(FRAME) + 1;

    const first = decodeChunk(whole.slice(0, cut));
    const second = decodeChunk(whole.slice(cut), first.pending);

    expect(first.text + second.text).toBe("답변");
    expect(second.frames).toEqual([{ cards: [card] }]);
  });

  it("한 글자씩 흘려보내도 텍스트·프레임이 온전하다", () => {
    const whole = "가나다" + encodeFrame({ cards: [card] }) + "라마";
    let pending = "";
    let text = "";
    const frames: unknown[] = [];

    for (const ch of whole) {
      const r = decodeChunk(ch, pending);
      pending = r.pending;
      text += r.text;
      frames.push(...r.frames);
    }

    expect(text).toBe("가나다라마");
    expect(frames).toEqual([{ cards: [card] }]);
  });
});

describe("decodeChunk — 견고성", () => {
  it("★ 프레임처럼 보이지만 JSON 이 아니면 텍스트로 되돌린다(답변 유실 방지)", () => {
    const r = decodeChunk(`앞${FRAME}이건 JSON 이 아님${FRAME}뒤`);
    expect(r.frames).toEqual([]);
    expect(r.text).toBe(`앞${FRAME}이건 JSON 이 아님${FRAME}뒤`);
  });

  it("빈 청크는 아무것도 바꾸지 않는다", () => {
    expect(decodeChunk("")).toEqual({ text: "", frames: [], pending: "" });
  });

  it("JSON 배열처럼 객체가 아닌 프레임은 텍스트로 되돌린다", () => {
    const r = decodeChunk(`${FRAME}[1,2]${FRAME}`);
    expect(r.frames).toEqual([]);
    expect(r.text).toContain("[1,2]");
  });
});
