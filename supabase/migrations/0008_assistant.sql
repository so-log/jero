-- 0008_assistant — AI 여행 어시스턴트(18) Phase 1: RAG 기반. 0007 이후 실행.
-- 임베딩(place_embedding) + 사용량(assistant_usage) + RPC 4종. 계약 `데이터모델_계약.md` Part C 기준.
-- ★기존 테이블·정책 무변경(additive) → 플래그 off 면 회귀 0.
-- 재적용 안전(if not exists / or replace). 적용: Supabase Dashboard → SQL Editor 에 붙여넣고 Run.

create extension if not exists vector;

-- ── 1. 장소 임베딩 (Gemini gemini-embedding-001, 768 절단 + L2 정규화 — C2)
create table if not exists public.place_embedding (
  place_id     uuid primary key references public.place(id) on delete cascade,
  trip_id      uuid not null references public.trip(id) on delete cascade,
  content      text not null,
  content_hash text not null,
  embedding    vector(768) not null,
  model        text not null,
  updated_at   timestamptz not null default now()
);
create index if not exists place_embedding_trip_idx on public.place_embedding (trip_id);
-- ★ ANN 인덱스는 만들지 않는다(C3): 검색이 trip_id 로 좁혀지는 소규모라 정확 검색이 더 빠르고 재현율 100%.
--   총 5만 행 초과 시에만 승격: create index ... using hnsw (embedding vector_cosine_ops);

alter table public.place_embedding enable row level security;

-- 조회: 그 trip 의 멤버(역할 무관 — viewer 도 RAG 검색 가능)
drop policy if exists pe_select on public.place_embedding;
create policy pe_select on public.place_embedding for select
  using ( public.is_trip_member(trip_id) );
-- insert/update/delete 정책 **없음** → 직접 쓰기 전면 차단.
-- 쓰기는 upsert_place_embedding RPC 로만(C1). 삭제는 place cascade 로 자동.

-- ── 2. 임베딩 원문(단일 출처) — ★ memo 제외(C2-b): 자유 입력 PII 를 외부 provider 로 보내지 않는다.
create or replace function public.place_embed_content(p public.place)
returns text language sql immutable as $$
  select trim(both ' ' from concat_ws(' · ',
    p.name, p.category::text, nullif(p.area,'')));
$$;

-- ── 3. 인덱싱 RPC (security definer — trip_id·content 를 place 행에서 파생)
--      ★ definer 는 RLS 를 우회하므로 자가 인가 필수(C1-a):
--        ①로그인 ②대상 행 DB 조회 ③조회한 trip_id 로 멤버십 판정(클라가 넘긴 값 아님).
create or replace function public.upsert_place_embedding(
  p_place_id uuid, p_embedding vector(768), p_model text
) returns void
language plpgsql security definer
set search_path = public
as $$
declare p public.place;
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;            -- ①
  select * into p from public.place where id = p_place_id;                         -- ②
  if not found then raise exception 'place_not_found'; end if;
  if not public.is_trip_member(p.trip_id) then raise exception 'forbidden'; end if; -- ③ 역할 무관(멤버면 OK)

  insert into public.place_embedding (place_id, trip_id, content, content_hash, embedding, model, updated_at)
  values (p.id, p.trip_id, public.place_embed_content(p),
          md5(public.place_embed_content(p)), p_embedding, p_model, now())
  on conflict (place_id) do update
    set content = excluded.content, content_hash = excluded.content_hash,
        embedding = excluded.embedding, model = excluded.model, updated_at = now();
end; $$;

-- ── 4. 재인덱싱 대상 · 유사 검색 (security invoker — 호출자 RLS 준수, 자가 인가 불필요)
create or replace function public.stale_place_embeddings(p_trip_id uuid, p_limit int default 50)
returns table (place_id uuid, content text)
language sql stable security invoker as $$
  select p.id, public.place_embed_content(p)
  from public.place p
  left join public.place_embedding e on e.place_id = p.id
  where p.trip_id = p_trip_id
    and (e.place_id is null or e.content_hash <> md5(public.place_embed_content(p)))
  limit p_limit;
$$;

-- p_query 는 저장 벡터와 동일 모델·768차원·L2 정규화여야 한다(C2-a).
create or replace function public.match_place_embeddings(
  p_trip_id uuid, p_query vector(768), p_limit int default 8
) returns table (place_id uuid, content text, similarity float)
language sql stable security invoker as $$
  select e.place_id, e.content, 1 - (e.embedding <=> p_query) as similarity
  from public.place_embedding e
  where e.trip_id = p_trip_id
  order by e.embedding <=> p_query
  limit least(p_limit, 20);
$$;

-- ── 5. 사용량 (rate limit) — 본인 조회만, 소비는 RPC 로만 (C6)
create table if not exists public.assistant_usage (
  user_id    uuid not null references public.profile(id) on delete cascade,
  usage_date date not null,
  count      int  not null default 0,
  primary key (user_id, usage_date)
);
alter table public.assistant_usage enable row level security;

drop policy if exists au_select on public.assistant_usage;
create policy au_select on public.assistant_usage for select
  using ( user_id = auth.uid() );
-- insert/update 정책 없음 → 소비는 consume_assistant_quota RPC 로만(사용자가 자기 카운터를 되돌릴 수 없다).

-- ★ definer 자가 인가(C1-a): 파라미터에 user_id 없음 → 대상은 항상 auth.uid() 본인 행.
--   count < p_limit 조건부 UPDATE 라 증가가 원자적(동시 요청 경합에도 한도 초과 없음).
create or replace function public.consume_assistant_quota(p_limit int default 30)
returns table (allowed boolean, remaining int)
language plpgsql security definer
set search_path = public
as $$
declare cur int;
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;

  insert into public.assistant_usage (user_id, usage_date, count)
  values (auth.uid(), current_date, 0)
  on conflict (user_id, usage_date) do nothing;

  update public.assistant_usage set count = count + 1
   where user_id = auth.uid() and usage_date = current_date and count < p_limit
  returning count into cur;

  if cur is null then return query select false, 0; end if;
  return query select true, greatest(p_limit - cur, 0);
end; $$;
