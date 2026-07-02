"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";

import { useAuth } from "../api/useAuth";
import { authSchema, type AuthForm, type AuthMode } from "../lib/authSchema";

/**
 * 우측 인증 패널(01) — 모드 토글(로그인/회원가입) + 구글 + 이메일 폼 + 둘러보기. 시안 auth panel.
 * 클라 Zod 검증(UX) → useAuth 스텁 → 성공 시 /trips. 비밀번호 보기 토글. 입력값 저장·로깅 금지(§8.5).
 */
export function AuthPanel() {
  const router = useRouter();
  const auth = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<AuthForm>({ defaultValues: { name: "", email: "", pw: "" } });

  const signup = mode === "signup";
  const loading =
    auth.login.isPending || auth.signup.isPending || auth.googleLogin.isPending;

  const toggleMode = () => {
    setMode(signup ? "login" : "signup");
    clearErrors();
  };

  const onSubmit = handleSubmit(async (values) => {
    const parsed = authSchema(mode).safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setError(issue.path[0] as keyof AuthForm, { message: issue.message });
      }
      return;
    }
    const mutation = signup ? auth.signup : auth.login;
    await mutation.mutateAsync(values);
    router.push("/trips");
  });

  const onGoogle = async () => {
    await auth.googleLogin.mutateAsync();
    router.push("/trips");
  };

  return (
    <div className="relative flex flex-1 items-center justify-center p-10">
      <div className="flex w-[380px] flex-col">
        <div className="mb-6 flex flex-col gap-1.5">
          <h1 className="text-[25px] font-extrabold tracking-tight text-ink">
            {signup ? "제이로 계정 만들기" : "다시 오신 걸 환영해요"}
          </h1>
          <span className="text-sm font-medium text-faint">
            {signup
              ? "몇 초면 끝나요. 바로 여행을 시작할 수 있어요."
              : "로그인하고 함께 만들던 여행을 이어가세요."}
          </span>
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={onGoogle}
          className="flex h-[50px] items-center justify-center gap-2.5 rounded-md border border-line-strong bg-background text-[14.5px] font-bold text-body hover:bg-secondary"
        >
          <GoogleMark />
          Google로 계속하기
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-line" />
          <span className="text-xs font-semibold text-mute">또는 이메일로</span>
          <div className="h-px flex-1 bg-line" />
        </div>

        {/* 이메일 폼 */}
        <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
          {signup && (
            <FormField label="이름" error={errors.name?.message}>
              <Input
                {...register("name")}
                leftIcon="user"
                placeholder="홍길동"
                invalid={!!errors.name}
              />
            </FormField>
          )}
          <FormField label="이메일" error={errors.email?.message}>
            <Input
              {...register("email")}
              type="email"
              leftIcon="mail"
              placeholder="you@email.com"
              invalid={!!errors.email}
            />
          </FormField>
          <FormField label="비밀번호" error={errors.pw?.message}>
            <Input
              {...register("pw")}
              type={showPw ? "text" : "password"}
              leftIcon="lock"
              placeholder={signup ? "6자 이상" : "비밀번호"}
              invalid={!!errors.pw}
              endAdornment={
                <button
                  type="button"
                  aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
                  onClick={() => setShowPw((v) => !v)}
                  className="flex text-mute hover:text-subtle"
                >
                  <Icon name={showPw ? "eye-off" : "eye"} size={16} />
                </button>
              }
            />
          </FormField>

          {!signup && (
            <div className="-mt-1 flex justify-end">
              <button
                type="button"
                className="text-[12.5px] font-semibold text-faint hover:text-subtle"
              >
                비밀번호를 잊으셨나요?
              </button>
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" className="mt-1 gap-2">
            {signup ? "가입하고 시작하기" : "로그인"}
            <Icon name="arrow-right" size={18} strokeWidth={2.3} />
          </Button>
        </form>

        {/* 모드 토글 */}
        <div className="mt-[22px] flex items-center justify-center gap-1.5 text-[13.5px]">
          <span className="font-medium text-faint">
            {signup ? "이미 계정이 있으신가요?" : "아직 계정이 없으신가요?"}
          </span>
          <button
            type="button"
            onClick={toggleMode}
            className="font-bold text-primary-hover"
          >
            {signup ? "로그인" : "회원가입"}
          </button>
        </div>

        {/* 둘러보기 */}
        <div className="mt-[26px] flex justify-center border-t border-line pt-[22px]">
          <Link
            href="/share/demo"
            className="inline-flex h-[42px] items-center gap-1.5 rounded-md border border-line-strong bg-background px-[18px] text-[13.5px] font-bold text-subtle hover:bg-secondary"
          >
            <Icon name="eye" size={16} strokeWidth={2} />
            공유 링크로 둘러보기
          </Link>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 bg-background/90 backdrop-blur-sm">
          <span className="size-[38px] animate-spin rounded-full border-[3.5px] border-primary-tint border-t-primary" />
          <span className="text-sm font-bold text-ink">
            {signup ? "계정을 만드는 중…" : "로그인하는 중…"}
          </span>
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12.5px] font-bold text-body">{label}</label>
      {children}
      {error && <span className="text-[11.5px] font-semibold text-danger">{error}</span>}
    </div>
  );
}

/** 구글 브랜드 마크(멀티컬러) — 우리 아이콘 세트(단색 Lucide)와 별개라 인라인 SVG. */
function GoogleMark() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}
