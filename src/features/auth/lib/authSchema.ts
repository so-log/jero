import { z } from "zod";

/**
 * 인증 폼 검증(01). 이메일 /.+@.+\..+/.
 * **비밀번호 정책(계약 B3 확정)**: 가입·재설정은 min 8, **로그인은 하드 min 없이 "필수"만**
 * (길이 규칙 강화 이전 계정의 로그인 거부 방지). 클라 검증은 UX — 신뢰 경계는 서버(§8.3).
 */
export type AuthMode = "login" | "signup";

export interface AuthForm {
  name: string;
  email: string;
  pw: string;
}

const email = z
  .string()
  .trim()
  .regex(/.+@.+\..+/, "올바른 이메일 주소를 입력해 주세요");

/** 신규 비밀번호(가입·재설정 공통) — 8자 이상. */
export const newPasswordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 해요");

/** 로그인 비밀번호 — 필수만(기존 계정 호환). */
const loginPassword = z.string().min(1, "비밀번호를 입력해 주세요");

/** 모드별 스키마 — 로그인은 이름 제외·비번 필수, 회원가입은 이름 필수·비번 8자+. */
export function authSchema(mode: AuthMode) {
  return mode === "signup"
    ? z.object({
        name: z.string().trim().min(1, "이름을 입력해 주세요"),
        email,
        pw: newPasswordSchema,
      })
    : z.object({ email, pw: loginPassword });
}
