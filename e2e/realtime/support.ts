import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 실시간(B4) e2e 지원 — service_role 부트스트랩(계약 B8, 사용자 승인).
 * .env.local 을 직접 파싱(테스트 프로세스는 Next 처럼 자동 로드하지 않음).
 * 실 Supabase 에 임시 계정 A/B/C + 여행 + 멤버십 + 일정 장소를 만들고, 종료 시 전량 삭제한다.
 * 매 실행 고유 이메일(runId)이라 재실행 충돌·잔여 없음.
 */

function loadEnv(): Record<string, string> {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const env: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

const env = loadEnv();
export const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const hasBackend = Boolean(
  SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY,
);

export interface RtUser {
  email: string;
  password: string;
  name: string;
  initial: string;
  id: string;
}

export interface RtData {
  tripId: string;
  date: string;
  a: RtUser;
  b: RtUser;
  c: RtUser;
  /** 시드된 일정 장소(order_in_day 1..n 순). */
  places: { id: string; name: string }[];
}

const PASSWORD = "jeroRealtime8!";

/** anon 키 클라이언트(세션 메모리 보관, 파일/자동갱신 없음). */
export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** email/pw 로그인된 anon 클라이언트 + 액세스 토큰(실시간 private 채널용). */
export async function signedInClient(
  user: RtUser,
): Promise<{ client: SupabaseClient; token: string }> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) throw new Error(`로그인 실패(${user.email}): ${error.message}`);
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token ?? "";
  await client.realtime.setAuth(token);
  return { client, token };
}

export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function createUser(
  admin: SupabaseClient,
  email: string,
  name: string,
  initial: string,
): Promise<RtUser> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error || !data.user) {
    throw new Error(`계정 생성 실패(${email}): ${error?.message}`);
  }
  return { email, password: PASSWORD, name, initial, id: data.user.id };
}

/**
 * A(owner)·B(editor 멤버)·C(비멤버) + A 소유 여행 + start_date 일정 장소 3개 시드.
 * A 는 create_trip RPC(계약 B2.1)로 owner 부여, B 멤버십·장소는 service_role 로 시드.
 */
export async function bootstrap(runId: string): Promise<RtData> {
  const admin = adminClient();
  const a = await createUser(admin, `rt-a-${runId}@jero.test`, "Ada", "A");
  const b = await createUser(admin, `rt-b-${runId}@jero.test`, "Ben", "B");
  const c = await createUser(admin, `rt-c-${runId}@jero.test`, "Cara", "C");

  const date = "2026-08-01";

  // A 로 create_trip → owner 멤버십 원자적 부여.
  const { client: aClient } = await signedInClient(a);
  const { data: tripIdData, error: tripErr } = await aClient.rpc("create_trip", {
    payload: {
      title: "실시간 검증 여행",
      icon: "plane",
      cover: "#6E9CF2",
      country: "일본",
      region: "도쿄",
      start_date: date,
      end_date: "2026-08-03",
      startMode: "blank",
      members: [],
    },
  });
  if (tripErr || typeof tripIdData !== "string") {
    throw new Error(`create_trip 실패: ${tripErr?.message}`);
  }
  const tripId = tripIdData;
  await aClient.auth.signOut();

  // B editor 멤버십(service_role — RLS 우회 시드).
  const { error: memberErr } = await admin
    .from("trip_member")
    .insert({ trip_id: tripId, user_id: b.id, role: "editor" });
  if (memberErr) throw new Error(`멤버 시드 실패: ${memberErr.message}`);

  // start_date 일정 장소 3개(order_in_day 1..3).
  const seed = [
    { name: "가장소 카페", category: "cafe", order_in_day: 1 },
    { name: "나장소 식당", category: "food", order_in_day: 2 },
    { name: "다장소 상점", category: "shopping", order_in_day: 3 },
  ].map((p) => ({
    trip_id: tripId,
    name: p.name,
    category: p.category,
    scheduled_date: date,
    order_in_day: p.order_in_day,
    saved_by: a.id,
    scheduled_by: a.id,
  }));
  const { data: placeRows, error: placeErr } = await admin
    .from("place")
    .insert(seed)
    .select("id, name, order_in_day");
  if (placeErr || !placeRows) {
    throw new Error(`장소 시드 실패: ${placeErr?.message}`);
  }
  const places = [...placeRows]
    .sort((x, y) => (x.order_in_day as number) - (y.order_in_day as number))
    .map((r) => ({ id: r.id as string, name: r.name as string }));

  return { tripId, date, a, b, c, places };
}

/** 단독 owner(다른 멤버 없음) + 여행 1개 생성. 계정삭제 "단독 소유 → cascade 삭제" 케이스용. */
export async function createSoloOwner(
  runId: string,
): Promise<{ user: RtUser; tripId: string }> {
  const admin = adminClient();
  const user = await createUser(admin, `rt-solo-${runId}@jero.test`, "Solo", "S");
  const { client } = await signedInClient(user);
  const { data, error } = await client.rpc("create_trip", {
    payload: {
      title: "단독 소유 여행",
      icon: "plane",
      cover: "#6E9CF2",
      start_date: "2026-09-01",
      end_date: "2026-09-02",
      startMode: "blank",
      members: [],
    },
  });
  await client.auth.signOut();
  if (error || typeof data !== "string") {
    throw new Error(`solo create_trip 실패: ${error?.message}`);
  }
  return { user, tripId: data };
}

/** 여행(하위 cascade) + 계정 3개 삭제. teardown. */
export async function teardown(data: RtData): Promise<void> {
  const admin = adminClient();
  await admin.from("trip").delete().eq("id", data.tripId);
  for (const u of [data.a, data.b, data.c]) {
    if (u.id) await admin.auth.admin.deleteUser(u.id);
  }
}
