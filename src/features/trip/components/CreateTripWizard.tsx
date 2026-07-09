"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { Icon } from "@/components/ui/icon";
import { Stepper } from "@/components/ui/stepper";
import { cn } from "@/lib/utils";

import { useCreateTrip } from "../api/useCreateTrip";
import {
  STEP_FIELDS,
  tripSchema,
  type CreateTripInput,
} from "../lib/tripSchema";
import { Step1Info } from "./steps/Step1Info";
import { Step2Dates } from "./steps/Step2Dates";
import { Step3Members } from "./steps/Step3Members";
import { Step4Mode } from "./steps/Step4Mode";

/**
 * 03 여행 생성 마법사 — RHF + Zod 다단계 폼(tripSchema 단일 출처). 컴포넌트 직접 fetch 금지(§7.1).
 * 단계별 trigger 검증 → 마지막에 useCreateTrip(스텁) → 성공 시 워크스페이스로 진입.
 */
const STEPS = ["여행 정보", "여행 기간", "멤버 초대", "시작 방식"];

const DEFAULTS: CreateTripInput = {
  // 데모 프리필 없음 — 제목·나라·지역은 빈 값(placeholder 안내). 커버/아이콘 기본 선택만 유지.
  title: "",
  icon: "building",
  cover: "blue",
  country: "",
  region: "",
  // 기본 날짜 없음 — 사용자가 시작·종료를 필수 선택(과거 기본값 방지, 종료≥시작).
  start_date: "",
  end_date: "",
  // 초대 멤버 프리필 없음 — 소유자(=실제 나)만 기본(Step3 가 useProfileQuery 로 표시).
  members: [],
  startMode: "blank",
  templateId: null,
};

export function CreateTripWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const methods = useForm<CreateTripInput>({
    resolver: zodResolver(tripSchema),
    defaultValues: DEFAULTS,
    mode: "onSubmit",
  });
  const createTrip = useCreateTrip();
  const isLoading = createTrip.isPending;

  const close = () => router.push("/trips");

  const submit = methods.handleSubmit(async (values) => {
    const { id } = await createTrip.mutateAsync(values);
    router.push(`/trips/${id}?view=plan`);
  });

  const next = async () => {
    const ok = await methods.trigger(STEP_FIELDS[step]);
    if (!ok) return;
    if (step < 4) setStep(step + 1);
    else await submit();
  };

  const prev = () => {
    if (step > 1) {
      methods.clearErrors();
      setStep(step - 1);
    }
  };

  // 현재 단계의 첫 에러 메시지를 배너로.
  const errors = methods.formState.errors;
  const bannerMessage = STEP_FIELDS[step]
    .map((f) => errors[f]?.message)
    .find(Boolean) as string | undefined;

  const isLast = step === 4;

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="relative flex w-[692px] flex-col overflow-hidden rounded-card border border-line bg-background shadow-modal">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-[22px] pt-[18px]">
          <div className="flex items-center gap-2.5">
            <span className="flex size-[30px] items-center justify-center rounded-md bg-gradient-to-br from-[#6E9CF2] to-[#8FBCF7] text-white shadow-[0_3px_8px_-2px_color-mix(in_srgb,#5B8DEF_50%,transparent)]">
              <Icon name="map-pin" size={16} strokeWidth={2.1} />
            </span>
            <span className="text-[15.5px] font-extrabold tracking-tight text-ink">
              새 여행 만들기
            </span>
          </div>
          <button
            type="button"
            aria-label="닫기"
            onClick={close}
            className="flex size-[34px] items-center justify-center rounded-md bg-secondary text-faint hover:bg-line hover:text-subtle"
          >
            <Icon name="x" size={18} strokeWidth={2.2} />
          </button>
        </div>

        {/* 스테퍼 */}
        <div className="px-[26px] pt-5 pb-[18px]">
          <Stepper steps={STEPS} current={step} />
        </div>
        <div className="h-px bg-line" />

        {/* 본문 */}
        <div className="relative min-h-[392px] p-[26px]">
          <FormProvider {...methods}>
            {bannerMessage && (
              <div className="mb-[18px] flex items-center gap-2.5 rounded-md border border-danger/30 bg-danger-tint px-3.5 py-2.5">
                <Icon
                  name="alert"
                  size={17}
                  strokeWidth={2.2}
                  className="flex-none text-danger"
                />
                <span className="text-[13px] font-semibold text-danger">
                  {bannerMessage}
                </span>
              </div>
            )}
            {step === 1 && <Step1Info />}
            {step === 2 && <Step2Dates />}
            {step === 3 && <Step3Members />}
            {step === 4 && <Step4Mode />}
          </FormProvider>

          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/90 backdrop-blur-sm">
              <span className="size-10 animate-spin rounded-full border-[3.5px] border-primary-tint border-t-primary" />
              <div className="flex flex-col items-center gap-1">
                <span className="text-[15px] font-bold text-ink">여행을 만드는 중…</span>
                <span className="text-[13px] font-medium text-faint">
                  멤버를 초대하고 워크스페이스를 준비하고 있어요
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="h-px bg-line" />

        {/* 푸터 */}
        <div className="flex items-center justify-between px-[26px] py-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={prev}
              className="inline-flex h-11 items-center gap-1.5 rounded-md border border-line-strong bg-background pr-[18px] pl-3.5 text-sm font-bold text-subtle hover:bg-secondary"
            >
              <Icon name="chevron-left" size={17} strokeWidth={2.2} />
              이전
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-4">
            <span className="text-[13px] font-bold text-faint">단계 {step} / 4</span>
            <button
              type="button"
              onClick={next}
              disabled={isLoading}
              className={cn(
                "inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-[22px] text-[14.5px] font-bold text-primary-foreground shadow-primary hover:bg-primary-hover disabled:opacity-60",
              )}
            >
              {isLast ? "여행 만들기" : "다음"}
              <Icon
                name={isLast ? "check" : "chevron-right"}
                size={17}
                strokeWidth={2.3}
              />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
