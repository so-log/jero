"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button, buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";

import { useAuth } from "../api/useAuth";
import { useAuthUser } from "../api/useAuthUser";
import { resetPasswordSchema, type ResetPasswordForm } from "../lib/authSchema";

/**
 * 새 비밀번호 설정(비밀번호 재설정) — 복구 링크 진입 시 콜백이 코드를 세션으로 교환해 여기로 온다.
 * 세션(복구)이 있으면 새 비번 폼, 없으면(만료/무효) 안내. useAuth.updatePassword 경유(§7.1). 성공 → /trips.
 */
export function ResetPasswordPanel() {
  const router = useRouter();
  const { updatePassword } = useAuth();
  const { data: session, isLoading } = useAuthUser();
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordForm>({ defaultValues: { pw: "", confirm: "" } });

  const onSubmit = handleSubmit(async (values) => {
    const parsed = resetPasswordSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setError(issue.path[0] as keyof ResetPasswordForm, {
          message: issue.message,
        });
      }
      return;
    }
    try {
      await updatePassword.mutateAsync(values.pw);
      router.push("/trips");
    } catch (e) {
      setError("pw", {
        message:
          e instanceof Error
            ? e.message
            : "비밀번호를 변경하지 못했어요. 다시 시도해 주세요.",
      });
    }
  });

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-surface p-6">
      <div className="relative flex w-full max-w-[380px] flex-col rounded-card border border-line bg-background p-7 shadow-card sm:p-9">
        {/* 브랜드 */}
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#6E9CF2] to-[#8FBCF7] text-white">
            <Icon name="map-pin" size={20} strokeWidth={2.4} />
          </span>
          <span className="text-[19px] font-extrabold tracking-tight text-ink">jero</span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center gap-3.5 py-8">
            <span className="size-9 animate-spin rounded-full border-[3.5px] border-primary-tint border-t-primary" />
            <span className="text-sm font-semibold text-faint">확인하는 중…</span>
          </div>
        ) : session?.authenticated ? (
          <>
            <div className="mb-6 flex flex-col gap-1.5">
              <h1 className="text-[23px] font-extrabold tracking-tight text-ink">
                새 비밀번호 설정
              </h1>
              <span className="text-sm font-medium text-faint">
                안전한 새 비밀번호를 입력해 주세요(8자 이상).
              </span>
            </div>

            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5">
              <Field label="새 비밀번호" error={errors.pw?.message}>
                <Input
                  {...register("pw")}
                  type={showPw ? "text" : "password"}
                  leftIcon="lock"
                  placeholder="8자 이상"
                  invalid={!!errors.pw}
                  endAdornment={
                    <button
                      type="button"
                      aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
                      onClick={() => setShowPw((v) => !v)}
                      className="flex size-6 items-center justify-center text-mute hover:text-subtle"
                    >
                      <Icon name={showPw ? "eye-off" : "eye"} size={16} />
                    </button>
                  }
                />
              </Field>
              <Field label="새 비밀번호 확인" error={errors.confirm?.message}>
                <Input
                  {...register("confirm")}
                  type={showPw ? "text" : "password"}
                  leftIcon="lock"
                  placeholder="한 번 더 입력"
                  invalid={!!errors.confirm}
                />
              </Field>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="mt-1 gap-2"
                disabled={updatePassword.isPending}
              >
                {updatePassword.isPending ? "변경하는 중…" : "비밀번호 변경하기"}
                {!updatePassword.isPending && (
                  <Icon name="arrow-right" size={18} strokeWidth={2.3} />
                )}
              </Button>
            </form>
          </>
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-1.5">
              <h1 className="text-[23px] font-extrabold tracking-tight text-ink">
                링크가 만료됐어요
              </h1>
              <span className="text-sm font-medium leading-relaxed text-faint">
                재설정 링크가 만료됐거나 이미 사용됐어요. 다시 요청해 주세요.
              </span>
            </div>
            <Link href="/" className={buttonVariants({ variant: "primary", size: "lg" })}>
              로그인으로 돌아가기
              <Icon name="arrow-right" size={17} strokeWidth={2.3} />
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

function Field({
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
