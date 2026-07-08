-- 0005_templates — 템플릿 복제로 시작(2차 C). 0001~0004 이후 실행.
-- (1) 템플릿 카탈로그 시드 테이블 3종 + 공개 read RLS
-- (2) 시드 데이터 2종(도쿄 클래식 4일 / 제주 드라이브 3일) — 폴더·장소·Day별 일정
-- (3) create_trip RPC 확장: start_mode='template' + templateId → folder·place 복제(Day 오프셋 매핑)
-- 적용: Supabase Dashboard → SQL Editor 에 이 파일 전체 붙여넣고 Run.

-- ── (1) 템플릿 카탈로그 테이블 (id 는 슬러그 text — 프론트 TRIP_TEMPLATES id 와 매핑) ──
create table if not exists public.trip_template (
  id          text primary key,
  title       text not null,
  country     text,
  region      text,
  nights      int not null,
  cover_icon  text not null default 'plane',
  cover_color text not null default 'blue'
);

create table if not exists public.template_folder (
  id          text primary key,
  template_id text not null references public.trip_template(id) on delete cascade,
  name        text not null,
  icon        text,
  color       text,
  sort_order  int not null default 0
);

create table if not exists public.template_place (
  id                 text primary key,
  template_id        text not null references public.trip_template(id) on delete cascade,
  template_folder_id text references public.template_folder(id) on delete set null,
  name               text not null,
  category           category not null,
  area               text,
  lat                numeric,
  lng                numeric,
  memo               text,
  /** 1-based Day. null = 저장(미일정). */
  scheduled_day      int,
  order_in_day       int,
  start_time         time,
  duration_min       int,
  sort_order         int not null default 0
);

-- 공개 read(카탈로그). 쓰기는 시드(마이그레이션)만 — insert/update/delete 정책 없음.
alter table public.trip_template   enable row level security;
alter table public.template_folder enable row level security;
alter table public.template_place  enable row level security;
drop policy if exists tpl_read on public.trip_template;
create policy tpl_read   on public.trip_template   for select to anon, authenticated using (true);
drop policy if exists tplf_read on public.template_folder;
create policy tplf_read  on public.template_folder for select to anon, authenticated using (true);
drop policy if exists tplp_read on public.template_place;
create policy tplp_read  on public.template_place  for select to anon, authenticated using (true);

-- ── (2) 시드 데이터 (재적용 안전: 삭제 후 삽입) ──
delete from public.trip_template where id in ('tpl-tokyo', 'tpl-jeju'); -- folder/place 는 cascade

insert into public.trip_template (id, title, country, region, nights, cover_icon, cover_color) values
  ('tpl-tokyo', '도쿄 클래식 4일', '일본', '도쿄', 3, 'building', 'blue'),
  ('tpl-jeju',  '제주 드라이브 3일', '한국', '제주', 2, 'mountain', 'mint');

insert into public.template_folder (id, template_id, name, icon, color, sort_order) values
  ('tf-tokyo-see',  'tpl-tokyo', '명소',  'landmark', '#3B7DF0', 0),
  ('tf-tokyo-eat',  'tpl-tokyo', '맛집',  'utensils', '#E8615C', 1),
  ('tf-tokyo-cafe', 'tpl-tokyo', '카페',  'coffee',   '#C5893A', 2),
  ('tf-jeju-nature','tpl-jeju',  '자연',  'mountain', '#3FC4A0', 0),
  ('tf-jeju-cafe',  'tpl-jeju',  '카페',  'coffee',   '#C5893A', 1),
  ('tf-jeju-eat',   'tpl-jeju',  '맛집',  'utensils', '#E8615C', 2);

-- 도쿄: Day1~4 일정 + 저장 1
insert into public.template_place
  (id, template_id, template_folder_id, name, category, area, lat, lng, memo, scheduled_day, order_in_day, start_time, duration_min, sort_order) values
  ('tp-tok-1',  'tpl-tokyo', 'tf-tokyo-see',  '센소지',           'museum',   '아사쿠사',   35.7148, 139.7967, '도쿄 대표 사찰', 1, 1, '10:00', 90, 0),
  ('tp-tok-2',  'tpl-tokyo', 'tf-tokyo-see',  '나카미세 거리',      'shopping', '아사쿠사',   35.7112, 139.7965, null,            1, 2, '11:30', 60, 1),
  ('tp-tok-3',  'tpl-tokyo', 'tf-tokyo-see',  '도쿄 스카이트리',    'museum',   '스미다',     35.7101, 139.8107, '전망대',        1, 3, '14:00', 90, 2),
  ('tp-tok-4',  'tpl-tokyo', 'tf-tokyo-eat',  '츠키지 장외시장',    'food',     '츠키지',     35.6654, 139.7707, '해산물 아침',   2, 1, '09:00', 90, 3),
  ('tp-tok-5',  'tpl-tokyo', 'tf-tokyo-see',  '긴자',             'shopping', '긴자',       35.6717, 139.7650, null,            2, 2, '12:00', 120, 4),
  ('tp-tok-6',  'tpl-tokyo', 'tf-tokyo-see',  '시부야 스크램블',    'museum',   '시부야',     35.6595, 139.7004, null,            2, 3, '16:00', 60, 5),
  ('tp-tok-7',  'tpl-tokyo', 'tf-tokyo-see',  '신주쿠 교엔',       'museum',   '신주쿠',     35.6852, 139.7100, '정원 산책',     3, 1, '10:00', 90, 6),
  ('tp-tok-8',  'tpl-tokyo', 'tf-tokyo-cafe', '오모테산도 카페',    'cafe',     '오모테산도', 35.6659, 139.7127, null,            3, 2, '13:00', 60, 7),
  ('tp-tok-9',  'tpl-tokyo', 'tf-tokyo-see',  '도쿄역',           'transport','마루노우치', 35.6812, 139.7671, '마지막 날 이동', 4, 1, '11:00', 30, 8),
  ('tp-tok-10', 'tpl-tokyo', 'tf-tokyo-cafe', '하라주쿠 디저트',    'cafe',     '하라주쿠',   35.6702, 139.7027, '여유 되면',     null, null, null, null, 9);

-- 제주: Day1~3 일정 + 저장 1
insert into public.template_place
  (id, template_id, template_folder_id, name, category, area, lat, lng, memo, scheduled_day, order_in_day, start_time, duration_min, sort_order) values
  ('tp-jej-1', 'tpl-jeju', 'tf-jeju-nature', '성산일출봉',      'museum', '성산',   33.4580, 126.9427, '일출 명소', 1, 1, '09:00', 90, 0),
  ('tp-jej-2', 'tpl-jeju', 'tf-jeju-nature', '섭지코지',        'museum', '성산',   33.4239, 126.9308, null,       1, 2, '11:30', 60, 1),
  ('tp-jej-3', 'tpl-jeju', 'tf-jeju-cafe',   '오설록 티뮤지엄',  'cafe',   '서귀포', 33.3057, 126.2895, '녹차밭',   2, 1, '10:00', 90, 2),
  ('tp-jej-4', 'tpl-jeju', 'tf-jeju-nature', '한라산 어리목',    'museum', '제주시', 33.3846, 126.4914, '트레킹',   2, 2, '13:00', 180, 3),
  ('tp-jej-5', 'tpl-jeju', 'tf-jeju-nature', '협재해변',        'museum', '한림',   33.3940, 126.2396, null,       3, 1, '10:00', 90, 4),
  ('tp-jej-6', 'tpl-jeju', 'tf-jeju-eat',    '흑돼지 거리',      'food',   '제주시', 33.5113, 126.5219, '저녁',     3, 2, '18:00', 90, 5),
  ('tp-jej-7', 'tpl-jeju', 'tf-jeju-eat',    '동문시장',        'food',   '제주시', 33.5127, 126.5286, '먹거리',   null, null, null, null, 6),
  ('tp-jej-8', 'tpl-jeju', 'tf-jeju-cafe',   '애월 카페거리',    'cafe',   '애월',   33.4636, 126.3096, '해안 뷰',  null, null, null, null, 7);

-- ── (3) create_trip RPC 확장 (0002 원본 대체 — 템플릿 복제 추가) ──
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

  -- 템플릿 복제(2차 C): folder → place. Day 는 새 여행 start_date 기준 오프셋 매핑.
  if coalesce(payload->>'startMode','') = 'template'
     and nullif(payload->>'templateId','') is not null then
    declare
      tpl    text := payload->>'templateId';
      v_start date := (payload->>'start_date')::date;
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
          trip_id, folder_id, name, category, area, lat, lng, memo,
          scheduled_date, order_in_day, start_time, duration_min, saved_by, scheduled_by
        ) values (
          new_id,
          case when p.template_folder_id is not null then (fmap->>p.template_folder_id)::uuid else null end,
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
