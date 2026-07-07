-- 0003_share — 공개 공유(08) + 초대 미리보기 RPC. 0002_data 이후 실행.
-- 익명(anon) 호출 허용 RPC로 세션 없이 토큰 스코프 조회(민감필드 제외, §8.5). RLS 우회는 함수 내부 검증으로 방어.
-- 적용: Supabase Dashboard → SQL Editor 에 붙여넣고 Run.

-- 공개 공유 스냅샷 — share_link 토큰으로 여행 읽기 전용 투영. 이메일·예산/정산·내부식별 제외.
create or replace function public.get_shared_trip(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare lnk public.share_link; tr public.trip;
begin
  select * into lnk from public.share_link where token = p_token;
  if not found or lnk.revoked then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  if lnk.expires_at is not null and lnk.expires_at <= now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;
  select * into tr from public.trip where id = lnk.trip_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  return jsonb_build_object(
    'ok', true,
    'snapshot', jsonb_build_object(
      'trip', jsonb_build_object('title', tr.title, 'start_date', tr.start_date, 'end_date', tr.end_date),
      'places', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', p.id, 'name', p.name, 'category', p.category, 'scheduled_date', p.scheduled_date,
          'order_in_day', p.order_in_day, 'start_time', to_char(p.start_time, 'HH24:MI'),
          'duration_min', p.duration_min, 'memo', p.memo, 'lat', p.lat, 'lng', p.lng
        ) order by p.scheduled_date, p.order_in_day)
        from public.place p where p.trip_id = tr.id and p.scheduled_date is not null
      ), '[]'::jsonb),
      'members', coalesce((
        select jsonb_agg(jsonb_build_object('initial', left(pr.name, 1), 'color', pr.avatar_color))
        from public.trip_member tm join public.profile pr on pr.id = tm.user_id
        where tm.trip_id = tr.id
      ), '[]'::jsonb)
    )
  );
end; $$;

-- 초대 미리보기 — 수락 전 여행 제목·부여 역할·초대자 표시(민감정보 제외). 로그인 전에도 노출 가능해 anon 허용.
create or replace function public.preview_invite(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare inv public.invitation; tr public.trip; inviter text;
begin
  select * into inv from public.invitation where token = p_token;
  if not found or inv.status <> 'pending'
     or (inv.expires_at is not null and inv.expires_at <= now()) then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  select * into tr from public.trip where id = inv.trip_id;
  select name into inviter from public.profile where id = inv.invited_by;
  return jsonb_build_object(
    'ok', true,
    'trip_title', tr.title,
    'start_date', tr.start_date,
    'end_date', tr.end_date,
    'role', inv.role,
    'inviter_name', coalesce(inviter, '멤버')
  );
end; $$;

-- 익명 실행 허용(세션 없는 공개 경로). authenticated 도 호출 가능.
grant execute on function public.get_shared_trip(text) to anon, authenticated;
grant execute on function public.preview_invite(text) to anon, authenticated;
