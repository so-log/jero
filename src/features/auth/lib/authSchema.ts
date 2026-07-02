import { z } from "zod";

/**
 * 인증 폼 검증(01). 시안 규칙: 이메일 /.+@.+\..+/ · 비밀번호 ≥ 6. 회원가입은 이름 추가.
 * 클라 검증은 UX용 — 신뢰 경계는 서버다(서버 재검증, §8.3).
 */
export type AuthMode = "login" | "signup";

export interface AuthForm {
  name: string;
  email: string;
  pw: string;
}

const base = {
  email: z
    .string()
    .trim()
    .regex(/.+@.+\..+/, "올바른 이메일 주소를 입력해 주세요"),
  pw: z.string().min(6, "비밀번호는 6자 이상이어야 해요"),
};

/** 모드별 스키마 — 로그인은 이름 검증 제외, 회원가입은 이름 필수. */
export function authSchema(mode: AuthMode) {
  return mode === "signup"
    ? z.object({ ...base, name: z.string().trim().min(1, "이름을 입력해 주세요") })
    : z.object(base);
}
