import type { PamphletTheme } from "@/lib/constants/pamphletThemes";

import { useQrCode } from "../../api/useQrCode";
import { JeroMark, PanelShell } from "./shared";

/** QR 패널 — 공유 링크(/share/[token]) QR + 안내. QR 은 qrcode 라이브러리 SVG(테마 ink 색). */
export function QrPanel({
  theme,
  w,
  tripId,
}: {
  theme: PamphletTheme;
  w: number;
  tripId: string;
}) {
  const s = w / 232;
  const { svg } = useQrCode(tripId, theme.ink);
  const qrSize = 110 * s;

  return (
    <PanelShell w={w}>
      <div style={{ position: "absolute", inset: 0, background: theme.wash }} />
      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: `0 ${18 * s}px`, gap: 14 * s }}>
        <span style={{ fontSize: 9 * s, fontWeight: 700, color: theme.accent, letterSpacing: ".14em" }}>SCAN TO OPEN</span>
        <div style={{ padding: 12 * s, background: "#fff", borderRadius: 12 * s, boxShadow: "0 4px 14px -4px rgba(16,24,40,.2)" }}>
          <div style={{ width: qrSize, height: qrSize, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {svg ? (
              <span
                style={{ display: "block", width: qrSize, height: qrSize, lineHeight: 0 }}
                // qrcode 라이브러리 출력 SVG(앱 origin + 자체 발급 토큰만, 유저 입력 없음) — 안전.
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <span style={{ width: qrSize, height: qrSize, borderRadius: 8, background: theme.chipBg }} />
            )}
          </div>
        </div>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 3 * s }}>
          <span style={{ fontSize: 13 * s, fontWeight: 800, color: theme.ink }}>제이로 앱에서 열기</span>
          <span style={{ fontSize: 10 * s, fontWeight: 500, color: theme.ink, opacity: 0.55 }}>실시간으로 함께 편집해요</span>
        </div>
      </div>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 * s, paddingBottom: 18 * s }}>
        <span style={{ width: 20 * s, height: 20 * s, borderRadius: 6 * s, background: theme.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <JeroMark size={12 * s} color="#fff" strokeWidth={3.4} />
        </span>
        <span style={{ fontSize: 12 * s, fontWeight: 800, color: theme.ink, letterSpacing: "-.04em" }}>jero.app</span>
      </div>
    </PanelShell>
  );
}
