"use client";

import { useRef, useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { MEMBER_COLORS } from "@/lib/constants/members";
import { cn } from "@/lib/utils";

import { useDeleteAvatar, useUploadAvatar } from "../api/useAccount";
import type { ProfileForm } from "../lib/profileSchema";

/** 프로필 섹션 — 사진(업로드/삭제)/색 + 이름(편집) + 이메일(읽기 전용·인증됨). 시안 profile. */
export function ProfileSection({
  email,
  avatarUrl,
}: {
  email: string;
  /** 현재 저장된 프로필 사진 URL(useProfileQuery). 없으면 색·이니셜. */
  avatarUrl?: string | null;
}) {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<ProfileForm>();
  const name = useWatch({ control, name: "name" });
  const color = useWatch({ control, name: "avatarColor" });
  const initial = (name?.trim()?.[0] ?? "지").toUpperCase();

  // 사진 업로드/삭제(폼 저장과 독립 — 즉시 반영, ['profile'] 무효화). 컴포넌트 직접 fetch 없음(§7.1).
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const busy = uploadAvatar.isPending || deleteAvatar.isPending;

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 재선택 허용
    if (!file) return;
    setAvatarError(null);
    uploadAvatar.mutate(file, {
      onError: (err) => setAvatarError(err.message),
    });
  };
  const onDeleteAvatar = () => {
    setAvatarError(null);
    deleteAvatar.mutate(undefined, {
      onError: (err) => setAvatarError(err.message),
    });
  };

  return (
    <section id="section-profile" className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-extrabold tracking-tight text-ink">프로필</h2>
        <span className="text-[13px] font-medium text-faint">
          다른 멤버에게 보이는 정보예요.
        </span>
      </div>

      <div className="overflow-hidden rounded-panel border border-line bg-background">
        {/* 사진 + 색 (좁은 폭에서 색 스와치가 다음 줄로) */}
        <div className="flex flex-wrap items-center gap-4 border-b border-line p-[18px]">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage 동적 아바타
            <img
              src={avatarUrl}
              alt="프로필 사진"
              className="size-16 flex-none rounded-full object-cover"
              style={{ boxShadow: `0 0 0 2px ${color}` }}
            />
          ) : (
            <span
              className="flex size-16 flex-none items-center justify-center rounded-full text-2xl font-bold text-white"
              style={{ background: color }}
            >
              {initial}
            </span>
          )}
          <div className="flex flex-col gap-2">
            <span className="text-[13.5px] font-bold text-body">프로필 사진</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickFile}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="inline-flex h-[34px] items-center gap-1.5 rounded-md border border-line-strong bg-background px-3 text-[12.5px] font-bold text-body hover:bg-secondary disabled:opacity-50"
              >
                <Icon name="upload" size={15} strokeWidth={2} />
                {uploadAvatar.isPending ? "올리는 중…" : "업로드"}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={onDeleteAvatar}
                  disabled={busy}
                  className="h-[34px] rounded-md px-3 text-[12.5px] font-semibold text-mute hover:bg-secondary hover:text-subtle disabled:opacity-50"
                >
                  {deleteAvatar.isPending ? "삭제 중…" : "삭제"}
                </button>
              )}
            </div>
            {avatarError ? (
              <span className="text-[11.5px] font-semibold text-danger">{avatarError}</span>
            ) : (
              <span className="text-[11.5px] font-medium text-faint">
                JPG · PNG · WEBP · 2MB 이하
              </span>
            )}
          </div>
          <Controller
            control={control}
            name="avatarColor"
            render={({ field }) => (
              <div className="ml-auto flex gap-2">
                {MEMBER_COLORS.map((c) => {
                  const on = field.value === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-label={`아바타 색 ${c}`}
                      aria-pressed={on}
                      onClick={() => field.onChange(c)}
                      className={cn(
                        "flex size-[26px] items-center justify-center rounded-full transition-transform",
                        on && "scale-105 ring-2 ring-white",
                      )}
                      style={{
                        background: c,
                        boxShadow: on ? `0 0 0 2px ${c}` : undefined,
                      }}
                    >
                      {on && <Icon name="check" size={14} strokeWidth={3} color="#fff" />}
                    </button>
                  );
                })}
              </div>
            )}
          />
        </div>

        {/* 이름 */}
        <div className="flex flex-col gap-1.5 border-b border-line p-[18px]">
          <label className="text-[12.5px] font-bold text-body">이름</label>
          <Input {...register("name")} placeholder="이름" invalid={!!errors.name} />
          {errors.name ? (
            <span className="text-[11.5px] font-semibold text-danger">
              {errors.name.message}
            </span>
          ) : (
            <span className="text-[11.5px] font-medium text-faint">
              멤버 목록과 커서에 표시돼요
            </span>
          )}
        </div>

        {/* 이메일(읽기 전용) */}
        <div className="flex flex-col gap-1.5 p-[18px]">
          <div className="flex items-center gap-2">
            <label className="text-[12.5px] font-bold text-body">이메일</label>
            <span className="inline-flex items-center gap-1 rounded-pill bg-success-tint px-1.5 py-0.5 text-[10.5px] font-bold text-success">
              <Icon name="check" size={11} strokeWidth={2.6} />
              인증됨
            </span>
          </div>
          <div className="flex h-12 items-center gap-2.5 rounded-md border-[1.5px] border-line-strong bg-secondary px-3.5">
            <Icon name="mail" size={16} className="text-faint" />
            <span className="flex-1 text-sm font-medium text-subtle">{email}</span>
            <Icon name="lock" size={14} className="text-mute" />
          </div>
          <span className="text-[11.5px] font-medium text-faint">
            로그인에 사용하는 이메일이에요
          </span>
        </div>
      </div>
    </section>
  );
}
