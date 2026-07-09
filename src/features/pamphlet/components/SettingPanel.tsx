"use client";

import { useState } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import {
  PAMPHLET_THEMES,
  PAMPHLET_THEME_ORDER,
} from "@/lib/constants/pamphletThemes";
import { cn } from "@/lib/utils";

import { miniSceneSvg, SvgArt } from "../lib/art";
import type { PamphletSections } from "../lib/faces";
import { usePamphletStore } from "../store/pamphletStore";

const SECTIONS: { k: keyof PamphletSections; label: string; icon: IconName }[] = [
  { k: "cover", label: "표지", icon: "image" },
  { k: "schedule", label: "일정표", icon: "calendar" },
  { k: "prep", label: "준비물", icon: "list-checks" },
  { k: "intro", label: "여행지 소개", icon: "file-text" },
  { k: "qr", label: "QR 코드", icon: "qr-code" },
];

function Checkbox({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 flex-none items-center justify-center rounded-md border-2",
        on ? "border-primary bg-primary" : "border-line-strong bg-background",
      )}
    >
      {on && <Icon name="check" size={12} strokeWidth={3.2} color="#fff" />}
    </span>
  );
}

function Block({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-[13.5px] font-extrabold text-ink">{title}</span>
        {desc && <span className="text-xs font-medium text-faint">{desc}</span>}
      </div>
      {children}
    </div>
  );
}

/** 팜플렛 설정 패널(2차) — 섹션 체크 · 테마 칩 · 준비물 편집. 상태는 pamphletStore(§7.1). */
export function SettingPanel({ scheduleDisabled }: { scheduleDisabled: boolean }) {
  const { sections, themeKey, prep, toggleSection, setTheme, togglePrep, addPrep } =
    usePamphletStore();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const commitAdd = () => {
    const label = draft.trim();
    if (label) addPrep(label);
    setDraft("");
    setAdding(false);
  };

  return (
    <div className="flex flex-col gap-7">
      {/* 섹션 */}
      <Block title="포함할 섹션" desc="표지·일정표·준비물·소개·QR">
        <div className="flex flex-col gap-0.5">
          {SECTIONS.map((sec) => {
            const on = sections[sec.k];
            const disabled = sec.k === "schedule" && scheduleDisabled;
            return (
              <button
                key={sec.k}
                type="button"
                disabled={disabled}
                onClick={() => toggleSection(sec.k)}
                className={cn(
                  "flex h-[46px] w-full items-center gap-3 rounded-lg px-3 text-left transition-colors disabled:opacity-45",
                  on ? "bg-surface" : "hover:bg-secondary",
                )}
              >
                <Checkbox on={on && !disabled} />
                <span
                  className={cn(
                    "flex size-[30px] flex-none items-center justify-center rounded-md",
                    on ? "bg-primary-tint text-primary-hover" : "bg-secondary text-faint",
                  )}
                >
                  <Icon name={sec.icon} size={16} strokeWidth={2} />
                </span>
                <span className={cn("text-[13.5px]", on ? "font-bold text-ink" : "font-semibold text-faint")}>
                  {sec.label}
                  {disabled && " · 일정 없음"}
                </span>
              </button>
            );
          })}
        </div>
      </Block>

      {/* 테마 */}
      <Block title="테마">
        <div className="flex flex-wrap gap-2">
          {PAMPHLET_THEME_ORDER.map((k) => {
            const t = PAMPHLET_THEMES[k];
            const on = themeKey === k;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => setTheme(k)}
                className="inline-flex h-[38px] items-center gap-2 rounded-pill border-[1.5px] pr-3 pl-2 transition-colors"
                style={{
                  borderColor: on ? t.accent : "var(--color-line-strong)",
                  background: on ? t.soft : "var(--color-background)",
                }}
              >
                {t.scene ? (
                  <SvgArt inner={miniSceneSvg(t.scene, t)} vw={36} vh={36} width={22} height={22} style={{ borderRadius: 8, overflow: "hidden" }} />
                ) : (
                  <span className="flex">
                    <span className="inline-block size-[15px] rounded-full ring-[1.5px] ring-white" style={{ background: t.accent }} />
                    <span className="-ml-[5px] inline-block size-[15px] rounded-full ring-[1.5px] ring-white" style={{ background: t.accent2 }} />
                  </span>
                )}
                <span className="text-[13px] font-semibold" style={{ color: on ? t.ink : "var(--color-subtle)" }}>
                  {t.name}
                </span>
              </button>
            );
          })}
        </div>
      </Block>

      {/* 준비물 */}
      <Block title="준비물 체크리스트" desc="펼침면 뒷쪽에 인쇄돼요">
        <div className="flex flex-col gap-1.5">
          {prep.map((p, i) => (
            <div key={i} className="flex h-[38px] items-center gap-2.5 px-1.5">
              <button type="button" onClick={() => togglePrep(i)} className="inline-flex">
                <Checkbox on={p.on} />
              </button>
              <span className={cn("flex-1 text-[13px]", p.on ? "font-bold text-body" : "font-medium text-faint")}>
                {p.label}
              </span>
            </div>
          ))}
          {adding ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitAdd();
                } else if (e.key === "Escape") {
                  setAdding(false);
                  setDraft("");
                }
              }}
              onBlur={commitAdd}
              placeholder="준비물 이름"
              className="h-[38px] w-max rounded-md border-[1.5px] border-primary/40 bg-background px-3 text-[13px] font-semibold text-ink outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-0.5 inline-flex h-[38px] w-max items-center gap-1.5 rounded-md border border-dashed border-line-strong bg-background px-3 text-[12.5px] font-bold text-faint hover:border-primary hover:text-primary-hover"
            >
              <Icon name="plus" size={15} strokeWidth={2.2} />
              항목 추가
            </button>
          )}
        </div>
      </Block>
    </div>
  );
}
