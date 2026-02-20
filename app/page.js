'use client';

import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Scale,
  AlertCircle,
  FileText,
  Search,
  ChevronRight,
  Volume2,
  VolumeX,
  RotateCcw,
  HardDrive,
  FolderOpen,
  Trash2,
  ShieldAlert,
  Save,
} from 'lucide-react';

/* =========================================================
   app/page.js — SINGLE FILE (RUNNABLE)
   - JSON DSL(GAME_DB) 기반 VN + 재판 엔진
   - talk / scene / anim / trial(=cross_exam)
   - Press → evolveOnPress (증언 갱신)
   - Evidence Present (약점 문장에 제시)
   - Evidence Examine (hotspots)
   - Evidence Combine (req 2개 → result)
   - Save/Load 3 slots (localStorage)
   - UI: safe-area, 가림/끊김 최소화
========================================================= */

/* =========================
   0) Global CSS
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
@keyframes slideUp{from{transform:translateY(18px);opacity:0}to{transform:translateY(0);opacity:1}}
.animate-slide-up{animation:slideUp .28s cubic-bezier(.16,1,.3,1)}
`;

/* =========================
   1) Utils
========================= */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;

function ensureSentence(text) {
  const s = String(text ?? '').trim();
  if (!s) return s;
  const last = s[s.length - 1];
  const has = last === '.' || last === '!' || last === '?' || last === '…';
  return has ? s : s + '.';
}
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/* =========================
   2) LocalStorage Save
========================= */
const SAVE_NS = 'ACEVN_GAME_DB_SAVE';
const saveKey = (slot) => `${SAVE_NS}::slot::${slot}`;

function safeJSONParse(s, fb = null) {
  try {
    return JSON.parse(s);
  } catch {
    return fb;
  }
}
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
   3) Asset Audio (optional)
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

  const unlock = async () => {
    if (unlockedRef.current) return true;
    unlockedRef.current = true;
    try {
      const t = new Audio();
      t.muted = true;
      await t.play().catch(() => {});
      t.pause();
      return true;
    } catch {
      return false;
    }
  };

  const setMuted = async (m) => {
    mutedRef.current = !!m;
    const cur = bgmCurRef.current.audio;
    if (cur) cur.volume = mutedRef.current ? 0 : cur.volume;
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
      try {
        prev.pause();
      } catch {}
      try {
        prev.currentTime = 0;
      } catch {}
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
      if (a.paused || a.ended) {
        picked = a;
        break;
      }
    }
    try {
      picked.volume = vol;
      try {
        picked.currentTime = 0;
      } catch {}
      await picked.play();
      return true;
    } catch {
      return false;
    }
  };

  return { unlock, setMuted, playBgm, playSfx };
}

/* =========================
   4) GAME_DB (Episode 1 + Trial 1 script)
========================= */
const GAME_DB = {
  meta: {
    title: '에피소드 1: 단선된 진실 (The Severed Truth)',
    description:
      '90년대 장기 미제 유괴·협박 사건의 목소리 트릭과 알리바이 조작 요소를, 스마트 시티 인프라(도어락 로그·스마트워치·CCTV 프레임 드롭·AI 음성 분류·전력 데이터)로 재해석한 가상의 사건. 흑막은 직접 언급되지 않고 입막음 방식과 조작 흔적만 남긴다.',
  },
  backgrounds: {
    court: 'bg-gradient-to-b from-slate-950 via-slate-900 to-black',
    hall: 'bg-gradient-to-b from-slate-900 to-slate-800',
    server: 'bg-gradient-to-br from-slate-900 via-indigo-950 to-black',
    tense: 'bg-gradient-to-br from-red-950 to-slate-900',
    ending: 'bg-gradient-to-br from-slate-950 via-slate-900 to-black',
  },
  bgm: {
    trial: { type: 'square', freq: 210, rate: 0.33, depth: 9, volume: 0.02 },
    tense: { type: 'triangle', freq: 240, rate: 0.22, depth: 7, volume: 0.025 },
    victory: { type: 'sine', freq: 420, rate: 0.11, depth: 3, volume: 0.025 },
  },
  characters: {
    judge: { name: '마판사', color: '#6B7280', desc: '절차주의. 말이 짧다. 말버릇: 핵심만.' },
    player: { name: '진무연', color: '#2563EB', desc: '직관과 논리를 선으로 연결하는 변호사. 말버릇: 선이 연결됐어.' },
    prosecutor: { name: '류시온', color: '#DC2626', desc: '데이터 맹신 검사. 말버릇: 오차율 0%입니다.' },
    witness1: {
      name: '박경비',
      color: '#10B981',
      avatars: {
        normal:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%2310B981'/%3E%3Ctext x='50' y='62' font-size='28' text-anchor='middle' fill='white'%3E경비%3C/text%3E%3C/svg%3E",
        sweat:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%23F59E0B'/%3E%3Ctext x='50' y='62' font-size='34' text-anchor='middle' fill='white'%3E😰%3C/text%3E%3C/svg%3E",
        crazy:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%23991B1B'/%3E%3Ctext x='50' y='62' font-size='34' text-anchor='middle' fill='white'%3E🤯%3C/text%3E%3C/svg%3E",
      },
      desc: '사람 좋은 척하지만 빚에 쪼들린 경비원. 몰리면 아니유가 튀어나온다.',
    },
    witness2: {
      name: '최실장',
      color: '#8B5CF6',
      avatars: {
        normal:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%238B5CF6'/%3E%3Ctext x='50' y='62' font-size='28' text-anchor='middle' fill='white'%3EIT%3C/text%3E%3C/svg%3E",
        sweat:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%23F59E0B'/%3E%3Ctext x='50' y='62' font-size='34' text-anchor='middle' fill='white'%3E😰%3C/text%3E%3C/svg%3E",
        crazy:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%23991B1B'/%3E%3Ctext x='50' y='62' font-size='34' text-anchor='middle' fill='white'%3E😈%3C/text%3E%3C/svg%3E",
      },
      desc: 'IT 총괄. 말버릇: 로그가 말해요. 몰리면 웃음으로 넘기다 갑자기 차가워진다.',
    },
    witness3: {
      name: '윤기사',
      color: '#06B6D4',
      avatars: {
        normal:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%2306B6D4'/%3E%3Ctext x='50' y='62' font-size='28' text-anchor='middle' fill='white'%3E기사%3C/text%3E%3C/svg%3E",
        sweat:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%23F59E0B'/%3E%3Ctext x='50' y='62' font-size='34' text-anchor='middle' fill='white'%3E😰%3C/text%3E%3C/svg%3E",
        crazy:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%23991B1B'/%3E%3Ctext x='50' y='62' font-size='34' text-anchor='middle' fill='white'%3E😡%3C/text%3E%3C/svg%3E",
      },
      desc: '시설 관리 기사. 말버릇: 전기는 거짓말 안 해요. 몰리면 냉소가 튀어나온다.',
    },
  },
  evidence: {
    autopsy: { name: '검시 소견서', icon: '🧾', desc: '피해자 윤비서의 사인은 둔기성 두부 손상. 사망 추정 시각 21:00.' },
    smartwatch_data: { name: '피해자 스마트워치', icon: '⌚', desc: '심박이 20:45:12 급상승 후 20:45:19 급정지. 이후 움직임 없음.' },
    server_log: { name: '서버실 도어락 로그', icon: '🚪', desc: "20:55~21:05 동안 '잠김 유지'. '열림' 이벤트 없음." },
    hall_cctv: { name: '복도 CCTV 캡처', icon: '📹', desc: '21:00 전후 복도에 누군가 스쳐 지나가지만 프레임 드롭으로 얼굴이 깨진다.' },
    power_spike: { name: '랙 전력 급등 기록', icon: '🔌', desc: '20:45:12 서버랙 전력 급등. 0.2초 과전류 보호가 작동했다.' },
    voice_print: { name: '서버실 인터폰 음성 로그', icon: '🎙️', desc: "20:59 '문 열어' 음성. 발화자 분류가 윤비서로 찍혀 있다." },
    server_blade: {
      name: '피 묻은 서버 블레이드',
      icon: '🔪',
      desc: '현장에 떨어진 금속 부품. 손잡이에서 박경비 지문 검출.',
      examine: {
        bg: 'bg-slate-800 text-gray-200',
        content:
          "[압수품: 서버 블레이드 제1호]\n무게 3.5kg 금속 부품.\n손잡이 혈흔 다량.\n끝부분 변색이 이상하다.",
        hotspots: [
          {
            id: 'burn_mark',
            x: 78,
            y: 38,
            width: 16,
            height: 22,
            resultEvidenceKey: 'electric_burn',
            successMsg: '끝부분이 국부 용융됐다. 혈흔이 아니라 고전압 스파크 흔적이다.',
          },
        ],
      },
    },
    electric_burn: { name: '블레이드의 탄 자국', icon: '⚡', desc: '고전압 스파크에 의한 용융 자국. 금속 표면이 녹아내렸다.' },
    real_time_of_death: {
      name: '진짜 사망 시각 (20:45)',
      icon: '⏱️',
      desc: '스마트워치 심정지와 전력 급등이 20:45에 일치한다. 21:00 타격은 사후일 가능성이 크다.',
    },
    staged_accident: {
      name: '감전사 위장 정황',
      icon: '💀',
      desc: '피해자는 20:45 감전으로 즉사했고, 누군가 21:00 전후 두부 손상을 추가해 살인으로 위장했다.',
    },
    evolved_voice_log: { name: '조작된 분류 정황', icon: '🧩', desc: "프레임 드롭과 분류 모델 편향으로 '윤비서 음성' 태깅이 틀릴 수 있다." },
  },
  combinations: [
    {
      req: ['autopsy', 'smartwatch_data'],
      result: 'real_time_of_death',
      successMsg: '심정지(20:45)가 진짜 사망 시각이다. 21:00의 타격은 사후일 가능성이 생겼다.',
    },
    {
      req: ['real_time_of_death', 'electric_burn'],
      result: 'staged_accident',
      successMsg: '탄 자국과 20:45 심정지. 선이 연결됐다. 사인은 타살이 아니라 감전사다.',
    },
    {
      req: ['voice_print', 'hall_cctv'],
      result: 'evolved_voice_log',
      successMsg: '프레임 드롭과 음성 분류. 보이는 것과 태깅된 것은 다를 수 있다.',
    },
  ],
  cases: [
    {
      title: '제1화: 단선된 진실',
      apMax: 5,
      initialEvidence: ['autopsy', 'smartwatch_data', 'server_log', 'server_blade', 'voice_print', 'power_spike', 'hall_cctv'],
      script: [
        { type: 'scene', bgKey: 'court', bgmKey: 'trial' },
        { type: 'talk', charKey: 'judge', text: '개정합니다. 핵심만.' },
        { type: 'talk', charKey: 'prosecutor', text: '오차율 0%입니다. 21:00. 밀실. 둔기 타격.' },
        { type: 'talk', charKey: 'player', text: '선이 엉켰네요. 풀어보죠.' },

        {
          type: 'trial',
          title: '박경비의 목격 증언',
          witnessCharKey: 'witness1',
          bgKey: 'hall',
          statements: [
            { id: 'w1_01', text: '21:00 정각, 누가 서버실 쪽에서 튀어나왔슈.' },
            {
              id: 'w1_02',
              text: '손에 피 묻은 블레이드를 들고 있었구먼.',
              pressQ: '피를 봤다?',
              press: [
                { charKey: 'player', text: '거리랑 조명. 정확히.' },
                { charKey: 'witness1', face: 'sweat', text: '복도등이 깜빡였슈. 그래도 빨갛게… 보였슈.' },
              ],
            },
            {
              id: 'w1_03',
              text: '문이 열려 있었슈. 그래서 나왔다고 확신했슈.',
              pressQ: '문이 열렸다고요?',
              press: [
                { charKey: 'player', text: '도어락 로그는 봤어요?' },
                { charKey: 'witness1', face: 'sweat', text: '그건… 나중에… 들었슈.' },
              ],
              evolveOnPress: {
                newText: '문이 열렸다고 생각했슈. 나중에 로그가 잠겼다고 해서… 헷갈렸슈.',
                weakness: true,
                contradictionEvidenceKey: 'server_log',
                failMsg: '도어락 로그에 열림 이벤트가 있나?',
              },
            },
            {
              id: 'w1_04',
              text: '얼굴은 못 봤지만, 빨간 랜야드가 흔들렸슈.',
              pressQ: '얼굴도 못 봤는데 확정?',
              press: [
                { charKey: 'player', text: '확정은 금지죠.' },
                { charKey: 'witness1', face: 'sweat', text: "아니유. 그래서… '그럴 것 같다'였슈." },
              ],
            },
          ],
        },

        { type: 'anim', name: 'objection' },
        { type: 'talk', charKey: 'player', text: '이의 있습니다. 20:55부터 21:05까지 문은 열린 적이 없습니다.' },
        { type: 'talk', charKey: 'prosecutor', text: '시간 착각이죠. 20:55 이전에 들어가 잠복.' },
        { type: 'talk', charKey: 'player', text: '그럼 사망 시각부터 바꿔야겠네요.' },

        {
          type: 'trial',
          title: '류시온의 팩트 선언',
          witnessCharKey: 'prosecutor',
          bgKey: 'tense',
          statements: [
            {
              id: 'p_01',
              text: '사망 추정 시각은 21:00입니다. 흔들리지 않습니다.',
              weakness: true,
              contradictionEvidenceKey: 'real_time_of_death',
              failMsg: '두 단서를 조합해 진짜 사망 시각을 만들어야 한다.',
            },
          ],
        },

        { type: 'anim', name: 'objection' },
        { type: 'talk', charKey: 'player', text: '선이 연결됐어. 심정지는 20:45입니다.' },
        { type: 'talk', charKey: 'prosecutor', text: '…뭐죠, 그건.' },
        { type: 'talk', charKey: 'player', text: '21:00의 타격은 사후입니다.' },

        { type: 'talk', charKey: 'prosecutor', text: '좋아. 그럼 20:45의 사람.' },
        { type: 'talk', charKey: 'prosecutor', text: '박경비. 흉기 지문. 끝.' },

        { type: 'talk', charKey: 'witness1', face: 'crazy', text: '아니유! 난 만졌을 뿐이유! 겁나서…!' },
        { type: 'talk', charKey: 'judge', text: '다음 증인.' },

        {
          type: 'trial',
          title: '최실장의 은폐',
          witnessCharKey: 'witness2',
          bgKey: 'tense',
          statements: [
            { id: 'w2_01', text: '로그가 말해요. 20:45. 박경비 동선. 끝.' },
            {
              id: 'w2_02',
              text: '블레이드가 흉기입니다. 피가 증거예요.',
              pressQ: '피가 곧 살인?',
              press: [
                { charKey: 'player', text: '끝부분 변색은 봤나요?' },
                { charKey: 'witness2', face: 'sweat', text: '그건… 중요하지 않죠. 피가 더 중요하니까.' },
              ],
              evolveOnPress: {
                newText: '피가 묻은 흉기면 끝이에요. 다른 해석은 변명입니다.',
                weakness: true,
                contradictionEvidenceKey: 'staged_accident',
                failMsg: '탄 자국 + 진짜 사망 시각을 조합해 위장을 만들라.',
              },
            },
          ],
        },

        { type: 'anim', name: 'objection' },
        { type: 'talk', charKey: 'player', text: '이 사건의 본질은 살인이 아닙니다. 감전사입니다.' },
        { type: 'talk', charKey: 'prosecutor', text: '감전…?' },
        { type: 'talk', charKey: 'player', text: '20:45 전력 급등. 탄 자국. 심정지. 선이 맞아요.' },
        { type: 'talk', charKey: 'judge', text: '21:00의 타격은?' },
        { type: 'talk', charKey: 'player', text: '사후 위장입니다.' },

        { type: 'talk', charKey: 'witness2', face: 'crazy', text: '…재밌네요.' },
        { type: 'talk', charKey: 'player', text: '뭐가요.' },
        { type: 'talk', charKey: 'witness2', text: '알면… 불편해져요.' },

        {
          type: 'trial',
          title: '음성 로그의 함정',
          witnessCharKey: 'witness3',
          bgKey: 'server',
          statements: [
            { id: 'w3_01', text: '전기는 거짓말 안 해요. 사람은 해요.' },
            {
              id: 'w3_02',
              text: '20:59 인터폰. 윤비서 음성으로 분류됐죠.',
              pressQ: '윤비서는 20:45에 죽었다.',
              press: [
                { charKey: 'player', text: '그럼 태깅이 틀렸을 수도.' },
                { charKey: 'witness3', face: 'sweat', text: '분류는… 틀릴 수도 있어요. 프레임이 깨지면.' },
              ],
              evolveOnPress: {
                newText: '프레임 드롭이면 태깅이 틀릴 수 있어요. 목소리도 과거 샘플에 끌려가요.',
                weakness: true,
                contradictionEvidenceKey: 'evolved_voice_log',
                failMsg: 'CCTV 프레임 드롭과 음성 분류를 엮어 조작 가능성을 만들라.',
              },
            },
          ],
        },

        { type: 'talk', charKey: 'player', text: '즉, 윤비서 음성은 확정 증거가 아닙니다.' },
        { type: 'talk', charKey: 'prosecutor', text: '오차율 0%…라고 했던 내가, 틀릴 수도 있나.' },

        { type: 'talk', charKey: 'judge', text: '결론.' },
        { type: 'talk', charKey: 'player', text: '20:45 감전사. 21:00 위장. 로그는 조작 가능. 유죄는 못 갑니다.' },
        { type: 'talk', charKey: 'judge', text: '무죄.' },

        { type: 'talk', charKey: 'witness2', face: 'sweat', text: '…증언, 취소합니다.' },
        { type: 'talk', charKey: 'judge', text: '정숙!' },

        { type: 'scene', bgKey: 'ending', bgmKey: 'victory' },
        { type: 'talk', charKey: 'narrator', text: '법정 밖, 최실장은 발신자 없는 무음 전화를 받았다.' },
        { type: 'talk', charKey: 'narrator', text: '그는 통화를 하지 않았다. 고개만 끄덕였다.' },
        { type: 'talk', charKey: 'player', text: '선이… 끊겼어.' },
        { type: 'end', text: 'THE END' },
      ],
    },
  ],
};

/* =========================
   5) Compile DSL → runtime
========================= */
function compileGame(db) {
  const baseCase = db.cases?.[0];
  const script = baseCase?.script || [];
  const lines = [];

  for (const raw of script) {
    if (!raw || !raw.type) continue;

    if (raw.type === 'talk') {
      lines.push({
        type: 'talk',
        charKey: raw.charKey || 'narrator',
        text: ensureSentence(raw.text),
        face: raw.face || 'normal',
        bgKey: raw.bgKey || null,
      });
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
        text: ensureSentence(s.text),
        pressQ: s.pressQ ? ensureSentence(s.pressQ) : null,
        press: Array.isArray(s.press)
          ? s.press.map((p) => ({
              charKey: p.charKey || 'narrator',
              face: p.face || 'normal',
              text: ensureSentence(p.text),
            }))
          : [],
        evolveOnPress: s.evolveOnPress
          ? {
              newText: ensureSentence(s.evolveOnPress.newText),
              weakness: !!s.evolveOnPress.weakness,
              contradictionEvidenceKey: s.evolveOnPress.contradictionEvidenceKey || null,
              failMsg: s.evolveOnPress.failMsg ? ensureSentence(s.evolveOnPress.failMsg) : null,
            }
          : null,
        weakness: !!s.weakness,
        contradictionEvidenceKey: s.contradictionEvidenceKey || null,
        failMsg: s.failMsg ? ensureSentence(s.failMsg) : null,
      }));

      lines.push({
        type: 'cross_exam',
        title: raw.title || '심문',
        bgKey: raw.bgKey || 'court',
        witnessCharKey: raw.witnessCharKey || 'witness1',
        statements,
      });
      continue;
    }

    // fallback
    lines.push(raw);
  }

  const initialEvidence = baseCase?.initialEvidence || [];
  const apMax = baseCase?.apMax ?? 5;

  return {
    meta: db.meta,
    backgrounds: db.backgrounds,
    characters: db.characters,
    evidence: db.evidence,
    combinations: db.combinations || [],
    lines,
    initialEvidence,
    apMax,
    bgm: db.bgm,
  };
}

/* =========================
   6) State + Reducer
========================= */
const AT = {
  RESET: 'RESET',
  NEXT: 'NEXT',
  PRESS: 'PRESS',
  PRESS_NEXT: 'PRESS_NEXT',
  PRESENT: 'PRESENT',
  OPEN_EVIDENCE: 'OPEN_EVIDENCE',
  CLOSE_EVIDENCE: 'CLOSE_EVIDENCE',
  OPEN_COMBINE: 'OPEN_COMBINE',
  CLOSE_COMBINE: 'CLOSE_COMBINE',
  OPEN_EXAMINE: 'OPEN_EXAMINE',
  CLOSE_EXAMINE: 'CLOSE_EXAMINE',
  SELECT_COMBINE_A: 'SELECT_COMBINE_A',
  SELECT_COMBINE_B: 'SELECT_COMBINE_B',
  APPLY_COMBINE: 'APPLY_COMBINE',
  HYDRATE: 'HYDRATE',
};

function initialState(game) {
  return {
    idx: 0,
    bgKey: game.lines?.[0]?.bgKey || 'court',
    hpMax: game.apMax,
    hp: game.apMax,
    // inventory
    inv: Array.from(new Set(game.initialEvidence || [])),
    // trial
    ceIndex: 0,
    pressMode: false,
    pressIndex: 0,
    // ui
    evidenceOpen: false,
    combineOpen: false,
    examineOpen: false,
    examineKey: null,
    combineA: null,
    combineB: null,
    // evolve memory: stmtId -> evolved {text, weakness,...}
    evolved: {},
    // end flags
    ending: false,
    gameOver: false,
  };
}

function reducer(game, state, action) {
  const lines = game.lines || [];
  const line = lines[state.idx];

  const getStatement = () => {
    if (!line || line.type !== 'cross_exam') return null;
    const s = line.statements?.[state.ceIndex] || null;
    if (!s) return null;
    // if evolved exists, merge
    const ev = state.evolved?.[s.id];
    if (ev) {
      return { ...s, ...ev, isEvolved: true };
    }
    return s;
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

    case AT.OPEN_COMBINE:
      return { ...state, combineOpen: true };
    case AT.CLOSE_COMBINE:
      return { ...state, combineOpen: false, combineA: null, combineB: null };

    case AT.OPEN_EXAMINE:
      return { ...state, examineOpen: true, examineKey: action.key || null };
    case AT.CLOSE_EXAMINE:
      return { ...state, examineOpen: false, examineKey: null };

    case AT.SELECT_COMBINE_A:
      return { ...state, combineA: action.key || null };
    case AT.SELECT_COMBINE_B:
      return { ...state, combineB: action.key || null };

    case AT.APPLY_COMBINE: {
      const a = state.combineA;
      const b = state.combineB;
      if (!a || !b) return state;
      const req = [a, b].sort().join('::');

      const hit = (game.combinations || []).find((c) => {
        const rr = (c.req || []).slice().sort().join('::');
        return rr === req;
      });

      if (!hit) return { ...state, combineOpen: false, combineA: null, combineB: null };

      const resultKey = hit.result;
      const inv = new Set(state.inv);
      inv.add(resultKey);

      return {
        ...state,
        inv: Array.from(inv),
        combineOpen: false,
        combineA: null,
        combineB: null,
        // show overlay via ui event outside reducer
      };
    }

    case AT.PRESS: {
      if (!line || line.type !== 'cross_exam') return state;
      const s = getStatement();
      if (!s) return state;
      if (!s.press || !s.press.length) return state;
      return { ...state, pressMode: true, pressIndex: 0 };
    }

    case AT.PRESS_NEXT: {
      if (!state.pressMode) return state;
      const s = getStatement();
      const n = s?.press?.length || 0;
      if (n <= 0) return { ...state, pressMode: false, pressIndex: 0 };

      // if there is evolveOnPress and press is fully consumed, evolve then exit press
      const last = state.pressIndex >= n - 1;
      if (!last) return { ...state, pressIndex: state.pressIndex + 1 };

      // consume last press then evolve (if any)
      const evo = s?.evolveOnPress;
      if (evo) {
        const nextEvolved = { ...(state.evolved || {}) };
        nextEvolved[s.id] = {
          text: evo.newText,
          weakness: !!evo.weakness,
          contradictionEvidenceKey: evo.contradictionEvidenceKey,
          failMsg: evo.failMsg,
        };
        return { ...state, evolved: nextEvolved, pressMode: false, pressIndex: 0 };
      }

      return { ...state, pressMode: false, pressIndex: 0 };
    }

    case AT.PRESENT: {
      if (!line || line.type !== 'cross_exam') return state;
      const s = getStatement();
      if (!s) return state;

      // require weakness to be true to allow solve
      const isWeak = !!s.weakness;
      const correctKey = s.contradictionEvidenceKey;
      const presented = action.key;

      if (isWeak && correctKey && presented === correctKey) {
        // solved this trial segment: advance to next line
        const nextIdx = clamp(state.idx + 1, 0, lines.length - 1);
        const nextLine = lines[nextIdx];
        return {
          ...state,
          idx: nextIdx,
          bgKey: nextLine?.bgKey || state.bgKey,
          ceIndex: 0,
          pressMode: false,
          pressIndex: 0,
          evidenceOpen: false,
        };
      }

      // wrong: hp down
      const hp = Math.max(0, state.hp - 1);
      return { ...state, hp, gameOver: hp <= 0 };
    }

    case AT.NEXT: {
      if (state.ending || state.gameOver) return state;

      // if press mode, next means press-next
      if (state.pressMode) return reducer(game, state, { type: AT.PRESS_NEXT });

      if (!line) return state;

      if (line.type === 'scene') {
        // auto-advance to next line; bgKey already set by scene
        const nextIdx = clamp(state.idx + 1, 0, lines.length - 1);
        const nextLine = lines[nextIdx];
        return { ...state, idx: nextIdx, bgKey: nextLine?.bgKey || line.bgKey || state.bgKey };
      }

      if (line.type === 'anim') {
        const nextIdx = clamp(state.idx + 1, 0, lines.length - 1);
        const nextLine = lines[nextIdx];
        return { ...state, idx: nextIdx, bgKey: nextLine?.bgKey || state.bgKey };
      }

      if (line.type === 'end') {
        return { ...state, ending: true };
      }

      if (line.type === 'cross_exam') {
        const total = line.statements?.length || 0;
        if (total <= 0) {
          const nextIdx = clamp(state.idx + 1, 0, lines.length - 1);
          const nextLine = lines[nextIdx];
          return { ...state, idx: nextIdx, bgKey: nextLine?.bgKey || state.bgKey, ceIndex: 0 };
        }
        const last = state.ceIndex >= total - 1;
        if (last) {
          // block if unresolved weaknesses exist
          const weakIdx = (line.statements || []).map((st, i) => ({ st, i })).filter(({ st }) => {
            const ev = state.evolved?.[st.id];
            const merged = ev ? { ...st, ...ev } : st;
            return !!merged.weakness;
          });
          if (weakIdx.length > 0) {
            // keep at first weak
            return { ...state, ceIndex: weakIdx[0].i };
          }
          // no weak: advance
          const nextIdx = clamp(state.idx + 1, 0, lines.length - 1);
          const nextLine = lines[nextIdx];
          return { ...state, idx: nextIdx, bgKey: nextLine?.bgKey || state.bgKey, ceIndex: 0 };
        }
        return { ...state, ceIndex: state.ceIndex + 1 };
      }

      // talk
      const nextIdx = clamp(state.idx + 1, 0, lines.length - 1);
      const nextLine = lines[nextIdx];
      return { ...state, idx: nextIdx, bgKey: nextLine?.bgKey || state.bgKey };
    }

    default:
      return state;
  }
}

/* =========================
   7) Runtime selectors
========================= */
function pickAvatar(char, face) {
  const a = char?.avatars || {};
  return a?.[face] || a?.normal || null;
}

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
    if (line?.type === 'talk') return line.charKey || 'narrator';
    return 'narrator';
  })();

  const speaker = chars[speakerKey] || chars.narrator;
  const face = pressItem?.face || (line?.type === 'talk' ? line.face : 'normal');

  const text = (() => {
    if (state.pressMode && pressItem?.text) return pressItem.text;
    if (isCE) return stmt?.text || '';
    if (line?.type === 'talk') return line.text || '';
    if (line?.type === 'end') return line.text || 'THE END';
    return '';
  })();

  const hint = (() => {
    if (!isCE) return '';
    if (stmt?.weakness) return stmt?.failMsg || '약한 문장이다. 증거를 제시해라.';
    return '';
  })();

  return {
    line,
    bgKey,
    bgClass,
    isCE,
    ceTitle: isCE ? line.title : '',
    ceIndex: isCE ? state.ceIndex : 0,
    ceTotal: isCE ? (line.statements?.length || 0) : 0,
    witnessKey: isCE ? line.witnessCharKey : null,
    stmt,
    speakerKey,
    speaker,
    face,
    avatar: pickAvatar(speaker, face),
    text,
    hint,
  };
}

/* =========================
   8) UI Components
========================= */
function Pill({ children }) {
  return <div className="px-4 py-2 rounded-full border border-white/10 bg-black/45 backdrop-blur-md">{children}</div>;
}

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

function EvidenceModal({
  open,
  onClose,
  inventory,
  evidenceMap,
  admittedSet,
  onPresent,
  onExamine,
  onOpenCombine,
  onOpenAdmission,
  hint,
}) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="증거"
      icon={<FileText className="w-5 h-5 text-amber-300" />}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
            {hint || ''}
          </div>
          <div className="flex gap-2">
            <button onClick={onOpenCombine} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
              조합
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
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
          const admitted = admittedSet.has(key);
          return (
            <div key={key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start gap-4">
                <div className="text-4xl">{ev.icon || '🗂️'}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-base font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {ev.name}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full border ${admitted ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-black/20 text-gray-200'}`}>
                      {admitted ? '채택' : '미채택'}
                    </span>
                    <span className="text-xs font-mono px-2 py-1 rounded-full bg-black/30 border border-white/10 text-gray-300">
                      {key}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-300 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {ev.desc}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 justify-end">
                {ev.examine ? (
                  <button onClick={() => onExamine(key)} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
                    조사
                  </button>
                ) : null}
                <button onClick={() => onOpenAdmission(key)} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
                  채택
                </button>
                <button
                  onClick={() => onPresent(key)}
                  className="px-4 py-2 rounded-xl bg-amber-600/80 hover:bg-amber-500 border border-amber-400/30 font-semibold"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
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
          <div className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
            두 개를 골라 조합하라.
          </div>
          <div className="flex gap-2">
            <button onClick={onApply} className="px-4 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 border border-emerald-400/30 font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
              조합
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
              닫기
            </button>
          </div>
        </div>
      }
    >
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-2 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
          <span className="text-gray-300">A:</span>
          <span className="text-white font-semibold">{a ? evidenceMap[a]?.name || a : '선택'}</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-300">B:</span>
          <span className="text-white font-semibold">{b ? evidenceMap[b]?.name || b : '선택'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {inventory.map((key) => {
          const ev = evidenceMap[key];
          if (!ev) return null;
          const selectedA = a === key;
          const selectedB = b === key;
          return (
            <button
              key={key}
              onClick={() => {
                if (!a || selectedA) onPickA(key);
                else if (!b || selectedB) onPickB(key);
                else onPickB(key);
              }}
              className={`p-4 rounded-2xl border text-left transition ${
                selectedA || selectedB ? 'bg-amber-500/10 border-amber-400/30' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{ev.icon || '🗂️'}</div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {ev.name}
                  </div>
                  <div className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {ev.desc}
                  </div>
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
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
            닫기
          </button>
        </div>
      }
    >
      <div className={`rounded-2xl border border-white/10 p-4 ${ex.bg || 'bg-white/5 text-gray-200'}`}>
        <pre className="whitespace-pre-wrap text-sm leading-relaxed" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
          {ex.content}
        </pre>

        <div className="relative mt-4 w-full aspect-[16/9] rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
          {/* hotspots use percentage-like coordinates but are given as 0..100-ish */}
          {hotspots.map((h) => (
            <button
              key={h.id}
              onClick={() => onFound(h)}
              className="absolute border border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl transition"
              style={{
                left: `${h.x}%`,
                top: `${h.y}%`,
                width: `${h.width}%`,
                height: `${h.height}%`,
              }}
              aria-label={h.id}
            />
          ))}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-3 left-3 text-xs text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>
            핫스팟을 눌러 단서를 찾아라.
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function AdmissionModal({ open, onClose, evidenceKey, evidence, admission, onOffer, onAdmit, onDeny }) {
  if (!open || !evidenceKey) return null;
  const admitted = admission.admitted.has(evidenceKey);
  const denied = admission.denied.has(evidenceKey);
  const pending = Array.from(admission.pending.values()).find((r) => r.evidenceKey === evidenceKey) || null;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="증거 채택"
      icon={<ShieldAlert className="w-5 h-5 text-amber-300" />}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
            닫기
          </button>
        </div>
      }
    >
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start gap-4">
          <div className="text-4xl">{evidence?.icon || '🗂️'}</div>
          <div className="min-w-0">
            <div className="text-lg font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
              {evidence?.name || evidenceKey}
              <span className="ml-2 text-xs font-mono text-gray-400">{evidenceKey}</span>
            </div>
            <div className="mt-2 text-sm text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>
              {evidence?.desc || ''}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
              <span className={`px-2 py-1 rounded-full border ${admitted ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : denied ? 'border-rose-400/30 bg-rose-500/10 text-rose-200' : 'border-white/10 bg-black/20 text-gray-200'}`}>
                {admitted ? '채택됨' : denied ? '기각됨' : pending ? '심리중' : '미신청'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onOffer} disabled={!!pending || admitted || denied} className="px-4 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-500 border border-blue-400/30 font-semibold disabled:opacity-40">
          신청
        </button>
        <button onClick={onAdmit} disabled={!pending} className="px-4 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 border border-emerald-400/30 font-semibold disabled:opacity-40">
          채택
        </button>
        <button onClick={onDeny} disabled={!pending} className="px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-500 border border-rose-400/30 font-semibold disabled:opacity-40">
          기각
        </button>
      </div>

      {denied ? (
        <div className="mt-4 text-sm text-rose-200 bg-rose-500/10 border border-rose-400/20 rounded-2xl p-4">
          기각 사유: {admission.denied.get(evidenceKey)?.rationale || 'denied'}
        </div>
      ) : null}
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
    <ModalShell
      open={open}
      onClose={onClose}
      title="세이브/로드"
      icon={<HardDrive className="w-5 h-5 text-gray-200" />}
    >
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
              <button
                disabled={busy != null}
                onClick={() => run(slot, onSave, '저장 완료', '저장 실패')}
                className="px-3 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-500 border border-blue-400/30 font-semibold disabled:opacity-40"
              >
                <span className="inline-flex items-center gap-2"><Save className="w-4 h-4" />저장</span>
              </button>
              <button
                disabled={busy != null}
                onClick={() => run(slot, onLoad, '로드 완료', '로드 실패')}
                className="px-3 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 border border-emerald-400/30 font-semibold disabled:opacity-40"
              >
                <span className="inline-flex items-center gap-2"><FolderOpen className="w-4 h-4" />로드</span>
              </button>
              <button
                disabled={busy != null}
                onClick={() => run(slot, onDelete, '삭제 완료', '삭제 실패')}
                className="px-3 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-500 border border-rose-400/30 font-semibold disabled:opacity-40"
              >
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
   9) Page
========================= */
export default function Page() {
  const audio = useAudioBus();

  const game = useMemo(() => compileGame(GAME_DB), []);
  const [state, dispatch] = useReducer((s, a) => reducer(game, s, a), undefined, () => initialState(game));
  const view = useMemo(() => deriveView(game, state), [game, state]);

  // ui overlay
  const [muted, setMuted] = useState(false);
  const [bgUrl, setBgUrl] = useState(null);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [overlayMsg, setOverlayMsg] = useState(null);
  const [effectText, setEffectText] = useState(null);

  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [combineOpen, setCombineOpen] = useState(false);
  const [examineOpen, setExamineOpen] = useState(false);
  const [admissionOpen, setAdmissionOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const [examineKey, setExamineKey] = useState(null);
  const [admissionKey, setAdmissionKey] = useState(null);

  // admission state: basic (manual)
  const [admission, setAdmission] = useState(() => {
    const a = { admitted: new Set(), denied: new Map(), pending: new Map() };
    // 기본은 “초기 증거”는 채택되어 있다고 가정(플레이 막힘 방지)
    for (const k of game.initialEvidence || []) a.admitted.add(k);
    return a;
  });

  const [combineA, setCombineA] = useState(null);
  const [combineB, setCombineB] = useState(null);

  const doShake = (ms = 320) => (setShake(true), setTimeout(() => setShake(false), ms));
  const doFlash = (ms = 140) => (setFlash(true), setTimeout(() => setFlash(false), ms));
  const doOverlay = (t, ms = 1000) => (setOverlayMsg(t), setTimeout(() => setOverlayMsg(null), ms));
  const doEffect = (t, ms = 850) => (setEffectText(t), setTimeout(() => setEffectText(null), ms));

  // bg update (image optional)
  useEffect(() => {
    // optional: you can map bgKey to image if you place files
    // example mapping: /assets/bg/<bgKey>.webp
    const candidate = `/assets/bg/${view.bgKey}.webp`;
    preloadImage(candidate).then((ok) => setBgUrl(ok ? candidate : null));
  }, [view.bgKey]);

  // bgm update (optional if you place files: /assets/bgm/<key>.ogg)
  useEffect(() => {
    const line = view.line;
    if (!line || line.type !== 'scene') return;
    if (!line.bgmKey) return;
    const url = `/assets/bgm/${line.bgmKey}.ogg`;
    audio.playBgm(line.bgmKey, url).catch(() => {});
  }, [view.line?.type, view.line?.bgmKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    audio.setMuted(muted).catch(() => {});
  }, [muted]); // eslint-disable-line react-hooks/exhaustive-deps

  const unlock = async () => {
    await audio.unlock();
  };
  const sfx = async (k) => {
    // optional sfx file
    const url = `/assets/sfx/${k}.ogg`;
    await audio.playSfx(k, url).catch(() => {});
  };

  // scene auto-advance
  useEffect(() => {
    if (view.line?.type === 'scene') {
      dispatch({ type: AT.NEXT });
    }
  }, [view.line?.type]); // eslint-disable-line react-hooks/exhaustive-deps

  // anim auto effect
  useEffect(() => {
    if (view.line?.type === 'anim') {
      if (view.line.name === 'objection') {
        doEffect('OBJECTION!');
        doFlash();
        sfx('objection');
      } else if (view.line.name === 'flash') {
        doFlash();
        sfx('flash');
      } else {
        doFlash();
      }
      dispatch({ type: AT.NEXT });
    }
  }, [view.line?.type]); // eslint-disable-line react-hooks/exhaustive-deps

  // helpers for present
  const doPresent = async (key) => {
    await unlock();
    await sfx('flash');
    doFlash();

    const prevHp = state.hp;
    dispatch({ type: AT.PRESENT, key });

    setTimeout(async () => {
      if (state.hp < prevHp) {
        doShake();
        doOverlay('틀렸다.');
        await sfx('fail');
      } else {
        doEffect('OBJECTION!');
        doOverlay('모순이다.');
        await sfx('objection');
      }
    }, 80);
  };

  // combine apply
  const applyCombine = async () => {
    const a = combineA;
    const b = combineB;
    if (!a || !b) {
      doOverlay('두 개를 골라라.');
      return;
    }
    const req = [a, b].sort().join('::');
    const hit = (game.combinations || []).find((c) => (c.req || []).slice().sort().join('::') === req);

    setCombineOpen(false);
    setCombineA(null);
    setCombineB(null);

    if (!hit) {
      doOverlay('아무 일도 없다.');
      return;
    }

    const resultKey = hit.result;
    if (!state.inv.includes(resultKey)) {
      const inv = Array.from(new Set([...state.inv, resultKey]));
      const nextState = { ...state, inv };
      dispatch({ type: AT.HYDRATE, state: nextState });
    }
    doOverlay(hit.successMsg || '새로운 단서가 생겼다.');
    await sfx('admit');
  };

  // examine found
  const onHotspotFound = async (h) => {
    if (!h?.resultEvidenceKey) return;
    const key = h.resultEvidenceKey;
    if (!state.inv.includes(key)) {
      const inv = Array.from(new Set([...state.inv, key]));
      dispatch({ type: AT.HYDRATE, state: { ...state, inv } });
    }
    doOverlay(h.successMsg || '단서를 찾았다.');
    await sfx('admit');
  };

  // admission ops
  const openAdmission = (key) => {
    setAdmissionKey(key);
    setAdmissionOpen(true);
  };
  const offerAdmission = () => {
    if (!admissionKey) return;
    const res = requestAdmission(admission, admissionKey);
    setAdmission(res.state);
    doOverlay('신청했다.');
  };
  const admitEvidence = () => {
    if (!admissionKey) return;
    const req = Array.from(admission.pending.values()).find((r) => r.evidenceKey === admissionKey);
    if (!req) return;
    const next = ruleAdmission(admission, req.requestId, 'ADMIT');
    setAdmission(next);
    doOverlay('채택됐다.');
  };
  const denyEvidence = () => {
    if (!admissionKey) return;
    const req = Array.from(admission.pending.values()).find((r) => r.evidenceKey === admissionKey);
    if (!req) return;
    const next = ruleAdmission(admission, req.requestId, 'DENY');
    setAdmission(next);
    doOverlay('기각됐다.');
  };

  // save/load
  const onSave = async (slot) => {
    const blob = {
      schema: 1,
      savedAt: new Date().toISOString(),
      state,
      admission: {
        admitted: Array.from(admission.admitted.values()),
        denied: Array.from(admission.denied.entries()),
        pending: Array.from(admission.pending.entries()),
      },
      combine: { a: combineA, b: combineB },
    };
    const res = lsSave(slot, blob);
    return { ok: res.ok, msg: res.ok ? `슬롯 ${slot} 저장 완료` : `저장 실패: ${res.reason}` };
  };
  const onLoad = async (slot) => {
    const res = lsLoad(slot);
    if (!res.ok) return { ok: false, msg: `로드 실패: ${res.reason}` };
    const data = res.data;
    if (data?.state) dispatch({ type: AT.HYDRATE, state: data.state });
    if (data?.admission) {
      setAdmission({
        admitted: new Set(data.admission.admitted || []),
        denied: new Map(data.admission.denied || []),
        pending: new Map(data.admission.pending || []),
      });
    }
    setCombineA(data?.combine?.a || null);
    setCombineB(data?.combine?.b || null);
    return { ok: true, msg: `슬롯 ${slot} 로드 완료` };
  };
  const onDelete = async (slot) => {
    const res = lsDelete(slot);
    return { ok: res.ok, msg: res.ok ? `슬롯 ${slot} 삭제 완료` : `삭제 실패: ${res.reason}` };
  };

  // end screens
  if (state.gameOver) {
    return (
      <div className={`min-h-screen ${GAME_DB.backgrounds.gameover || 'bg-gradient-to-br from-black via-red-950 to-slate-950'} text-white flex items-center justify-center p-6`}>
        <style jsx global>{GLOBAL_CSS}</style>
        <div className="w-full max-w-lg rounded-3xl bg-black/60 border border-white/10 backdrop-blur-xl p-8 text-center">
          <div className="text-6xl mb-4">💥</div>
          <div className="text-4xl font-bold mb-3" style={{ fontFamily: 'Crimson Pro, serif' }}>
            게임 오버
          </div>
          <div className="text-gray-300 mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
            페널티가 누적됐다.
          </div>
          <button
            onClick={() => {
              setAdmission(() => {
                const a = { admitted: new Set(), denied: new Map(), pending: new Map() };
                for (const k of game.initialEvidence || []) a.admitted.add(k);
                return a;
              });
              dispatch({ type: AT.RESET });
            }}
            className="px-6 py-3 rounded-xl bg-white text-black font-semibold"
          >
            다시 시작
          </button>
        </div>
      </div>
    );
  }

  if (state.ending) {
    return (
      <div className={`min-h-screen ${GAME_DB.backgrounds.ending} text-white flex items-center justify-center p-6`}>
        <style jsx global>{GLOBAL_CSS}</style>
        <div className="w-full max-w-2xl rounded-3xl bg-black/60 border border-white/10 backdrop-blur-xl p-8 text-center">
          <Scale className="w-20 h-20 mx-auto mb-5 text-blue-400" />
          <div className="text-6xl font-bold mb-3" style={{ fontFamily: 'Crimson Pro, serif' }}>
            {GAME_DB.meta.title}
          </div>
          <div className="text-gray-300 mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
            {GAME_DB.meta.description}
          </div>
          <button onClick={() => dispatch({ type: AT.RESET })} className="px-6 py-3 rounded-xl bg-white text-black font-semibold">
            다시하기
          </button>
        </div>
      </div>
    );
  }

  // top background
  const bgStyle = bgUrl
    ? { backgroundImage: `url(${bgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined;

  const admittedSet = admission.admitted instanceof Set ? admission.admitted : new Set();

  const speaker = view.speaker;
  const avatar = view.avatar;

  const pressable = view.isCE && !!view.stmt?.pressQ && (view.stmt?.press?.length || 0) > 0;
  const weakNow = !!view.stmt?.weakness;

  return (
    <div className={`h-screen w-full relative overflow-hidden ${view.bgClass} ${shake ? 'animate-shake' : ''}`} style={bgStyle}>
      <style jsx global>{GLOBAL_CSS}</style>

      {/* overlay */}
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
              <button
                onClick={async () => {
                  await unlock();
                  setSaveOpen(true);
                  await sfx('tap');
                }}
                className="w-11 h-11 rounded-full bg-black/45 border border-white/10 hover:border-white/20 backdrop-blur-md flex items-center justify-center"
                aria-label="save"
              >
                <HardDrive className="w-5 h-5 text-gray-200" />
              </button>

              <button
                onClick={async () => {
                  await unlock();
                  setMuted((m) => !m);
                  await sfx('tap');
                }}
                className="w-11 h-11 rounded-full bg-black/45 border border-white/10 hover:border-white/20 backdrop-blur-md flex items-center justify-center"
                aria-label="mute"
              >
                {muted ? <VolumeX className="w-5 h-5 text-gray-200" /> : <Volume2 className="w-5 h-5 text-gray-200" />}
              </button>

              <button
                onClick={async () => {
                  await unlock();
                  setEvidenceOpen(true);
                  dispatch({ type: AT.OPEN_EVIDENCE });
                  await sfx('tap');
                }}
                className="h-11 px-4 rounded-full bg-black/45 border border-white/10 hover:border-white/20 backdrop-blur-md flex items-center gap-2"
                aria-label="evidence"
              >
                <FileText className="w-5 h-5 text-amber-300" />
                <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {state.inv.length}/{Object.keys(game.evidence || {}).length}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* CE bar */}
        {view.isCE ? (
          <div className="px-4 mt-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-blue-950/70 border-blue-500/40 text-blue-200 backdrop-blur-md">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
                {view.ceTitle} · {view.ceIndex + 1}/{view.ceTotal} {weakNow ? '· 약점' : ''}
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

      {flash ? <div className="absolute inset-0 z-[50] bg-white/20 pointer-events-none" /> : null}

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
            {/* name tag */}
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

            <div
              onClick={async () => {
                await unlock();
                await sfx('tap');
                dispatch({ type: AT.NEXT });
              }}
              className="relative bg-black/80 border border-white/10 rounded-2xl p-5 md:p-6 min-h-[170px] backdrop-blur-xl cursor-pointer hover:border-white/20 transition"
            >
              <div className="text-lg md:text-xl text-white leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
                {view.text}
              </div>

              {/* actions inside box (no overlap) */}
              {view.isCE ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await unlock();
                      await sfx('tap');
                      dispatch({ type: AT.PRESS });
                      if (view.stmt?.pressQ) doOverlay(view.stmt.pressQ);
                    }}
                    disabled={!pressable}
                    className="px-4 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-500 border border-blue-400/30 font-semibold flex items-center gap-2 disabled:opacity-40"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    <Search className="w-4 h-4" />
                    추궁
                  </button>

                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await unlock();
                      await sfx('tap');
                      setEvidenceOpen(true);
                      dispatch({ type: AT.OPEN_EVIDENCE });
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-600/80 hover:bg-amber-500 border border-amber-400/30 font-semibold flex items-center gap-2"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    <FileText className="w-4 h-4" />
                    증거
                  </button>

                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await unlock();
                      await sfx('tap');
                      dispatch({ type: AT.RESET });
                      doOverlay('리셋');
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold flex items-center gap-2"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    <RotateCcw className="w-4 h-4" />
                    리셋
                  </button>
                </div>
              ) : null}

              <div className="absolute bottom-4 right-4 opacity-50 pointer-events-none">
                <ChevronRight className="w-6 h-6 animate-pulse" />
              </div>
            </div>

            {view.hint ? (
              <div className="mt-3 text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                {view.hint}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Evidence */}
      <EvidenceModal
        open={evidenceOpen && state.evidenceOpen}
        onClose={async () => {
          await unlock();
          await sfx('tap');
          setEvidenceOpen(false);
          dispatch({ type: AT.CLOSE_EVIDENCE });
        }}
        inventory={state.inv}
        evidenceMap={game.evidence}
        admittedSet={admittedSet}
        hint={view.hint}
        onPresent={(key) => doPresent(key)}
        onExamine={(key) => {
          setExamineKey(key);
          setExamineOpen(true);
        }}
        onOpenCombine={() => {
          setCombineOpen(true);
        }}
        onOpenAdmission={(key) => openAdmission(key)}
      />

      {/* Combine */}
      <CombineModal
        open={combineOpen}
        onClose={() => {
          setCombineOpen(false);
          setCombineA(null);
          setCombineB(null);
        }}
        inventory={state.inv}
        evidenceMap={game.evidence}
        a={combineA}
        b={combineB}
        onPickA={(k) => (k === combineB ? setCombineB(null) : null, setCombineA(k))}
        onPickB={(k) => (k === combineA ? setCombineA(null) : null, setCombineB(k))}
        onApply={applyCombine}
      />

      {/* Examine */}
      <ExamineModal
        open={examineOpen}
        onClose={() => {
          setExamineOpen(false);
          setExamineKey(null);
        }}
        evidenceKey={examineKey}
        evidence={examineKey ? game.evidence[examineKey] : null}
        onFound={onHotspotFound}
      />

      {/* Admission */}
      <AdmissionModal
        open={admissionOpen}
        onClose={() => {
          setAdmissionOpen(false);
          setAdmissionKey(null);
        }}
        evidenceKey={admissionKey}
        evidence={admissionKey ? game.evidence[admissionKey] : null}
        admission={admission}
        onOffer={offerAdmission}
        onAdmit={admitEvidence}
        onDeny={denyEvidence}
      />

      {/* Save/Load */}
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
