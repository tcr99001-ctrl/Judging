'use client';

import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Scale,
  AlertCircle,
  FileText,
  Search,
  ChevronRight,
  ChevronLeft,
  Volume2,
  VolumeX,
  RotateCcw,
  HardDrive,
  FolderOpen,
  Trash2,
  Save,
} from 'lucide-react';

/* =========================================================
   app/page.js — SINGLE FILE (RUNNABLE)
   FIX:
   - ✅ 하단 4개 버튼 정렬:
     - 모바일: [추궁/증거/리셋] 한 줄 + [이전/다음] 한 줄
     - 데스크톱: 좌(3개) / 우(이전/다음) 한 줄
   - ✅ Pill/pickAvatar SSR 에러 방지 포함
   - ✅ Prev/Next history snapshot
   - ✅ Typewriter + Blip
   - ✅ Cross exam gate (Press/Evolve, Weakness/Present)
========================================================= */

/* =========================
   Global CSS
========================= */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');
:root{color-scheme:dark}
html,body{height:100%}
*{-webkit-tap-highlight-color:transparent}
.safe-top{padding-top:env(safe-area-inset-top)}
.safe-bottom{padding-bottom:env(safe-area-inset-bottom)}
.no-scrollbar::-webkit-scrollbar{width:0;height:0}
@keyframes shake{0%,100%{transform:translate(0)}25%{transform:translate(-6px,3px)}75%{transform:translate(6px,-3px)}}
.animate-shake{animation:shake .22s ease-in-out 3}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.animate-fade-in{animation:fadeIn .25s ease-out}
@keyframes neonPulse{0%,100%{opacity:.75;transform:translateY(0)}50%{opacity:1;transform:translateY(-1px)}}
.neon-pulse{animation:neonPulse 1.25s ease-in-out infinite}
`;

/* =========================
   UI primitives (SSR-safe)
========================= */
function Pill({ children }) {
  return <div className="px-4 py-2 rounded-full border border-white/10 bg-black/45 backdrop-blur-md">{children}</div>;
}

/* =========================
   Utils
========================= */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;

function nowMs() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
function safeJSONParse(s, fb = null) {
  try {
    return JSON.parse(s);
  } catch {
    return fb;
  }
}
function normalizeKoreanSentence(raw) {
  const s0 = String(raw ?? '').trim();
  if (!s0) return s0;
  const last = s0[s0.length - 1];
  if (['.', '!', '?', '…'].includes(last)) return s0;
  if (last === ')' || last === ']' || last === '"' || last === "'") return s0;
  if (/(까|나요|습니까|죠)$/.test(s0)) return s0 + '?';
  if (
    s0.endsWith('다') ||
    s0.endsWith('요') ||
    s0.endsWith('죠') ||
    s0.endsWith('네') ||
    s0.endsWith('라') ||
    s0.endsWith('자') ||
    s0.endsWith('냐') ||
    s0.endsWith('까') ||
    s0.endsWith('습니다') ||
    s0.endsWith('입니다')
  ) {
    return s0 + '.';
  }
  return s0 + '.';
}
function pickAvatar(char, face = 'normal') {
  const a = char?.avatars || {};
  if (a && typeof a === 'object') return a[face] || a.normal || null;
  return null;
}

/* =========================
   Typewriter
========================= */
function useTypewriter(text, { enabled = true, cps = 34 } = {}) {
  const full = String(text ?? '');
  const [shown, setShown] = useState(full);
  const [done, setDone] = useState(true);

  const rafRef = useRef(null);
  const idxRef = useRef(0);
  const lastRef = useRef(0);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };
  const skip = () => {
    stop();
    idxRef.current = full.length;
    setShown(full);
    setDone(true);
  };

  useEffect(() => {
    stop();

    if (!enabled) {
      setShown(full);
      setDone(true);
      idxRef.current = full.length;
      return;
    }
    if (!full) {
      setShown('');
      setDone(true);
      idxRef.current = 0;
      return;
    }

    setShown('');
    setDone(false);
    idxRef.current = 0;
    lastRef.current = performance.now();

    const tick = (t) => {
      const last = lastRef.current || t;
      const dt = Math.max(0, t - last);
      lastRef.current = t;

      const add = (dt / 1000) * cps;
      const next = Math.min(full.length, idxRef.current + add);
      const nextInt = Math.floor(next);

      if (nextInt !== Math.floor(idxRef.current)) {
        idxRef.current = nextInt;
        setShown(full.slice(0, nextInt));
      } else {
        idxRef.current = next;
      }

      if (idxRef.current >= full.length) {
        idxRef.current = full.length;
        setShown(full);
        setDone(true);
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full, enabled, cps]);

  return { shown, done, skip };
}

/* =========================
   LocalStorage Save
========================= */
const SAVE_NS = 'ACEVN_SAVE';
const saveKey = (slot) => `${SAVE_NS}::slot::${slot}`;

function lsSave(slot, data) {
  if (typeof window === 'undefined') return { ok: false, reason: 'no_window' };
  try {
    window.localStorage.setItem(saveKey(slot), JSON.stringify(data));
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}
function lsLoad(slot) {
  if (typeof window === 'undefined') return { ok: false, reason: 'no_window' };
  const raw = window.localStorage.getItem(saveKey(slot));
  if (!raw) return { ok: false, reason: 'not_found' };
  const obj = safeJSONParse(raw, null);
  if (!obj) return { ok: false, reason: 'parse_failed' };
  return { ok: true, data: obj };
}
function lsDelete(slot) {
  if (typeof window === 'undefined') return { ok: false, reason: 'no_window' };
  try {
    window.localStorage.removeItem(saveKey(slot));
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

/* =========================
   Audio (BGM/SFX + Blip)
========================= */
function makeAudio(url, { loop = false, volume = 1 } = {}) {
  const a = new Audio(url);
  a.loop = !!loop;
  a.preload = 'auto';
  a.volume = clamp(volume, 0, 1);
  return a;
}
async function fadeTo(audio, targetVol, ms) {
  if (!audio) return;
  const start = audio.volume;
  const end = clamp(targetVol, 0, 1);
  const dur = Math.max(0, ms | 0);
  if (dur === 0) {
    audio.volume = end;
    return;
  }
  const t0 = performance.now();
  return new Promise((resolve) => {
    const tick = () => {
      const t = performance.now();
      const p = clamp((t - t0) / dur, 0, 1);
      audio.volume = start + (end - start) * p;
      if (p >= 1) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
function useAudioBus() {
  const unlockedRef = useRef(false);
  const mutedRef = useRef(false);

  const bgmCurRef = useRef({ key: null, audio: null, cache: new Map() });
  const sfxPoolRef = useRef(new Map());

  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const lastBlipRef = useRef(0);

  const ensureCtx = () => {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctxRef.current) {
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = 0.65;
      master.connect(ctx.destination);
      ctxRef.current = ctx;
      masterRef.current = master;
    }
    return ctxRef.current;
  };

  const unlock = async () => {
    if (unlockedRef.current) return true;
    unlockedRef.current = true;
    try {
      const t = new Audio();
      t.muted = true;
      await t.play().catch(() => {});
      t.pause();
    } catch {}
    try {
      const ctx = ensureCtx();
      if (ctx && ctx.state === 'suspended') await ctx.resume().catch(() => {});
    } catch {}
    return true;
  };

  const setMuted = async (m) => {
    mutedRef.current = !!m;
    const cur = bgmCurRef.current.audio;
    if (cur) cur.volume = mutedRef.current ? 0 : cur.volume;
    if (masterRef.current) masterRef.current.gain.value = mutedRef.current ? 0 : 0.65;
  };

  const playBgm = async (key, url, { fadeMs = 520, vol = 0.75 } = {}) => {
    if (!url) return;
    const cur = bgmCurRef.current;
    if (cur.key === key) return;

    let next = cur.cache.get(key);
    if (!next) {
      next = makeAudio(url, { loop: true, volume: 0 });
      cur.cache.set(key, next);
    }
    try {
      await next.play();
    } catch {}

    const prev = cur.audio;
    cur.audio = next;
    cur.key = key;

    const target = mutedRef.current ? 0 : vol;
    await fadeTo(next, target, fadeMs);

    if (prev && prev !== next) {
      await fadeTo(prev, 0, fadeMs);
      try { prev.pause(); } catch {}
      try { prev.currentTime = 0; } catch {}
    }
  };

  const playSfx = async (key, url, { vol = 0.95 } = {}) => {
    if (!url) return false;
    if (mutedRef.current) return true;

    const pools = sfxPoolRef.current;
    let pool = pools.get(key);
    if (!pool) {
      pool = Array.from({ length: 6 }, () => makeAudio(url, { loop: false, volume: vol }));
      pools.set(key, pool);
    }
    let picked = pool[0];
    for (const a of pool) {
      if (a.paused || a.ended) { picked = a; break; }
    }
    try {
      picked.volume = vol;
      try { picked.currentTime = 0; } catch {}
      await picked.play();
      return true;
    } catch {
      return false;
    }
  };

  const blip = ({ freq = 860, dur = 0.018, vol = 0.08 } = {}) => {
    if (mutedRef.current) return;
    const t = nowMs();
    if (t - lastBlipRef.current < 28) return;
    lastBlipRef.current = t;

    const ctx = ensureCtx();
    const master = masterRef.current;
    if (!ctx || !master) return;

    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g);
      g.connect(master);

      const st = ctx.currentTime;
      const en = st + Math.max(0.01, dur);
      g.gain.setValueAtTime(vol, st);
      g.gain.exponentialRampToValueAtTime(0.0001, en);

      o.start(st);
      o.stop(en + 0.01);
    } catch {}
  };

  return { unlock, setMuted, playBgm, playSfx, blip };
}

/* =========================
   Optional BG preload
========================= */
function preloadImage(url) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (!url) return resolve(false);
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/* =========================
   GAME_DB
========================= */
const GAME_DB = {
  meta: { title: '에피소드 1: 단선된 진실', description: '로그와 분류가 진실을 가장한다. 첫 재판에서 그 착각을 부순다.' },
  backgrounds: {
    court: 'bg-gradient-to-b from-slate-950 via-slate-900 to-black',
    hall: 'bg-gradient-to-b from-slate-900 to-slate-800',
    server: 'bg-gradient-to-br from-slate-900 via-indigo-950 to-black',
    tense: 'bg-gradient-to-br from-red-950 to-slate-900',
    ending: 'bg-gradient-to-br from-slate-950 via-slate-900 to-black',
    gameover: 'bg-gradient-to-br from-black via-red-950 to-slate-950',
  },
  characters: {
    judge: { name: '마판사', color: '#6B7280' },
    player: { name: '진무연', color: '#2563EB' },
    prosecutor: { name: '류시온', color: '#DC2626' },
    witness1: {
      name: '박경비',
      color: '#10B981',
      avatars: {
        normal:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%2310B981'/%3E%3Ctext x='50' y='62' font-size='28' text-anchor='middle' fill='white'%3E경비%3C/text%3E%3C/svg%3E",
        sweat:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%23F59E0B'/%3E%3Ctext x='50' y='62' font-size='34' text-anchor='middle' fill='white'%3E😰%3C/text%3E%3C/svg%3E",
      },
    },
    witness2: {
      name: '최실장',
      color: '#8B5CF6',
      avatars: {
        normal:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%238B5CF6'/%3E%3Ctext x='50' y='62' font-size='28' text-anchor='middle' fill='white'%3EIT%3C/text%3E%3C/svg%3E",
        sweat:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%23F59E0B'/%3E%3Ctext x='50' y='62' font-size='34' text-anchor='middle' fill='white'%3E😰%3C/text%3E%3C/svg%3E",
      },
    },
    witness3: {
      name: '윤기사',
      color: '#06B6D4',
      avatars: {
        normal:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%2306B6D4'/%3E%3Ctext x='50' y='62' font-size='28' text-anchor='middle' fill='white'%3E기사%3C/text%3E%3C/svg%3E",
        sweat:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%23F59E0B'/%3E%3Ctext x='50' y='62' font-size='34' text-anchor='middle' fill='white'%3E😰%3C/text%3E%3C/svg%3E",
      },
    },
  },
  evidence: {
    autopsy: { name: '검시 소견서', icon: '🧾', desc: '사인은 둔기성 두부 손상이며, 사망 추정 시각은 21:00이다.' },
    smartwatch_data: { name: '스마트워치', icon: '⌚', desc: '심정지는 20:45:19에 기록되어 있다.' },
    server_log: { name: '도어락 로그', icon: '🚪', desc: '20:55~21:05 구간은 잠김 유지로 기록되어 있다.' },
    hall_cctv: { name: '복도 CCTV', icon: '📹', desc: '프레임 드롭으로 얼굴 식별이 불가능하다.' },
    voice_print: { name: '인터폰 음성 로그', icon: '🎙️', desc: "20:59에 '문 열어'가 녹음되었고, 윤비서로 분류되었다." },
    server_blade: {
      name: '서버 블레이드',
      icon: '🔪',
      desc: '끝부분에 변색이 있다. 손잡이에는 지문이 남아 있다.',
      examine: {
        bg: 'bg-slate-800 text-gray-200',
        content: '[압수품]\n금속 부품이다.\n끝부분 변색이 이상하다.',
        hotspots: [{ id: 'burn_mark', x: 78, y: 38, width: 16, height: 22, resultEvidenceKey: 'electric_burn', successMsg: '고전압 스파크에 의한 탄 자국이다.' }],
      },
    },
    electric_burn: { name: '탄 자국', icon: '⚡', desc: '금속이 국부적으로 용융된 흔적이다.' },
    real_time_of_death: { name: '진짜 사망 시각', icon: '⏱️', desc: '스마트워치 기록에 따르면 사망은 20:45이다.' },
    staged_accident: { name: '감전사 위장', icon: '💀', desc: '감전사 이후 사후 타격으로 살인처럼 위장되었다.' },
    evolved_voice_log: { name: '분류 조작 정황', icon: '🧩', desc: '프레임 드롭과 분류 편향으로 태깅 오류가 가능하다.' },
  },
  combinations: [
    { req: ['autopsy', 'smartwatch_data'], result: 'real_time_of_death', successMsg: '부검과 워치를 합치면, 진짜 사망 시각은 20:45로 고정된다.' },
    { req: ['real_time_of_death', 'electric_burn'], result: 'staged_accident', successMsg: '탄 자국과 사망 시각이 맞물린다. 감전사 위장 정황이 완성된다.' },
    { req: ['voice_print', 'hall_cctv'], result: 'evolved_voice_log', successMsg: '영상이 깨진 구간에서 음성 분류는 조작될 수 있다.' },
  ],
  cases: [
    {
      title: '제1화: 단선된 진실',
      apMax: 7,
      initialEvidence: ['autopsy', 'smartwatch_data', 'server_log', 'server_blade', 'voice_print', 'hall_cctv'],
      script: [
        { type: 'scene', bgKey: 'court', bgmKey: 'trial' },
        { type: 'talk', charKey: 'judge', text: '지금부터 재판을 시작하겠습니다. 핵심만 말하세요' },
        { type: 'talk', charKey: 'prosecutor', text: '정리부터 하죠. 21시. 서버실. 한 번의 타격. 그게 전부입니다' },
        { type: 'talk', charKey: 'player', text: '전부라고요. 그 말부터 먼저 깨겠습니다' },

        { type: 'anim', name: 'cross_start' },
        {
          type: 'trial',
          title: '박경비의 목격 증언',
          witnessCharKey: 'witness1',
          bgKey: 'hall',
          statements: [
            { id: 'w1_01', text: '21:00 정각에 누군가 서버실 쪽에서 튀어나오는 것을 봤습니다' },
            {
              id: 'w1_02',
              text: '문이 열려 있었기 때문에, 나왔다고 확신했습니다',
              pressQ: '문이 열렸다는 근거가 있나요',
              press: [
                { charKey: 'player', text: '도어락 기록은 확인했나요' },
                { charKey: 'witness1', face: 'sweat', text: '그때는 몰랐습니다. 저는 그냥 눈으로 봤습니다' },
              ],
              evolveOnPress: {
                newText: '문이 열렸다고 생각했지만, 도어락 로그를 보니 열림 기록이 없었다고 들었습니다',
                weakness: true,
                contradictionEvidenceKey: 'server_log',
                failMsg: '도어락 로그를 제시해서, 문이 열리지 않았음을 입증하라',
              },
            },
          ],
        },

        { type: 'anim', name: 'objection' },
        { type: 'talk', charKey: 'player', text: '이의 있습니다. 20:55부터 21:05까지 열림 이벤트가 없습니다' },
        { type: 'talk', charKey: 'prosecutor', text: '좋아요. 그러면 안에서 죽였겠죠. 이제 시간만 보면 됩니다' },
        { type: 'talk', charKey: 'player', text: '그 시간부터 바꿔야 합니다' },

        { type: 'anim', name: 'cross_start' },
        {
          type: 'trial',
          title: '류시온의 주장: 사망 시각',
          witnessCharKey: 'prosecutor',
          bgKey: 'tense',
          statements: [
            { id: 'p_01', text: '부검 소견서는 21시를 가리킵니다. 결론은 단순합니다', weakness: true, contradictionEvidenceKey: 'real_time_of_death', failMsg: '부검과 스마트워치를 조합해 진짜 사망 시각을 만든 뒤 제시하라' },
          ],
        },

        { type: 'talk', charKey: 'player', text: '선이 연결됐습니다. 심정지는 20:45입니다' },
        { type: 'talk', charKey: 'prosecutor', text: '…그럼 21시는 사후라는 말이군요. 위장 가능성이 생깁니다' },

        { type: 'anim', name: 'cross_start' },
        {
          type: 'trial',
          title: '최실장의 은폐',
          witnessCharKey: 'witness2',
          bgKey: 'tense',
          statements: [
            {
              id: 'w2_01',
              text: '블레이드에 피가 있습니다. 그러니 살인입니다',
              pressQ: '피가 있으면 무조건 살인인가요',
              press: [
                { charKey: 'player', text: '끝부분 변색은 확인했나요' },
                { charKey: 'witness2', face: 'sweat', text: '그런 건 중요하지 않습니다. 피가 먼저죠' },
              ],
              evolveOnPress: {
                newText: '피가 묻은 흉기면 충분합니다. 다른 해석은 변명입니다',
                weakness: true,
                contradictionEvidenceKey: 'staged_accident',
                failMsg: '탄 자국과 사망 시각을 조합해 감전사 위장 정황을 만든 뒤 제시하라',
              },
            },
          ],
        },

        { type: 'talk', charKey: 'player', text: '이 사건의 본질은 살인이 아니라 감전사입니다' },

        { type: 'anim', name: 'cross_start' },
        {
          type: 'trial',
          title: '음성 로그의 함정',
          witnessCharKey: 'witness3',
          bgKey: 'server',
          statements: [
            {
              id: 'w3_01',
              text: '20:59의 음성은 윤비서로 분류되었습니다',
              pressQ: '윤비서는 20:45에 사망했습니다. 어떻게 가능한가요',
              press: [
                { charKey: 'player', text: '분류가 틀릴 가능성은 없나요' },
                { charKey: 'witness3', face: 'sweat', text: '프레임이 깨지면 흔들릴 수는 있습니다' },
              ],
              evolveOnPress: {
                newText: '프레임 드롭 구간이면 음성 분류는 오탐이 발생할 수 있습니다',
                weakness: true,
                contradictionEvidenceKey: 'evolved_voice_log',
                failMsg: '음성 로그와 CCTV를 조합해 분류 조작 정황을 만든 뒤 제시하라',
              },
            },
          ],
        },

        { type: 'talk', charKey: 'judge', text: '피고인에게 무죄를 선고합니다' },
        { type: 'scene', bgKey: 'ending', bgmKey: 'victory' },
        { type: 'talk', charKey: 'player', text: '선이 끊긴 게 아니라, 누가 끊어 놓은 겁니다' },
        { type: 'end', text: 'THE END' },
      ],
    },
  ],
};

/* =========================
   Compile
========================= */
function compileGame(db) {
  const baseCase = db.cases?.[0];
  const script = baseCase?.script || [];
  const lines = [];

  for (const raw of script) {
    if (!raw || !raw.type) continue;

    if (raw.type === 'talk') {
      lines.push({ type: 'talk', charKey: raw.charKey || 'judge', text: normalizeKoreanSentence(raw.text), face: raw.face || 'normal', bgKey: raw.bgKey || null });
      continue;
    }
    if (raw.type === 'scene') {
      lines.push({ type: 'scene', bgKey: raw.bgKey || 'court', bgmKey: raw.bgmKey || null });
      continue;
    }
    if (raw.type === 'anim') {
      lines.push({ type: 'anim', name: raw.name || 'flash' });
      continue;
    }
    if (raw.type === 'end') {
      lines.push({ type: 'end', text: String(raw.text || 'THE END') });
      continue;
    }
    if (raw.type === 'trial') {
      const statements = (raw.statements || []).map((s) => ({
        id: s.id || uid('stmt'),
        text: normalizeKoreanSentence(s.text),
        pressQ: s.pressQ ? normalizeKoreanSentence(s.pressQ) : null,
        press: Array.isArray(s.press) ? s.press.map((p) => ({ charKey: p.charKey || 'judge', face: p.face || 'normal', text: normalizeKoreanSentence(p.text) })) : [],
        evolveOnPress: s.evolveOnPress
          ? {
              newText: normalizeKoreanSentence(s.evolveOnPress.newText),
              weakness: !!s.evolveOnPress.weakness,
              contradictionEvidenceKey: s.evolveOnPress.contradictionEvidenceKey || null,
              failMsg: s.evolveOnPress.failMsg ? normalizeKoreanSentence(s.evolveOnPress.failMsg) : null,
            }
          : null,
        weakness: !!s.weakness,
        contradictionEvidenceKey: s.contradictionEvidenceKey || null,
        failMsg: s.failMsg ? normalizeKoreanSentence(s.failMsg) : null,
      }));
      lines.push({ type: 'cross_exam', title: raw.title || '심문', bgKey: raw.bgKey || 'court', witnessCharKey: raw.witnessCharKey || 'witness1', statements });
      continue;
    }

    lines.push(raw);
  }

  return {
    meta: db.meta,
    backgrounds: db.backgrounds,
    characters: db.characters,
    evidence: db.evidence,
    combinations: db.combinations || [],
    lines,
    initialEvidence: baseCase?.initialEvidence || [],
    apMax: baseCase?.apMax ?? 5,
  };
}

/* =========================
   Reducer + History
========================= */
const AT = {
  RESET: 'RESET',
  NEXT: 'NEXT',
  PREV: 'PREV',
  PRESS: 'PRESS',
  PRESS_NEXT: 'PRESS_NEXT',
  PRESENT: 'PRESENT',
  OPEN_EVIDENCE: 'OPEN_EVIDENCE',
  CLOSE_EVIDENCE: 'CLOSE_EVIDENCE',
  HYDRATE: 'HYDRATE',
};

function initialState(game) {
  return {
    idx: 0,
    bgKey: game.lines?.[0]?.bgKey || 'court',
    hpMax: game.apMax,
    hp: game.apMax,
    inv: Array.from(new Set(game.initialEvidence || [])),
    ceIndex: 0,
    pressMode: false,
    pressIndex: 0,
    evidenceOpen: false,
    evolved: {},
    ending: false,
    gameOver: false,
    history: [],
  };
}

function stripHistory(s) {
  const { history, ...rest } = s;
  return rest;
}

function reducer(game, state, action) {
  const lines = game.lines || [];
  const line = lines[state.idx];

  const getMergedStmtAt = (st, i) => {
    const L = lines[st.idx];
    if (!L || L.type !== 'cross_exam') return null;
    const base = L.statements?.[i] || null;
    if (!base) return null;
    const ev = st.evolved?.[base.id];
    return ev ? { ...base, ...ev } : base;
  };

  const findUnresolved = (st) => {
    const L = lines[st.idx];
    if (!L || L.type !== 'cross_exam') return -1;
    const stmts = L.statements || [];
    for (let i = 0; i < stmts.length; i++) {
      const base = stmts[i];
      const merged = getMergedStmtAt(st, i);
      const evolved = !!st.evolved?.[base.id];
      const hasEvolve = !!base.evolveOnPress;
      const isWeak = !!merged?.weakness;
      if (isWeak) return i;
      if (hasEvolve && !evolved) return i;
    }
    return -1;
  };

  const pushHistory = (nextState) => {
    const snap = stripHistory(state);
    const hist = state.history ? state.history.slice() : [];
    hist.push(snap);
    if (hist.length > 200) hist.shift();
    return { ...nextState, history: hist };
  };

  switch (action.type) {
    case AT.RESET:
      return initialState(game);

    case AT.HYDRATE:
      return action.state && isObj(action.state) ? action.state : state;

    case AT.OPEN_EVIDENCE:
      return { ...state, evidenceOpen: true };
    case AT.CLOSE_EVIDENCE:
      return { ...state, evidenceOpen: false };

    case AT.PRESS: {
      if (!line || line.type !== 'cross_exam') return state;
      const s = getMergedStmtAt(state, state.ceIndex);
      if (!s?.press?.length) return state;
      return pushHistory({ ...state, pressMode: true, pressIndex: 0 });
    }

    case AT.PRESS_NEXT: {
      if (!state.pressMode) return state;
      const s = getMergedStmtAt(state, state.ceIndex);
      const n = s?.press?.length || 0;
      if (n <= 0) return pushHistory({ ...state, pressMode: false, pressIndex: 0 });

      const last = state.pressIndex >= n - 1;
      if (!last) return pushHistory({ ...state, pressIndex: state.pressIndex + 1 });

      const base = line?.statements?.[state.ceIndex];
      const evo = s?.evolveOnPress;
      if (base && evo) {
        const nextEvolved = { ...(state.evolved || {}) };
        nextEvolved[base.id] = { text: evo.newText, weakness: !!evo.weakness, contradictionEvidenceKey: evo.contradictionEvidenceKey, failMsg: evo.failMsg };
        return pushHistory({ ...state, evolved: nextEvolved, pressMode: false, pressIndex: 0 });
      }
      return pushHistory({ ...state, pressMode: false, pressIndex: 0 });
    }

    case AT.PRESENT: {
      if (!line || line.type !== 'cross_exam') return state;
      const s = getMergedStmtAt(state, state.ceIndex);
      if (!s) return state;

      if (s.weakness && s.contradictionEvidenceKey && action.key === s.contradictionEvidenceKey) {
        const base = line?.statements?.[state.ceIndex];
        const evolvedNext = { ...(state.evolved || {}) };
        if (base?.id && evolvedNext[base.id]) {
          const keep = { ...evolvedNext[base.id] };
          delete keep.weakness;
          delete keep.contradictionEvidenceKey;
          delete keep.failMsg;
          evolvedNext[base.id] = keep;
        }

        const tmp = { ...state, evolved: evolvedNext, pressMode: false, pressIndex: 0, evidenceOpen: false };
        const unresolved = findUnresolved(tmp);
        if (unresolved >= 0) return pushHistory({ ...tmp, ceIndex: unresolved });

        const nextIdx = clamp(state.idx + 1, 0, lines.length - 1);
        const nextLine = lines[nextIdx];
        return pushHistory({ ...tmp, idx: nextIdx, bgKey: nextLine?.bgKey || tmp.bgKey, ceIndex: 0 });
      }

      const hp = Math.max(0, state.hp - 1);
      return pushHistory({ ...state, hp, gameOver: hp <= 0 });
    }

    case AT.NEXT: {
      if (state.ending || state.gameOver) return state;
      if (state.pressMode) return reducer(game, state, { type: AT.PRESS_NEXT });

      if (!line) return state;

      if (line.type === 'scene' || line.type === 'anim') {
        const nextIdx = clamp(state.idx + 1, 0, lines.length - 1);
        const nextLine = lines[nextIdx];
        return pushHistory({ ...state, idx: nextIdx, bgKey: nextLine?.bgKey || state.bgKey });
      }

      if (line.type === 'end') return pushHistory({ ...state, ending: true });

      if (line.type === 'cross_exam') {
        const total = line.statements?.length || 0;
        const last = state.ceIndex >= total - 1;
        if (last) {
          const unresolved = findUnresolved(state);
          if (unresolved >= 0) return pushHistory({ ...state, ceIndex: unresolved });
          const nextIdx = clamp(state.idx + 1, 0, lines.length - 1);
          const nextLine = lines[nextIdx];
          return pushHistory({ ...state, idx: nextIdx, bgKey: nextLine?.bgKey || state.bgKey, ceIndex: 0 });
        }
        return pushHistory({ ...state, ceIndex: state.ceIndex + 1 });
      }

      const nextIdx = clamp(state.idx + 1, 0, lines.length - 1);
      const nextLine = lines[nextIdx];
      return pushHistory({ ...state, idx: nextIdx, bgKey: nextLine?.bgKey || state.bgKey });
    }

    case AT.PREV: {
      const hist = state.history || [];
      if (hist.length <= 0) return state;
      const prevSnap = hist[hist.length - 1];
      const nextHist = hist.slice(0, -1);
      return { ...prevSnap, history: nextHist };
    }

    default:
      return state;
  }
}

/* =========================
   View
========================= */
function deriveView(game, state) {
  const lines = game.lines || [];
  const line = lines[state.idx];
  const chars = game.characters || {};

  const bgKey = state.bgKey || line?.bgKey || 'court';
  const bgClass = game.backgrounds?.[bgKey] || 'bg-gradient-to-b from-slate-950 via-slate-900 to-black';

  const isCE = line?.type === 'cross_exam';
  const stmt0 = isCE ? (line.statements?.[state.ceIndex] || null) : null;
  const ev = stmt0 ? state.evolved?.[stmt0.id] : null;
  const stmt = stmt0 ? (ev ? { ...stmt0, ...ev } : stmt0) : null;

  const pressItem = state.pressMode && stmt?.press?.length ? stmt.press[state.pressIndex] : null;

  const speakerKey = (() => {
    if (pressItem?.charKey) return pressItem.charKey;
    if (isCE) return line.witnessCharKey || 'witness1';
    if (line?.type === 'talk') return line.charKey || 'judge';
    return 'judge';
  })();

  const speaker = chars[speakerKey] || chars.judge;
  const face = pressItem?.face || 'normal';
  const avatar = pickAvatar(speaker, face);

  const text = (() => {
    if (state.pressMode && pressItem?.text) return pressItem.text;
    if (isCE) return stmt?.text || '';
    if (line?.type === 'talk') return line.text || '';
    if (line?.type === 'end') return line.text || 'THE END';
    return '';
  })();

  const hint = (() => {
    if (!isCE) return '';
    const evolved = stmt0 ? !!state.evolved?.[stmt0.id] : false;
    const hasEvolve = !!stmt0?.evolveOnPress;
    if (hasEvolve && !evolved) return '이 문장은 추궁해서 증언을 갱신해야 한다.';
    if (stmt?.weakness) return stmt?.failMsg || '이 문장은 약점이다. 증거를 제시하라.';
    return '';
  })();

  return { line, bgKey, bgClass, isCE, ceTitle: isCE ? line.title : '', ceIndex: isCE ? state.ceIndex : 0, ceTotal: isCE ? (line.statements?.length || 0) : 0, stmt, speaker, avatar, text, hint };
}

/* =========================
   Evidence helpers
========================= */
function findCombination(combos, a, b) {
  const req = [a, b].sort().join('::');
  return (combos || []).find((c) => (c.req || []).slice().sort().join('::') === req) || null;
}

/* =========================
   Modals
========================= */
function ModalShell({ open, onClose, title, icon, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[85vh] rounded-3xl border border-white/10 bg-black/75 backdrop-blur-xl overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">{icon}</div>
            <div className="min-w-0">
              <div className="text-xl font-semibold text-white" style={{ fontFamily: 'Crimson Pro, serif' }}>
                {title}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center">
            ✕
          </button>
        </div>
        <div className="p-6 overflow-auto no-scrollbar">{children}</div>
        {footer ? <div className="px-6 py-4 border-t border-white/10">{footer}</div> : null}
      </div>
    </div>
  );
}

function EvidenceModal({ open, onClose, inventory, evidenceMap, onPresent, onExamine, onOpenCombine, hint }) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="증거"
      icon={<FileText className="w-5 h-5 text-amber-300" />}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-gray-400">{hint || ''}</div>
          <div className="flex gap-2">
            <button onClick={onOpenCombine} className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold">
              조합
            </button>
            <button onClick={onClose} className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold">
              닫기
            </button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {inventory.map((key) => {
          const ev = evidenceMap[key];
          if (!ev) return null;
          return (
            <div key={key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start gap-4">
                <div className="text-4xl">{ev.icon || '🗂️'}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-base font-semibold text-white">{ev.name}</div>
                    <span className="text-xs font-mono px-2 py-1 rounded-full bg-black/30 border border-white/10 text-gray-300">{key}</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-300 leading-relaxed">{ev.desc}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 justify-end">
                {ev.examine ? (
                  <button onClick={() => onExamine(key)} className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-semibold">
                    조사
                  </button>
                ) : null}
                <button onClick={() => onPresent(key)} className="h-10 px-4 rounded-xl bg-amber-600/80 hover:bg-amber-500 border border-amber-400/30 font-semibold">
                  제시
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}

function CombineModal({ open, onClose, inventory, evidenceMap, a, b, onPickA, onPickB, onApply }) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="단서 조합"
      icon={<RotateCcw className="w-5 h-5 text-gray-200" />}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-gray-400">두 개를 골라 조합</div>
          <div className="flex gap-2">
            <button onClick={onApply} className="h-10 px-4 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 border border-emerald-400/30 font-semibold">
              조합
            </button>
            <button onClick={onClose} className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold">
              닫기
            </button>
          </div>
        </div>
      }
    >
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
        <div className="text-sm text-gray-200">
          A: <span className="font-semibold text-white">{a ? (evidenceMap[a]?.name || a) : '선택'}</span>
          <span className="mx-2 text-gray-500">·</span>
          B: <span className="font-semibold text-white">{b ? (evidenceMap[b]?.name || b) : '선택'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {inventory.map((key) => {
          const ev = evidenceMap[key];
          if (!ev) return null;
          const selected = a === key || b === key;
          return (
            <button
              key={key}
              onClick={() => {
                if (!a || a === key) onPickA(key);
                else if (!b || b === key) onPickB(key);
                else onPickB(key);
              }}
              className={`p-4 rounded-2xl border text-left transition ${
                selected ? 'bg-emerald-500/10 border-emerald-400/30' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{ev.icon || '🗂️'}</div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">{ev.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{ev.desc}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ModalShell>
  );
}

function ExamineModal({ open, onClose, evidenceKey, evidence, onFound }) {
  if (!open || !evidenceKey || !evidence?.examine) return null;
  const ex = evidence.examine;
  const hotspots = ex.hotspots || [];
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={`조사: ${evidence.name}`}
      icon={<Search className="w-5 h-5 text-gray-200" />}
      footer={
        <div className="flex items-center justify-end">
          <button onClick={onClose} className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold">
            닫기
          </button>
        </div>
      }
    >
      <div className={`rounded-2xl border border-white/10 p-4 ${ex.bg || 'bg-white/5 text-gray-200'}`}>
        <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono">{ex.content}</pre>

        <div className="relative mt-4 w-full aspect-[16/9] rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
          {hotspots.map((h) => (
            <button
              key={h.id}
              onClick={() => onFound(h)}
              className="absolute border border-emerald-400/40 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition"
              style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.width}%`, height: `${h.height}%` }}
              aria-label={h.id}
            />
          ))}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-3 left-3 text-xs text-gray-300">초록 핫스팟을 눌러 단서를 찾아라</div>
        </div>
      </div>
    </ModalShell>
  );
}

function SaveLoadModal({ open, onClose, onSave, onLoad, onDelete }) {
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(null);

  const run = async (slot, fn, okMsg, failMsg) => {
    setBusy(slot);
    try {
      const r = await fn(slot);
      setToast({ ok: r.ok, msg: r.msg || (r.ok ? okMsg : failMsg) });
    } catch (e) {
      setToast({ ok: false, msg: `${failMsg}: ${String(e)}` });
    } finally {
      setBusy(null);
      setTimeout(() => setToast(null), 1400);
    }
  };

  return (
    <ModalShell open={open} onClose={onClose} title="세이브/로드" icon={<HardDrive className="w-5 h-5 text-gray-200" />}>
      {toast ? (
        <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${toast.ok ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-100' : 'bg-rose-500/10 border-rose-400/20 text-rose-100'}`}>
          {toast.msg}
        </div>
      ) : null}

      <div className="space-y-3">
        {[1, 2, 3].map((slot) => (
          <div key={slot} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-white">슬롯 {slot}</div>
            <div className="ml-auto flex flex-wrap gap-2">
              <button disabled={busy != null} onClick={() => run(slot, onSave, '저장 완료', '저장 실패')} className="h-10 px-3 rounded-xl bg-blue-600/80 hover:bg-blue-500 border border-blue-400/30 font-semibold disabled:opacity-40">
                <span className="inline-flex items-center gap-2"><Save className="w-4 h-4" />저장</span>
              </button>
              <button disabled={busy != null} onClick={() => run(slot, onLoad, '로드 완료', '로드 실패')} className="h-10 px-3 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 border border-emerald-400/30 font-semibold disabled:opacity-40">
                <span className="inline-flex items-center gap-2"><FolderOpen className="w-4 h-4" />로드</span>
              </button>
              <button disabled={busy != null} onClick={() => run(slot, onDelete, '삭제 완료', '삭제 실패')} className="h-10 px-3 rounded-xl bg-rose-600/80 hover:bg-rose-500 border border-rose-400/30 font-semibold disabled:opacity-40">
                <span className="inline-flex items-center gap-2"><Trash2 className="w-4 h-4" />삭제</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

/* =========================
   Page
========================= */
export default function Page() {
  const audio = useAudioBus();
  const game = useMemo(() => compileGame(GAME_DB), []);
  const [state, dispatch] = useReducer((s, a) => reducer(game, s, a), undefined, () => initialState(game));
  const view = useMemo(() => deriveView(game, state), [game, state]);

  const [muted, setMuted] = useState(false);
  const [bgUrl, setBgUrl] = useState(null);

  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [combineOpen, setCombineOpen] = useState(false);
  const [examineOpen, setExamineOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const [combineA, setCombineA] = useState(null);
  const [combineB, setCombineB] = useState(null);
  const [examineKey, setExamineKey] = useState(null);

  const [shake, setShake] = useState(false);
  const [overlayMsg, setOverlayMsg] = useState(null);
  const [effectText, setEffectText] = useState(null);

  const doShake = (ms = 320) => (setShake(true), setTimeout(() => setShake(false), ms));
  const doOverlay = (t, ms = 1000) => (setOverlayMsg(t), setTimeout(() => setOverlayMsg(null), ms));
  const doEffect = (t, ms = 850) => (setEffectText(t), setTimeout(() => setEffectText(null), ms));

  const lastMoveRef = useRef(0);
  const canMove = () => {
    const t = nowMs();
    if (t - lastMoveRef.current < 250) return false;
    lastMoveRef.current = t;
    return true;
  };

  useEffect(() => {
    audio.setMuted(muted).catch(() => {});
  }, [muted]); // eslint-disable-line react-hooks/exhaustive-deps

  const unlock = async () => {
    await audio.unlock();
  };
  const sfx = async (k) => {
    const url = `/assets/sfx/${k}.ogg`;
    await audio.playSfx(k, url).catch(() => {});
  };

  useEffect(() => {
    const candidate = `/assets/bg/${view.bgKey}.webp`;
    preloadImage(candidate).then((ok) => setBgUrl(ok ? candidate : null));
  }, [view.bgKey]);

  useEffect(() => {
    if (view.line?.type === 'scene') dispatch({ type: AT.NEXT });
  }, [view.line?.type]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (view.line?.type !== 'anim') return;
    if (view.line.name === 'objection') {
      doEffect('OBJECTION!');
      sfx('objection');
    } else if (view.line.name === 'cross_start') {
      doOverlay('CROSS EXAMINATION');
      sfx('tap');
    } else {
      sfx('flash');
    }
    dispatch({ type: AT.NEXT });
  }, [view.line?.type]); // eslint-disable-line react-hooks/exhaustive-deps

  const { shown: typedText, done: typedDone, skip: typedSkip } = useTypewriter(view.text, { enabled: true, cps: view.isCE ? 42 : 34 });

  const lastLenRef = useRef(0);
  useEffect(() => {
    const curLen = typedText.length;
    const prevLen = lastLenRef.current;
    if (curLen > prevLen && !typedDone) {
      if (curLen % 2 === 0) audio.blip({ freq: view.isCE ? 920 : 780, dur: 0.018, vol: 0.08 });
    }
    lastLenRef.current = curLen;
  }, [typedText, typedDone, view.isCE]); // eslint-disable-line react-hooks/exhaustive-deps

  const bgStyle = bgUrl ? { backgroundImage: `url(${bgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined;

  const onPrev = async () => {
    if (!canMove()) return;
    await unlock();
    await sfx('tap');
    if (!typedDone) { typedSkip(); return; }
    dispatch({ type: AT.PREV });
  };

  const onNext = async () => {
    if (!canMove()) return;
    await unlock();
    await sfx('tap');
    if (!typedDone) { typedSkip(); return; }
    dispatch({ type: AT.NEXT });
  };

  const doPresent = async (key) => {
    await unlock();
    await sfx('flash');
    const prevHp = state.hp;
    dispatch({ type: AT.PRESENT, key });

    setTimeout(async () => {
      if (state.hp < prevHp) {
        doShake();
        doOverlay('틀렸습니다.');
        await sfx('fail');
      } else {
        doEffect('OBJECTION!');
        doOverlay('모순입니다.');
        await sfx('objection');
      }
    }, 80);
  };

  const applyCombine = async () => {
    const a = combineA;
    const b = combineB;
    if (!a || !b) {
      doOverlay('두 개를 골라야 합니다.');
      return;
    }
    const hit = findCombination(game.combinations, a, b);
    setCombineOpen(false);
    setCombineA(null);
    setCombineB(null);

    if (!hit) {
      doOverlay('조합 결과가 없습니다.');
      return;
    }
    if (!state.inv.includes(hit.result)) {
      const inv = Array.from(new Set([...state.inv, hit.result]));
      dispatch({ type: AT.HYDRATE, state: { ...state, inv } });
    }
    doOverlay(hit.successMsg || '새 단서를 얻었습니다.');
    await sfx('tap');
  };

  const onHotspotFound = async (h) => {
    if (!h?.resultEvidenceKey) return;
    const key = h.resultEvidenceKey;
    if (!state.inv.includes(key)) {
      const inv = Array.from(new Set([...state.inv, key]));
      dispatch({ type: AT.HYDRATE, state: { ...state, inv } });
    }
    doOverlay(h.successMsg || '단서를 찾았습니다.');
    await sfx('tap');
  };

  const onSave = async (slot) => {
    const blob = { schema: 1, savedAt: new Date().toISOString(), state, combine: { a: combineA, b: combineB } };
    const res = lsSave(slot, blob);
    return { ok: res.ok, msg: res.ok ? `슬롯 ${slot} 저장 완료` : `저장 실패: ${res.reason}` };
  };

  const onLoad = async (slot) => {
    const res = lsLoad(slot);
    if (!res.ok) return { ok: false, msg: `로드 실패: ${res.reason}` };
    const data = res.data;
    if (data?.state) dispatch({ type: AT.HYDRATE, state: data.state });
    setCombineA(data?.combine?.a || null);
    setCombineB(data?.combine?.b || null);
    return { ok: true, msg: `슬롯 ${slot} 로드 완료` };
  };

  const onDelete = async (slot) => {
    const res = lsDelete(slot);
    return { ok: res.ok, msg: res.ok ? `슬롯 ${slot} 삭제 완료` : `삭제 실패: ${res.reason}` };
  };

  if (state.gameOver) {
    return (
      <div className={`min-h-screen ${GAME_DB.backgrounds.gameover} text-white flex items-center justify-center p-6`} style={bgStyle}>
        <style jsx global>{GLOBAL_CSS}</style>
        <div className="w-full max-w-lg rounded-3xl bg-black/60 border border-white/10 backdrop-blur-xl p-8 text-center">
          <div className="text-6xl mb-4">💥</div>
          <div className="text-4xl font-bold mb-3" style={{ fontFamily: 'Crimson Pro, serif' }}>게임 오버</div>
          <button onClick={() => dispatch({ type: AT.RESET })} className="h-11 px-6 rounded-xl bg-white text-black font-semibold">다시 시작</button>
        </div>
      </div>
    );
  }

  if (state.ending) {
    return (
      <div className={`min-h-screen ${GAME_DB.backgrounds.ending} text-white flex items-center justify-center p-6`} style={bgStyle}>
        <style jsx global>{GLOBAL_CSS}</style>
        <div className="w-full max-w-2xl rounded-3xl bg-black/60 border border-white/10 backdrop-blur-xl p-8 text-center">
          <Scale className="w-20 h-20 mx-auto mb-5 text-blue-400" />
          <div className="text-5xl font-bold mb-3" style={{ fontFamily: 'Crimson Pro, serif' }}>{GAME_DB.meta.title}</div>
          <button onClick={() => dispatch({ type: AT.RESET })} className="h-11 px-6 rounded-xl bg-white text-black font-semibold">다시하기</button>
        </div>
      </div>
    );
  }

  const speaker = view.speaker;
  const avatar = view.avatar;
  const pressable = view.isCE && !!view.stmt?.pressQ && (view.stmt?.press?.length || 0) > 0;

  return (
    <div className={`h-screen w-full relative overflow-hidden ${view.bgClass} ${shake ? 'animate-shake' : ''}`} style={bgStyle}>
      <style jsx global>{GLOBAL_CSS}</style>

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10 pointer-events-none" />

      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-50 safe-top">
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between gap-3">
            <Pill>
              <div className="flex items-center gap-3">
                <Scale className="w-5 h-5 text-blue-300" />
                <div className="flex gap-1.5">
                  {[...Array(state.hpMax)].map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${i < state.hp ? 'bg-blue-400 shadow shadow-blue-400/40' : 'bg-gray-700'}`} />
                  ))}
                </div>
              </div>
            </Pill>

            <div className="flex items-center gap-2">
              <button onClick={async () => { await unlock(); setSaveOpen(true); await sfx('tap'); }} className="w-11 h-11 rounded-full bg-black/45 border border-white/10 hover:border-white/20 backdrop-blur-md flex items-center justify-center" aria-label="save">
                <Save className="w-5 h-5 text-gray-200" />
              </button>

              <button onClick={async () => { await unlock(); setMuted((m) => !m); await sfx('tap'); }} className="w-11 h-11 rounded-full bg-black/45 border border-white/10 hover:border-white/20 backdrop-blur-md flex items-center justify-center" aria-label="mute">
                {muted ? <VolumeX className="w-5 h-5 text-gray-200" /> : <Volume2 className="w-5 h-5 text-gray-200" />}
              </button>

              <button onClick={async () => { await unlock(); setEvidenceOpen(true); dispatch({ type: AT.OPEN_EVIDENCE }); await sfx('tap'); }} className="h-11 px-4 rounded-full bg-black/45 border border-white/10 hover:border-white/20 backdrop-blur-md flex items-center gap-2" aria-label="evidence">
                <FileText className="w-5 h-5 text-amber-300" />
                <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {state.inv.length}/{Object.keys(game.evidence || {}).length}
                </span>
              </button>
            </div>
          </div>
        </div>

        {view.isCE ? (
          <div className="px-4 mt-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 backdrop-blur-md neon-pulse">
              <span className="text-[11px] font-black tracking-widest" style={{ fontFamily: 'Inter, sans-serif' }}>CROSS EXAMINATION</span>
              <span className="text-[11px] font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
                · {view.ceTitle} · {view.ceIndex + 1}/{view.ceTotal}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* FX */}
      {effectText ? (
        <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="relative bg-black/35 backdrop-blur-sm rounded-3xl px-8 py-6 border border-white/10">
            <div className="absolute inset-0 bg-white/10 blur-3xl animate-pulse" />
            <div className="relative text-6xl md:text-7xl font-black tracking-tight text-white" style={{ fontFamily: 'Crimson Pro, serif' }}>
              {effectText}
            </div>
          </div>
        </div>
      ) : null}

      {overlayMsg ? (
        <div className="absolute inset-0 z-[55] flex items-start justify-center pt-24 pointer-events-none animate-fade-in">
          <div className="px-5 py-3 rounded-2xl bg-black/70 border border-white/10 backdrop-blur-xl text-white text-sm font-semibold">
            {overlayMsg}
          </div>
        </div>
      ) : null}

      {/* Character */}
      {speaker ? (
        <div className="absolute inset-x-0 bottom-[220px] md:bottom-[240px] flex items-center justify-center z-20 pointer-events-none">
          <div className="relative animate-fade-in">
            <div className="absolute inset-0 rounded-full blur-2xl opacity-30" style={{ backgroundColor: speaker.color }} />
            {avatar ? (
              <img src={avatar} alt={speaker.name} className="relative w-28 h-28 md:w-32 md:h-32 rounded-full border-2 border-white/20 shadow-2xl" />
            ) : (
              <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full border-2 border-white/20 shadow-2xl bg-white/5" />
            )}
          </div>
        </div>
      ) : null}

      {/* Dialogue */}
      <div className="absolute bottom-0 left-0 right-0 z-40 safe-bottom">
        <div className="p-4 md:p-6">
          <div className="max-w-5xl mx-auto">
            {speaker?.name ? (
              <div className="mb-2 ml-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-t-xl bg-black/60 border border-white/10">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: speaker.color }} />
                  <span className="text-xs font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {speaker.name}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="relative bg-black/80 border border-white/10 rounded-2xl p-5 md:p-6 min-h-[170px] backdrop-blur-xl">
              <div className={`text-lg md:text-xl leading-relaxed ${view.isCE ? 'text-emerald-100' : 'text-white'}`} style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
                {typedText}
                {!typedDone ? <span className="inline-block w-2">▍</span> : null}
              </div>

              {/* ✅ BUTTON ALIGN FIX HERE */}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {view.isCE ? (
                    <button
                      onClick={async (e) => {
                        e.preventDefault(); e.stopPropagation();
                        await unlock(); await sfx('tap');
                        if (!typedDone) { typedSkip(); return; }
                        dispatch({ type: AT.PRESS });
                        if (view.stmt?.pressQ) doOverlay(view.stmt.pressQ);
                      }}
                      disabled={!pressable}
                      className="h-11 px-4 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 border border-emerald-400/30 font-semibold flex items-center gap-2 disabled:opacity-40"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      <Search className="w-4 h-4" />
                      추궁
                    </button>
                  ) : null}

                  <button
                    onClick={async (e) => {
                      e.preventDefault(); e.stopPropagation();
                      await unlock(); await sfx('tap');
                      if (!typedDone) { typedSkip(); return; }
                      setEvidenceOpen(true);
                      dispatch({ type: AT.OPEN_EVIDENCE });
                    }}
                    className="h-11 px-4 rounded-xl bg-amber-600/80 hover:bg-amber-500 border border-amber-400/30 font-semibold flex items-center gap-2"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    <FileText className="w-4 h-4" />
                    증거
                  </button>

                  <button
                    onClick={async (e) => {
                      e.preventDefault(); e.stopPropagation();
                      await unlock(); await sfx('tap');
                      dispatch({ type: AT.RESET });
                      doOverlay('리셋했습니다.');
                    }}
                    className="h-11 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold flex items-center gap-2"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    <RotateCcw className="w-4 h-4" />
                    리셋
                  </button>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={async (e) => { e.preventDefault(); e.stopPropagation(); await onPrev(); }}
                    className="h-11 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold flex items-center gap-2"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    <ChevronLeft className="w-5 h-5" />
                    이전
                  </button>

                  <button
                    onClick={async (e) => { e.preventDefault(); e.stopPropagation(); await onNext(); }}
                    className="h-11 px-5 rounded-xl bg-white text-black font-black flex items-center gap-2"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    다음
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {view.hint ? <div className="mt-3 text-xs text-gray-400">{view.hint}</div> : null}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <EvidenceModal
        open={evidenceOpen && state.evidenceOpen}
        onClose={async () => { await unlock(); await sfx('tap'); setEvidenceOpen(false); dispatch({ type: AT.CLOSE_EVIDENCE }); }}
        inventory={state.inv}
        evidenceMap={game.evidence}
        hint={view.hint}
        onPresent={(key) => doPresent(key)}
        onExamine={(key) => { setExamineKey(key); setExamineOpen(true); }}
        onOpenCombine={() => setCombineOpen(true)}
      />

      <CombineModal
        open={combineOpen}
        onClose={() => { setCombineOpen(false); setCombineA(null); setCombineB(null); }}
        inventory={state.inv}
        evidenceMap={game.evidence}
        a={combineA}
        b={combineB}
        onPickA={(k) => setCombineA(k)}
        onPickB={(k) => setCombineB(k)}
        onApply={applyCombine}
      />

      <ExamineModal
        open={examineOpen}
        onClose={() => { setExamineOpen(false); setExamineKey(null); }}
        evidenceKey={examineKey}
        evidence={examineKey ? game.evidence[examineKey] : null}
        onFound={onHotspotFound}
      />

      <SaveLoadModal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        onSave={onSave}
        onLoad={onLoad}
        onDelete={onDelete}
      />
    </div>
  );
                       }
