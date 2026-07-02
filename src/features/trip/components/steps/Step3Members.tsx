"use client";

import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

import { inviteSchema, type CreateTripInput, type InviteRole } from "../../lib/tripSchema";

/**
 * Step3 — 멤버 초대(선택). 이메일 추가/제거 + 역할 토글(편집 가능/읽기 전용, owner 불가) + 초대 링크.
 * 생성자(나)는 owner 로 고정 표시(목록엔 미포함 — 서버가 owner 추가). 시안 step3.
 */
const ME = { name: "지현", email: "jihyun@trip.co", color: "#3B7DF0" };
const MEMBER_COLORS = ["#FF8A65", "#3FC4A0", "#B07CF0", "#F0A93C", "#E0609A", "#4FA8D8"];

export function Step3Members() {
  const { control } = useFormContext<CreateTripInput>();
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "members",
  });
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);

  const add = () => {
    const parsed = inviteSchema.shape.email.safeParse(draft);
    if (!parsed.success) {
      setDraftError(parsed.error.issues[0]?.message ?? "이메일을 확인해 주세요");
      return;
    }
    if (fields.some((f) => f.email === parsed.data)) {
      setDraftError("이미 추가된 멤버예요");
      return;
    }
    append({ email: parsed.data, role: "editor" });
    setDraft("");
    setDraftError(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 이메일 초대 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[12.5px] font-bold text-body">이메일로 초대</label>
        <div className="flex gap-2">
          <div className="relative flex flex-1 items-center">
            <span className="pointer-events-none absolute left-3.5 text-faint">
              <Icon name="mail" size={16} />
            </span>
            <input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setDraftError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder="friend@email.com"
              className={cn(
                "h-[46px] w-full rounded-md border-[1.5px] bg-background pr-3.5 pl-[38px] text-sm font-medium text-ink outline-none transition-colors focus:border-primary focus:shadow-focus",
                draftError ? "border-danger" : "border-line-strong",
              )}
            />
          </div>
          <button
            type="button"
            onClick={add}
            className="inline-flex h-[46px] flex-none items-center gap-1.5 rounded-md bg-primary-tint px-4 text-[13.5px] font-bold text-primary-hover hover:bg-[color-mix(in_srgb,var(--color-primary-tint),#000_4%)]"
          >
            <Icon name="plus" size={17} strokeWidth={2.4} />
            추가
          </button>
        </div>
        {draftError && (
          <span className="text-[11.5px] font-semibold text-danger">{draftError}</span>
        )}
      </div>

      {/* 멤버 목록 */}
      <div className="flex flex-col gap-2">
        <MemberRow
          name={ME.name}
          email={ME.email}
          color={ME.color}
          isOwner
        />
        {fields.map((field, i) => (
          <MemberRow
            key={field.id}
            name={field.email.split("@")[0]}
            email={field.email}
            color={MEMBER_COLORS[i % MEMBER_COLORS.length]}
            role={field.role}
            onRole={(role) => update(i, { ...field, role })}
            onRemove={() => remove(i)}
          />
        ))}
      </div>

      {/* 초대 링크 */}
      <div className="flex items-center gap-3 rounded-panel border border-dashed border-line-strong bg-primary-wash px-3.5 py-3">
        <span className="flex size-[34px] flex-none items-center justify-center rounded-md bg-primary-tint text-primary-hover">
          <Icon name="link" size={17} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-body">초대 링크로 공유</div>
          <div className="truncate text-xs font-medium text-faint">
            jero.app/i/tokyo-4d92x · 읽기 전용
          </div>
        </div>
        <button
          type="button"
          className="inline-flex h-9 flex-none items-center gap-1.5 rounded-md border border-line-strong bg-background pr-3.5 pl-3 text-[13px] font-bold text-body hover:bg-secondary"
        >
          <Icon name="copy" size={15} strokeWidth={2} className="text-faint" />
          복사
        </button>
      </div>
    </div>
  );
}

function MemberRow({
  name,
  email,
  color,
  role,
  isOwner = false,
  onRole,
  onRemove,
}: {
  name: string;
  email: string;
  color: string;
  role?: InviteRole;
  isOwner?: boolean;
  onRole?: (role: InviteRole) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-panel border border-line bg-surface px-3 py-2.5">
      <span
        className="flex size-[34px] flex-none items-center justify-center rounded-full border-2 bg-background text-[13px] font-bold"
        style={{ borderColor: color, color }}
      >
        {name[0]?.toUpperCase()}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[13.5px] font-bold text-body">
          {name}
          {isOwner && (
            <span className="ml-1.5 text-[11.5px] font-semibold text-faint">(나)</span>
          )}
        </span>
        <span className="truncate text-xs font-medium text-faint">{email}</span>
      </div>
      {isOwner ? (
        <span className="inline-flex h-[30px] items-center gap-1 rounded-pill bg-primary-tint px-2.5 text-xs font-bold text-primary-hover">
          <Icon name="crown" size={13} strokeWidth={2.1} />
          소유자
        </span>
      ) : (
        <div className="inline-flex gap-0.5 rounded-md bg-secondary p-[3px]">
          {(["editor", "viewer"] as const).map((k) => {
            const on = role === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => onRole?.(k)}
                className={cn(
                  "h-6 rounded-xs px-2.5 text-[11.5px] transition-colors",
                  on
                    ? "bg-background font-bold text-primary-strong shadow-card"
                    : "font-semibold text-faint",
                )}
              >
                {k === "editor" ? "편집 가능" : "읽기 전용"}
              </button>
            );
          })}
        </div>
      )}
      {isOwner ? (
        <span className="w-7 flex-none" />
      ) : (
        <button
          type="button"
          aria-label="멤버 제거"
          onClick={onRemove}
          className="flex size-7 flex-none items-center justify-center rounded-md text-mute hover:bg-danger-tint hover:text-danger"
        >
          <Icon name="x" size={16} strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}
