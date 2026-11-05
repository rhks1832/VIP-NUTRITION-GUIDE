import {
  calcTargets,
  splitMeals,
  proteinNote,
  buildAdvice,
  buildTips,
  validateProfile,
  PACES,
  MEAL_COUNTS,
} from '../src/calc.js';

let fail = 0;
let checks = 0;
const assert = (cond, msg) => {
  checks++;
  if (!cond) {
    fail++;
    if (fail < 20) console.log('FAIL:', msg);
  }
};

const profiles = [
  { sex: 'm', age: 30, height: 175, weight: 75, activity: 'mid' },
  { sex: 'm', age: 25, height: 180, weight: 65, activity: 'high' },
  { sex: 'm', age: 45, height: 170, weight: 95, activity: 'low' },
  { sex: 'f', age: 28, height: 160, weight: 52, activity: 'light' },
  { sex: 'f', age: 35, height: 165, weight: 70, activity: 'low' },
  { sex: 'f', age: 22, height: 168, weight: 58, activity: 'mid' },
  { sex: 'm', age: 60, height: 168, weight: 80, activity: 'light' },
  { sex: 'm', age: 28, height: 185, weight: 110, activity: 'high' },
  { sex: 'f', age: 40, height: 150, weight: 45, activity: 'low' },
  { sex: 'm', age: 35, height: 175, weight: 140, activity: 'low' },
];

for (const base of profiles) {
  for (const goal of ['diet', 'maintain', 'bulk']) {
    for (const pace of PACES[goal]) {
      const profile = { ...base, goal, pace: pace.id };
      const t = calcTargets(profile);
      const tag = JSON.stringify({ base, goal, pace: pace.id });

      assert(t.kcal > 0 && t.p > 0 && t.c > 0 && t.f > 0, `양수 ${tag}`);
      assert(t.kcal % 10 === 0, `칼로리 10단위 ${tag}`);

      // 5:3:2 검증 (칼로리 비율)
      const kc = t.c * 4;
      const kp = t.p * 4;
      const kf = t.f * 9;
      const sum = kc + kp + kf;
      assert(Math.abs(sum - t.kcal) / t.kcal < 0.01, `탄단지 합계가 칼로리와 일치 ${tag}: ${sum} vs ${t.kcal}`);
      assert(Math.abs(kc / sum - 0.5) < 0.01, `탄수 50% ${tag}`);
      assert(Math.abs(kp / sum - 0.3) < 0.01, `단백질 30% ${tag}`);
      assert(Math.abs(kf / sum - 0.2) < 0.01, `지방 20% ${tag}`);

      // 다이어트 칼로리 하한
      if (goal === 'diet') {
        assert(t.kcal >= (base.sex === 'm' ? 1500 : 1200) - 10 || t.kcal >= t.bmr - 10, `다이어트 하한 ${tag}: ${t.kcal}`);
        assert(t.kcal >= t.bmr - 10, `다이어트는 BMR 미만 금지 ${tag}`);
      }
      if (goal === 'bulk') assert(t.kcal > t.tdee, `벌크는 유지보다 높아야 함 ${tag}`);
      if (goal === 'diet') assert(t.kcal <= t.tdee, `다이어트는 유지 이하 ${tag}`);

      // 끼니 분할 (3끼/4끼)
      for (const n of MEAL_COUNTS) {
        const m = splitMeals(t, n);
        assert(m.count === n, `끼니 수 ${n}`);
        assert(Math.abs(m.kcal * n - t.kcal) <= 5 * n + 5, `끼니 칼로리 합 ${tag} ${n}: ${m.kcal * n} vs ${t.kcal}`);
        assert(Math.abs(m.c * n - t.c) <= n, `끼니 탄수 합 ${tag} ${n}`);
        assert(Math.abs(m.p * n - t.p) <= n, `끼니 단백질 합 ${tag} ${n}`);
        assert(Math.abs(m.f * n - t.f) <= n, `끼니 지방 합 ${tag} ${n}`);
      }
      assert(splitMeals(t, 5).count === 3, '5끼는 지원하지 않음(3끼로 대체)');

      // 문구 생성 (오류 없이 문자열)
      const note = proteinNote(t);
      assert(note === null || typeof note === 'string', `단백질 안내 ${tag}`);
      assert(buildTips(goal, t).every((x) => typeof x === 'string' && x.length > 0), `점검 팁 ${tag}`);
      assert(buildAdvice(goal).every((g) => g.title && g.items.length > 0), `조언 ${tag}`);
    }
  }
}

// 검증 규칙
const v = (o) =>
  Object.keys(validateProfile({ sex: 'm', activity: 'mid', goal: 'diet', age: '30', height: '175', weight: '75', ...o }));
assert(v({}).length === 0, '정상 입력 통과');
assert(v({ age: '17' }).includes('age'), '17세 차단');
assert(v({ age: '' }).includes('age'), '빈 나이 차단');
assert(v({ height: '100' }).includes('height'), '키 범위');
assert(v({ weight: '300' }).includes('weight'), '체중 범위');
assert(v({ sex: '' }).includes('sex'), '성별 필수');

// 단백질 안내 분기
const heavy = calcTargets({ sex: 'm', age: 28, height: 185, weight: 65, activity: 'high', goal: 'bulk', pace: 'full' });
assert(heavy.pPerKg > 2.2 && typeof proteinNote(heavy) === 'string', `고단백 안내 (${heavy.pPerKg})`);
const bigdiet = calcTargets({ sex: 'm', age: 35, height: 175, weight: 140, activity: 'low', goal: 'diet', pace: 'normal' });
console.log('140kg 다이어트:', { kcal: bigdiet.kcal, p: bigdiet.p, pPerKg: bigdiet.pPerKg, note: proteinNote(bigdiet) });

// 예시 출력
const ex = calcTargets({ sex: 'f', age: 28, height: 160, weight: 52, activity: 'light', goal: 'diet', pace: 'normal' });
console.log('예시(여 28/160/52 다이어트):', ex);
console.log('3끼:', splitMeals(ex, 3), '4끼:', splitMeals(ex, 4));

console.log(`\n${checks}건 검사`);
console.log(fail ? `실패 ${fail}건` : '모두 통과');
process.exit(fail ? 1 : 0);
