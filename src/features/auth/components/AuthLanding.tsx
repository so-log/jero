"use client";

import { Icon, type IconName } from "@/components/ui/icon";

import { AuthPanel } from "./AuthPanel";

/**
 * 01 로그인/랜딩 — 좌측 브랜드/가치/기능 + 우측 인증 패널(설계 §3). 비로그인 열람 가능.
 * 로그인 상태로 `/` 접근 시 `/trips` 리다이렉트는 서버 세션 검증으로(§8.2, 미들웨어 TODO).
 */
const FEATURES: { icon: IconName; bg: string; fg: string; title: string; desc: string }[] = [
  { icon: "users", bg: "var(--color-primary-tint)", fg: "var(--color-primary-hover)", title: "실시간 협업", desc: "친구들과 동시에 편집하고 커서까지 함께 봐요" },
  { icon: "route", bg: "var(--color-success-tint)", fg: "var(--color-success)", title: "순서 · 동선 정리", desc: "장소를 순서대로 잇고 지도에 동선을 그려요" },
  { icon: "wallet", bg: "var(--color-warn-tint)", fg: "var(--color-warn)", title: "예산 · 더치페이", desc: "지출을 모으고 누가 누구에게 줄지 자동 정산" },
];

export function AuthLanding() {
  return (
    <main className="flex min-h-screen w-full">
      {/* 좌측 — 브랜드/가치 */}
      <div
        className="relative hidden w-[660px] flex-none flex-col overflow-hidden p-[48px_52px] lg:flex"
        style={{
          background:
            "radial-gradient(125% 100% at 12% 8%, var(--color-primary-tint) 0%, #EEF1FB 40%, var(--color-success-tint) 100%)",
        }}
      >
        <div className="relative flex items-center gap-2.5">
          <span className="flex size-[38px] items-center justify-center rounded-lg bg-gradient-to-br from-[#6E9CF2] to-[#8FBCF7] text-white shadow-[0_4px_10px_-2px_color-mix(in_srgb,#5B8DEF_50%,transparent)]">
            <Icon name="map-pin" size={22} strokeWidth={2.4} />
          </span>
          <span className="text-[21px] font-extrabold tracking-tight text-ink">jero</span>
        </div>

        <div className="relative mt-16 flex flex-col gap-[18px]">
          <span className="inline-flex w-max items-center gap-1.5 rounded-pill border border-primary-tint bg-white/70 px-3.5 py-1.5 text-[12.5px] font-bold text-primary-hover">
            <Icon name="sparkles" size={14} strokeWidth={2.2} />
            함께 만드는 여행
          </span>
          <h1 className="text-[44px] leading-[1.18] font-extrabold tracking-tight text-ink">
            친구들과 함께 짜는
            <br />
            여행 계획, 한 곳에서.
          </h1>
          <p className="max-w-[430px] text-[16.5px] leading-relaxed font-medium text-subtle">
            가고 싶은 곳을 모으고, 순서와 동선을 함께 정하고, 예산까지 한 번에.
            실시간으로 같이 만드는 여행 플래너예요.
          </p>
        </div>

        <div className="relative mt-auto flex flex-col gap-2.5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex items-center gap-3 rounded-lg border border-white/70 bg-white/60 p-[13px_15px] backdrop-blur"
            >
              <span
                className="flex size-[42px] flex-none items-center justify-center rounded-md"
                style={{ background: f.bg, color: f.fg }}
              >
                <Icon name={f.icon} size={21} strokeWidth={2} />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-ink">{f.title}</span>
                <span className="text-[12.5px] font-medium text-subtle">{f.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 우측 — 인증 */}
      <AuthPanel />
    </main>
  );
}
