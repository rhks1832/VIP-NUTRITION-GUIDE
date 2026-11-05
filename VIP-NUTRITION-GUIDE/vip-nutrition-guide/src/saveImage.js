// 칼로리 + 탄단지 비율을 이미지로 그려서 PNG data URL로 반환
// - feed : 1080x1350 (4:5)
// - story: 1080x1920 (9:16), 인스타 UI에 가려지는 위·아래 영역을 피해 중앙에 배치
// 외부 라이브러리 없이 canvas만 사용 (카톡/인스타 인앱 브라우저 호환)

const FONT = '"Pretendard", -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

const COLORS = {
  bg: '#12140e',
  card: '#181b12',
  lime: '#d6e64c',
  cream: '#ebebe4',
  olive: '#676e3e',
  gray: '#96958f',
  carb: '#a9b85a',
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function text(ctx, str, x, y, { size, weight = 700, color, align = 'center', family = FONT, spacing }) {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  try {
    ctx.letterSpacing = spacing || '0px';
  } catch (e) {
    /* 지원하지 않는 브라우저에서는 무시 */
  }
  ctx.fillText(str, x, y);
}

export function renderSummaryImage({ format = 'feed', goalLabel, kcal, c, p, f, handle, title, cta }) {
  const W = 1080;
  const CARD_H = 1230;
  const H = format === 'story' ? 1920 : 1350;
  const dy = (H - 1350) / 2; // 스토리는 카드를 세로 중앙으로 이동

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // 카드 + 테두리
  roundRect(ctx, 60, 60 + dy, W - 120, CARD_H, 36);
  ctx.fillStyle = COLORS.card;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(214,230,76,0.22)';
  ctx.stroke();

  // 상단 라임 라인
  ctx.fillStyle = COLORS.lime;
  ctx.fillRect(120, 128 + dy, 120, 6);
  ctx.fillRect(W - 240, 128 + dy, 120, 6);

  text(ctx, 'THE LAST SET', W / 2, 212 + dy, { size: 30, color: COLORS.olive, spacing: '8px' });
  text(ctx, title, W / 2, 310 + dy, { size: 84, weight: 900, color: COLORS.cream });
  text(ctx, goalLabel, W / 2, 410 + dy, { size: 44, weight: 800, color: COLORS.lime });

  // 칼로리
  text(ctx, kcal.toLocaleString('ko-KR'), W / 2, 620 + dy, { size: 230, weight: 900, color: COLORS.lime });
  text(ctx, 'kcal / 일', W / 2, 700 + dy, { size: 50, weight: 700, color: COLORS.cream });

  // 비율 문구 + 막대 (칼로리 기준 50 : 30 : 20)
  text(ctx, '탄수화물 5 : 단백질 3 : 지방 2', W / 2, 800 + dy, { size: 50, weight: 800, color: COLORS.cream });
  const bx = 130;
  const bw = W - 260;
  const by = 842 + dy;
  const bh = 34;
  const wc = bw * 0.5;
  const wp = bw * 0.3;
  const wf = bw * 0.2;
  ctx.fillStyle = COLORS.carb;
  ctx.fillRect(bx, by, wc, bh);
  ctx.fillStyle = COLORS.lime;
  ctx.fillRect(bx + wc, by, wp, bh);
  ctx.fillStyle = COLORS.olive;
  ctx.fillRect(bx + wc + wp, by, wf, bh);

  // 그램 3열
  const cols = [
    { label: '탄수화물', value: c, color: COLORS.carb },
    { label: '단백질', value: p, color: COLORS.lime },
    { label: '지방', value: f, color: COLORS.cream },
  ];
  const colX = [bx + bw * 0.17, bx + bw * 0.5, bx + bw * 0.83];
  cols.forEach((col, i) => {
    text(ctx, col.label, colX[i], 955 + dy, { size: 36, weight: 600, color: COLORS.gray });
    text(ctx, `${col.value}g`, colX[i], 1040 + dy, { size: 76, weight: 900, color: col.color });
  });

  // 하단: 유입 문구 + 아이디 + 서명
  ctx.fillStyle = 'rgba(235,235,228,0.12)';
  ctx.fillRect(W / 2 - 60, 1090 + dy, 120, 3);
  if (cta) text(ctx, cta, W / 2, 1150 + dy, { size: 38, weight: 800, color: COLORS.lime });
  text(ctx, handle, W / 2, 1204 + dy, { size: 34, weight: 600, color: COLORS.gray });
  text(ctx, 'The Last Set', W / 2, 1254 + dy, { size: 32, weight: 500, color: COLORS.olive, family: SERIF });

  return canvas.toDataURL('image/png');
}
