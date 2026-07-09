# Pretendard Variable — dynamic-subset (자체호스팅)

`next/font/local` 단일 full woff2(2MB) 방식을 **Pretendard 공식 dynamic-subset**으로 교체했다.

- **`pretendard.css`** — 92개 `@font-face`(각 `unicode-range` 분할, `font-display: swap`, `format('woff2-variations')`). `globals.css` 상단에서 `@import`. `font-family: 'Pretendard Variable'` → `@theme --font-pretendard`/`--font-sans` 토큰이 그대로 참조하므로 **사용처 무변경**.
- **woff2 청크** — `public/fonts/pretendard/PretendardVariable.subset.*.woff2` (자체호스팅, 외부 CDN 미사용 → CSP `font-src 'self'`). 브라우저는 렌더된 글리프의 `unicode-range`에 매칭되는 청크만 내려받는다(full 2MB 대체).
- **preload** — `src/app/layout.tsx`에서 가장 흔한 청크(91=라틴+기본 한글, 90=상용 한글)만 `react-dom` `preload`로 FCP 보전.
- 폰트 파일이 없어도 **build/dev 는 실패하지 않는다**(fallback 폰트로 렌더). full woff2 및 `fonts.ts`(next/font/local)는 제거됨.

## 재생성 (버전 업 시)

```bash
npm pack pretendard          # 릴리스 tarball (dependency 추가 아님)
tar -xzf pretendard-*.tgz
cp package/dist/web/variable/woff2-dynamic-subset/*.woff2 public/fonts/pretendard/
# pretendardvariable-dynamic-subset.css 의 src 경로만 자체호스팅 위치로 치환:
sed 's#\./woff2-dynamic-subset/#/fonts/pretendard/#g' \
  package/dist/web/variable/pretendardvariable-dynamic-subset.css > src/app/fonts/pretendard.css
```

출처: https://github.com/orioncactus/pretendard (SIL Open Font License 1.1 — `pretendard.css` 상단 고지 유지)
