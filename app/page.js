'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Scale,
  AlertCircle,
  FileText,
  Search,
  ChevronRight,
  Volume2,
  VolumeX,
  RotateCcw,
  Gavel,
  Zap,
  Timer,
} from 'lucide-react';

/* =========================
   0) utils
========================= */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
const safeGet = (obj, path, fallback) => {
  try {
    const ps = path.split('.');
    let cur = obj;
    for (const p of ps) {
      if (cur == null) return fallback;
      cur = cur[p];
    }
    return cur == null ? fallback : cur;
  } catch {
    return fallback;
  }
};
function useLatestRef(value) {
  const r = useRef(value);
  useEffect(() => {
    r.current = value;
  }, [value]);
  return r;
}

/* =========================
   1) WebAudio (simple + speed mod)
========================= */
function useAudioEngine() {
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const bgmNodesRef = useRef({ o: null, g: null, lfo: null, lfoG: null, cfg: null, baseFreq: 220 });
  const [muted, setMuted] = useState(false);

  const ensure = () => {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctxRef.current) {
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      ctxRef.current = ctx;
      masterRef.current = master;
    }
    return ctxRef.current;
  };

  const setMasterMuted = (m) => {
    setMuted(m);
    const ctx = ensure();
    if (!ctx || !masterRef.current) return;
    masterRef.current.gain.value = m ? 0 : 0.9;
  };

  const stopBgm = () => {
    const n = bgmNodesRef.current;
    try {
      n.o?.stop();
    } catch {}
    try {
      n.lfo?.stop();
    } catch {}
    try {
      n.o?.disconnect();
      n.g?.disconnect();
      n.lfo?.disconnect();
      n.lfoG?.disconnect();
    } catch {}
    bgmNodesRef.current = { o: null, g: null, lfo: null, lfoG: null, cfg: null, baseFreq: 220 };
  };

  const playBgm = (cfg) => {
    const ctx = ensure();
    if (!ctx || !masterRef.current) return;
    if (!cfg) {
      stopBgm();
      return;
    }
    const prev = bgmNodesRef.current.cfg;
    const same =
      prev &&
      prev.type === cfg.type &&
      prev.freq === cfg.freq &&
      prev.rate === cfg.rate &&
      prev.depth === cfg.depth &&
      prev.volume === cfg.volume;
    if (same) return;

    stopBgm();

    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = cfg.type || 'sine';
    o.frequency.value = cfg.freq || 220;
    g.gain.value = cfg.volume ?? 0.02;

    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = cfg.rate || 0.2;
    lfoG.gain.value = cfg.depth ?? 6;

    lfo.connect(lfoG);
    lfoG.connect(o.frequency);

    o.connect(g);
    g.connect(masterRef.current);

    o.start();
    lfo.start();

    bgmNodesRef.current = { o, g, lfo, lfoG, cfg: { ...cfg }, baseFreq: cfg.freq || 220 };
  };

  // speedFactor: 0..1
  const setBgmSpeed = (speedFactor) => {
    const n = bgmNodesRef.current;
    const ctx = ensure();
    if (!ctx || !n?.o) return;
    const sf = clamp(speedFactor ?? 0, 0, 1);
    const target = n.baseFreq * (1 + 0.18 * sf);
    try {
      n.o.frequency.setTargetAtTime(target, ctx.currentTime, 0.08);
      if (n.g) {
        const vol = (n.cfg?.volume ?? 0.02) * (1 + 0.12 * sf);
        n.g.gain.setTargetAtTime(vol, ctx.currentTime, 0.12);
      }
    } catch {}
  };

  const sfxBeep = (freq = 880, dur = 0.06, vol = 0.06, type = 'square') => {
    const ctx = ensure();
    if (!ctx || !masterRef.current) return;
    if (muted) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g);
    g.connect(masterRef.current);
    o.start();
    setTimeout(() => {
      try {
        o.stop();
      } catch {}
      try {
        o.disconnect();
        g.disconnect();
      } catch {}
    }, dur * 1000);
  };

  return { muted, setMasterMuted, playBgm, stopBgm, sfxBeep, setBgmSpeed };
}

/* =========================
   2) GAME DB
========================= */
const GAME_DB = {
  meta: {
    title: 'INSANE SPEED 법정 진실공방',
    subtitle: '타이머·콤보·속도FX로 압박하는 심문',
  },
  backgrounds: {
    court: 'bg-gradient-to-b from-slate-950 via-slate-900 to-black',
    hall: 'bg-gradient-to-b from-slate-900 to-slate-800',
    press: 'bg-gradient-to-br from-indigo-950 to-slate-900',
    tense: 'bg-gradient-to-br from-red-950 to-slate-900',
    ending: 'bg-gradient-to-br from-slate-950 via-slate-900 to-black',
    gameover: 'bg-gradient-to-br from-black via-red-950 to-slate-950',
  },
  bgm: {
    calm: { type: 'sine', freq: 180, rate: 0.14, depth: 4, volume: 0.02 },
    trial: { type: 'square', freq: 210, rate: 0.33, depth: 9, volume: 0.02 },
    tense: { type: 'triangle', freq: 240, rate: 0.22, depth: 7, volume: 0.025 },
    climax: { type: 'sawtooth', freq: 260, rate: 0.38, depth: 10, volume: 0.018 },
    victory: { type: 'sine', freq: 420, rate: 0.11, depth: 3, volume: 0.025 },
  },
  sfx: {
    tap: { freq: 520, dur: 0.04, vol: 0.035, type: 'square' },
    success: { freq: 980, dur: 0.06, vol: 0.06, type: 'square' },
    fail: { freq: 210, dur: 0.08, vol: 0.06, type: 'sawtooth' },
    objection: { freq: 1080, dur: 0.07, vol: 0.08, type: 'square' },
    flash: { freq: 760, dur: 0.03, vol: 0.03, type: 'triangle' },
    tick: { freq: 1280, dur: 0.02, vol: 0.02, type: 'sine' },
  },
  characters: {
    judge: {
      name: '재판장',
      color: '#6B7280',
      avatar:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23374151'/%3E%3Ctext x='50' y='60' font-size='40' text-anchor='middle' fill='white'%3E⚖%3C/text%3E%3C/svg%3E",
    },
    prosecutor: {
      name: '최검사',
      color: '#DC2626',
      avatar:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23DC2626'/%3E%3Ctext x='50' y='60' font-size='34' text-anchor='middle' fill='white'%3E검%3C/text%3E%3C/svg%3E",
    },
    player: {
      name: '강변호',
      color: '#2563EB',
      avatar:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%232563EB'/%3E%3Ctext x='50' y='60' font-size='34' text-anchor='middle' fill='white'%3E변%3C/text%3E%3C/svg%3E",
    },
    narrator: { name: '내레이션', color: '#9CA3AF', avatar: null },
    defendant: {
      name: '피고인(익명)',
      color: '#8B5CF6',
      avatar:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%238B5CF6'/%3E%3Ctext x='50' y='60' font-size='26' text-anchor='middle' fill='white'%3E피고%3C/text%3E%3C/svg%3E",
    },
    witness1: {
      name: '경비원 박○○',
      color: '#10B981',
      avatars: {
        normal:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%2310B981'/%3E%3Ctext x='50' y='60' font-size='22' text-anchor='middle' fill='white'%3E경비%3C/text%3E%3C/svg%3E",
        sweat:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23FBBF24'/%3E%3Ctext x='50' y='60' font-size='34' text-anchor='middle' fill='white'%3E😰%3C/text%3E%3C/svg%3E",
        angry:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23EF4444'/%3E%3Ctext x='50' y='60' font-size='34' text-anchor='middle' fill='white'%3E😡%3C/text%3E%3C/svg%3E",
      },
    },
    witness2: {
      name: '배달기사 김○○',
      color: '#06B6D4',
      avatars: {
        normal:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%2306B6D4'/%3E%3Ctext x='50' y='60' font-size='22' text-anchor='middle' fill='white'%3E배달%3C/text%3E%3C/svg%3E",
        sweat:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23FBBF24'/%3E%3Ctext x='50' y='60' font-size='34' text-anchor='middle' fill='white'%3E😰%3C/text%3E%3C/svg%3E",
        shock:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23F59E0B'/%3E%3Ctext x='50' y='60' font-size='34' text-anchor='middle' fill='white'%3E😱%3C/text%3E%3C/svg%3E",
      },
    },
    witness3: {
      name: '검시관 서○○',
      color: '#A855F7',
      avatars: {
        normal:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23A855F7'/%3E%3Ctext x='50' y='60' font-size='22' text-anchor='middle' fill='white'%3E검시%3C/text%3E%3C/svg%3E",
        sweat:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23FBBF24'/%3E%3Ctext x='50' y='60' font-size='34' text-anchor='middle' fill='white'%3E😰%3C/text%3E%3C/svg%3E",
      },
    },
    witness4: {
      name: 'IT관리자 정○○',
      color: '#F97316',
      avatars: {
        normal:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23F97316'/%3E%3Ctext x='50' y='60' font-size='22' text-anchor='middle' fill='white'%3EIT%3C/text%3E%3C/svg%3E",
        sweat:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23FBBF24'/%3E%3Ctext x='50' y='60' font-size='34' text-anchor='middle' fill='white'%3E😰%3C/text%3E%3C/svg%3E",
        angry:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23EF4444'/%3E%3Ctext x='50' y='60' font-size='34' text-anchor='middle' fill='white'%3E😡%3C/text%3E%3C/svg%3E",
      },
    },
  },
  evidence: {
    autopsy: { name: '검시 예비 소견서', icon: '🧾', desc: '사망 추정시각 21:10±20분, 둔기성 손상.' },
    revised_autopsy: { name: '검시 보완 소견서', icon: '🧾', desc: '사망 추정시각 20:35±15분으로 수정. 위 내용물 분석 반영.' },
    cctv_lobby: { name: '로비 CCTV 캡처', icon: '📹', desc: '20:58 로비에 피고인으로 보이는 인물. 화질 불량.' },
    cctv_blindspot: { name: 'CCTV 사각지대 도면', icon: '🗺️', desc: '엘리베이터 앞 3m 구간은 반사광으로 얼굴 식별 불가.' },
    elevator_log: { name: '엘리베이터 운행 로그', icon: '🛗', desc: '20:41 14층→1층, 20:49 1층→14층. 카드 태그 없음(비상모드 기록).' },
    door_access: { name: '출입문 카드기록', icon: '🪪', desc: '피고인 카드: 20:28 14층 출입, 21:05 재출입.' },
    phone_ping: { name: '휴대폰 기지국 기록', icon: '📶', desc: '20:33~20:52 인근 기지국 체류. 실내/실외 구분 불가.' },
    delivery_receipt: { name: '배달 영수증', icon: '🧾', desc: '20:46 “14층 1402호 문앞” 전달. 서명 없음.' },
    parking_ticket: { name: '주차정산 기록', icon: '🅿️', desc: '20:37 정산 완료. 차량 출차 20:39.' },
    printer_log: { name: '프린터 출력 로그', icon: '🖨️', desc: '20:34 “14F-공용프린터” 출력 2장. 사용자 인증 토큰 “A-Temp”.' },
    temp_token: { name: '임시 인증 토큰', icon: '🔑', desc: 'IT가 발급한 1회용 토큰. 발급자/수령자 기록이 불완전.' },
    tool_mark: { name: '둔기(조각상) 감정', icon: '🗿', desc: '사무실 장식 조각상. 손잡이 부분 마모, 지문 불명확.' },
  },
  cases: [
    {
      id: 'case_001',
      title: '밤의 14층',
      tagline: '익명 피고인 · 로비 CCTV · 뒤집히는 사망시각',
      coverBgKey: 'court',
      defaultBgmKey: 'trial',
      hpMax: 7,
      initialEvidence: ['autopsy', 'cctv_lobby', 'door_access', 'phone_ping', 'tool_mark'],
      script: [
        { type: 'scene', bgKey: 'court', bgmKey: 'trial' },
        { type: 'talk', charKey: 'narrator', text: '심야 오피스 건물 14층에서 살인 사건이 발생했다.' },
        { type: 'talk', charKey: 'narrator', text: '피해자는 내부 감사팀 직원. 피고인은 “익명 처리된 내부자”.' },
        { type: 'talk', charKey: 'judge', text: '본 법정은 사실관계 확인을 위해 다수 증인을 채택합니다.' },
        { type: 'talk', charKey: 'prosecutor', text: '피고인은 20:58 로비 CCTV에 등장했고, 21:10 전후 피해자를 살해했습니다.' },
        { type: 'talk', charKey: 'player', text: '증거가 “보이는 것”과 “사실”은 다릅니다. 그 차이를 입증하겠습니다.' },
        { type: 'anim', name: 'flash', sfxKey: 'flash' },
        { type: 'talk', charKey: 'judge', text: '좋습니다. 첫 번째 증인을 부르겠습니다.' },

        {
          type: 'trial',
          title: '경비원 박○○의 증언 ① (로비 목격)',
          witnessCharKey: 'witness1',
          bgKey: 'hall',
          statements: [
            { text: '저는 1층 로비에서 20:55부터 근무했습니다.' },
            { text: '20:58경, 피고인으로 보이는 사람이 로비에 들어왔습니다.' },
            { text: '그 사람은 모자를 쓰고 있었지만 체형이 피고인과 같았습니다.' },
            { text: '그 뒤 바로 엘리베이터 쪽으로 걸어갔습니다.' },
            { text: '엘리베이터 앞에서 잠시 멈추더니 14층 버튼을 눌렀습니다.' },
            { text: '그 장면은 CCTV에도 고스란히 남아 있습니다.' },
            { text: '따라서 피고인이 14층으로 올라간 건 확실합니다.' },
            { text: '그리고 21:05쯤 피고인이 다시 14층으로 들어가는 것도 봤습니다.' },
            { text: '피고인 카드 기록도 그걸 뒷받침합니다.' },
            {
              text: '결론적으로 피고인은 20:58~21:10 사이, 피해자와 같은 층에 있었습니다.',
              weak: true,
              contradictionEvidenceKey: 'cctv_blindspot',
              failMsg: '“확실하다”는 주장에 빈틈이 있다. CCTV의 구조를 뒤집을 증거가 필요하다.',
              pressQ: '당신은 얼굴을 “확실히” 봤습니까?',
              press: [
                { charKey: 'witness1', text: '얼굴은… 완벽하진 않지만, 체형과 걸음걸이가…', face: 'sweat' },
                { charKey: 'player', text: '(식별 근거가 약하다. “확실”을 무너뜨려야 한다.)' },
              ],
            },
          ],
        },

        { type: 'anim', name: 'objection', sfxKey: 'objection' },
        { type: 'talk', charKey: 'player', text: '이의 있습니다!', size: 'text-3xl', color: 'text-blue-400' },
        { type: 'talk', charKey: 'player', text: 'CCTV는 “고스란히” 남지 않습니다. 구조적으로 사각이 있습니다.' },
        { type: 'talk', charKey: 'prosecutor', text: '사각이 있든 없든, 로비에 있었던 사실은 변하지 않습니다.' },
        { type: 'talk', charKey: 'judge', text: '변호인은 “확실”이라는 단어를 쟁점으로 삼는군요. 다음 증인으로 넘어갑니다.' },

        {
          type: 'trial',
          title: '검시관 서○○의 증언 ② (사망시각)',
          witnessCharKey: 'witness3',
          bgKey: 'tense',
          statements: [
            { text: '피해자의 직접 사인은 둔기성 두부 손상입니다.' },
            { text: '사망 추정시각은 21:10을 중심으로 ±20분입니다.' },
            { text: '따라서 20:50 이전 사망은 가능성이 낮습니다.' },
            {
              text: '즉, 사망시각을 흔들 증거는 없습니다.',
              weak: true,
              contradictionEvidenceKey: 'revised_autopsy',
              failMsg: '사망시각은 “보완 소견서”가 핵심이다.',
              pressQ: '당신은 “위 내용물 분석”을 했습니까?',
              press: [
                { charKey: 'witness3', text: '초기에는 제한적이었습니다. 보완 분석은…', face: 'sweat' },
                { charKey: 'player', text: '(보완 분석이 있다. “초기 소견”을 절대시하면 진다.)' },
              ],
            },
          ],
        },

        { type: 'anim', name: 'objection', sfxKey: 'objection' },
        { type: 'talk', charKey: 'player', text: '이의 있습니다! 보완 소견서가 있습니다!', size: 'text-3xl', color: 'text-red-500' },
        { type: 'talk', charKey: 'judge', text: '시간축이 뒤집혔군요.' },

        { type: 'scene', bgKey: 'ending', bgmKey: 'victory' },
        { type: 'anim', name: 'victory', sfxKey: 'success' },
        { type: 'talk', charKey: 'judge', text: '피고인에게 무죄를 선고합니다.', size: 'text-3xl' },
        { type: 'end', text: 'THE END' },
      ],
    },
  ],
};

/* =========================
   3) compiler (DSL -> runtime lines)
========================= */
function compileCase(c) {
  const lines = [];
  const push = (l) => {
    const line = { ...l };
    if (!line.id && (line.type === 'scene' || line.type === 'talk' || line.type === 'choice' || line.type === 'trial')) {
      line.id = uid(line.type);
    }
    lines.push(line);
  };

  for (const raw of c.script) {
    if (!raw || !raw.type) continue;

    if (raw.type === 'trial') {
      push({
        ...raw,
        type: 'cross_exam',
        title: raw.title,
        isFinal: !!raw.isFinal,
        witnessCharKey: raw.witnessCharKey || 'witness1',
        bgKey: raw.bgKey,
        statements: (raw.statements || []).map((s) => ({
          text: s.text ?? '',
          weakness: !!s.weak,
          contradiction: s.contradictionEvidenceKey,
          failMsg: s.failMsg,
          press: s.pressQ,
          pressResponse: (s.press || []).map((p) => ({
            type: 'talk',
            charKey: p.charKey,
            text: p.text ?? '',
            face: p.face ?? 'normal',
          })),
        })),
      });
      continue;
    }

    push(raw);
  }

  return { lines };
}

/* =========================
   4) SPEED FX: Canvas speed lines
========================= */
function SpeedLines({ intensity = 0, pulse = 0, danger = 0 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const lastRef = useRef(0);
  const dprRef = useRef(1);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

    const resize = () => {
      const dpr = Math.max(1, Math.min(2.25, window.devicePixelRatio || 1));
      dprRef.current = dpr;
      const rect = c.getBoundingClientRect();
      c.width = Math.floor(rect.width * dpr);
      c.height = Math.floor(rect.height * dpr);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d', { alpha: true });
    if (!ctx) return;

    const draw = (ts) => {
      rafRef.current = requestAnimationFrame(draw);
      const last = lastRef.current || ts;
      const dt = Math.min(0.033, Math.max(0.0, (ts - last) / 1000));
      lastRef.current = ts;

      tRef.current += dt * (0.8 + intensity * 2.2);
      const t = tRef.current;

      const w = c.width;
      const h = c.height;
      ctx.clearRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.42;
      const n = Math.floor(38 + intensity * 200);

      // glow
      const glow = 0.06 + intensity * 0.22 + pulse * 0.16;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = glow;
      ctx.fillStyle = danger > 0.6 ? 'rgba(255,80,80,1)' : 'rgba(90,160,255,1)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, w * 0.22, h * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // lines
      ctx.save();
      ctx.translate(cx, cy);
      ctx.globalCompositeOperation = 'lighter';

      const baseA = 0.05 + intensity * 0.20 + pulse * 0.16;
      ctx.globalAlpha = clamp(baseA, 0, 0.5);

      const minDim = Math.min(w, h);
      for (let i = 0; i < n; i++) {
        const a = ((i / n) * Math.PI * 2 + t * 0.9) % (Math.PI * 2);
        const r1 = (0.05 + Math.random() * 0.12) * minDim;
        const r2 = (0.22 + Math.random() * 0.58 + intensity * 0.22) * minDim;
        const x1 = Math.cos(a) * r1;
        const y1 = Math.sin(a) * r1;
        const x2 = Math.cos(a) * r2;
        const y2 = Math.sin(a) * r2;

        const lw = (1 + intensity * 2.2) * dprRef.current * (0.55 + Math.random() * 1.15);
        ctx.lineWidth = lw;
        ctx.strokeStyle =
          danger > 0.6
            ? `rgba(255, ${Math.floor(120 + Math.random() * 80)}, ${Math.floor(120 + Math.random() * 80)}, 1)`
            : `rgba(${Math.floor(120 + Math.random() * 70)}, ${Math.floor(200 + Math.random() * 55)}, 255, 1)`;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      ctx.restore();

      // vignette
      ctx.save();
      const v = 0.55 + intensity * 0.35;
      const grad = ctx.createRadialGradient(cx, cy, minDim * 0.15, cx, cy, minDim * v);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, danger > 0.6 ? 'rgba(0,0,0,0.78)' : 'rgba(0,0,0,0.7)');
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.78;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [intensity, pulse, danger]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-[3]" />;
}

/* =========================
   5) HUD (정렬된 상단)
========================= */
function HudPill({ children, className = '' }) {
  return (
    <div className={`hud-pill ${className}`}>
      <div className="hud-pill-inner">{children}</div>
    </div>
  );
}

function TopHUD({
  hp,
  hpMax,
  evCount,
  evMax,
  onOpenEvidence,
  muted,
  onToggleMute,
  turn,
  combo,
  mult,
  timeLeft,
  timeMax,
  speed,
  danger,
}) {
  const tP = timeMax > 0 ? clamp(timeLeft / timeMax, 0, 1) : 1;
  const barFrom = danger > 0.6 ? 'from-red-400' : 'from-blue-400';
  const barTo = danger > 0.6 ? 'to-amber-300' : 'to-cyan-300';

  return (
    <div className="hud-root">
      <div className="hud-row">
        <div className="hud-left">
          <HudPill>
            <div className="flex items-center gap-3">
              <Scale className="w-5 h-5 text-blue-400" strokeWidth={2} />
              <div className="flex gap-1.5">
                {[...Array(hpMax)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      i < hp ? 'bg-blue-400 shadow-lg shadow-blue-400/50' : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </HudPill>

          <HudPill className="hidden md:block">
            <div className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-gray-200" />
              <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                TURN {turn}
              </span>
            </div>
          </HudPill>
        </div>

        <div className="hud-center">
          <HudPill className="w-[18.5rem] md:w-[22rem]">
            <div className="flex items-center gap-3 w-full">
              <Timer className={`w-5 h-5 ${danger > 0.6 ? 'text-red-300' : 'text-cyan-200'}`} />
              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${barFrom} ${barTo} shadow-md`}
                  style={{ width: `${Math.floor(tP * 100)}%`, transition: 'width 120ms linear' }}
                />
              </div>
              <span className={`text-xs font-black tabular-nums ${danger > 0.6 ? 'text-red-200' : 'text-cyan-100'}`}>
                {timeLeft.toFixed(1)}s
              </span>
            </div>
          </HudPill>

          <HudPill className="hidden md:block">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-300" />
              <span className="text-sm font-black text-white tabular-nums" style={{ fontFamily: 'Inter, sans-serif' }}>
                x{mult.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-amber-200/90 tabular-nums ml-2">COMBO {combo}</span>
              <span className="text-[10px] text-white/70 tabular-nums ml-2">{Math.floor(speed * 100)}%</span>
            </div>
          </HudPill>
        </div>

        <div className="hud-right">
          <button onClick={onToggleMute} className="hud-icon tap-scale" aria-label="mute">
            {muted ? <VolumeX className="w-5 h-5 text-gray-200" /> : <Volume2 className="w-5 h-5 text-gray-200" />}
          </button>

          <button onClick={onOpenEvidence} className="hud-action tap-scale" aria-label="evidence">
            <FileText className="w-5 h-5 text-amber-400" strokeWidth={2} />
            <span className="text-sm font-semibold text-white tabular-nums" style={{ fontFamily: 'Inter, sans-serif' }}>
              {evCount} / {evMax}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   6) UI bits
========================= */
function EffectLayer({ effectText, flash, overlayMsg, speedPulse, danger }) {
  return (
    <>
      {effectText && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-blue-600/20 to-red-600/20 backdrop-blur-sm">
          <div className="relative">
            <div className="absolute inset-0 bg-white/10 blur-3xl pulse-soft"></div>
            <h1
              className="relative text-7xl md:text-9xl font-black tracking-tighter text-white drop-shadow-2xl"
              style={{
                fontFamily: 'Crimson Pro, serif',
                textShadow:
                  danger > 0.6
                    ? '0 0 40px rgba(239, 68, 68, 0.8), 0 0 80px rgba(239, 68, 68, 0.4)'
                    : '0 0 40px rgba(59, 130, 246, 0.8), 0 0 80px rgba(59, 130, 246, 0.4)',
                transform: `scale(${1 + speedPulse * 0.03})`,
              }}
            >
              {effectText}
            </h1>
          </div>
        </div>
      )}

      {overlayMsg && (
        <div className="absolute inset-0 z-[95] flex items-start justify-center pt-[calc(var(--hud-h)+var(--safe-top)+12px)] pointer-events-none">
          <div
            className={`px-5 py-3 rounded-2xl backdrop-blur-xl text-white text-sm font-semibold animate-fade-in ${
              danger > 0.6 ? 'bg-red-900/60 border border-red-400/20' : 'bg-black/70 border border-white/10'
            }`}
          >
            {overlayMsg}
          </div>
        </div>
      )}

      {flash && <div className="absolute inset-0 z-[90] bg-white/20 pointer-events-none" />}

      {speedPulse > 0.001 && (
        <div
          className="absolute inset-0 z-[4] pointer-events-none"
          style={{
            background:
              danger > 0.6
                ? `radial-gradient(circle at 50% 40%, rgba(255,120,120,${0.08 + speedPulse * 0.12}) 0%, rgba(0,0,0,0) 55%)`
                : `radial-gradient(circle at 50% 40%, rgba(120,180,255,${0.08 + speedPulse * 0.12}) 0%, rgba(0,0,0,0) 55%)`,
          }}
        />
      )}
    </>
  );
}

function CharacterAvatar({ char, face, speed }) {
  if (!char) return null;
  const src = char.avatars?.[face] || char.avatar || null;
  const wobble = 1 + speed * 0.02;
  return (
    <div className="absolute bottom-[calc(160px+var(--safe-bot)+140px)] left-1/2 -translate-x-1/2 z-10 pointer-events-none">
      <div className="relative animate-fade-in" style={{ transform: `scale(${wobble})` }}>
        <div className="absolute inset-0 rounded-full blur-2xl opacity-30" style={{ backgroundColor: char.color }} />
        {src ? (
          <img src={src} alt={char.name} className="relative w-28 h-28 md:w-32 md:h-32 rounded-full border-2 border-white/20 shadow-2xl" />
        ) : (
          <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full border-2 border-white/20 shadow-2xl bg-white/5" />
        )}
      </div>
    </div>
  );
}

function CrossExamPill({ title, isFinal, cur, total, witnessName, combo, mult, danger }) {
  return (
    <div className="ce-pill">
      <div
        className={`px-6 py-3 rounded-full border backdrop-blur-md ${
          isFinal ? 'bg-red-950/80 border-red-500/50 text-red-200' : 'bg-blue-950/80 border-blue-500/50 text-blue-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <AlertCircle className="w-4 h-4" strokeWidth={2} />
          <span className="text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
            {isFinal ? '최후의 증언' : title} · {cur}/{total} · {witnessName}
          </span>
          <span className={`ml-2 text-xs font-black tabular-nums ${danger > 0.6 ? 'text-red-100' : 'text-cyan-100'}`}>
            x{mult.toFixed(2)}
          </span>
          <span className="text-xs font-semibold text-amber-200/90 tabular-nums">COMBO {combo}</span>
        </div>
      </div>
    </div>
  );
}

function DialogueBox({
  char,
  text,
  colorClass,
  sizeClass,
  onNext,
  isCE,
  pressMode,
  onPress,
  onOpenEvidence,
  danger,
}) {
  return (
    <div onClick={onNext} className="dialogue-wrap">
      <div className="max-w-5xl mx-auto">
        {char && (
          <div className="mb-3 ml-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-t-xl bg-black/60 backdrop-blur-md border-t border-x border-white/10">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: char.color }} />
              <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                {char.name}
              </span>
            </div>
          </div>
        )}

        <div
          className={`relative bg-black/80 backdrop-blur-xl border rounded-2xl p-7 md:p-8 min-h-[160px] cursor-pointer transition-all duration-300 group ${
            danger > 0.6 ? 'border-red-400/30 hover:border-red-300/40' : 'border-white/10 hover:border-white/20'
          }`}
        >
          <p
            className={`text-xl leading-relaxed ${colorClass || 'text-white'} ${sizeClass || ''}`}
            style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}
          >
            {text}
          </p>

          {isCE && !pressMode && (
            <div className="dialogue-actions">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPress();
                }}
                className="tap-scale flex items-center gap-2 px-6 py-3 bg-blue-600/90 hover:bg-blue-500 text-white font-semibold rounded-xl backdrop-blur-sm transition-all duration-300 border border-blue-400/30"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <Search className="w-5 h-5" strokeWidth={2} />
                <span>추궁</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEvidence();
                }}
                className="tap-scale flex items-center gap-2 px-6 py-3 bg-amber-600/90 hover:bg-amber-500 text-white font-semibold rounded-xl backdrop-blur-sm transition-all duration-300 border border-amber-400/30"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <FileText className="w-5 h-5" strokeWidth={2} />
                <span>증거 제시</span>
              </button>
            </div>
          )}

          <div className="absolute bottom-6 right-6 opacity-40 group-hover:opacity-100 transition-opacity pointer-events-none">
            <ChevronRight className={`w-6 h-6 ${danger > 0.6 ? 'text-red-200' : 'text-white'} animate-pulse`} strokeWidth={2} />
          </div>
        </div>
      </div>
    </div>
  );
}

function EvidenceModal({ items, isTrial, hint, onClose, onPresent, onReset }) {
  return (
    <div className="absolute inset-0 bg-black/95 backdrop-blur-xl z-40 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        <div className="flex items-center justify-between mb-8 md:mb-10 gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <FileText className="w-8 h-8 text-amber-400 shrink-0" strokeWidth={2} />
            <h2 className="text-3xl font-semibold text-white truncate" style={{ fontFamily: 'Crimson Pro, serif' }}>
              증거 목록
            </h2>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onReset}
              className="tap-scale flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-all"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <RotateCcw className="w-4 h-4" />
              <span>리셋</span>
            </button>
            <button
              onClick={onClose}
              className="tap-scale px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-all"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              닫기
            </button>
          </div>
        </div>

        {hint && (
          <div className="mb-6 px-5 py-4 rounded-2xl bg-amber-500/10 border border-amber-400/20 text-amber-200">
            <div className="text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
              {hint}
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center text-gray-400 py-24 md:py-28">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" strokeWidth={1} />
            <p className="text-xl" style={{ fontFamily: 'Inter, sans-serif' }}>
              수집한 증거가 없습니다
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map((item) => (
              <button
                key={item.key}
                onClick={() => (isTrial ? onPresent(item.key) : null)}
                className="tap-scale p-6 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/50 rounded-2xl transition-all duration-300 text-left group"
              >
                <div className="flex items-start gap-6">
                  <div className="text-5xl flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-white mb-2 truncate" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {item.desc}
                    </p>
                    <div className="mt-3 text-xs text-amber-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      {isTrial ? '클릭하여 제시 →' : '지금은 확인만 가능 →'}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================
   7) MAIN
========================= */
export default function Page() {
  const audio = useAudioEngine();

  const gameCase = GAME_DB.cases[0];
  const compiled = useMemo(() => compileCase(gameCase), []);
  const lines = compiled.lines;

  const hpMax = gameCase.hpMax ?? 7;
  const evMax = Object.keys(GAME_DB.evidence).length;

  const [index, setIndex] = useState(0);
  const [bgKey, setBgKey] = useState(gameCase.coverBgKey || 'court');
  const [hp, setHp] = useState(hpMax);

  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [effectText, setEffectText] = useState(null);
  const [overlayMsg, setOverlayMsg] = useState(null);
  const [speedPulse, setSpeedPulse] = useState(0);

  const [evidenceMode, setEvidenceMode] = useState(false);

  const [pressMode, setPressMode] = useState(false);
  const [pressIndex, setPressIndex] = useState(0);

  const [ceIndex, setCeIndex] = useState(0);
  const [ceLocked, setCeLocked] = useState(false);

  const [isEnding, setIsEnding] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const [invKeys, setInvKeys] = useState(gameCase.initialEvidence || []);

  // SPEED GAME STATE
  const BASE_TIME = 7.5;
  const [timeMax, setTimeMax] = useState(BASE_TIME);
  const [timeLeft, setTimeLeft] = useState(BASE_TIME);

  const [combo, setCombo] = useState(0);
  const [mult, setMult] = useState(1.0);

  const timeLeftRef = useLatestRef(timeLeft);
  const timeMaxRef = useLatestRef(timeMax);
  const comboRef = useLatestRef(combo);
  const multRef = useLatestRef(mult);
  const hpRef = useLatestRef(hp);

  const currentLine = lines[index] || {};
  const isCE = currentLine.type === 'cross_exam';
  const stmt = isCE ? currentLine.statements?.[ceIndex] : null;

  const bgClass = useMemo(() => safeGet(GAME_DB, `backgrounds.${bgKey}`, GAME_DB.backgrounds.court), [bgKey]);

  const witnessCharKey = isCE ? currentLine.witnessCharKey : null;
  const witnessChar = witnessCharKey ? GAME_DB.characters[witnessCharKey] : null;

  const text = useMemo(() => {
    if (pressMode && stmt?.pressResponse?.[pressIndex]?.text) return stmt.pressResponse[pressIndex].text;
    if (isCE) return stmt?.text || '';
    return currentLine.text || '';
  }, [pressMode, stmt, pressIndex, isCE, currentLine.text]);

  const speaker = useMemo(() => {
    if (pressMode && stmt?.pressResponse?.[pressIndex]?.charKey) return GAME_DB.characters[stmt.pressResponse[pressIndex].charKey] || null;
    if (isCE) return witnessChar || GAME_DB.characters.witness1;
    if (currentLine.charKey) return GAME_DB.characters[currentLine.charKey] || null;
    return null;
  }, [pressMode, stmt, pressIndex, isCE, currentLine.charKey, witnessChar]);

  const face = useMemo(() => {
    if (pressMode && stmt?.pressResponse?.[pressIndex]?.face) return stmt.pressResponse[pressIndex].face;
    return currentLine.face || 'normal';
  }, [pressMode, stmt, pressIndex, currentLine.face]);

  const invItems = useMemo(() => {
    return invKeys
      .map((k) => {
        const ev = GAME_DB.evidence[k];
        if (!ev) return null;
        return { key: k, ...ev };
      })
      .filter(Boolean);
  }, [invKeys]);

  const canTapAdvance = !evidenceMode && !isEnding && !gameOver && !ceLocked;

  const sfx = (key) => {
    const cfg = GAME_DB.sfx[key];
    if (!cfg) return;
    audio.sfxBeep(cfg.freq, cfg.dur, cfg.vol, cfg.type);
  };

  const doFlash = (ms = 220) => {
    setFlash(true);
    setTimeout(() => setFlash(false), ms);
  };
  const doShake = (ms = 520) => {
    setShake(true);
    setTimeout(() => setShake(false), ms);
  };
  const doEffect = (t, ms = 1200) => {
    setEffectText(t);
    setTimeout(() => setEffectText(null), ms);
  };
  const doOverlay = (t, ms = 1200) => {
    setOverlayMsg(t);
    setTimeout(() => setOverlayMsg(null), ms);
  };
  const pulse = (power = 1) => {
    setSpeedPulse((p) => Math.max(p, 0.35 * power));
    setTimeout(() => setSpeedPulse((p) => Math.max(0, p - 0.25 * power)), 90);
    setTimeout(() => setSpeedPulse((p) => Math.max(0, p - 0.18 * power)), 180);
  };

  const advance = (d = 1) => setIndex((p) => clamp(p + d, 0, lines.length - 1));

  const computeSpeed = (tLeft, tMax, comboV) => {
    const tp = tMax > 0 ? clamp(tLeft / tMax, 0, 1) : 1;
    const pressure = 1 - tp;
    const streak = clamp(comboV / 12, 0, 1);
    return clamp(0.15 + pressure * 0.55 + streak * 0.45, 0, 1);
  };

  const speed = useMemo(() => computeSpeed(timeLeft, timeMax, combo), [timeLeft, timeMax, combo]);
  const danger = useMemo(() => {
    const tp = timeMax > 0 ? clamp(timeLeft / timeMax, 0, 1) : 1;
    return clamp((0.35 - tp) / 0.35, 0, 1);
  }, [timeLeft, timeMax]);

  const resetSpeedState = (hard = false) => {
    setTimeMax(BASE_TIME);
    setTimeLeft(BASE_TIME);
    if (hard) {
      setCombo(0);
      setMult(1.0);
    }
  };

  const reset = () => {
    setIndex(0);
    setBgKey(gameCase.coverBgKey || 'court');
    setHp(hpMax);
    setShake(false);
    setFlash(false);
    setEffectText(null);
    setOverlayMsg(null);
    setSpeedPulse(0);
    setEvidenceMode(false);
    setPressMode(false);
    setPressIndex(0);
    setCeIndex(0);
    setCeLocked(false);
    setIsEnding(false);
    setGameOver(false);
    setInvKeys(gameCase.initialEvidence || []);
    resetSpeedState(true);
    audio.playBgm(GAME_DB.bgm[gameCase.defaultBgmKey] || GAME_DB.bgm.trial);
  };

  // init BGM
  useEffect(() => {
    audio.playBgm(GAME_DB.bgm[gameCase.defaultBgmKey] || GAME_DB.bgm.trial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // speed -> bgm mod
  useEffect(() => {
    audio.setBgmSpeed(speed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

  // timer tick loop
  useEffect(() => {
    if (!isCE) return;
    if (evidenceMode || ceLocked || pressMode || isEnding || gameOver) return;

    let raf = 0;
    let last = 0;

    const loop = (ts) => {
      raf = requestAnimationFrame(loop);
      if (!last) last = ts;
      const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000));
      last = ts;

      setTimeLeft((p) => Math.max(0, p - dt));

      if (danger > 0.6 && Math.random() < 0.18) sfx('tick');
      if (Math.random() < 0.06 && danger > 0.6) pulse(0.8);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCE, evidenceMode, ceLocked, pressMode, isEnding, gameOver, danger]);

  // timeout penalty
  useEffect(() => {
    if (!isCE) return;
    if (evidenceMode || ceLocked || pressMode || isEnding || gameOver) return;
    if (timeLeft > 0) return;

    const timeoutPenalty = () => {
      doOverlay('시간 초과! 압박에 밀렸다…', 1000);
      doShake(420);
      doFlash(140);
      sfx('fail');
      pulse(1);

      setCombo(0);
      setMult(1.0);
      setHp((h) => Math.max(0, h - 1));

      const len = currentLine.statements?.length || 0;
      if (len > 0) {
        if (ceIndex < len - 1) setCeIndex((p) => p + 1);
        else {
          setCeIndex(0);
          advance(1);
        }
      } else {
        advance(1);
      }
      setTimeLeft(timeMaxRef.current || BASE_TIME);
    };

    timeoutPenalty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // CE statement change -> reset timer
  useEffect(() => {
    if (!isCE) return;
    const c = comboRef.current || 0;
    const m = multRef.current || 1.0;
    const base = BASE_TIME;
    const shrink = clamp(c / 18, 0, 1) * 1.6;
    const add = clamp((m - 1) / 1.2, 0, 1) * 0.6;
    const tm = clamp(base - shrink + add, 4.6, 8.0);
    setTimeMax(tm);
    setTimeLeft(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCE, ceIndex, index]);

  // auto-handle scene/anim/end
  useEffect(() => {
    if (!currentLine?.type) return;

    if (currentLine.type === 'scene') {
      if (currentLine.bgKey) setBgKey(currentLine.bgKey);
      if (currentLine.bgmKey) audio.playBgm(GAME_DB.bgm[currentLine.bgmKey] || null);
      advance(1);
      return;
    }

    if (currentLine.type === 'anim') {
      if (currentLine.name === 'flash') {
        doFlash(240);
        sfx(currentLine.sfxKey || 'flash');
        pulse(0.6);
        setTimeout(() => advance(1), 260);
        return;
      }
      if (currentLine.name === 'objection') {
        doEffect('OBJECTION!', 1200);
        doShake(520);
        doFlash(220);
        sfx(currentLine.sfxKey || 'objection');
        pulse(1);
        setTimeout(() => advance(1), 900);
        return;
      }
      if (currentLine.name === 'victory') {
        doEffect('VICTORY', 1600);
        sfx(currentLine.sfxKey || 'success');
        pulse(0.8);
        setTimeout(() => advance(1), 1400);
        return;
      }
      advance(1);
      return;
    }

    if (currentLine.type === 'end') {
      setIsEnding(true);
      audio.playBgm(GAME_DB.bgm.victory);
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // HP -> game over
  useEffect(() => {
    if (hp <= 0 && !gameOver) {
      setGameOver(true);
      setEvidenceMode(false);
      setPressMode(false);
      setCeLocked(false);
      audio.playBgm(null);
      sfx('fail');
      doOverlay('판사님이 더는 들어주지 않습니다.', 1500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hp]);

  const handlePress = () => {
    if (!isCE || !stmt?.pressResponse?.length) return;
    setPressMode(true);
    setPressIndex(0);
    doOverlay(stmt.press || '추궁!', 900);
    sfx('tap');
    pulse(0.35);
  };

  const handlePressNext = () => {
    if (!stmt?.pressResponse?.length) {
      setPressMode(false);
      setPressIndex(0);
      return;
    }
    if (pressIndex < stmt.pressResponse.length - 1) setPressIndex((p) => p + 1);
    else {
      setPressMode(false);
      setPressIndex(0);
    }
  };

  const handleNext = () => {
    if (!canTapAdvance) return;
    sfx('tap');
    pulse(0.25);

    if (pressMode) {
      handlePressNext();
      return;
    }

    if (isCE) {
      const len = currentLine.statements?.length || 0;
      if (len <= 0) {
        advance(1);
        return;
      }
      if (ceIndex < len - 1) setCeIndex((p) => p + 1);
      else {
        setCeIndex(0);
        advance(1);
      }
      return;
    }

    advance(1);
  };

  const applyPenalty = (msg) => {
    doOverlay(msg || '그 증거는 맞지 않습니다!', 1200);
    doShake(520);
    sfx('fail');
    pulse(0.9);
    setHp(Math.max(0, hpRef.current - 1));
    setCombo(0);
    setMult(1.0);
    setTimeLeft(timeMaxRef.current || BASE_TIME);
  };

  const applyCorrect = () => {
    setCeLocked(true);
    setEvidenceMode(false);

    const tl = timeLeftRef.current || 0;
    const tm = timeMaxRef.current || BASE_TIME;
    const tp = tm > 0 ? clamp(tl / tm, 0, 1) : 0;
    const nearMiss = tp < 0.18;
    const perfect = tp > 0.72;

    doEffect('OBJECTION!', 1100);
    doFlash(240);
    doShake(520);
    sfx('objection');
    pulse(1.2);

    setCombo((c) => c + 1);
    setMult((m) => clamp(m + (perfect ? 0.14 : nearMiss ? 0.18 : 0.1), 1.0, 2.25));

    const bonus = (perfect ? 1.2 : nearMiss ? 1.55 : 0.95) + clamp(comboRef.current / 20, 0, 1) * 0.5;
    setTimeLeft(clamp((timeMaxRef.current || BASE_TIME) * bonus, 2.2, 10.0));

    doOverlay(perfect ? '완벽한 타이밍!' : nearMiss ? '아슬아슬하게 잡았다!' : '모순이다!', 900);

    setTimeout(() => {
      setCeLocked(false);
      setCeIndex(0);
      advance(1);
    }, 980);
  };

  const presentEvidence = (key) => {
    if (!isCE || !stmt) {
      doOverlay('법정 심문에서만 제시 가능합니다.', 1000);
      sfx('fail');
      pulse(0.6);
      return;
    }
    if (stmt.weakness && stmt.contradiction === key) applyCorrect();
    else applyPenalty(stmt.failMsg || '그 증거는 맞지 않습니다!');
  };

  const turnCounter = useMemo(() => {
    let t = 1;
    for (let i = 0; i < index; i++) {
      const l = lines[i];
      if (!l) continue;
      if (l.type === 'cross_exam') {
        const n = l.statements?.length || 0;
        t += Math.max(1, n);
      } else if (l.type === 'talk') t += 1;
      else if (l.type === 'anim') t += 1;
      else if (l.type === 'scene') t += 0;
      else t += 1;
    }
    if (isCE) t += ceIndex;
    return t;
  }, [index, isCE, ceIndex, lines]);

  const hint = isCE && stmt?.weakness ? '팁: 이 문장에 모순이 있습니다. 알맞은 증거를 제시하세요.' : null;

  // Ending UI
  if (isEnding) {
    return (
      <div className={`h-screen w-full ${GAME_DB.backgrounds.ending} text-white flex flex-col items-center justify-center p-8 relative overflow-hidden`}>
        <style jsx global>{globalCss}</style>
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10 text-center">
          <Scale className="w-24 h-24 mx-auto mb-8 text-blue-400" strokeWidth={1.5} />
          <h1 className="text-6xl md:text-7xl font-bold mb-6 tracking-tight" style={{ fontFamily: 'Crimson Pro, serif' }}>
            {gameCase.title}
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent mx-auto mb-8"></div>
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-xl mx-auto leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
            “확정”은 무너지고, 시간축은 잠겼다.
            <br />
            압박 속에서도, 네가 먼저 모순을 꿰뚫었다.
          </p>
          <button
            onClick={reset}
            className="tap-scale px-10 py-4 bg-white text-black font-semibold rounded-md hover:bg-gray-100 transition-all duration-300"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            처음부터 다시하기
          </button>
        </div>
      </div>
    );
  }

  // Game Over UI
  if (gameOver) {
    return (
      <div className={`h-screen w-full ${GAME_DB.backgrounds.gameover} text-white flex items-center justify-center p-8 relative overflow-hidden`}>
        <style jsx global>{globalCss}</style>
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] bg-red-600 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -right-24 w-[28rem] h-[28rem] bg-blue-600 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-xl w-full bg-black/60 border border-white/10 backdrop-blur-xl rounded-3xl p-8 text-center">
          <div className="text-6xl mb-4">💥</div>
          <h1 className="text-4xl font-bold mb-3" style={{ fontFamily: 'Crimson Pro, serif' }}>
            게임 오버
          </h1>
          <p className="text-gray-300 mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
            시간 압박에 밀렸습니다.
            <br />
            콤보를 지키며 모순을 더 빨리 잡으세요.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={reset}
              className="tap-scale px-6 py-3 bg-white text-black font-semibold rounded-xl transition-all"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              다시 시작
            </button>
          </div>
        </div>
      </div>
    );
  }

  const speedLayerIntensity = clamp(speed * (isCE ? 1 : 0.4), 0, 1);

  return (
    <div className={`h-screen w-full relative overflow-hidden select-none transition-all duration-700 ${bgClass} ${shake ? 'animate-shake' : ''}`}>
      <style jsx global>{globalCss}</style>

      <SpeedLines intensity={speedLayerIntensity} pulse={speedPulse} danger={danger} />

      <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-transparent to-transparent pointer-events-none z-[2]" />

      <TopHUD
        hp={hp}
        hpMax={hpMax}
        evCount={invItems.length}
        evMax={evMax}
        onOpenEvidence={() => setEvidenceMode(true)}
        muted={audio.muted}
        onToggleMute={() => audio.setMasterMuted(!audio.muted)}
        turn={turnCounter}
        combo={combo}
        mult={mult}
        timeLeft={timeLeft}
        timeMax={timeMax}
        speed={speed}
        danger={danger}
      />

      <EffectLayer effectText={effectText} flash={flash} overlayMsg={overlayMsg} speedPulse={speedPulse} danger={danger} />

      <CharacterAvatar char={speaker} face={face} speed={speed} />

      {isCE && (
        <CrossExamPill
          title={currentLine.title}
          isFinal={!!currentLine.isFinal}
          cur={ceIndex + 1}
          total={currentLine.statements?.length || 0}
          witnessName={witnessChar?.name || '증인'}
          combo={combo}
          mult={mult}
          danger={danger}
        />
      )}

      <DialogueBox
        char={speaker}
        text={text}
        colorClass={currentLine.color}
        sizeClass={currentLine.size}
        onNext={handleNext}
        isCE={isCE}
        pressMode={pressMode}
        onPress={handlePress}
        onOpenEvidence={() => setEvidenceMode(true)}
        danger={danger}
      />

      {evidenceMode && (
        <EvidenceModal
          items={invItems}
          isTrial={isCE}
          hint={hint}
          onClose={() => setEvidenceMode(false)}
          onPresent={presentEvidence}
          onReset={reset}
        />
      )}

      {/* Mobile mini HUD (정렬) */}
      <div className="absolute left-1/2 -translate-x-1/2 z-[35] md:hidden pointer-events-none" style={{ bottom: 'calc(160px + var(--safe-bot) + 12px)' }}>
        <div className={`px-4 py-2 rounded-full backdrop-blur-xl border ${danger > 0.6 ? 'bg-red-950/55 border-red-400/20' : 'bg-black/45 border-white/10'}`}>
          <div className="flex items-center gap-2 text-xs font-black tabular-nums text-white">
            <Zap className="w-4 h-4 text-amber-300" />
            x{mult.toFixed(2)}
            <span className="text-amber-200/90 font-semibold ml-1">COMBO {combo}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   8) global CSS
========================= */
const globalCss = `
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700;900&family=Inter:wght@400;500;600;700;900&display=swap');

:root{
  color-scheme: dark;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bot: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --hud-h: 64px;
  --hud-gap: 12px;
}
*{ -webkit-tap-highlight-color: transparent; }
html, body { height: 100%; }
body { margin: 0; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; overflow: hidden; }
.tabular-nums { font-variant-numeric: tabular-nums; }

/* press feedback */
.tap-scale { transform: translateZ(0); }
.tap-scale:active { transform: scale(0.96); }

/* HUD layout */
.hud-root{
  position: absolute;
  top: calc(var(--safe-top) + 12px);
  left: calc(var(--safe-left) + 12px);
  right: calc(var(--safe-right) + 12px);
  z-index: 50;
  pointer-events: none;
}
.hud-row{
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--hud-gap);
}
.hud-left, .hud-center, .hud-right{
  display: flex;
  align-items: center;
  gap: var(--hud-gap);
}
.hud-left{ justify-content: flex-start; }
.hud-center{ justify-content: center; }
.hud-right{ justify-content: flex-end; pointer-events: auto; }

.hud-pill{
  pointer-events: auto;
}
.hud-pill-inner{
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: var(--hud-h);
  padding: 0 16px;
  border-radius: 999px;
  background: rgba(0,0,0,0.40);
  border: 1px solid rgba(255,255,255,0.10);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.hud-icon{
  width: var(--hud-h);
  height: var(--hud-h);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(0,0,0,0.40);
  border: 1px solid rgba(255,255,255,0.10);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.hud-icon:hover{ border-color: rgba(255,255,255,0.20); }

.hud-action{
  height: var(--hud-h);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-radius: 999px;
  background: rgba(0,0,0,0.40);
  border: 1px solid rgba(255,255,255,0.10);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.hud-action:hover{ border-color: rgba(255,255,255,0.20); }

/* CrossExam pill: always below HUD */
.ce-pill{
  position: absolute;
  top: calc(var(--safe-top) + 12px + var(--hud-h) + 14px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  animation: slideUp 260ms ease-out both;
  pointer-events: none;
}

/* Dialogue */
.dialogue-wrap{
  position: absolute;
  left: 0; right: 0;
  bottom: calc(var(--safe-bot) + 0px);
  padding: 18px 18px calc(18px + var(--safe-bot));
  z-index: 30;
  cursor: pointer;
}
.dialogue-actions{
  position: absolute;
  top: -78px;
  right: 0;
  display: flex;
  gap: 12px;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in { animation: fadeIn 220ms ease-out both; }

@keyframes slideUp {
  from { opacity: 0; transform: translate(-50%, 10px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
.animate-slide-up { animation: slideUp 260ms ease-out both; }

@keyframes shake {
  0% { transform: translate3d(0,0,0); }
  15% { transform: translate3d(-8px, 2px, 0); }
  30% { transform: translate3d(7px, -2px, 0); }
  45% { transform: translate3d(-6px, 2px, 0); }
  60% { transform: translate3d(5px, -1px, 0); }
  75% { transform: translate3d(-3px, 1px, 0); }
  100% { transform: translate3d(0,0,0); }
}
.animate-shake { animation: shake 520ms cubic-bezier(.2,.9,.2,1) both; }

@keyframes pulseSoft {
  0% { transform: scale(0.98); opacity: 0.55; }
  55% { transform: scale(1.02); opacity: 0.9; }
  100% { transform: scale(1.0); opacity: 0.6; }
}
.pulse-soft { animation: pulseSoft 980ms ease-in-out infinite; }

/* Responsive tune */
@media (max-width: 420px){
  :root{ --hud-h: 56px; --hud-gap: 10px; }
  .hud-pill-inner{ padding: 0 12px; }
  .hud-action{ padding: 0 12px; }
  .dialogue-actions{ top: -72px; }
}
`;
