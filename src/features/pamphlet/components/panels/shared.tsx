import type { CSSProperties, ReactNode } from "react";

/** A4 3단 한 패널 비율(시안). height = width / 0.4714. */
export const PANEL_RATIO = 0.4714;
export const panelHeight = (w: number): number => Math.round(w / PANEL_RATIO);

/** 패널 외곽 셸(고정 스켈레톤, 테마만 가변). */
export function PanelShell({
  w,
  children,
  style,
}: {
  w: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        width: w,
        height: panelHeight(w),
        background: "#fff",
        border: "1px solid #E4E7EC",
        borderRadius: 6,
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 1px 2px rgba(16,24,40,.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** jero 브랜드 마크(정적 SVG, 유저 데이터 없음). */
export function JeroMark({
  size,
  color,
  strokeWidth = 3.2,
}: {
  size: number;
  color: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="24" cy="9" r="5" />
      <circle cx="24" cy="9" r="1.9" fill={color} stroke="none" />
      <path d="M24 14V25a5.5 5.5 0 0 1-11 0" />
    </svg>
  );
}
