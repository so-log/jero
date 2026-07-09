import chromium from "@sparticuz/chromium";
import { type NextRequest, NextResponse } from "next/server";
import puppeteer, { type Browser } from "puppeteer-core";

import { hasSupabase } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * POST /api/pamphlet/export (팜플렛_설계 §5·§9) — 인쇄 전용 라우트를 headless Chromium 으로 렌더 →
 * A4 landscape·printBackground PDF 버퍼로 다운로드 응답. 미리보기와 동일 컴포넌트/`faces` 재사용이라 결과 일치.
 *
 * 보안(§8.2): 세션 + trip 멤버십(owner/editor) 재검증. 요청 쿠키를 headless 브라우저에 전달해
 * 인쇄 라우트의 서버 멤버십 체크 + 클라 데이터 fetch(RLS)를 그대로 통과시킨다.
 * 배포(서버리스 Linux)는 `@sparticuz/chromium`, 로컬은 `PUPPETEER_EXECUTABLE_PATH` 로 설치된 Chrome 경로 주입.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

interface ExportBody {
  tripId?: string;
  theme?: string;
  sections?: string; // csv (cover,schedule,prep,intro,qr)
  token?: string;
}

async function launchBrowser(): Promise<Browser> {
  // 로컬(Windows/macOS)은 설치된 Chrome/Edge 경로를 env 로 주입(@sparticuz 바이너리는 Linux 전용).
  const localExecutable =
    process.env.PUPPETEER_EXECUTABLE_PATH ?? process.env.CHROME_PATH;
  if (localExecutable) {
    return puppeteer.launch({
      headless: true,
      executablePath: localExecutable,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  // 배포(Vercel/Lambda) — 서버리스 호환 Chromium.
  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

function resolveOrigin(request: NextRequest): string {
  const url = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    url.host;
  const proto =
    request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export async function POST(request: NextRequest) {
  let body: ExportBody;
  try {
    body = (await request.json()) as ExportBody;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { tripId, theme, sections, token } = body;
  if (!tripId || !theme || !sections) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // 세션 + 멤버십 재검증(§8.2) — 키 있을 때만. 없으면(스텁/로컬 데모) 스킵하고 fixture 로 렌더.
  if (hasSupabase) {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const { data: member } = await supabase
      .from("trip_member")
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .maybeSingle();
    // 멤버(owner/editor)만 — 비멤버·viewer 차단(§8).
    if (!member || member.role === "viewer") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const origin = resolveOrigin(request);
  const params = new URLSearchParams({ theme, sections });
  if (token) params.set("token", token);
  const printUrl = `${origin}/trips/${tripId}/pamphlet/print?${params.toString()}`;

  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    // 인쇄 라우트가 로드 후 자동 window.print() 하지만 headless 에선 렌더만 필요 — no-op 처리.
    await page.evaluateOnNewDocument(() => {
      window.print = () => {};
    });

    // 인증 세션 전달: 요청 쿠키를 그대로 심어 서버 멤버십 체크 + 클라 데이터 fetch 통과(§8.2).
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const cookies = cookieHeader
        .split(";")
        .map((c) => {
          const idx = c.indexOf("=");
          if (idx < 0) return null;
          return {
            name: c.slice(0, idx).trim(),
            value: c.slice(idx + 1).trim(),
            url: origin,
          };
        })
        .filter((c): c is { name: string; value: string; url: string } =>
          Boolean(c && c.name),
        );
      if (cookies.length > 0) await page.setCookie(...cookies);
    }

    await page.emulateMediaType("print");
    await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 45_000 });
    // 팜플렛 면과 폰트(동적 서브셋)까지 렌더 완료 대기.
    await page.waitForSelector(".pf-page", { timeout: 15_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const pdf = await page.pdf({
      printBackground: true,
      landscape: true,
      format: "a4",
      preferCSSPageSize: true, // 인쇄 라우트의 @page { size: A4 landscape } 우선.
    });

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="jero-pamphlet-${tripId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    // 시크릿/PII 미출력(§8.5) — 일반화된 메시지만.
    console.error("[pamphlet/export] headless render failed");
    return NextResponse.json({ error: "render_failed" }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
