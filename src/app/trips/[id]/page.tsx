import { BudgetView } from "@/features/budget";
import { CalendarView, PlanView } from "@/features/itinerary";
import { PlacesView } from "@/features/place";
import { WorkspaceShell } from "@/features/workspace";

/**
 * 워크스페이스 — `?view=plan|calendar|places|budget` (기본 plan). 설계 §2.
 * 공통 셸(WorkspaceShell: 상단 바)이 본문만 교체. 현재 플랜·일정표 구현, 나머지는 후속.
 * Next 16: params·searchParams 는 Promise.
 */
export default async function TripWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const { view = "plan" } = await searchParams;

  return (
    <WorkspaceShell tripId={id}>
      {view === "plan" ? (
        <PlanView tripId={id} />
      ) : view === "calendar" ? (
        <CalendarView tripId={id} />
      ) : view === "places" ? (
        <PlacesView tripId={id} />
      ) : view === "budget" ? (
        <BudgetView tripId={id} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-faint">
          &lsquo;{view}&rsquo; 뷰는 준비 중이에요
        </div>
      )}
    </WorkspaceShell>
  );
}
