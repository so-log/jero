"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";

import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { MEMBER_COLORS } from "@/lib/constants/members";
import { cn } from "@/lib/utils";

import type { ProfileForm } from "../lib/profileSchema";

/** 프로필 섹션 — 사진/색 + 이름(편집) + 이메일(읽기 전용·인증됨). 시안 profile. */
export function ProfileSection({ email }: { email: string }) {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<ProfileForm>();
  const name = useWatch({ control, name: "name" });
  const color = useWatch({ control, name: "avatarColor" });
  const initial = (name?.trim()?.[0] ?? "지").toUpperCase();

  return (
    <section id="section-profile" className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-extrabold tracking-tight text-ink">프로필</h2>
        <span className="text-[13px] font-medium text-faint">
          다른 멤버에게 보이는 정보예요.
        </span>
      </div>

      <div className="overflow-hidden rounded-panel border border-line bg-background">
        {/* 사진 + 색 */}
        <div className="flex items-center gap-4 border-b border-line p-[18px]">
          <span
            className="flex size-16 flex-none items-center justify-center rounded-full text-2xl font-bold text-white"
            style={{ background: color }}
          >
            {initial}
          </span>
          <div className="flex flex-col gap-2">
            <span className="text-[13.5px] font-bold text-body">프로필 사진</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-[34px] items-center gap-1.5 rounded-md border border-line-strong bg-background px-3 text-[12.5px] font-bold text-body hover:bg-secondary"
              >
                <Icon name="upload" size={15} strokeWidth={2} />
                업로드
              </button>
              <button
                type="button"
                className="h-[34px] rounded-md px-3 text-[12.5px] font-semibold text-mute hover:bg-secondary hover:text-subtle"
              >
                삭제
              </button>
            </div>
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
