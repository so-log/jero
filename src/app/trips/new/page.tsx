import { CreateTripWizard } from "@/features/trip";

/**
 * 03 여행 생성 — `/trips/new`. 4단계 마법사(RHF + Zod). 닫기 → `/trips`, 생성 완료 → `/trips/[id]`.
 */
export default function NewTripPage() {
  return <CreateTripWizard />;
}
