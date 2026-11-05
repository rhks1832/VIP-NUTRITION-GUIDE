import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 배포 주소가 있으면 링크 미리보기(카톡/인스타 DM/문자) 정보를 자동으로 추가
// - Vercel: VERCEL_PROJECT_PRODUCTION_URL 을 자동으로 사용
// - 직접 지정: SITE_URL=https://내도메인 npm run build
function siteMeta() {
  return {
    name: 'site-meta',
    transformIndexHtml(html) {
      const raw =
        process.env.SITE_URL ||
        (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
      const twitter = '<meta name="twitter:card" content="summary_large_image" />';
      if (!raw) return html.replace('</head>', `    ${twitter}\n  </head>`);
      const base = raw.replace(/\/$/, '');
      const tags = [
        `<link rel="canonical" href="${base}/" />`,
        `<meta property="og:url" content="${base}/" />`,
        `<meta property="og:image" content="${base}/og.png" />`,
        '<meta property="og:image:width" content="1200" />',
        '<meta property="og:image:height" content="630" />',
        twitter,
        `<meta name="twitter:image" content="${base}/og.png" />`,
      ]
        .map((t) => `    ${t}`)
        .join('\n');
      return html.replace('</head>', `${tags}\n  </head>`);
    },
  };
}

// 카카오톡/인스타 인앱 브라우저 호환: 낮은 타깃으로 트랜스파일, 단일 HTML 파일로 번들
export default defineConfig({
  plugins: [react(), viteSingleFile(), siteMeta()],
  build: {
    target: 'es2017',
    cssTarget: 'chrome61',
    chunkSizeWarningLimit: 600,
  },
});
