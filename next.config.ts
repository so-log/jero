import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 팜플렛 서버 PDF(headless Chromium) — 번들에 포함하지 않고 서버 런타임에서 로드(§팜플렛 §5).
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
};

export default nextConfig;
