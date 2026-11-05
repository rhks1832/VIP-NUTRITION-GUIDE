// ───────────────────────────────────────────────
// 칼로리 / 탄단지(5:3:2) 계산
// 모든 수치는 "참고용" 추정치입니다.
// ───────────────────────────────────────────────

export const ACTIVITY = [
  { id: 'low', label: '거의 앉아서 생활', desc: '운동 거의 안 함 · 사무직', factor: 1.2 },
  { id: 'light', label: '가볍게 활동', desc: '주 1~3회 운동', factor: 1.375 },
  { id: 'mid', label: '보통', desc: '주 3~5회 운동', factor: 1.55 },
  { id: 'high', label: '매우 활발', desc: '주 6~7회 운동 · 육체노동', factor: 1.725 },
];

export const GOALS = [
  { id: 'diet', label: '다이어트', sub: '체지방 감량' },
  { id: 'maintain', label: '체중 유지', sub: '지금 몸 유지' },
  { id: 'bulk', label: '벌크업', sub: '근육량 증가' },
];

export const PACES = {
  diet: [
    { id: 'normal', label: '보통', pct: -20, note: '-20%' },
    { id: 'slow', label: '천천히', pct: -15, note: '-15%' },
  ],
  maintain: [{ id: 'keep', label: '유지', pct: 0, note: '±0%' }],
  bulk: [
    { id: 'lean', label: '린벌크', pct: 10, note: '+10%' },
    { id: 'full', label: '적극 벌크', pct: 15, note: '+15%' },
  ],
};

export const LIMITS = {
  age: [18, 80],
  height: [140, 220],
  weight: [35, 200],
};

// 탄수화물 : 단백질 : 지방 = 5 : 3 : 2 (칼로리 비율)
export const RATIO = { c: 5, p: 3, f: 2 };

export const MEAL_COUNTS = [3, 4];

export function validateProfile(p) {
  const errors = {};
  const num = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));
  const age = num(p.age);
  const height = num(p.height);
  const weight = num(p.weight);
  if (!(age >= 1)) errors.age = '나이를 입력해 주세요';
  else if (age < LIMITS.age[0])
    errors.age = '만 18세 미만은 개인 맞춤 칼로리 계산을 제공하지 않아요. 보호자·전문가와 상담해 주세요';
  else if (age > LIMITS.age[1]) errors.age = '만 80세 이하만 계산할 수 있어요. 전문가와 상담해 주세요';
  if (!(height >= LIMITS.height[0] && height <= LIMITS.height[1]))
    errors.height = `키는 ${LIMITS.height[0]}~${LIMITS.height[1]}cm 사이로 입력해 주세요`;
  if (!(weight >= LIMITS.weight[0] && weight <= LIMITS.weight[1]))
    errors.weight = `체중은 ${LIMITS.weight[0]}~${LIMITS.weight[1]}kg 사이로 입력해 주세요`;
  if (!p.sex) errors.sex = '성별을 선택해 주세요';
  if (!p.activity) errors.activity = '활동량을 선택해 주세요';
  if (!p.goal) errors.goal = '목표를 선택해 주세요';
  return errors;
}

export function getPace(goal, paceId) {
  const list = PACES[goal] || PACES.maintain;
  return list.find((x) => x.id === paceId) || list[0];
}

export function calcTargets(profile) {
  const sex = profile.sex;
  const age = Number(profile.age);
  const height = Number(profile.height);
  const weight = Number(profile.weight);
  const act = ACTIVITY.find((a) => a.id === profile.activity) || ACTIVITY[1];
  const goal = profile.goal;
  const pace = getPace(goal, profile.pace);

  // Mifflin-St Jeor
  const bmr = 10 * weight + 6.25 * height - 5 * age + (sex === 'm' ? 5 : -161);
  const tdee = bmr * act.factor;

  let kcal = tdee * (1 + pace.pct / 100);
  let floorApplied = false;
  if (goal === 'diet') {
    const floor = Math.max(sex === 'm' ? 1500 : 1200, bmr);
    if (kcal < floor) {
      kcal = floor;
      floorApplied = true;
    }
  }
  kcal = Math.round(kcal / 10) * 10;

  // 5 : 3 : 2 (탄수화물 50% / 단백질 30% / 지방 20%, 칼로리 기준)
  const total = RATIO.c + RATIO.p + RATIO.f;
  const c = Math.round((kcal * (RATIO.c / total)) / 4);
  const p = Math.round((kcal * (RATIO.p / total)) / 4);
  const f = Math.round((kcal * (RATIO.f / total)) / 9);

  const water = Math.round(weight * 0.033 * 10) / 10;
  // 체지방이 많은 경우 단백질 평가는 BMI 27 기준 체중으로 계산
  const refWeight = Math.round(Math.min(weight, 27 * Math.pow(height / 100, 2)));
  const pPerKg = Math.round((p / refWeight) * 10) / 10;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    kcal,
    p,
    c,
    f,
    pct: pace.pct,
    paceLabel: pace.label,
    floorApplied,
    water,
    weight,
    refWeight,
    pPerKg,
  };
}

// 하루 목표를 끼니 수로 균등하게 나눈 한 끼 기준
export function splitMeals(t, count) {
  const n = count === 4 ? 4 : 3;
  return {
    count: n,
    kcal: Math.round(t.kcal / n / 10) * 10,
    c: Math.round(t.c / n),
    p: Math.round(t.p / n),
    f: Math.round(t.f / n),
  };
}

// 5:3:2 기준이 체중 대비 단백질에 어떤 영향을 주는지 알려주는 참고 문구
export function proteinNote(t) {
  const ref = t.refWeight;
  const basis = ref === t.weight ? "체중 1kg당" : `기준 체중(${ref}kg) 1kg당`;
  if (t.pPerKg > 2.2) {
    return `5:3:2 기준이라 단백질이 ${basis} ${t.pPerKg}g으로 일반 권장(1.6~2.2g)보다 높게 나와요. 먹기 부담되면 하루 ${Math.round(
      ref * 2.2
    )}g 정도까지 줄이고, 줄인 만큼 탄수화물로 채워도 괜찮아요.`;
  }
  if (t.pPerKg < 1.4) {
    return `5:3:2 기준이라 단백질이 ${basis} ${t.pPerKg}g으로 낮게 나와요. 근손실을 줄이려면 하루 ${Math.round(
      ref * 1.6
    )}g 이상을 목표로 하고, 늘린 만큼 탄수화물을 줄여 칼로리를 맞춰요.`;
  }
  return null;
}

const r1 = (x) => Math.round(x * 10) / 10;

// 목표별 점검 가이드
export function buildTips(goal, t) {
  const w = t.weight;
  if (goal === 'diet') {
    return [
      `체중은 주 1회, 같은 요일·같은 조건(아침 공복)에 측정해요. 일주일 평균 기준 -${r1(w * 0.005)}~-${r1(w * 0.01)}kg 감량이 적당해요.`,
      '2주 연속 체중이 그대로면 하루 100~150kcal를 줄이거나(주로 탄수화물) 걷기를 20~30분 늘려요.',
      '주 -1%보다 빠르게 빠지거나 어지럽고 힘이 없으면 100~150kcal를 늘려요. 빨리 빼는 게 목표가 아니에요.',
      `물은 하루 약 ${t.water}L 이상, 수면은 7시간 이상을 목표로 해요.`,
    ];
  }
  if (goal === 'bulk') {
    return [
      `체중은 주 1회, 같은 조건에서 측정해요. 일주일 평균 +${r1(w * 0.0025)}~+${r1(w * 0.005)}kg 증가가 적당해요.`,
      '2주 연속 체중이 그대로면 하루 150~200kcal를 늘려요(주로 탄수화물). 너무 빨리 찌면 100~150kcal를 줄여요.',
      '벌크업은 식단만으로 되지 않아요. 주 3~5회 근력운동과 점진적 중량 증가가 함께 가야 해요.',
      `물은 하루 약 ${t.water}L 이상, 수면은 7시간 이상을 목표로 해요.`,
    ];
  }
  return [
    '체중은 주 1회 측정하고, ±1kg 안에서 유지되는지 확인해요.',
    '2주 이상 한 방향으로 계속 변하면 100~150kcal 단위로 조절해요.',
    `물은 하루 약 ${t.water}L 이상, 수면은 7시간 이상을 목표로 해요.`,
  ];
}

// 식사 조언 (그룹별)
export function buildAdvice(goal) {
  const groups = [
    {
      title: '한 끼 어림법',
      items: [
        '단백질은 손바닥 크기 한 덩이, 탄수화물은 주먹 크기, 지방은 엄지 크기를 한 끼 기본으로 잡아요. 칼로리가 모자라거나 남으면 탄수화물(주먹)부터 늘리고 줄여요.',
        '5:3:2는 그램이 아니라 칼로리 비율이에요. 지방은 같은 양이어도 칼로리가 높아서, 기름·견과류는 조금만 먹어도 20%가 채워져요.',
        '하루 끝에 딱 맞추려 하지 않아도 돼요. 일주일 평균이 목표의 ±5~10% 안이면 충분해요.',
      ],
    },
    {
      title: '운동 전후',
      items: [
        '운동 2~3시간 전에 탄수화물과 단백질을 함께 먹어요. 시간이 없으면 바나나나 밥 조금 정도로 가볍게요.',
        '운동 후 2시간 안에 단백질과 탄수화물을 같이 먹어요.',
        '운동 안 하는 날도 칼로리와 단백질은 그대로 챙겨요.',
      ],
    },
  ];

  if (goal === 'diet') {
    groups.push({
      title: '다이어트 요령',
      items: [
        '채소, 해조류, 국 건더기를 매 끼니 한 줌 이상 곁들이면 포만감이 오래가요.',
        '단백질 반찬부터 먹고, 한 끼를 20분 정도로 천천히 먹어요.',
        '음료로 먹는 칼로리(주스, 라떼, 탄산)는 한 잔에 100~300kcal인 경우가 많아요. 물이나 제로 음료로 바꾸는 게 가장 쉬운 감량이에요.',
        '술은 칼로리도 높고 다음 날 식욕까지 올려요. 횟수부터 줄여요.',
        '배고플 땐 그릭요거트, 계란, 두부 같은 단백질 간식을 먼저 찾아요.',
      ],
    });
  } else if (goal === 'bulk') {
    groups.push({
      title: '벌크업 요령',
      items: [
        '밥 먹기가 힘들면 우유, 프로틴 쉐이크 같은 액체 칼로리를 더해요.',
        '한 끼에 몰아 먹지 말고 끼니마다 나눠 먹으면 소화 부담이 줄어요.',
        '칼로리가 모자라면 올리브유, 견과류, 땅콩버터처럼 적은 양에 칼로리가 큰 식품을 곁들여요.',
        '체지방이 너무 빨리 늘면 하루 100~150kcal를 줄여요. 천천히 찌우는 쪽이 오래 남아요.',
      ],
    });
  } else {
    groups.push({
      title: '유지 요령',
      items: [
        '주말까지 포함한 일주일 평균으로 생각해요. 하루 과식은 다음 끼니에서 평소대로 돌아오면 돼요.',
        '체중이 한 방향으로 계속 움직이면 그때 100~150kcal씩 조절해요.',
      ],
    });
  }

  groups.push({
    title: '외식 · 간식 · 습관',
    items: [
      '외식은 구이, 수육, 회, 계란, 두부 같은 단백질 메뉴를 먼저 고르고 국물은 남겨요.',
      '한 끼를 망쳤다고 다음 끼니를 굶지 말고 평소대로 먹어요.',
      '편의점 식품은 영양성분표에서 칼로리와 단백질부터 확인해요.',
      '처음 1~2주만 먹은 걸 기록해 보면 내 양의 감이 잡혀요.',
      '취침 3시간 전에는 식사를 마무리하면 잠이 편해요.',
    ],
  });
  return groups;
}
