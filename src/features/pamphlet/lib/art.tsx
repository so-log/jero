import type { CSSProperties } from "react";

import type {
  PamphletTheme,
  PatternKey,
  SceneKey,
} from "@/lib/constants/pamphletThemes";

/**
 * 팜플렛 아트 렌더러(2차, 팜플렛_설계 §3) — 프로토타입 pattern()/sceneInner()/miniScene() 이관.
 * **결정적 SVG**(팔레트 색만 사용, 사용자 입력 없음) → dangerouslySetInnerHTML 안전(§8.3: 유저 입력 아님).
 * 텍스트(장소명·메모 등 유저데이터)는 절대 여기 넣지 않는다 — 패널에서 React children 으로 렌더.
 */

// ── 씬 계열(표지 배경 플랫 일러스트, viewBox 232×300) ────────────────────────
function cloud(x: number, y: number, sc: number): string {
  return `<g fill="#FFFFFF" opacity="0.96"><ellipse cx="${x}" cy="${y}" rx="${30 * sc}" ry="${17 * sc}"/><circle cx="${x - 20 * sc}" cy="${y + 3 * sc}" r="${13 * sc}"/><circle cx="${x + 22 * sc}" cy="${y + 2 * sc}" r="${15 * sc}"/><circle cx="${x - 2 * sc}" cy="${y - 11 * sc}" r="${15 * sc}"/></g>`;
}
function sun(x: number, y: number, r: number, col: string): string {
  let g = "";
  for (let i = 0; i < 8; i++) {
    const an = (i * Math.PI) / 4;
    g += `<line x1="${x + Math.cos(an) * (r + 6)}" y1="${y + Math.sin(an) * (r + 6)}" x2="${x + Math.cos(an) * (r + 15)}" y2="${y + Math.sin(an) * (r + 15)}" stroke="${col}" stroke-width="4" stroke-linecap="round"/>`;
  }
  return g + `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/>`;
}

export function sceneSvg(kind: SceneKey, theme: PamphletTheme): string {
  const a = theme.accent;
  const a2 = theme.accent2;
  if (kind === "sky") {
    return (
      `<defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9E4FF"/><stop offset="1" stop-color="#E9F6FF"/></linearGradient></defs>` +
      `<rect width="232" height="300" fill="url(#sg)"/>` + sun(176, 74, 30, a2) +
      cloud(60, 150, 1.15) + cloud(180, 200, 1.0) + cloud(110, 235, 0.85) +
      `<g stroke="${a}" stroke-width="3" stroke-linecap="round" opacity="0.5" fill="none"><path d="M40 90 q6 -7 12 0 q6 -7 12 0"/><path d="M150 120 q5 -6 10 0 q5 -6 10 0"/></g>`
    );
  }
  if (kind === "meadow") {
    const flowers = [[50, 214], [95, 232], [150, 220], [195, 238], [120, 255]]
      .map((p) => `<g><line x1="${p[0]}" y1="${p[1] + 10}" x2="${p[0]}" y2="${p[1] + 18}" stroke="#3E9E54" stroke-width="2.5"/><circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${a2}"/><circle cx="${p[0] - 5}" cy="${p[1] + 3}" r="4" fill="#FFFFFF"/><circle cx="${p[0] + 5}" cy="${p[1] + 3}" r="4" fill="#FFFFFF"/><circle cx="${p[0]}" cy="${p[1]}" r="2.2" fill="#FFD84D"/></g>`)
      .join("");
    return (
      `<defs><linearGradient id="mg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DFF3FF"/><stop offset="1" stop-color="#EFFAE6"/></linearGradient></defs>` +
      `<rect width="232" height="300" fill="url(#mg)"/>` + sun(46, 60, 22, a2) + cloud(170, 66, 0.8) +
      `<path d="M0 180 Q116 140 232 180 L232 300 L0 300 Z" fill="#9BDB8E"/>` +
      `<path d="M0 220 Q116 185 232 220 L232 300 L0 300 Z" fill="${a}"/>` +
      `<path d="M0 262 Q116 238 232 262 L232 300 L0 300 Z" fill="#3E9E54"/>` + flowers
    );
  }
  if (kind === "forest") {
    const tree = (x: number, y: number, sc: number, col: string) =>
      `<g><rect x="${x - 3 * sc}" y="${y}" width="${6 * sc}" height="${14 * sc}" rx="2" fill="#B07A4A"/><path d="M${x - 18 * sc} ${y} Q${x} ${y - 6 * sc} ${x + 18 * sc} ${y} Z" fill="${col}"/><path d="M${x - 16 * sc} ${y - 14 * sc} Q${x} ${y - 20 * sc} ${x + 16 * sc} ${y - 14 * sc} L${x + 14 * sc} ${y - 6 * sc} Q${x} ${y - 11 * sc} ${x - 14 * sc} ${y - 6 * sc} Z" fill="${col}"/><path d="M${x - 12 * sc} ${y - 26 * sc} Q${x} ${y - 34 * sc} ${x + 12 * sc} ${y - 26 * sc} L${x + 11 * sc} ${y - 18 * sc} Q${x} ${y - 23 * sc} ${x - 11 * sc} ${y - 18 * sc} Z" fill="${col}"/></g>`;
    return (
      `<defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D8F0E4"/><stop offset="1" stop-color="#EEF8F1"/></linearGradient></defs>` +
      `<rect width="232" height="300" fill="url(#fg)"/>` + sun(190, 54, 20, a2) +
      `<path d="M0 210 Q116 180 232 210 L232 300 L0 300 Z" fill="#CDE9D6"/>` +
      `<path d="M96 300 L136 300 L124 214 Q116 210 108 214 Z" fill="#E8D6AE"/>` +
      `<line x1="116" y1="228" x2="116" y2="292" stroke="#F3E9CF" stroke-width="3" stroke-dasharray="7 8" stroke-linecap="round"/>` +
      tree(44, 235, 1.5, "#3E9E6E") + tree(196, 240, 1.6, "#2F8E60") + tree(74, 205, 1.05, "#4FB183") + tree(165, 205, 1.1, "#3E9E6E") + tree(120, 192, 0.85, "#57B98C")
    );
  }
  if (kind === "sea") {
    return (
      `<defs><linearGradient id="skg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFEFFA"/><stop offset="1" stop-color="#EAF8FC"/></linearGradient>` +
      `<linearGradient id="seg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="#1B8AA6"/></linearGradient></defs>` +
      `<rect width="232" height="300" fill="url(#skg)"/>` + sun(56, 64, 24, a2) +
      `<rect y="176" width="232" height="124" fill="url(#seg)"/>` +
      `<g stroke="#FFFFFF" stroke-width="2.5" opacity="0.55" fill="none" stroke-linecap="round"><path d="M20 208 q10 -7 20 0 q10 -7 20 0"/><path d="M150 200 q10 -7 20 0 q10 -7 20 0"/><path d="M70 236 q10 -7 20 0 q10 -7 20 0"/></g>` +
      `<ellipse cx="44" cy="184" rx="34" ry="12" fill="#7FB98A"/>` +
      `<path d="M34 176 L54 176 L50 120 L38 120 Z" fill="#FFFFFF"/><path d="M38 120 L50 120 L49 108 L39 108 Z" fill="${a2}"/>` +
      `<rect x="36" y="150" width="16" height="7" fill="${a2}"/><rect x="37" y="164" width="14" height="7" fill="${a2}"/>` +
      `<path d="M150 214 L206 214 L198 232 L158 232 Z" fill="#FFFFFF"/>` +
      `<line x1="178" y1="150" x2="178" y2="214" stroke="#8A6242" stroke-width="3"/>` +
      `<path d="M178 154 L178 208 L142 208 Z" fill="#FFFFFF"/><path d="M181 158 L181 206 L214 206 Z" fill="${a2}"/>`
    );
  }
  if (kind === "train") {
    const ties = [16, 44, 72, 100, 128, 156, 184, 212].map((x) => `<line x1="${x}" y1="280" x2="${x}" y2="292"/>`).join("");
    return (
      `<defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DCF0FB"/><stop offset="1" stop-color="#FDF1EC"/></linearGradient></defs>` +
      `<rect width="232" height="300" fill="url(#tg)"/>` + sun(188, 56, 20, a2) + cloud(60, 74, 0.8) +
      `<path d="M0 196 Q116 168 232 196 L232 300 L0 300 Z" fill="#BFE39E"/>` +
      `<path d="M0 236 Q116 214 232 236 L232 300 L0 300 Z" fill="#9AD27C"/>` +
      `<g stroke="#8A93A0" stroke-width="4" stroke-linecap="round"><line x1="8" y1="286" x2="224" y2="286"/></g>` +
      `<g stroke="#B98A5A" stroke-width="4">${ties}</g>` +
      `<g><rect x="36" y="232" width="60" height="40" rx="9" fill="${a}"/><rect x="80" y="216" width="34" height="56" rx="9" fill="${a}"/><rect x="88" y="226" width="18" height="16" rx="3" fill="#EAF6FF"/><rect x="46" y="242" width="16" height="14" rx="3" fill="#EAF6FF"/><rect x="66" y="242" width="12" height="14" rx="3" fill="#EAF6FF"/><rect x="98" y="208" width="12" height="12" rx="3" fill="#4A5568"/>` +
      `<rect x="118" y="238" width="44" height="34" rx="8" fill="${a2}"/><rect x="126" y="246" width="12" height="14" rx="3" fill="#EAF6FF"/><rect x="142" y="246" width="12" height="14" rx="3" fill="#EAF6FF"/>` +
      `<circle cx="52" cy="278" r="8" fill="#4A5568"/><circle cx="88" cy="278" r="8" fill="#4A5568"/><circle cx="134" cy="278" r="7" fill="#4A5568"/></g>`
    );
  }
  // plane
  return (
    `<defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C7DBFF"/><stop offset="1" stop-color="#EDF3FF"/></linearGradient></defs>` +
    `<rect width="232" height="300" fill="url(#pg)"/>` +
    cloud(52, 210, 1.1) + cloud(190, 235, 0.95) + cloud(150, 90, 0.7) +
    `<path d="M28 250 Q90 150 150 120" stroke="${a}" stroke-width="3" stroke-dasharray="3 8" stroke-linecap="round" fill="none" opacity="0.6"/><circle cx="28" cy="250" r="5" fill="${a}"/>` +
    `<g transform="rotate(-28 150 120)"><ellipse cx="150" cy="120" rx="46" ry="15" fill="#FFFFFF"/><path d="M196 120 q10 0 12 -5 l-16 -2 z" fill="${a2}"/>` +
    `<path d="M150 112 L120 78 L134 108 Z" fill="${a}"/><path d="M150 128 L120 162 L134 132 Z" fill="${a}"/>` +
    `<path d="M108 120 L92 106 L104 118 Z" fill="${a}"/>` +
    `<g fill="${a2}"><circle cx="132" cy="120" r="3"/><circle cx="146" cy="120" r="3"/><circle cx="160" cy="120" r="3"/><circle cx="174" cy="120" r="3"/></g></g>`
  );
}

export function miniSceneSvg(kind: SceneKey, theme: PamphletTheme): string {
  const a = theme.accent;
  const a2 = theme.accent2;
  let inner = "";
  if (kind === "sky") inner = `<circle cx="24" cy="14" r="7" fill="${a2}"/><ellipse cx="15" cy="26" rx="10" ry="5" fill="#fff"/><circle cx="9" cy="25" r="4" fill="#fff"/><circle cx="21" cy="24" r="5" fill="#fff"/>`;
  else if (kind === "meadow") inner = `<circle cx="10" cy="12" r="5" fill="${a2}"/><path d="M0 24 Q18 16 36 24 L36 36 L0 36Z" fill="${a}"/><circle cx="24" cy="24" r="3" fill="#fff"/><circle cx="24" cy="24" r="1.4" fill="#FFD84D"/>`;
  else if (kind === "forest") inner = `<path d="M8 30 L18 30 L13 12Z" fill="${a}"/><path d="M20 32 L32 32 L26 10Z" fill="#2F8E60"/><rect x="24" y="30" width="4" height="6" fill="#B07A4A"/>`;
  else if (kind === "sea") inner = `<rect y="20" width="36" height="16" fill="${a}"/><circle cx="9" cy="12" r="5" fill="${a2}"/><path d="M16 22 L28 22 L24 30 L20 30Z" fill="#fff"/><line x1="24" y1="10" x2="24" y2="22" stroke="#8A6242" stroke-width="1.6"/><path d="M24 11 L24 21 L15 21Z" fill="#fff"/>`;
  else if (kind === "train") inner = `<path d="M0 26 Q18 20 36 26 L36 36 L0 36Z" fill="${a}22"/><rect x="6" y="18" width="16" height="12" rx="3" fill="${a}"/><rect x="20" y="14" width="9" height="16" rx="3" fill="${a}"/><circle cx="11" cy="31" r="3" fill="#4A5568"/><circle cx="24" cy="31" r="3" fill="#4A5568"/>`;
  else inner = `<path d="M6 30 Q18 16 30 12" stroke="${a}" stroke-width="1.6" stroke-dasharray="2 3" fill="none"/><g transform="rotate(-25 24 14)"><ellipse cx="24" cy="14" rx="11" ry="4" fill="#fff" stroke="${a}" stroke-width="1"/><path d="M24 11 L16 5 L20 11Z" fill="${a}"/></g>`;
  return `<rect width="36" height="36" fill="${theme.wash}"/>${inner}`;
}

// ── 패턴 계열(표지·소개 배경, viewBox w×h) ───────────────────────────────────
export function patternSvg(pattern: PatternKey, theme: PamphletTheme, w: number, h: number): string {
  const a = theme.accent;
  const a2 = theme.accent2;
  let body = "";
  if (pattern === "waves") {
    for (let i = 0; i < 5; i++) {
      const y = 28 + i * 17;
      body += `<path d="M0 ${y} Q ${w * 0.25} ${y - 10} ${w * 0.5} ${y} T ${w} ${y}" fill="none" stroke="${a}" stroke-width="2.4" opacity="${0.5 - i * 0.06}"/>`;
    }
    body += `<circle cx="${w * 0.74}" cy="34" r="18" fill="${a2}" opacity="0.9"/>`;
  } else if (pattern === "city") {
    const bars = [[0.12, 60], [0.26, 90], [0.4, 45], [0.54, 105], [0.68, 72], [0.82, 120]];
    bars.forEach((b) => {
      body += `<rect x="${w * b[0] - 11}" y="${h - b[1]}" width="22" height="${b[1]}" rx="3" fill="${a}" opacity="0.85"/>`;
    });
    body += `<circle cx="${w * 0.8}" cy="30" r="13" fill="${a2}"/>`;
  } else if (pattern === "petals") {
    const pts = [[0.2, 0.3], [0.5, 0.2], [0.75, 0.4], [0.35, 0.6], [0.62, 0.68], [0.85, 0.62]];
    pts.forEach((p, i) => {
      const cx = w * p[0];
      const cy = h * p[1];
      const r = i % 2 ? 13 : 9;
      body += `<g transform="translate(${cx} ${cy})"><circle cx="0" cy="-${r}" r="${r}" fill="${a2}" opacity="0.85"/><circle cx="${r}" cy="0" r="${r}" fill="${a}" opacity="0.7"/><circle cx="0" cy="${r}" r="${r}" fill="${a2}" opacity="0.85"/><circle cx="-${r}" cy="0" r="${r}" fill="${a}" opacity="0.7"/></g>`;
    });
  } else if (pattern === "flakes") {
    const pts = [[0.22, 0.34], [0.5, 0.24], [0.74, 0.44], [0.36, 0.64], [0.64, 0.66], [0.84, 0.32]];
    pts.forEach((p, i) => {
      const cx = w * p[0];
      const cy = h * p[1];
      const r = i % 2 ? 11 : 7;
      body += `<g stroke="${a}" stroke-width="2" opacity="0.7"><line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}"/><line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}"/><line x1="${cx - r * 0.7}" y1="${cy - r * 0.7}" x2="${cx + r * 0.7}" y2="${cy + r * 0.7}"/><line x1="${cx - r * 0.7}" y1="${cy + r * 0.7}" x2="${cx + r * 0.7}" y2="${cy - r * 0.7}"/></g>`;
    });
  } else if (pattern === "dots") {
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 6; c++) {
        const cx = 18 + c * ((w - 30) / 5);
        const cy = 26 + r * 26;
        body += `<circle cx="${cx}" cy="${cy}" r="${(r + c) % 2 ? 8 : 5}" fill="${(r + c) % 2 ? a : a2}" opacity="0.8"/>`;
      }
  } else {
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 6; c++) {
        const cx = 16 + c * ((w - 24) / 5);
        const cy = 24 + r * 26;
        body += `<rect x="${cx - 6}" y="${cy - 6}" width="12" height="12" rx="3" fill="${(r + c) % 2 ? a : a2}" opacity="0.55"/>`;
      }
  }
  return body;
}

// ── React 래퍼(정적 SVG 삽입) ────────────────────────────────────────────────
/** viewBox vw×vh 의 inner SVG 를 w×h 로 렌더(씬: slice). 정적 문자열만 삽입. */
export function SvgArt({
  inner,
  vw,
  vh,
  width,
  height,
  slice = false,
  style,
}: {
  inner: string;
  vw: number;
  vh: number;
  width: number;
  height: number;
  slice?: boolean;
  style?: CSSProperties;
}) {
  const par = slice ? ' preserveAspectRatio="xMidYMid slice"' : "";
  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${vw} ${vh}"${par} xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  return (
    <span
      style={{ display: "block", lineHeight: 0, ...style }}
      // 정적 코드생성 SVG(팔레트 색만, 유저 입력 없음) — XSS 표면 없음(§8.3).
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
