"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";

import { useAutosaveMemo } from "../api/useUpsertPlace";

/** 입력이 멈춘 뒤 저장까지 대기(ms) — 자동저장 debounce(2차 F). */
const DEBOUNCE_MS = 600;

type SaveStatus = "idle" | "saving" | "saved";

/**
 * 장소 메모 인라인 자동저장(2차 F). editor+ 는 편집 → debounce 후 memo 만 patch(낙관적, 실패 롤백은 훅).
 * `placeId` 있으면 자동저장 모드(기존 장소), 없으면 생성 폼용(onChange 로 값만 상위에 전달).
 * viewer(canEdit=false)는 읽기 전용. 컴포넌트 직접 fetch 없음 — useAutosaveMemo 훅 경유(§7.1).
 */
export function MemoField({
  tripId,
  placeId,
  initial,
  canEdit,
  onChange,
}: {
  tripId: string;
  /** 기존 장소면 id(자동저장), 신규면 undefined(폼 저장). */
  placeId?: string;
  initial: string;
  canEdit: boolean;
  /** 상위 폼 동기화(생성 시 memo 반영·편집 시 제출 되돌림 방지). */
  onChange?: (value: string) => void;
}) {
  const { mutate } = useAutosaveMemo(tripId);
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const savedRef = useRef(initial); // 마지막으로 저장된 값

  // debounce 자동저장 — placeId(기존 장소) 편집 시에만. 입력마다 타이머 리셋 → 멈춘 뒤 1회 저장.
  useEffect(() => {
    if (!canEdit || !placeId) return;
    if (text === savedRef.current) return;
    setStatus("saving");
    const timer = setTimeout(() => {
      mutate(
        { placeId, memo: text },
        {
          onSuccess: () => {
            savedRef.current = text;
            setStatus("saved");
          },
          onError: () => setStatus("idle"), // 캐시 롤백은 훅이 처리
        },
      );
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, canEdit, placeId, mutate]);

  if (!canEdit) {
    return text ? (
      <p className="rounded-md bg-secondary px-3.5 py-2.5 text-sm font-medium leading-relaxed whitespace-pre-wrap text-subtle">
        {text}
      </p>
    ) : (
      <p className="text-[13px] font-medium text-faint">메모가 없어요</p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange?.(e.target.value);
        }}
        rows={3}
        placeholder="함께 보면 좋은 메모를 남겨보세요"
        className="w-full resize-none rounded-md border-[1.5px] border-line-strong bg-background px-3.5 py-2.5 text-sm font-medium leading-relaxed text-ink outline-none focus:border-primary focus:shadow-focus"
      />
      {placeId && (
        <span
          className="flex items-center gap-1 self-end text-[11.5px] font-semibold text-faint"
          role="status"
        >
          {status === "saving" && (
            <>
              <span className="size-3 animate-spin rounded-full border-[1.5px] border-primary-tint border-t-primary" />
              저장 중…
            </>
          )}
          {status === "saved" && (
            <>
              <Icon name="check" size={12} strokeWidth={2.6} className="text-success" />
              저장됨
            </>
          )}
        </span>
      )}
    </div>
  );
}
