"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { RoleBadge } from "@/components/ui/role-badge";
import { formatPeriod } from "@/lib/tripDate";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";

import { useAcceptInvite, usePreviewInvite } from "../api/useInvite";

/**
 * 12 초대 수락(/invite/[token]) — 미리보기 + 수락. 로그인/비로그인 분기, 만료/무효 에러.
 * accept_invite RPC(계약 B2.1) 연결. 레이아웃은 01/11 중앙 카드 톤 계승(시안: 초대 수락.dc.html).
 */
export function InviteAcceptView({ token }: { token: string }) {
  const router = useRouter();
  const preview = usePreviewInvite(token);
  const accept = useAcceptInvite();
  // 키 없으면(스텁) 로그인 간주. 실연동은 아래 effect 의 비동기 콜백에서만 setState.
  const [loggedIn, setLoggedIn] = useState<boolean | null>(
    hasSupabase ? null : true,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSupabase) return;
    let alive = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (alive) setLoggedIn(!!data.user);
      });
    return () => {
      alive = false;
    };
  }, []);

  const onAccept = () => {
    setError(null);
    accept.mutate(token, {
      onSuccess: (tripId) => router.push(`/trips/${tripId}?view=plan`),
      onError: (e) => setError(e.message),
    });
  };

  const busy = preview.isLoading || loggedIn === null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-[420px]">
        {busy ? (
          <Center>
            <span className="size-9 animate-spin rounded-full border-[3px] border-primary-tint border-t-primary" />
          </Center>
        ) : !preview.data?.ok ? (
          <ErrorCard onHome={() => router.push("/")} />
        ) : (
          <div className="flex flex-col gap-5 rounded-card border border-line bg-background p-7 shadow-modal">
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="mb-1 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#6E9CF2] to-[#8FBCF7] text-white shadow-card">
                <Icon name="map-pin" size={24} strokeWidth={2.1} />
              </span>
              <span className="text-[13px] font-semibold text-faint">
                {preview.data.inviter_name}님이 초대했어요
              </span>
              <h1 className="text-[21px] font-extrabold tracking-tight text-ink">
                {preview.data.trip_title}
              </h1>
              <span className="text-[13px] font-medium text-faint">
                {formatPeriod(preview.data.start_date, preview.data.end_date)}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3">
              <span className="text-[13px] font-semibold text-subtle">부여될 역할</span>
              <RoleBadge role={preview.data.role} />
            </div>

            {error && (
              <span className="text-center text-[12.5px] font-semibold text-danger">
                {error}
              </span>
            )}

            {loggedIn ? (
              <Button
                variant="primary"
                size="lg"
                className="gap-2"
                disabled={accept.isPending}
                onClick={onAccept}
              >
                {accept.isPending ? "참여하는 중…" : "수락하고 참여하기"}
                {!accept.isPending && (
                  <Icon name="arrow-right" size={18} strokeWidth={2.3} />
                )}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                className="gap-2"
                onClick={() =>
                  router.push(`/?returnTo=${encodeURIComponent(`/invite/${token}`)}`)
                }
              >
                로그인하고 수락
                <Icon name="arrow-right" size={18} strokeWidth={2.3} />
              </Button>
            )}
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-center text-[13px] font-semibold text-faint hover:text-subtle"
            >
              나중에 할게요
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-center py-20">{children}</div>;
}

function ErrorCard({ onHome }: { onHome: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-line bg-background p-8 text-center shadow-modal">
      <span className="flex size-16 items-center justify-center rounded-full bg-secondary text-faint">
        <Icon name="clock" size={30} strokeWidth={1.9} />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[20px] font-extrabold tracking-tight text-ink">
          유효하지 않은 초대예요
        </h1>
        <p className="text-[13.5px] font-medium text-faint">
          이 초대 링크는 만료됐거나 더 이상 사용할 수 없어요. 초대한 분께 새 링크를 요청해 주세요.
        </p>
      </div>
      <Button variant="secondary" onClick={onHome} className="mt-1">
        홈으로
      </Button>
    </div>
  );
}
