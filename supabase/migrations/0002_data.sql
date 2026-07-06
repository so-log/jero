-- 0002_data — 데이터 CRUD: trip/멤버십/폴더/장소/지출/공유/초대 + enum + RLS + 헬퍼 + RPC
-- 계약 데이터모델_계약 Part B(B1·B2·B5). 0001_auth 적용 후 실행(profile·currency enum 선행 필요).
-- 적용: Supabase Dashboard → SQL Editor 에 이 파일 전체 붙여넣고 Run.

-- ── enum (currency 는 0001) ────────────────────────────────────────────────
do $$ begin create type member_role     as enum ('owner','editor','viewer'); exception when duplicate_object then null; end $$;
do $$ begin create type category        as enum ('food','cafe','shopping','transport','museum','hotel','gift','etc'); exception when duplicate_object then null; end $$;
do $$ begin create type trip_start_mode as enum ('blank','template'); exception when duplicate_object then null; end $$;
do $$ begin create type share_role      as enum ('editor','viewer'); exception when duplicate_object then null; end $$;
do $$ begin create type invite_status   as enum ('pending','accepted','revoked'); exception when duplicate_object then null; end $$;

-- ── 테이블 ────────────────────────────────────────────────────────────────
create table if not exists public.trip (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  cover_icon    text not null,
  cover_color   text not null,
  country       text,
  region        text,
  start_date    date not null,
  end_date      date not null,
  start_mode    trip_start_mode not null default 'blank',
  base_currency currency not null default 'KRW',
  total_budget  numeric,
  settled_at    timestamptz,
  created_by    uuid not null references public.profile(id),
  created_at    timestamptz not null default now()
);

create table if not exists public.trip_member (
  id        uuid primary key default gen_random_uuid(),
  trip_id   uuid not null references public.trip(id) on delete cascade,
  user_id   uuid not null references public.profile(id) on delete cascade,
  role      member_role not null,
  joined_at timestamptz not null default now(),
  unique (trip_id, user_id)
);
create index if not exists trip_member_user_idx on public.trip_member(user_id);
create index if not exists trip_member_trip_idx on public.trip_member(trip_id);

create table if not exists public.folder (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trip(id) on delete cascade,
  name       text not null,
  icon       text,
  color      text,
  sort_order int not null default 0
);

create table if not exists public.place (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references public.trip(id) on delete cascade,
  folder_id      uuid references public.folder(id) on delete set null,
  name           text not null,
  category       category not null,
  area           text,
  lat            numeric,
  lng            numeric,
  google_place_id text,
  memo           text,
  saved_by       uuid references public.profile(id),
  scheduled_date date,
  order_in_day   int,
  start_time     time,
  duration_min   int,
  scheduled_by   uuid references public.profile(id),
  created_at     timestamptz not null default now()
);
create index if not exists place_trip_idx on public.place(trip_id);

create table if not exists public.expense (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trip(id) on delete cascade,
  title       text not null,
  category    category not null,
  amount      numeric not null check (amount > 0),
  currency    currency not null,
  fx_rate     numeric not null default 1,
  amount_base numeric generated always as (amount * fx_rate) stored,
  payer_id    uuid not null references public.profile(id),
  spent_on    date not null,
  created_by  uuid not null references public.profile(id),
  created_at  timestamptz not null default now()
);
create index if not exists expense_trip_idx on public.expense(trip_id);

create table if not exists public.expense_split (
  expense_id uuid not null references public.expense(id) on delete cascade,
  user_id    uuid not null references public.profile(id) on delete cascade,
  primary key (expense_id, user_id)
);

create table if not exists public.share_link (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trip(id) on delete cascade,
  token      text unique not null,
  role       share_role not null default 'viewer',
  expires_at timestamptz,
  revoked    boolean not null default false,
  created_by uuid not null references public.profile(id),
  created_at timestamptz not null default now()
);

create table if not exists public.invitation (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trip(id) on delete cascade,
  email      text not null,
  role       member_role not null default 'editor' check (role in ('editor','viewer')),
  status     invite_status not null default 'pending',
  token      text unique not null,
  invited_by uuid not null references public.profile(id),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── RLS 헬퍼 (security definer, 재귀 정책 방지) ────────────────────────────
create or replace function public.is_trip_member(t uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.trip_member m where m.trip_id = t and m.user_id = auth.uid());
$$;

create or replace function public.trip_role(t uuid)
returns member_role language sql security definer stable set search_path = public as $$
  select m.role from public.trip_member m where m.trip_id = t and m.user_id = auth.uid();
$$;

-- ── RLS 정책 ──────────────────────────────────────────────────────────────
-- profile: 0001 의 self 정책에 더해 "같은 trip 멤버 조회" 허용(멤버 아바타·커서용).
drop policy if exists profile_select_self on public.profile;
create policy profile_select_comembers on public.profile for select using (
  id = auth.uid()
  or exists (
    select 1 from public.trip_member a
    join public.trip_member b on a.trip_id = b.trip_id
    where a.user_id = auth.uid() and b.user_id = public.profile.id
  )
);

alter table public.trip          enable row level security;
alter table public.trip_member   enable row level security;
alter table public.folder        enable row level security;
alter table public.place         enable row level security;
alter table public.expense       enable row level security;
alter table public.expense_split enable row level security;
alter table public.share_link    enable row level security;
alter table public.invitation    enable row level security;

-- trip: 멤버 조회 / owner 수정·삭제. 직접 INSERT 정책 없음(생성=create_trip RPC).
create policy trip_select on public.trip for select using ( public.is_trip_member(id) );
create policy trip_update on public.trip for update using ( public.trip_role(id) = 'owner' );
create policy trip_delete on public.trip for delete using ( public.trip_role(id) = 'owner' );

-- trip_member: 멤버 조회 / owner 관리. self-insert 없음(수락=accept_invite RPC).
create policy member_select on public.trip_member for select using ( public.is_trip_member(trip_id) );
create policy member_manage on public.trip_member for all
  using ( public.trip_role(trip_id) = 'owner' ) with check ( public.trip_role(trip_id) = 'owner' );

-- folder·place·expense: 멤버 조회 / editor+ 편집
create policy folder_select on public.folder for select using ( public.is_trip_member(trip_id) );
create policy folder_write  on public.folder for all
  using ( public.trip_role(trip_id) in ('owner','editor') ) with check ( public.trip_role(trip_id) in ('owner','editor') );

create policy place_select on public.place for select using ( public.is_trip_member(trip_id) );
create policy place_write  on public.place for all
  using ( public.trip_role(trip_id) in ('owner','editor') ) with check ( public.trip_role(trip_id) in ('owner','editor') );

create policy expense_select on public.expense for select using ( public.is_trip_member(trip_id) );
create policy expense_write  on public.expense for all
  using ( public.trip_role(trip_id) in ('owner','editor') ) with check ( public.trip_role(trip_id) in ('owner','editor') );

-- expense_split: parent expense 조인으로 판정(비정규화 없음, 결정 C)
create policy split_select on public.expense_split for select using (
  public.is_trip_member((select e.trip_id from public.expense e where e.id = expense_id))
);
create policy split_write on public.expense_split for all
  using      ( public.trip_role((select e.trip_id from public.expense e where e.id = expense_id)) in ('owner','editor') )
  with check ( public.trip_role((select e.trip_id from public.expense e where e.id = expense_id)) in ('owner','editor') );

-- share_link·invitation: 멤버 조회 / owner 관리
create policy share_select on public.share_link for select using ( public.is_trip_member(trip_id) );
create policy share_manage on public.share_link for all
  using ( public.trip_role(trip_id) = 'owner' ) with check ( public.trip_role(trip_id) = 'owner' );
create policy invite_select on public.invitation for select using ( public.is_trip_member(trip_id) );
create policy invite_manage on public.invitation for all
  using ( public.trip_role(trip_id) = 'owner' ) with check ( public.trip_role(trip_id) = 'owner' );

-- ── RPC ───────────────────────────────────────────────────────────────────
-- create_trip: trip + owner 멤버십(+ 멤버 초대 레코드) 원자적. owner 는 생성으로만 부여(§4.9).
create or replace function public.create_trip(payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid; m jsonb;
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;
  insert into public.trip (title, cover_icon, cover_color, country, region, start_date, end_date, start_mode, base_currency, created_by)
  values (
    payload->>'title',
    payload->>'icon',
    payload->>'cover',
    nullif(payload->>'country',''),
    nullif(payload->>'region',''),
    (payload->>'start_date')::date,
    (payload->>'end_date')::date,
    coalesce((payload->>'startMode')::trip_start_mode,'blank'),
    coalesce((payload->>'base_currency')::currency,'KRW'),
    auth.uid()
  ) returning id into new_id;

  insert into public.trip_member (trip_id, user_id, role) values (new_id, auth.uid(), 'owner');

  -- 멤버 초대(editor/viewer) 레코드 생성(발송은 후속). owner 는 초대로 부여 불가.
  for m in select * from jsonb_array_elements(coalesce(payload->'members','[]'::jsonb)) loop
    insert into public.invitation (trip_id, email, role, token, invited_by, expires_at)
    values (new_id, m->>'email', coalesce((m->>'role')::member_role,'editor'),
            replace(gen_random_uuid()::text,'-',''), auth.uid(), now() + interval '30 days');
  end loop;

  -- TODO: startMode='template' 시 템플릿 place 복제 — 템플릿 place 시드 데이터 준비 후.
  return new_id;
end; $$;

-- accept_invite: 비멤버가 유효 토큰으로 멤버 전환(+ 초대 소비). MVP bearer(링크 소지자).
create or replace function public.accept_invite(invite_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv public.invitation;
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;
  select * into inv from public.invitation
   where token = invite_token and status = 'pending' and (expires_at is null or expires_at > now());
  if not found then raise exception 'invalid_or_expired_invite'; end if;
  -- MVP: bearer(링크 소지자면 수락). TODO(후속): 초대 이메일 == 로그인 이메일 바인딩.
  insert into public.trip_member (trip_id, user_id, role)
  values (inv.trip_id, auth.uid(), inv.role) on conflict (trip_id, user_id) do nothing;
  update public.invitation set status = 'accepted' where id = inv.id;
  return inv.trip_id;
end; $$;

-- reorder_places: 그 날 order_in_day 를 배열 순서(1-based)로 일괄 갱신. RLS(editor+)가 UPDATE 를 강제.
create or replace function public.reorder_places(p_trip_id uuid, p_date date, p_ids uuid[])
returns void language plpgsql set search_path = public as $$
begin
  update public.place p
     set order_in_day = t.ord
    from unnest(p_ids) with ordinality as t(id, ord)
   where p.id = t.id and p.trip_id = p_trip_id and p.scheduled_date = p_date;
end; $$;
