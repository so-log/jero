-- 0001_auth — 인증 1단계: profile 테이블 + 프로비저닝 트리거 + RLS (계약 데이터모델_계약 Part B, B1~B3)
-- 적용: Supabase Dashboard → SQL Editor 에 이 파일 전체를 붙여넣고 Run. (또는 supabase CLI: `supabase db push`)
-- 다른 enum·테이블(trip/place/expense 등)과 RLS·RPC 는 데이터 CRUD 단계(0002_*)에서 추가한다.

-- 통화 enum — profile.default_currency 가 사용(계약 §3). 다른 enum 은 후속 마이그레이션.
do $$ begin
  create type currency as enum ('KRW', 'JPY', 'USD', 'EUR');
exception when duplicate_object then null; end $$;

-- 사용자 프로필 (auth.users 1:1) — 계약 §4.1
create table if not exists public.profile (
  id               uuid primary key references auth.users(id) on delete cascade,
  name             text not null,
  email            text not null,
  avatar_color     text not null,
  avatar_url       text,
  default_currency currency not null default 'KRW',
  notif_trip       boolean not null default true,
  notif_comment    boolean not null default true,
  notif_settle     boolean not null default true,
  notif_marketing  boolean not null default false,
  created_at       timestamptz not null default now()
);

alter table public.profile enable row level security;

-- 본인 조회/수정만(§8.2). "같은 trip 멤버 조회"는 trip_member 도입되는 0002 에서 정책 확장.
drop policy if exists profile_select_self on public.profile;
create policy profile_select_self on public.profile
  for select using ( id = auth.uid() );

drop policy if exists profile_update_self on public.profile;
create policy profile_update_self on public.profile
  for update using ( id = auth.uid() ) with check ( id = auth.uid() );

-- 프로비저닝: auth.users insert → profile 자동 생성.
-- avatar_color 는 MEMBER_COLORS 팔레트에서 랜덤 배정(계약 B3 — lib/constants/members.ts 미러).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  palette text[] := array['#3B7DF0', '#FF8A65', '#3FC4A0', '#B07CF0', '#F2A65A'];
begin
  insert into public.profile (id, name, email, avatar_color)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)),
    new.email,
    palette[1 + floor(random() * array_length(palette, 1))::int]
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
