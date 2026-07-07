-- 0004_realtime — 실시간(계약 B4). 0001~0003 이후 실행.
-- (1) postgres_changes 방송 대상 테이블을 supabase_realtime 퍼블리케이션에 추가
-- (2) private 채널 Authorization: realtime.messages RLS 로 'trip:<id>' topic 은 해당 trip 멤버만 구독
-- 적용: Supabase Dashboard → SQL Editor 에 붙여넣고 Run. (프로젝트 Realtime 은 기본 활성)

-- ── (1) postgres_changes 퍼블리케이션 (중복 방지 조건부) ──
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='place') then
    alter publication supabase_realtime add table public.place; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='expense') then
    alter publication supabase_realtime add table public.expense; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='expense_split') then
    alter publication supabase_realtime add table public.expense_split; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='trip_member') then
    alter publication supabase_realtime add table public.trip_member; end if;
end $$;

-- ── (2) private 채널 Authorization (realtime.messages RLS) ──
-- topic 'trip:<uuid>' → 해당 trip 멤버(authenticated)만 read/write. 비멤버·익명 구독 차단(§8.2).
alter table realtime.messages enable row level security;

drop policy if exists rt_trip_member_read on realtime.messages;
create policy rt_trip_member_read on realtime.messages for select to authenticated
  using ( public.is_trip_member( (split_part(realtime.topic(), ':', 2))::uuid ) );

drop policy if exists rt_trip_member_write on realtime.messages;
create policy rt_trip_member_write on realtime.messages for insert to authenticated
  with check ( public.is_trip_member( (split_part(realtime.topic(), ':', 2))::uuid ) );

-- 참고: postgres_changes 는 소스 테이블 RLS 도 준수 → 멤버가 볼 수 있는 행만 전달(이중 방어).
