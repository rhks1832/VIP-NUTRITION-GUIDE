import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CONFIG } from './config.js';
import {
  ACTIVITY,
  GOALS,
  PACES,
  MEAL_COUNTS,
  validateProfile,
  calcTargets,
  splitMeals,
  proteinNote,
  buildTips,
  buildAdvice,
} from './calc.js';
import { renderSummaryImage } from './saveImage.js';

const DEFAULT_PROFILE = {
  sex: '',
  age: '',
  height: '',
  weight: '',
  activity: 'light',
  goal: 'diet',
  pace: 'normal',
};

// 결과 화면 한 줄 멘트 / CTA 문구 (담담한 톤)
const QUIPS = {
  diet: '줄이는 건 숫자고, 버티는 건 습관입니다.',
  maintain: '유지가 제일 지루하고, 제일 어렵습니다.',
  bulk: '많이 먹는 것도 운동입니다.',
};
const CTA_HEAD = {
  diet: ['숫자는 나왔어요.', '문제는 지키는 겁니다.'],
  maintain: ['기준은 잡혔어요.', '유지가 제일 어렵습니다.'],
  bulk: ['먹을 양은 정해졌어요.', '이제 먹고 들면 됩니다.'],
};
const TODAY = [
  '내일 아침 공복 체중을 재서 기준값으로 적어 두기',
  '오늘 먹는 끼니를 위 "한 끼 기준"에 맞춰 어림해 보기',
  '7일 뒤 체중 평균을 보고, 이 페이지에서 다시 계산하기',
];
const GET_ITEMS = ['하루 목표 칼로리', '탄·단·지 5:3:2 (그램)', '3끼 · 4끼 한 끼 기준', '식사 요령과 점검법'];

function loadSaved() {
  try {
    const raw = window.localStorage.getItem(CONFIG.storageKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : null;
  } catch (e) {
    return null;
  }
}

function saveProfile(profile) {
  try {
    window.localStorage.setItem(CONFIG.storageKey, JSON.stringify(profile));
  } catch (e) {
    /* 인앱 브라우저에서 저장이 막혀 있어도 동작에는 영향 없음 */
  }
}

const fmt = (n) => Math.round(n).toLocaleString('ko-KR');

function Seg({ value, options, onChange }) {
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={value === o.id ? 'on' : ''}
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.label}
          {o.sub ? <small>{o.sub}</small> : null}
        </button>
      ))}
    </div>
  );
}

function NumField({ label, unit, value, onChange, placeholder }) {
  return (
    <div>
      <span className="mini">{label}</span>
      <div className="inp">
        <input
          type="number"
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
        />
        <em>{unit}</em>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="top">
      <div className="corner">
        <i />
        <i />
      </div>
      <p className="eyebrow">THE LAST SET</p>
      <h1 className="title">
        VVIP
        <span>식단 가이드</span>
      </h1>
      <p className="sub">내 몸 기준으로 계산합니다. 1분이면 끝나요.</p>
    </div>
  );
}

function FormView({ profile, setProfile, errors, onSubmit }) {
  const set = (key) => (val) => setProfile((p) => ({ ...p, [key]: val }));
  const setGoal = (goal) => setProfile((p) => ({ ...p, goal, pace: PACES[goal][0].id }));
  const paces = PACES[profile.goal] || [];

  return (
    <>
      <Header />

      <div className="card gets">
        <span className="label">이렇게 알려드려요</span>
        <ul>
          {GET_ITEMS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>

      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        noValidate
      >
        <div className="field">
          <span className="label">성별</span>
          <Seg
            value={profile.sex}
            onChange={set('sex')}
            options={[
              { id: 'm', label: '남성' },
              { id: 'f', label: '여성' },
            ]}
          />
          {errors.sex ? <p className="err">{errors.sex}</p> : null}
        </div>

        <div className="field">
          <span className="label">
            신체 정보<small>만 18세 이상 · cm · kg</small>
          </span>
          <div className="row3">
            <NumField label="나이" unit="세" value={profile.age} onChange={set('age')} placeholder="30" />
            <NumField label="키" unit="cm" value={profile.height} onChange={set('height')} placeholder="175" />
            <NumField label="체중" unit="kg" value={profile.weight} onChange={set('weight')} placeholder="70" />
          </div>
          <p className="hint">체중은 아침 공복에 잰 값이 가장 정확해요.</p>
          {errors.age ? <p className="err">{errors.age}</p> : null}
          {errors.height ? <p className="err">{errors.height}</p> : null}
          {errors.weight ? <p className="err">{errors.weight}</p> : null}
        </div>

        <div className="field">
          <span className="label">활동량</span>
          <div className="opts">
            {ACTIVITY.map((a) => (
              <button
                key={a.id}
                type="button"
                className={profile.activity === a.id ? 'on' : ''}
                aria-pressed={profile.activity === a.id}
                onClick={() => set('activity')(a.id)}
              >
                <b>{a.label}</b>
                <span>{a.desc}</span>
              </button>
            ))}
          </div>
          <p className="hint">애매하면 한 단계 낮은 쪽을 고르세요. 활동량은 보통 높게 잡게 돼요.</p>
          {errors.activity ? <p className="err">{errors.activity}</p> : null}
        </div>

        <div className="field">
          <span className="label">목표</span>
          <Seg value={profile.goal} onChange={setGoal} options={GOALS} />
        </div>

        {paces.length > 1 ? (
          <div className="field">
            <span className="label">
              속도<small>유지 칼로리 대비</small>
            </span>
            <Seg
              value={profile.pace}
              onChange={set('pace')}
              options={paces.map((p) => ({ id: p.id, label: p.label, sub: p.note }))}
            />
          </div>
        ) : null}

        <button type="submit" className="btn">
          나만의 식사 칼로리 받기
        </button>
        <p className="note">입력한 정보는 서버로 보내지 않고, 이 기기에만 저장돼요.</p>
      </form>

      <p className="maker">
        만든 사람 <b>{CONFIG.creator.name}</b> · {CONFIG.instagramHandle}
      </p>
      <p className="sig">The Last Set</p>
    </>
  );
}

function RatioBar({ name, grams, share, cls }) {
  return (
    <div className="macro">
      <div className="head">
        <b>{name}</b>
        <span>
          {fmt(grams)}g · {share}%
        </span>
      </div>
      <div className="bar">
        <i className={cls} style={{ width: `${share}%` }} />
      </div>
    </div>
  );
}

function Acc({ title, items, open }) {
  return (
    <details className="acc" open={open}>
      <summary>{title}</summary>
      <div className="acc-body">
        <ul className="tips">
          {items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function StickyCta({ hidden }) {
  return (
    <div className={`sticky${hidden ? ' hide' : ''}`}>
      <div className="sticky-in">
        <a className="btn" href={CONFIG.inquiryUrl} target="_blank" rel="noopener noreferrer">
          {CONFIG.inquiryLabel}
        </a>
      </div>
    </div>
  );
}

function ResultView({ profile, onBack, showToast }) {
  const targets = useMemo(() => calcTargets(profile), [profile]);
  const [mealCount, setMealCount] = useState(3);
  const [imgs, setImgs] = useState(null);
  const [imgTab, setImgTab] = useState('feed');
  const [hideSticky, setHideSticky] = useState(false);
  const ctaRef = useRef(null);

  const per = useMemo(() => splitMeals(targets, mealCount), [targets, mealCount]);
  const tips = useMemo(() => buildTips(profile.goal, targets), [profile.goal, targets]);
  const advice = useMemo(() => buildAdvice(profile.goal), [profile.goal]);
  const pNote = useMemo(() => proteinNote(targets), [targets]);
  const goalInfo = GOALS.find((g) => g.id === profile.goal);
  const goalLabel =
    profile.goal !== 'maintain' ? `${goalInfo.label} · ${targets.paceLabel}` : goalInfo.label;
  const ctaHead = CTA_HEAD[profile.goal] || CTA_HEAD.maintain;

  const heroNote =
    profile.goal === 'maintain'
      ? `유지 칼로리 ${fmt(targets.tdee)}kcal 기준`
      : `유지 칼로리 ${fmt(targets.tdee)}kcal 기준 ${targets.pct > 0 ? '+' : ''}${targets.pct}%`;

  // 하단 문의 영역이 보이면 고정 버튼은 숨김
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof window === 'undefined' || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => setHideSticky(e.isIntersecting));
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onSaveImage = () => {
    try {
      const base = {
        goalLabel,
        kcal: targets.kcal,
        c: targets.c,
        p: targets.p,
        f: targets.f,
        handle: CONFIG.instagramHandle,
        title: CONFIG.title,
        cta: CONFIG.imageCta,
      };
      setImgs({
        feed: renderSummaryImage({ ...base, format: 'feed' }),
        story: renderSummaryImage({ ...base, format: 'story' }),
      });
      setImgTab('feed');
    } catch (e) {
      showToast('이미지를 만들지 못했어요');
    }
  };

  return (
    <>
      <Header />

      <div className="card hero">
        <span className="tag">{goalLabel}</span>
        <p className="kcal">
          {fmt(targets.kcal)}
          <small>kcal / 일</small>
        </p>
        <p>{heroNote}</p>
        {targets.floorApplied ? (
          <p>안전을 위해 최소 칼로리 기준(기초대사량·성별 하한)으로 맞췄어요.</p>
        ) : null}
        <p className="quip">{QUIPS[profile.goal]}</p>
      </div>

      <h2 className="h2">
        탄단지 <em>5 : 3 : 2</em>
      </h2>
      <div className="card">
        <RatioBar name="탄수화물" grams={targets.c} share={50} cls="c-c" />
        <RatioBar name="단백질" grams={targets.p} share={30} cls="c-p" />
        <RatioBar name="지방" grams={targets.f} share={20} cls="c-f" />
        <p className="explain">
          탄수화물 50% · 단백질 30% · 지방 20%, 칼로리 기준 비율이에요. 가장 지키기 쉬운 기준이라 이걸로 시작해요.
        </p>
        {pNote ? <p className="explain accent">{pNote}</p> : null}
        <button type="button" className="btn small" onClick={onSaveImage}>
          칼로리 · 탄단지 이미지로 저장
        </button>
        <p className="hint center">스토리나 피드에 올려도 좋아요.</p>
      </div>

      <h2 className="h2">
        한 끼 <em>기준</em>
      </h2>
      <div className="card">
        <Seg
          value={mealCount}
          onChange={setMealCount}
          options={MEAL_COUNTS.map((n) => ({ id: n, label: `하루 ${n}끼` }))}
        />
        <div className="per">
          <div className="per-kcal">
            한 끼 <b>{fmt(per.kcal)}</b>kcal
          </div>
          <div className="per-grid">
            <div>
              <span>탄수화물</span>
              <b>{per.c}g</b>
            </div>
            <div>
              <span>단백질</span>
              <b>{per.p}g</b>
            </div>
            <div>
              <span>지방</span>
              <b>{per.f}g</b>
            </div>
          </div>
        </div>
        <p className="explain">끼니마다 똑같이 맞출 필요는 없어요. 하루 합계만 목표 근처면 됩니다.</p>
      </div>

      <h2 className="h2">
        오늘부터 <em>3가지</em>
      </h2>
      <div className="card">
        <ol className="todo">
          {TODAY.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      </div>

      <h2 className="h2">
        식사 <em>요령</em>
      </h2>
      {advice.map((g, i) => (
        <Acc key={g.title} title={g.title} items={g.items} open={i === 0} />
      ))}
      <Acc title="이렇게 점검하세요" items={tips} open={false} />

      <div className="card warn">
        참고용 추정치이며 의학적 조언이 아니에요. 임신·수유 중이거나 질환(당뇨, 신장질환 등)이 있거나
        식사 문제로 고민 중이라면 전문가와 먼저 상의해 주세요. 어지럽거나 몸이 많이 힘들면 섭취량을 늘려 주세요.
      </div>

      <div className="creator">
        <span className="eyebrow">만든 사람</span>
        <p className="cname">{CONFIG.creator.name}</p>
        <p className="ctag">{CONFIG.creator.tagline}</p>
        <p className="road">
          <span>ROAD TO</span> <b>IFBB PRO</b>
        </p>
        <div className="chips">
          {CONFIG.creator.chips.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
      </div>

      <div className="cta" ref={ctaRef}>
        <p className="big">
          {ctaHead[0]} <span>{ctaHead[1]}</span>
        </p>
        <p>혼자 하기 막막하면 문의 주세요.</p>
        <a className="btn" href={CONFIG.inquiryUrl} target="_blank" rel="noopener noreferrer">
          {CONFIG.inquiryLabel}
        </a>
        <a className="btn ghost small" href={CONFIG.instagramUrl} target="_blank" rel="noopener noreferrer">
          인스타 팔로우 {CONFIG.instagramHandle}
        </a>
        <p className="hint center">팔로우 하고 같이 성공할래요?</p>
      </div>

      <button type="button" className="back" onClick={onBack}>
        정보 다시 입력하기
      </button>
      <p className="sig">The Last Set</p>

      {!imgs ? <StickyCta hidden={hideSticky} /> : null}

      {imgs ? (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal-body">
            <Seg
              value={imgTab}
              onChange={setImgTab}
              options={[
                { id: 'feed', label: '피드', sub: '4 : 5' },
                { id: 'story', label: '스토리', sub: '9 : 16' },
              ]}
            />
            <p className="modal-tip">이미지를 길게 눌러 저장하세요</p>
            <img src={imgs[imgTab]} alt="내 칼로리와 탄단지 비율" className={imgTab} />
            <a className="btn small" href={imgs[imgTab]} download={`vvip-diet-${imgTab}.png`}>
              기기에 바로 저장
            </a>
            <button type="button" className="btn ghost small" onClick={() => setImgs(null)}>
              닫기
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function AppInner() {
  const [profile, setProfile] = useState(() => {
    const saved = loadSaved();
    return saved ? { ...DEFAULT_PROFILE, ...saved } : DEFAULT_PROFILE;
  });
  const [errors, setErrors] = useState({});
  const [view, setView] = useState('form');
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1800);
  };

  const submit = () => {
    const errs = validateProfile(profile);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setTimeout(() => {
        const el = document.querySelector('.err');
        if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' });
      }, 0);
      return;
    }
    saveProfile(profile);
    setView('result');
    window.scrollTo(0, 0);
  };

  const back = () => {
    setView('form');
    window.scrollTo(0, 0);
  };

  return (
    <div className={`app${view === 'result' ? ' has-sticky' : ''}`}>
      {view === 'form' ? (
        <FormView profile={profile} setProfile={setProfile} errors={errors} onSubmit={submit} />
      ) : (
        <ResultView profile={profile} onBack={back} showToast={showToast} />
      )}
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="app">
          <div className="card">
            <span className="label">화면을 불러오지 못했어요</span>
            <p className="note">새로고침해도 같으면 인스타 DM으로 알려 주세요.</p>
            <button type="button" className="btn small" onClick={() => window.location.reload()}>
              새로고침
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
