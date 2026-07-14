// seed-demo.mjs — 리크루터 데모 계정 + 샘플 여행 데이터 시딩 (idempotent)
//
// 실행: 저장소 루트에서
//   node scripts/seed-demo.mjs
//
// 필요 env (.env.local 자동 로드 or 환경변수):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (서버 전용 키 — 절대 커밋/노출 금지)
//
// 재실행하면 기존 데모 계정의 여행을 지우고 새로 시딩한다(중복 방지).

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ── env 로드 (.env.local 간단 파서) ─────────────────────────────
function loadEnv() {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* .env.local 없으면 환경변수만 사용 */
  }
}
loadEnv();

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요 (.env.local 확인)");
  process.exit(1);
}
const db = createClient(URL_, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// ── 데모 계정 정보 (README에 공개) ──────────────────────────────
const DEMO = {
  email: "demo@jero.travel",
  password: "JeroDemo2026!",
  name: "제이로 데모",
};

// ── 여행 기본 ───────────────────────────────────────────────────
const TRIP = {
  title: "도쿄 가을 여행",
  cover_icon: "building",
  cover_color: "coral",
  country: "일본",
  region: "도쿄",
  start_date: "2026-10-08",
  end_date: "2026-10-12", // 4박 5일
  base_currency: "KRW",
};
const D = (n) => `2026-10-${String(7 + n).padStart(2, "0")}`; // D(1)=10-08 ...

// 폴더
const FOLDERS = [
  { key: "sight", name: "관광", color: "#6E9CF2", sort_order: 0 },
  { key: "food", name: "맛집", color: "#F2A98E", sort_order: 1 },
  { key: "cafe", name: "카페", color: "#4FC9A6", sort_order: 2 },
];

// 장소 (실좌표 → 지도 마커 표시). day 0 = 저장만(미배정)
const PLACES = [
  { name: "센소지", cat: "museum", folder: "sight", area: "다이토구 아사쿠사", lat: 35.7148, lng: 139.7967, day: 1, ord: 1, t: "09:30", dur: 90 },
  { name: "도쿄 스카이트리", cat: "museum", folder: "sight", area: "스미다구", lat: 35.7101, lng: 139.8107, day: 1, ord: 2, t: "11:30", dur: 90 },
  { name: "츠키지 장외시장", cat: "food", folder: "food", area: "주오구", lat: 35.6654, lng: 139.7707, day: 1, ord: 3, t: "18:00", dur: 90 },
  { name: "우에노 공원", cat: "museum", folder: "sight", area: "다이토구", lat: 35.7156, lng: 139.7745, day: 2, ord: 1, t: "10:00", dur: 120 },
  { name: "아키하바라", cat: "shopping", folder: null, area: "지요다구", lat: 35.6989, lng: 139.7716, day: 2, ord: 2, t: "14:00", dur: 120 },
  { name: "시부야 스크램블", cat: "shopping", folder: null, area: "시부야구", lat: 35.6595, lng: 139.7004, day: 3, ord: 1, t: "10:30", dur: 60 },
  { name: "이치란 시부야점", cat: "food", folder: "food", area: "시부야구", lat: 35.6612, lng: 139.701, day: 3, ord: 2, t: "12:00", dur: 60 },
  { name: "다케시타 거리", cat: "shopping", folder: null, area: "하라주쿠", lat: 35.6716, lng: 139.7031, day: 3, ord: 3, t: "14:00", dur: 90 },
  { name: "블루보틀 키요스미", cat: "cafe", folder: "cafe", area: "고토구", lat: 35.6816, lng: 139.8006, day: 3, ord: 4, t: "16:30", dur: 60 },
  { name: "신주쿠 교엔", cat: "museum", folder: "sight", area: "신주쿠구", lat: 35.6852, lng: 139.71, day: 4, ord: 1, t: "10:00", dur: 120 },
  // 저장만(미배정) — 지도엔 다이아 마커
  { name: "나카메구로", cat: "cafe", folder: "cafe", area: "메구로구", lat: 35.6447, lng: 139.6989, day: 0 },
  { name: "오다이바", cat: "shopping", folder: null, area: "미나토구", lat: 35.6297, lng: 139.7799, day: 0 },
];

// 지출 (payer=데모, base KRW, JPY는 fx 9)
const EXPENSES = [
  { title: "호텔 2박", cat: "hotel", amount: 24000, cur: "JPY", fx: 9, on: D(1) },
  { title: "스카이트리 전망대", cat: "museum", amount: 3100, cur: "JPY", fx: 9, on: D(1) },
  { title: "츠키지 스시", cat: "food", amount: 4500, cur: "JPY", fx: 9, on: D(1) },
  { title: "스이카 충전(교통)", cat: "transport", amount: 3000, cur: "JPY", fx: 9, on: D(1) },
  { title: "이치란 라멘", cat: "food", amount: 1500, cur: "JPY", fx: 9, on: D(3) },
  { title: "기념품", cat: "gift", amount: 5000, cur: "JPY", fx: 9, on: D(4) },
];

const hexToken = () => [...crypto.getRandomValues(new Uint8Array(9))].map((b) => b.toString(16).padStart(2, "0")).join("");
const must = (label, { error }) => { if (error) { console.error(`❌ ${label}:`, error.message); process.exit(1); } };

async function findUser(email) {
  // 페이지네이션 순회로 이메일 매칭
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const u = data.users.find((x) => x.email === email);
    if (u) return u;
    if (data.users.length < 200) break;
  }
  return null;
}

async function main() {
  console.log("→ 기존 데모 계정 정리…");
  const existing = await findUser(DEMO.email);
  if (existing) {
    // 소유 여행 삭제(cascade: 멤버·폴더·장소·지출·공유) 후 계정 삭제(cascade: profile)
    await db.from("trip").delete().eq("created_by", existing.id);
    await db.auth.admin.deleteUser(existing.id);
    console.log("  기존 데모 계정·데이터 삭제됨");
  }

  console.log("→ 데모 계정 생성…");
  const { data: created, error: cErr } = await db.auth.admin.createUser({
    email: DEMO.email,
    password: DEMO.password,
    email_confirm: true,
    user_metadata: { name: DEMO.name },
  });
  must("createUser", { error: cErr });
  const uid = created.user.id;

  // 프로필은 트리거로 자동 생성됨 — 이름 보정
  await db.from("profile").update({ name: DEMO.name }).eq("id", uid);

  console.log("→ 여행 생성…");
  const { data: trip, error: tErr } = await db
    .from("trip")
    .insert({ ...TRIP, start_mode: "blank", created_by: uid })
    .select("id")
    .single();
  must("trip insert", { error: tErr });
  const tripId = trip.id;

  must("trip_member", await db.from("trip_member").insert({ trip_id: tripId, user_id: uid, role: "owner" }));

  console.log("→ 폴더…");
  const { data: folders, error: fErr } = await db
    .from("folder")
    .insert(FOLDERS.map((f) => ({ trip_id: tripId, name: f.name, color: f.color, sort_order: f.sort_order })))
    .select("id, name");
  must("folder insert", { error: fErr });
  const folderId = (key) => {
    const meta = FOLDERS.find((f) => f.key === key);
    return meta ? folders.find((x) => x.name === meta.name)?.id ?? null : null;
  };

  console.log("→ 장소…");
  const placeRows = PLACES.map((p) => ({
    trip_id: tripId,
    folder_id: folderId(p.folder),
    name: p.name,
    category: p.cat,
    area: p.area,
    lat: p.lat,
    lng: p.lng,
    saved_by: uid,
    scheduled_date: p.day ? D(p.day) : null,
    order_in_day: p.day ? p.ord : null,
    start_time: p.day ? p.t : null,
    duration_min: p.day ? p.dur : null,
    scheduled_by: p.day ? uid : null,
  }));
  must("place insert", await db.from("place").insert(placeRows));

  console.log("→ 지출 + 분담…");
  for (const e of EXPENSES) {
    const { data: exp, error: eErr } = await db
      .from("expense")
      .insert({
        trip_id: tripId,
        title: e.title,
        category: e.cat,
        amount: e.amount,
        currency: e.cur,
        fx_rate: e.fx,
        payer_id: uid,
        spent_on: e.on,
        created_by: uid,
      })
      .select("id")
      .single();
    must("expense insert", { error: eErr });
    must("expense_split", await db.from("expense_split").insert({ expense_id: exp.id, user_id: uid }));
  }

  console.log("→ 읽기 전용 공유 링크…");
  const token = hexToken();
  must("share_link", await db.from("share_link").insert({ trip_id: tripId, token, role: "viewer", created_by: uid }));

  console.log("\n✅ 시딩 완료");
  console.log("──────────────────────────────────────");
  console.log(`  로그인:  ${DEMO.email}`);
  console.log(`  비번:    ${DEMO.password}`);
  console.log(`  여행:    ${TRIP.title} (장소 ${PLACES.length} · 지출 ${EXPENSES.length})`);
  console.log(`  공유링크: /share/${token}`);
  console.log("──────────────────────────────────────");
}

main().catch((e) => { console.error(e); process.exit(1); });
