import { describe, expect, it } from "vitest";

import {
  authSchema,
  resetPasswordSchema,
  resetRequestSchema,
} from "./authSchema";

/** 01 인증 폼 — 이메일 형식 · 로그인 비번 "필수" · 회원가입 비번 8자+·이름 필수 (계약 B3). */
describe("authSchema(login)", () => {
  const s = authSchema("login");
  it("유효 이메일·비밀번호 통과 (짧은 기존 비번도 허용)", () => {
    expect(s.safeParse({ email: "a@b.com", pw: "12345" }).success).toBe(true);
  });
  it("잘못된 이메일 → 실패", () => {
    expect(s.safeParse({ email: "nope", pw: "secret1" }).success).toBe(false);
  });
  it("빈 비밀번호 → 실패(필수)", () => {
    const r = s.safeParse({ email: "a@b.com", pw: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].message).toBe("비밀번호를 입력해 주세요");
    }
  });
});

describe("authSchema(signup) — 이름 필수 · 비번 8자+", () => {
  const s = authSchema("signup");
  it("이름 + 8자 비번 통과", () => {
    expect(
      s.safeParse({ name: "홍길동", email: "a@b.com", pw: "secret12" }).success,
    ).toBe(true);
  });
  it("비밀번호 8자 미만 → 실패", () => {
    const r = s.safeParse({ name: "홍길동", email: "a@b.com", pw: "secret1" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.message === "비밀번호는 8자 이상이어야 해요")).toBe(true);
    }
  });
  it("이름 누락 → 실패", () => {
    expect(
      s.safeParse({ name: "", email: "a@b.com", pw: "secret12" }).success,
    ).toBe(false);
  });
});

describe("resetRequestSchema — 재설정 요청(이메일만)", () => {
  it("유효 이메일 통과 / 잘못된 이메일 실패", () => {
    expect(resetRequestSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
    expect(resetRequestSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("resetPasswordSchema — 새 비번 + 확인 일치", () => {
  it("8자+ 이고 일치하면 통과", () => {
    expect(
      resetPasswordSchema.safeParse({ pw: "secret12", confirm: "secret12" }).success,
    ).toBe(true);
  });
  it("8자 미만 → 실패", () => {
    expect(
      resetPasswordSchema.safeParse({ pw: "short", confirm: "short" }).success,
    ).toBe(false);
  });
  it("확인 불일치 → 실패(confirm 경로)", () => {
    const r = resetPasswordSchema.safeParse({ pw: "secret12", confirm: "secret99" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.message === "비밀번호가 일치하지 않아요")).toBe(true);
    }
  });
});
