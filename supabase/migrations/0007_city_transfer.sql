-- 0007_city_transfer — 다중 도시 Phase 5(도시 간 이동 세그먼트). 0006 이후 실행.
-- trip_city 에 "도착 이동" 컬럼(additive, nullable) — 각 non-first 도시(seq>0)가 "그 도시로 어떻게 왔는가"를 갖는다.
-- 경계 날짜 = 도착 도시의 첫날(citySchedule startDate). 별도 테이블 없이 trip_city 에 부착(설계 §11.1).
-- ★하위호환: 모두 nullable → 기존 도시·단일 도시엔 이동 없음(회귀 0). RLS 는 기존 trip_city 정책 그대로.
-- 재적용 안전(if not exists). 적용: Supabase Dashboard → SQL Editor 에 붙여넣고 Run.

alter table public.trip_city
  add column if not exists arrival_mode         text,   -- 'train' | 'flight' | 'bus' | 'car' | 'etc'
  add column if not exists arrival_name         text,   -- 예: 신칸센 노조미
  add column if not exists arrival_time         time,   -- 출발/이동 시각
  add column if not exists arrival_duration_min int;    -- 소요(분)
