# 폰트 (self-host)

이 폴더에 **Pretendard Variable** 폰트 파일을 배치하세요. 외부 CDN을 쓰지 않습니다(보안 §8.6 / CSP `font-src 'self'`).

## 필요한 파일

```
src/app/fonts/PretendardVariable.woff2
```

- 다운로드: https://github.com/orioncactus/pretendard/releases
  - 릴리스 압축 안 `dist/web/variable/PretendardVariable.woff2` (또는 `static` 가 아닌 **variable** woff2)
- `src/app/fonts.ts` 가 이 파일을 `next/font/local` 로 로드합니다 (`weight: "100 900"`).

## 주의

- **파일이 없으면 `yarn dev` / `yarn build` 가 실패**합니다. (`yarn typecheck` 은 영향 없음)
- 번들 용량(full ≈ 1.1MB)이 부담되면 한글 subset woff2 적용을 검토하세요. subset 적용 시 `fonts.ts` 의 `src` 경로만 교체하면 됩니다.
- 이 woff2 파일은 바이너리이므로 저장소 커밋 정책(LFS 여부 등)은 별도로 결정하세요.
