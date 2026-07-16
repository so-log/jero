"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";

import type { IconName } from "@/lib/constants/icons";
import { cn } from "@/lib/utils";

import { Icon } from "./icon";

/**
 * 콤보박스(자유 입력 + 제안 필터) — base-ui Autocomplete 기반. 입력값(문자열)을 그대로 폼에 바인딩한다.
 * 제안 목록에서 선택하거나 직접 타이핑 모두 `onValueChange(문자열)` 로 전달(값 유실 없음).
 * 스타일은 Input(디자인 시스템)과 동일 토큰. 무거운 라이브러리 미사용(기존 UI 프리미티브 재사용).
 */
interface ComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  items: readonly string[];
  placeholder?: string;
  leftIcon?: IconName;
  invalid?: boolean;
  /** 제안이 없을 때 안내(자유 입력 가능 암시). */
  emptyText?: string;
  "aria-label"?: string;
}

export function Combobox({
  value,
  onValueChange,
  items,
  placeholder,
  leftIcon,
  invalid,
  emptyText = "직접 입력할 수 있어요",
  "aria-label": ariaLabel,
}: ComboboxProps) {
  return (
    <Autocomplete.Root
      items={items}
      value={value}
      onValueChange={(next) => onValueChange(next)}
      mode="list"
      // 입력창을 탭/클릭하면 제안이 바로 열리게(모바일에선 타이핑 전 열림 신호가 없어 "안 됨"으로 보였음).
      // 빈 입력이면 전체 목록, 타이핑하면 필터 — 데스크톱 동작·자유 입력 유지.
      openOnInputClick
    >
      <div className="relative flex items-center">
        {leftIcon && (
          <span
            className={cn(
              "pointer-events-none absolute left-3.5 flex",
              invalid ? "text-danger" : "text-faint",
            )}
          >
            <Icon name={leftIcon} size={16} />
          </span>
        )}
        <Autocomplete.Input
          aria-label={ariaLabel}
          aria-invalid={invalid ?? undefined}
          placeholder={placeholder}
          className={cn(
            "h-12 w-full rounded-md border-[1.5px] bg-background text-sm font-medium text-ink outline-none transition-colors placeholder:text-faint",
            leftIcon ? "pl-[38px]" : "pl-3.5",
            "pr-3.5",
            invalid
              ? "border-danger bg-danger-tint focus:border-danger"
              : "border-line-strong focus:border-primary focus:shadow-focus",
          )}
        />
      </div>

      <Autocomplete.Portal>
        <Autocomplete.Positioner sideOffset={6} className="z-50 outline-none">
          <Autocomplete.Popup className="max-h-[240px] w-[var(--anchor-width)] min-w-[180px] overflow-y-auto rounded-md border border-line bg-background py-1.5 shadow-elevated">
            <Autocomplete.Empty className="px-3.5 py-2 text-[12.5px] font-medium text-faint">
              {emptyText}
            </Autocomplete.Empty>
            <Autocomplete.List>
              {(item: string) => (
                <Autocomplete.Item
                  key={item}
                  value={item}
                  className="flex cursor-pointer items-center px-3.5 py-2 text-[13.5px] font-medium text-body outline-none data-[highlighted]:bg-secondary"
                >
                  {item}
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}
