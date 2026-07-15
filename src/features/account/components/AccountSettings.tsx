"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { Icon } from "@/components/ui/icon";

import {
  useDeleteAccount,
  useLogout,
  useProfileQuery,
  useUpdateProfile,
} from "../api/useAccount";
import { profileSchema, type ProfileForm } from "../lib/profileSchema";
import type { ProfileDto } from "../types";
import { AccountSection } from "./AccountSection";
import { PreferenceSection } from "./PreferenceSection";
import { ProfileSection } from "./ProfileSection";
import { SaveBar, type SaveStatus } from "./SaveBar";
import { SettingsNav, type SettingsSection } from "./SettingsNav";

/**
 * 09 계정 설정 — 상단 바 + 좌측 nav + 프로필/기본설정/계정관리 + 하단 저장 바(설계 §3).
 * RHF + Zod, 명시적 저장(dirty→저장, 되돌리기=reset). 컴포넌트 직접 fetch 금지(§7.1).
 */
function toForm(p: ProfileDto): ProfileForm {
  return {
    name: p.name,
    avatarColor: p.avatarColor,
    currency: p.currency,
    notif: p.notif,
  };
}

const EMPTY: ProfileForm = {
  name: "",
  avatarColor: "#3B7DF0",
  currency: "KRW",
  notif: { trip: false, comment: false, settle: false, marketing: false },
};

export function AccountSettings() {
  const router = useRouter();
  const { data: profile } = useProfileQuery();
  const update = useUpdateProfile();
  const deleteAccount = useDeleteAccount();
  const logout = useLogout();

  const [active, setActive] = useState<SettingsSection>("profile");

  const methods = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: EMPTY,
  });
  const {
    formState: { isDirty },
  } = methods;

  // 조회된 프로필로 폼 초기화(연동 시 fetch 완료 시점).
  const formValues = useMemo(() => (profile ? toForm(profile) : null), [profile]);
  useEffect(() => {
    if (formValues) methods.reset(formValues);
  }, [formValues, methods]);

  const status: SaveStatus = update.isPending
    ? "saving"
    : update.isError
      ? "error"
      : update.isSuccess && !isDirty
        ? "saved"
        : "idle";

  const onSave = methods.handleSubmit(async (values) => {
    await update.mutateAsync(values);
    methods.reset(values); // 저장값으로 기준 갱신 → dirty 해제
  });

  const goSection = (section: SettingsSection) => {
    setActive(section);
    document
      .getElementById(`section-${section}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onLogout = async () => {
    await logout();
    router.push("/");
  };
  const onDeleteAccount = async () => {
    await deleteAccount.mutateAsync();
    router.push("/");
  };

  return (
    <div className="flex h-screen flex-col">
      {/* 상단 바 */}
      <header className="flex h-16 flex-none items-center gap-2 border-b border-line bg-background px-4 md:gap-3.5 md:px-[22px]">
        <Link
          href="/trips"
          className="inline-flex h-11 flex-none items-center gap-1.5 rounded-md border border-line-strong bg-background pr-[11px] pl-2 text-[13px] font-semibold text-subtle hover:bg-secondary"
        >
          <Icon name="arrow-left" size={17} strokeWidth={2} />
          목록
        </Link>
        <span className="hidden h-6 w-px bg-line md:inline" />
        <span className="truncate text-[15px] font-extrabold tracking-tight text-ink md:text-[17px]">
          계정 설정
        </span>
        {profile && (
          <div className="ml-auto flex flex-none items-center gap-2.5">
            <span
              className="flex size-8 items-center justify-center rounded-full text-[13px] font-bold text-white"
              style={{ background: profile.avatarColor }}
            >
              {profile.name[0]}
            </span>
            <div className="hidden flex-col leading-tight sm:flex">
              <span className="text-[13px] font-bold text-ink">{profile.name}</span>
              <span className="text-[11.5px] font-medium text-faint">{profile.email}</span>
            </div>
          </div>
        )}
      </header>

      {/* 모바일: 세로 스택(상단 탭 nav → 콘텐츠 → 저장 바) / 데스크톱: 좌 nav + 우 콘텐츠 2단 */}
      <main className="flex min-h-0 flex-1 flex-col md:flex-row">
        <SettingsNav active={active} onSelect={goSection} />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-4 md:p-[30px_36px_28px]">
            <FormProvider {...methods}>
              <div className="flex max-w-[620px] flex-col gap-6 md:gap-[30px]">
                <ProfileSection email={profile?.email ?? ""} />
                <PreferenceSection />
                <AccountSection
                  onLogout={onLogout}
                  onDeleteAccount={onDeleteAccount}
                />
              </div>
            </FormProvider>
          </div>

          <SaveBar
            status={status}
            dirty={isDirty}
            onReset={() => formValues && methods.reset(formValues)}
            onSave={onSave}
          />
        </div>
      </main>
    </div>
  );
}
