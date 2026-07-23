import type { IconName } from "@/components/ui/icon";
import type { TransferMode } from "@/features/trip";

/**
 * 도시 간 이동 수단 메타(다중 도시 Phase 5) — 라벨·Lucide 아이콘 단일 출처(하드코딩 금지, cityColors 와 같은 규약).
 * 아이콘은 앱 아이콘 세트(icons.ts)에 등록된 이름만 사용(train·plane·bus·car·route).
 */
export interface TransferModeMeta {
  value: TransferMode;
  label: string;
  icon: IconName;
}

export const TRANSFER_MODES: TransferModeMeta[] = [
  { value: "train", label: "기차", icon: "train" },
  { value: "flight", label: "항공", icon: "plane" },
  { value: "bus", label: "버스", icon: "bus" },
  { value: "car", label: "자동차", icon: "car" },
  { value: "etc", label: "이동", icon: "route" },
];

const BY_VALUE = new Map(TRANSFER_MODES.map((m) => [m.value, m]));

/** 모드 → 메타(미지정/알 수 없으면 '이동' 폴백). */
export function transferMode(mode: TransferMode | null | undefined): TransferModeMeta {
  return (mode && BY_VALUE.get(mode)) || TRANSFER_MODES[TRANSFER_MODES.length - 1];
}

/** 'HH:MM' → '오전/오후 h:mm' 표시(빈값이면 null). */
export function formatTransferTime(time: string | null | undefined): string | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${String(m).padStart(2, "0")}`;
}
