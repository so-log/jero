-- 0006_multicity — 다중 도시 Phase 1(스키마·하위호환). 0001~0005 이후 실행.
-- (1) trip_city 테이블 + RLS(is_trip_member/trip_role 재사용)
-- (2) place.city_id 추가(nullable, on delete set null) + 인덱스
-- (3) 백필: 기존 각 trip → country/region 으로 도시 1개(seq 0, nights=박수) + place.city_id 설정
-- (4) create_trip RPC 확장: payload.cities[] 있으면 seq 순 생성, 없으면 country/region 으로 도시 1개 폴백
-- ★하위호환 목표 — 앱은 도시 1개로 기존과 동일 동작(회귀 0). 재적용 안전(if not exists / drop if exists).
-- 적용: Supabase Dashboard → SQL Editor 에 이 파일 전체 붙여넣고 Run.

-- ── (1) trip_city ──────────────────────────────────────────────────────────
create table if not exists public.trip_city (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trip(id) on delete cascade,
  name       text not null,
  country    text,
  lat        numeric,
  lng        numeric,
  nights     int not null,
  seq        int not null,
  created_at timestamptz not null default now(),
  unique (trip_id, seq)
);
create index if not exists trip_city_trip_idx on public.trip_city(trip_id);

alter table public.trip_city enable row level security;
drop policy if exists city_select on public.trip_city;
create policy city_select on public.trip_city for select
  using ( public.is_trip_member(trip_id) );
drop policy if exists city_write on public.trip_city;
create policy city_write on public.trip_city for all
  using ( public.trip_role(trip_id) in ('owner','editor') )
  with check ( public.trip_role(trip_id) in ('owner','editor') );

-- ── (2) place.city_id (additive) ────────────────────────────────────────────
alter table public.place
  add column if not exists city_id uuid references public.trip_city(id) on delete set null;
create index if not exists place_city_idx on public.place(city_id);

-- ── (3) 백필(기존 여행 하위호환) ──────────────────────────────────────────────
-- 도시 없는 기존 trip → seq 0 도시 1개(이름=region>country>title, nights=여행 박수).
insert into public.trip_city (trip_id, name, country, nights, seq)
select
  t.id,
  coalesce(nullif(t.region, ''), nullif(t.country, ''), t.title),
  nullif(t.country, ''),
  (t.end_date - t.start_date),  -- date - date = 정수(박수)
  0
from public.trip t
where not exists (select 1 from public.trip_city c where c.trip_id = t.id);

-- 그 trip 의 place.city_id 를 seq 0 도시로 백필(미설정만).
update public.place p
set city_id = c.id
from public.trip_city c
where c.trip_id = p.trip_id and c.seq = 0 and p.city_id is null;

-- ── (4) create_trip RPC 확장(0005 대체 — 도시 생성 추가) ───────────────────────
create or replace function public.create_trip(payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
  m jsonb;
  v_start date := (payload->>'start_date')::date;
  v_end   date := (payload->>'end_date')::date;
  first_city uuid;          -- seq 0 도시(템플릿 place 기본 배정 대상)
  c jsonb;
  city_tmp uuid;
  v_seq int := 0;
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;
  insert into public.trip (title, cover_icon, cover_color, country, region, start_date, end_date, start_mode, base_currency, created_by)
  values (
    payload->>'title',
    payload->>'icon',
    payload->>'cover',
    nullif(payload->>'country',''),
    nullif(payload->>'region',''),
    v_start,
    v_end,
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

  -- 도시 생성: cities[] 있으면 seq 순, 없으면 country/region 으로 1개 폴백(하위호환).
  if payload->'cities' is not null and jsonb_array_length(payload->'cities') > 0 then
    for c in select * from jsonb_array_elements(payload->'cities') loop
      insert into public.trip_city (trip_id, name, country, lat, lng, nights, seq)
      values (
        new_id,
        c->>'name',
        nullif(c->>'country',''),
        nullif(c->>'lat','')::numeric,
        nullif(c->>'lng','')::numeric,
        coalesce((c->>'nights')::int, 0),
        v_seq
      ) returning id into city_tmp;
      if v_seq = 0 then first_city := city_tmp; end if;
      v_seq := v_seq + 1;
    end loop;
  else
    insert into public.trip_city (trip_id, name, country, nights, seq)
    values (
      new_id,
      coalesce(nullif(payload->>'region',''), nullif(payload->>'country',''), payload->>'title'),
      nullif(payload->>'country',''),
      (v_end - v_start),
      0
    ) returning id into first_city;
  end if;

  -- 템플릿 복제(2차 C): folder → place. Day 는 새 여행 start_date 기준 오프셋 매핑.
  -- Phase 1: 복제 place 는 seq 0 도시(first_city)로 배정(템플릿은 단일 지역).
  if coalesce(payload->>'startMode','') = 'template'
     and nullif(payload->>'templateId','') is not null then
    declare
      tpl    text := payload->>'templateId';
      f      record;
      p      record;
      newf   uuid;
      fmap   jsonb := '{}'::jsonb; -- template_folder.id(text) → 새 folder.id(uuid)
    begin
      for f in select * from public.template_folder where template_id = tpl order by sort_order loop
        insert into public.folder (trip_id, name, icon, color, sort_order)
        values (new_id, f.name, f.icon, f.color, f.sort_order)
        returning id into newf;
        fmap := jsonb_set(fmap, array[f.id], to_jsonb(newf::text), true);
      end loop;

      for p in select * from public.template_place where template_id = tpl order by sort_order loop
        insert into public.place (
          trip_id, folder_id, city_id, name, category, area, lat, lng, memo,
          scheduled_date, order_in_day, start_time, duration_min, saved_by, scheduled_by
        ) values (
          new_id,
          case when p.template_folder_id is not null then (fmap->>p.template_folder_id)::uuid else null end,
          first_city,
          p.name, p.category, p.area, p.lat, p.lng, p.memo,
          case when p.scheduled_day is not null then v_start + (p.scheduled_day - 1) else null end,
          p.order_in_day, p.start_time, p.duration_min,
          auth.uid(),
          case when p.scheduled_day is not null then auth.uid() else null end
        );
      end loop;
    end;
  end if;

  return new_id;
end; $$;
