import { describe, expect, it } from "vitest";

import { authSchema } from "./authSchema";

/** 01 인증 폼 — 이메일 형식·비밀번호 ≥6·회원가입 이름 필수. */
describe("authSchema(login)", () => {
  const s = authSchema("login");
  it("유효 이메일·비밀번호 통과", () => {
    expect(s.safeParse({ email: "a@b.com", pw: "secret1" }).success).toBe(true);
  });
  it("잘못된 이메일 → 실패", () => {
    expect(s.safeParse({ email: "nope", pw: "secret1" }).success).toBe(false);
  });
  it("비밀번호 6자 미만 → 실패", () => {
    const r = s.safeParse({ email: "a@b.com", pw: "12345" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].message).toBe("비밀번호는 6자 이상이어야 해요");
    }
  });
});

describe("authSchema(signup) — 이름 필수", () => {
  const s = authSchema("signup");
  it("이름 포함 통과", () => {
    expect(s.safeParse({ name: "홍길동", email: "a@b.com", pw: "secret1" }).success).toBe(true);
  });
  it("이름 누락 → 실패", () => {
    expect(s.safeParse({ name: "", email: "a@b.com", pw: "secret1" }).success).toBe(false);
  });
});
