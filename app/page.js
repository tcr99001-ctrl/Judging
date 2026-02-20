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
  Gavel,
  Save,
  ShieldAlert,
  HardDrive,
  FolderOpen,
  Trash2,
} from 'lucide-react';

// ✅ alias (imports 아래에서만!)
const ScaleIcon = Scale;

/* =========================================================
   ✅ CLEAN SINGLE-FILE VN COURT DEMO (app/page.js)
   - Fixes your UI mess:
     1) Import order correct (no "const before import")
     2) No duplicated blocks / mismatched braces
     3) Mobile-first VN layout (top HUD + center portrait + bottom dialogue)
     4) Evidence + Admission + Save/Load modal are minimal and readable
   - Assets (optional):
     public/assets/bg/*.webp
     public/assets/bgm/*.ogg
     public/assets/sfx/*.ogg
========================================================= */

/* =========================================================
   0) Global CSS
========================================================= */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');

:root { color-scheme: dark; }

@keyframes shake {
  0%, 100% { transform: translate(0); }
  25% { transform: translate(-8px, 4px); }
  75% { transform: translate(8px, -4px); }
}
.animate-shake { animation: shake 0.25s ease-in-out 3; }

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fade-in { animation: fadeIn 0.35s ease-out; }

@keyframes slideUp {
  from { transform: translateY(24px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.animate-slide-up { animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1); }

@keyframes pulseSoft {
  0%,100% { transform: scale(1); opacity: .7; }
  50% { transform: scale(1.03); opacity: 1; }
}
.pulse-soft { animation: pulseSoft 1.25s ease-in-out infinite; }
`;

/* =========================================================
   1) Utils
========================================================= */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;

function hash32(str) {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function pickDet(arr, seedU32) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[seedU32 % arr.length];
}
function chance(seedU32, p01) {
  const x = (seedU32 % 10000) / 10000;
  return x < clamp(p01, 0, 1);
}
function ensureEndingPunct(t, kind = 'period') {
  const s = String(t || '').trim();
  if (!s) return s;
  const last = s[s.length - 1];
  const has = last === '.' || last === '!' || last === '?' || last === '…';
  if (has) return s;
  if (kind === 'question') return s + '?';
  if (kind === 'exclaim') return s + '!';
  return s + '.';
}
function normalizeCadence(cadence) {
  const c = String(cadence || '').toLowerCase();
  return c || 'neutral';
}

/* =========================================================
   2) Asset Manager (BG/BGM/SFX) — simple, stable
========================================================= */
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

function makeAudio(url, { loop = true, volume = 1 } = {}) {
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

function createAssetManager(assets) {
  const a = isObj(assets) ? assets : {};
  const bg = isObj(a.bg) ? a.bg : {};
  const bgm = isObj(a.bgm) ? a.bgm : {};
  const sfx = isObj(a.sfx) ? a.sfx : {};

  // BGM: single track crossfade
  let bgmCurKey = null;
  let bgmCur = null;
  let muted = false;
  const bgmCache = new Map();

  const bgmEnsure = (key) => {
    const url = bgm[key];
    if (!url) return null;
    if (bgmCache.has(key)) return bgmCache.get(key);
    const aud = makeAudio(url, { loop: true, volume: 0 });
    bgmCache.set(key, aud);
    return aud;
  };

  const unlock = async () => {
    try {
      const tmp = new Audio();
      tmp.muted = true;
      await tmp.play().catch(() => {});
      tmp.pause();
      return true;
    } catch {
      return false;
    }
  };

  const setMuted = async (m) => {
    muted = !!m;
    if (bgmCur) bgmCur.volume = muted ? 0 : bgmCur.volume;
  };

  const bgmPlay = async (key, { fadeMs = 600 } = {}) => {
    if (!key) return;
    if (bgmCurKey === key) return;
    const next = bgmEnsure(key);
    if (!next) return;

    try {
      await next.play();
    } catch {}

    const prev = bgmCur;
    bgmCur = next;
    bgmCurKey = key;

    const target = muted ? 0 : 0.75;
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

  // SFX: small pool per key
  const sfxPools = new Map();
  const sfxEnsure = (key) => {
    const url = sfx[key];
    if (!url) return null;
    if (sfxPools.has(key)) return sfxPools.get(key);
    const pool = Array.from({ length: 6 }, () => makeAudio(url, { loop: false, volume: 0.9 }));
    sfxPools.set(key, pool);
    return pool;
  };
  const sfxPlay = async (key) => {
    if (muted) return true;
    const pool = sfxEnsure(key);
    if (!pool) return false;
    let picked = pool[0];
    for (const a of pool) {
      if (a.paused || a.ended) {
        picked = a;
        break;
      }
    }
    try {
      picked.volume = 0.95;
      try {
        picked.currentTime = 0;
      } catch {}
      await picked.play();
      return true;
    } catch {
      return false;
    }
  };

  return {
    resolveBg: (key) => bg[key] || null,
    preloadBg: async (key) => {
      const url = bg[key];
      if (!url) return false;
      return preloadImage(url);
    },
    unlock,
    setMuted,
    bgmPlay,
    sfxPlay,
    keys: { bg: Object.keys(bg), bgm: Object.keys(bgm), sfx: Object.keys(sfx) },
  };
}

/* =========================================================
   3) Save (LocalStorage) — minimal
========================================================= */
const SAVE_NS = 'ACEVN_SAVE';
const saveKey = (caseId, slot) => `${SAVE_NS}::${String(caseId || 'case')}::slot::${slot}`;

function safeJSONParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function serializeSetMap(map) {
  const out = {};
  if (!map || !isObj(map)) return out;
  for (const [k, v] of Object.entries(map)) {
    out[k] = v instanceof Set ? Array.from(v.values()) : Array.isArray(v) ? v : [];
  }
  return out;
}
function deserializeSetMap(raw) {
  const out = {};
  if (!raw || !isObj(raw)) return out;
  for (const [k, arr] of Object.entries(raw)) out[k] = new Set(Array.isArray(arr) ? arr : []);
  return out;
}
function saveBlob(caseId, engineState, courtState) {
  return {
    schema: 1,
    savedAt: new Date().toISOString(),
    caseId,
    engine: {
      ...engineState,
      ceSolved: serializeSetMap(engineState.ceSolved),
    },
    court: courtState
      ? {
          ...courtState,
          admission: courtState.admission
            ? {
                ...courtState.admission,
                admitted: Array.from(courtState.admission.admitted.values()),
                denied: Array.from(courtState.admission.denied.entries()),
                pending: Array.from(courtState.admission.pending.entries()),
              }
            : null,
        }
      : null,
  };
}
function saveLS(caseId, slot, blob) {
  if (typeof window === 'undefined') return { ok: false, reason: 'no_window' };
  try {
    window.localStorage.setItem(saveKey(caseId, slot), JSON.stringify(blob));
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}
function loadLS(caseId, slot) {
  if (typeof window === 'undefined') return { ok: false, reason: 'no_window' };
  const raw = window.localStorage.getItem(saveKey(caseId, slot));
  if (!raw) return { ok: false, reason: 'not_found' };
  const obj = safeJSONParse(raw, null);
  if (!obj) return { ok: false, reason: 'parse_failed' };
  // normalize engine ceSolved back to sets
  if (obj.engine?.ceSolved) obj.engine.ceSolved = deserializeSetMap(obj.engine.ceSolved);
  // normalize admission sets/maps
  if (obj.court?.admission) {
    obj.court.admission.admitted = new Set(obj.court.admission.admitted || []);
    obj.court.admission.denied = new Map(obj.court.admission.denied || []);
    obj.court.admission.pending = new Map(obj.court.admission.pending || []);
  }
  return { ok: true, data: obj };
}
function delLS(caseId, slot) {
  if (typeof window === 'undefined') return { ok: false, reason: 'no_window' };
  try {
    window.localStorage.removeItem(saveKey(caseId, slot));
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

/* =========================================================
   4) VN Voice (deterministic, realistic)
========================================================= */
function computeStress({ hp, hpMax, isCE, unresolvedCount, pressMode }) {
  const hpFrac = hpMax > 0 ? clamp(1 - hp / hpMax, 0, 1) : 0;
  const u = isCE ? clamp((unresolvedCount || 0) / 3, 0, 1) : 0;
  const press = pressMode ? 0.15 : 0;
  return clamp(0.18 + hpFrac * 0.45 + u * 0.35 + press, 0, 1);
}

function applyVoice(charKey, charObj, rawText, { mode, stress, seed }) {
  let t = String(rawText ?? '');
  if (!t) return t;
  if (charKey === 'narrator') return ensureEndingPunct(t, 'period');

  const voice = charObj?.voice || {};
  const filler = voice.filler || [];
  const cadence = normalizeCadence(voice.cadence);
  const punct = voice.punctuation || { ellipsis: 0.12, exclaim: 0.08, question: 0.08 };
  const tics = voice.courtroomTics || [];

  const hasEllipsis = t.includes('...');
  const hasBang = t.includes('!');
  const hasQ = t.includes('?');

  if (cadence === 'clinical') {
    t = t.replace(/!+/g, '.');
    t = ensureEndingPunct(t, 'period');
  } else if (cadence === 'assertive') {
    t = ensureEndingPunct(t, hasQ ? 'question' : hasBang ? 'exclaim' : 'period');
    if (!hasBang && chance(seed ^ 0xA1B2C3D4, 0.1 + stress * 0.18)) t = t.replace(/\.$/, '!');
  } else if (cadence === 'probing') {
    t = ensureEndingPunct(t, 'period');
    if (!hasQ && chance(seed ^ 0x1F2E3D4C, 0.1 + stress * 0.22)) t = t.replace(/\.$/, '?');
  } else if (cadence === 'defensive' || cadence === 'guarded') {
    t = ensureEndingPunct(t, 'period');
    if (!hasEllipsis && chance(seed ^ 0x55AA55AA, 0.12 + stress * 0.28)) t = t.replace(/\.$/, '...');
  } else {
    t = ensureEndingPunct(t, 'period');
  }

  const fillerChance = clamp(0.08 + stress * 0.16, 0, 0.28);
  if (mode === 'court' && filler.length) {
    const f = pickDet(filler, seed ^ 0x9E3779B9);
    if (f && !t.startsWith('(') && chance(seed ^ 0xCAFEBABE, fillerChance)) t = `${f}. ${t}`;
  }

  if (mode === 'court' && tics.length) {
    const ticChance = clamp(0.05 + stress * 0.1, 0, 0.18);
    const k = pickDet(tics, seed ^ 0x31415926);
    if (k && t.length < 110 && chance(seed ^ 0xDEADBEEF, ticChance)) t = `${t} (${k})`;
  }

  if (!hasEllipsis && chance(seed ^ 0x0BADF00D, (punct.ellipsis || 0) * (0.55 + stress * 0.9))) {
    if (t.endsWith('.')) t = t.slice(0, -1) + '...';
    else if (!t.endsWith('...')) t += '...';
  }

  if (!hasQ && chance(seed ^ 0x12345678, (punct.question || 0) * (0.45 + stress * 0.8))) {
    if (cadence === 'probing' || cadence === 'defensive') if (t.endsWith('.')) t = t.slice(0, -1) + '?';
  }
  if (!hasBang && chance(seed ^ 0x87654321, (punct.exclaim || 0) * (0.45 + stress * 0.8))) {
    if (cadence === 'assertive') if (t.endsWith('.')) t = t.slice(0, -1) + '!';
  }

  return t.replace(/\s{2,}/g, ' ').trim();
}

/* =========================================================
   5) Case (compact but playable)
========================================================= */
const svg = {
  judge:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%231F2937'/%3E%3Ctext x='50' y='62' font-size='42' text-anchor='middle' fill='white'%3E⚖%3C/text%3E%3C/svg%3E",
  prosecutor:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%23991B1B'/%3E%3Ctext x='50' y='62' font-size='36' text-anchor='middle' fill='white'%3E검%3C/text%3E%3C/svg%3E",
  player:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%231D4ED8'/%3E%3Ctext x='50' y='62' font-size='36' text-anchor='middle' fill='white'%3E변%3C/text%3E%3C/svg%3E",
  witness1:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%23065F46'/%3E%3Ctext x='50' y='60' font-size='22' text-anchor='middle' fill='white'%3E경비%3C/text%3E%3C/svg%3E",
  witness3:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%235B21B6'/%3E%3Ctext x='50' y='60' font-size='22' text-anchor='middle' fill='white'%3E검시%3C/text%3E%3C/svg%3E",
  witness4:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%239A3412'/%3E%3Ctext x='50' y='60' font-size='26' text-anchor='middle' fill='white'%3EIT%3C/text%3E%3C/svg%3E",
};
const facePack = (baseSvg) => ({
  normal: baseSvg,
  sweat:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%23F59E0B'/%3E%3Ctext x='50' y='62' font-size='38' text-anchor='middle' fill='white'%3E😰%3C/text%3E%3C/svg%3E",
  angry:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%23DC2626'/%3E%3Ctext x='50' y='62' font-size='38' text-anchor='middle' fill='white'%3E😡%3C/text%3E%3C/svg%3E",
  breakdown:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%23991B1B'/%3E%3Ctext x='50' y='62' font-size='38' text-anchor='middle' fill='white'%3E🤯%3C/text%3E%3C/svg%3E",
});
const VOICE = {
  judge: { filler: ['좋습니다', '정리하죠', '핵심만'], cadence: 'measured', punctuation: { ellipsis: 0.08, exclaim: 0.04, question: 0.12 }, courtroomTics: ['요지', '관련성', '증거능력', '입증 책임'] },
  prosecutor: { filler: ['명확합니다', '결국', '요컨대'], cadence: 'assertive', punctuation: { ellipsis: 0.05, exclaim: 0.18, question: 0.08 }, courtroomTics: ['입증', '정합', '상식적으로', '일관성'] },
  player: { filler: ['정확히', '잠깐만요', '그러니까'], cadence: 'probing', punctuation: { ellipsis: 0.08, exclaim: 0.14, question: 0.2 }, courtroomTics: ['모순', '전제', '해석', '합리적 의심'] },
  witness1: { filler: ['예', '제가 보기엔', '규정상'], cadence: 'defensive', punctuation: { ellipsis: 0.22, exclaim: 0.05, question: 0.1 }, courtroomTics: ['근무일지', '절차상', '규정대로'] },
  witness3: { filler: ['의학적으로', '통상적으로', '범위상'], cadence: 'clinical', punctuation: { ellipsis: 0.04, exclaim: 0.01, question: 0.08 }, courtroomTics: ['추정시각', '오차범위', '소견', '근거'] },
  witness4: { filler: ['로그상', '시스템적으로', '정상이라면'], cadence: 'technical', punctuation: { ellipsis: 0.18, exclaim: 0.03, question: 0.1 }, courtroomTics: ['감사 로그', '권한', '무결성', '토큰'] },
  narrator: { filler: [], cadence: 'literary', punctuation: { ellipsis: 0.06, exclaim: 0.02, question: 0.02 }, courtroomTics: [] },
};

const CASE = {
  meta: {
    id: 'case_001',
    title: '밤의 14층',
    tagline: '확정이 무너지고, 입증 책임이 이동한다',
    ui: { coverBgKey: 'court' },
    rules: { hpMax: 7, requireSolveWeaknessToAdvance: true },
    initialEvidence: ['cctv_blindspot', 'door_access', 'revised_autopsy', 'printer_log', 'temp_token', 'parking_ticket'],
  },
  assets: {
    bg: {
      court: '/assets/bg/court_day.webp',
      hall: '/assets/bg/hallway_dim.webp',
      press: '/assets/bg/office_14f.webp',
      tense: '/assets/bg/court_night.webp',
      ending: '/assets/bg/ending_warm.webp',
      gameover: '/assets/bg/parking_garage.webp',
    },
    bgm: { trial: '/assets/bgm/trial.ogg', tense: '/assets/bgm/tense.ogg', victory: '/assets/bgm/victory.ogg' },
    sfx: { tap: '/assets/sfx/tap.ogg', flash: '/assets/sfx/flash.ogg', objection: '/assets/sfx/objection.ogg', admit: '/assets/sfx/admit.ogg', deny: '/assets/sfx/deny.ogg', fail: '/assets/sfx/fail.ogg' },
  },
  backgrounds: {
    court: 'bg-gradient-to-b from-slate-950 via-slate-900 to-black',
    hall: 'bg-gradient-to-b from-slate-900 to-slate-800',
    press: 'bg-gradient-to-br from-indigo-950 to-slate-900',
    tense: 'bg-gradient-to-br from-red-950 to-slate-900',
    ending: 'bg-gradient-to-br from-slate-950 via-slate-900 to-black',
    gameover: 'bg-gradient-to-br from-black via-red-950 to-slate-950',
  },
  characters: {
    narrator: { key: 'narrator', name: '내레이션', role: 'narrator', color: '#9CA3AF', avatar: null, faces: { normal: null }, voice: VOICE.narrator },
    judge: { key: 'judge', name: '재판장', role: 'judge', color: '#6B7280', avatar: svg.judge, faces: facePack(svg.judge), voice: VOICE.judge },
    prosecutor: { key: 'prosecutor', name: '최검사', role: 'prosecutor', color: '#DC2626', avatar: svg.prosecutor, faces: facePack(svg.prosecutor), voice: VOICE.prosecutor },
    player: { key: 'player', name: '강변호', role: 'defense', color: '#2563EB', avatar: svg.player, faces: facePack(svg.player), voice: VOICE.player },
    witness1: { key: 'witness1', name: '경비원 박○○', role: 'witness', color: '#10B981', avatar: svg.witness1, faces: facePack(svg.witness1), voice: VOICE.witness1 },
    witness3: { key: 'witness3', name: '검시관 서○○', role: 'expert', color: '#A855F7', avatar: svg.witness3, faces: facePack(svg.witness3), voice: VOICE.witness3 },
    witness4: { key: 'witness4', name: 'IT관리자 정○○', role: 'expert', color: '#F97316', avatar: svg.witness4, faces: facePack(svg.witness4), voice: VOICE.witness4 },
  },
  evidence: {
    cctv_blindspot: { name: 'CCTV 사각지대 도면', icon: '🗺️', desc: '반사광 구간으로 얼굴 식별 불가.' },
    door_access: { name: '출입문 카드기록', icon: '🪪', desc: '태그 순간만 기록. “기록=행동 전체” 아님.' },
    revised_autopsy: { name: '검시 보완 소견서', icon: '🧾', desc: '사망시각 범위를 20:35±15로 수정.' },
    printer_log: { name: '프린터 출력 로그', icon: '🖨️', desc: '20:34 A-Temp 토큰 사용 기록.' },
    temp_token: { name: '임시 인증 토큰', icon: '🔑', desc: '발급/수령 기록 불완전(무결성 공백).' },
    parking_ticket: { name: '주차정산 기록', icon: '🅿️', desc: '20:37 정산, 20:39 출차(독립 고정).' },
  },
  // ✅ NOTE: single-file test용으로 “법정 맛” 유지하되 너무 길지 않게 축약
  script: [
    { type: 'scene', bgKey: 'court', bgmKey: 'trial' },
    { type: 'talk', charKey: 'narrator', text: '심야 오피스 건물 14층에서 살인 사건이 발생했다' },
    { type: 'talk', charKey: 'judge', text: '입증 책임은 검찰에 있습니다' },
    { type: 'talk', charKey: 'prosecutor', text: '20:58 로비 인물은 피고인입니다. 기록이 뒷받침합니다' },
    { type: 'talk', charKey: 'player', text: '그 “확정”이 입증인지부터 확인하겠습니다' },
    {
      type: 'trial',
      title: '경비원 증언: 동일성',
      witnessCharKey: 'witness1',
      bgKey: 'hall',
      statements: [
        { text: '20:58에 로비에 사람이 들어왔습니다' },
        {
          text: '따라서 피고인으로 확정됩니다',
          weak: true,
          contradictionEvidenceKey: 'cctv_blindspot',
          failMsg: '사각지대로 식별 불가.',
          pressQ: '확정의 근거는 무엇입니까?',
          press: [{ charKey: 'witness1', text: '체형이 비슷했고… 다른 사람도 거의 없고…', face: 'sweat' }],
        },
      ],
    },
    { type: 'talk', charKey: 'prosecutor', text: '좋다. 그러면 사망시각으로 보자' },
    {
      type: 'trial',
      title: '검시관 증언: 사망시각',
      witnessCharKey: 'witness3',
      bgKey: 'tense',
      statements: [
        { text: '사망시각은 범위로 추정됩니다' },
        {
          text: '20:50 이전 사망은 가능성이 낮습니다',
          weak: true,
          contradictionEvidenceKey: 'revised_autopsy',
          failMsg: '보완 소견서로 범위 수정.',
          pressQ: '단정입니까 범위입니까?',
          press: [{ charKey: 'witness3', text: '범위입니다. 단정은 아닙니다', face: 'normal' }],
        },
      ],
    },
    { type: 'talk', charKey: 'prosecutor', text: '기록은 거짓말하지 않는다' },
    {
      type: 'trial',
      title: 'IT 증언: 권한과 기록',
      witnessCharKey: 'witness4',
      bgKey: 'press',
      statements: [
        { text: '예외는 거의 없습니다' },
        {
          text: '예외는 없었습니다',
          weak: true,
          contradictionEvidenceKey: 'printer_log',
          failMsg: 'A-Temp 사용 로그.',
        },
      ],
    },
    { type: 'talk', charKey: 'judge', text: '마지막으로, 독립 고정 기록이 있습니까?' },
    {
      type: 'trial',
      title: '최종: 고정 로그',
      witnessCharKey: 'witness3',
      bgKey: 'tense',
      isFinal: true,
      statements: [
        {
          text: '독립 고정 기록은 없습니다',
          weak: true,
          contradictionEvidenceKey: 'parking_ticket',
          failMsg: '주차정산/출차 기록.',
        },
      ],
    },
    { type: 'scene', bgKey: 'ending', bgmKey: 'victory' },
    { type: 'talk', charKey: 'judge', text: '피고인에게 무죄를 선고합니다' },
    { type: 'end', text: 'THE END' },
  ],
};

/* =========================================================
   6) Compile script -> runtime lines
========================================================= */
function compileCase(bundle) {
  const src = Array.isArray(bundle.script) ? bundle.script : [];
  const lines = [];
  const indexById = new Map();

  const push = (l) => {
    const idx = lines.length;
    lines.push(l);
    if (l?.id) indexById.set(l.id, idx);
  };

  for (const raw of src) {
    if (!raw || !raw.type) continue;

    if (raw.type === 'talk') {
      push({ type: 'talk', id: raw.id || uid('talk'), charKey: raw.charKey || null, text: String(raw.text || ''), face: raw.face || 'normal', bgKey: raw.bgKey || null });
      continue;
    }
    if (raw.type === 'scene') {
      push({ type: 'scene', id: raw.id || uid('scene'), bgKey: raw.bgKey || null, bgmKey: raw.bgmKey || null });
      continue;
    }
    if (raw.type === 'end') {
      push({ type: 'end', id: raw.id || uid('end'), text: String(raw.text || 'THE END') });
      continue;
    }

    if (raw.type === 'trial') {
      const stmts = (raw.statements || []).map((s, idx) => ({
        index: idx,
        text: String(s.text || ''),
        weakness: !!s.weak,
        contradiction: s.contradictionEvidenceKey || s.contradiction || null,
        failMsg: s.failMsg || null,
        press: s.pressQ || null,
        pressResponse: Array.isArray(s.press)
          ? s.press.map((p) => ({ type: 'talk', charKey: p.charKey || null, text: String(p.text || ''), face: p.face || 'normal' }))
          : [],
      }));
      const weakIndexes = [];
      for (let i = 0; i < stmts.length; i++) if (stmts[i].weakness) weakIndexes.push(i);

      push({
        type: 'cross_exam',
        id: raw.id || uid('trial'),
        title: String(raw.title || '심문'),
        isFinal: !!raw.isFinal,
        witnessCharKey: raw.witnessCharKey || 'witness1',
        bgKey: raw.bgKey || null,
        statements: stmts,
        _meta: { weakIndexes, weakCount: weakIndexes.length },
      });
      continue;
    }

    push({ ...raw, id: raw.id || uid('line') });
  }

  return { ...bundle, lines, indexById };
}

/* =========================================================
   7) Reducer (simple CE + progress)
========================================================= */
const ActionTypes = {
  INIT: 'INIT',
  NEXT: 'NEXT',
  PRESS_START: 'PRESS_START',
  PRESS_NEXT: 'PRESS_NEXT',
  PRESENT: 'PRESENT',
  OPEN_EVIDENCE: 'OPEN_EVIDENCE',
  CLOSE_EVIDENCE: 'CLOSE_EVIDENCE',
  RESET: 'RESET',
  HYDRATE: 'HYDRATE',
};

function makeInitialState(compiled) {
  const hpMax = compiled?.meta?.rules?.hpMax ?? 7;
  const inv = Array.isArray(compiled?.meta?.initialEvidence) ? compiled.meta.initialEvidence.slice() : [];
  return {
    index: 0,
    hp: hpMax,
    hpMax,
    ceIndex: 0,
    ceSolved: {},
    pressMode: false,
    pressIndex: 0,
    evidenceOpen: false,
    ending: false,
    gameOver: false,
    requireSolveWeaknessToAdvance: compiled?.meta?.rules?.requireSolveWeaknessToAdvance !== false,
    inventory: inv,
  };
}
function isCELine(line) {
  return !!line && line.type === 'cross_exam';
}
function solvedSet(state, lineIndex) {
  const set = state.ceSolved?.[lineIndex];
  return set instanceof Set ? set : new Set();
}
function unresolvedCount(state, line, lineIndex) {
  const weak = line?._meta?.weakIndexes || [];
  const solved = solvedSet(state, lineIndex);
  let n = 0;
  for (const wi of weak) if (!solved.has(wi)) n++;
  return n;
}
function firstUnresolvedIndex(state, line, lineIndex) {
  const weak = line?._meta?.weakIndexes || [];
  const solved = solvedSet(state, lineIndex);
  const first = weak.find((wi) => !solved.has(wi));
  return typeof first === 'number' ? first : 0;
}
function stmtAt(line, ceIndex) {
  if (!isCELine(line)) return null;
  const stmts = line.statements || [];
  if (!stmts.length) return null;
  return stmts[clamp(ceIndex, 0, stmts.length - 1)];
}
function normalizeHydrate(compiled, incoming) {
  const base = makeInitialState(compiled);
  const s = incoming && typeof incoming === 'object' ? incoming : {};
  const ceSolved = s.ceSolved && isObj(s.ceSolved) ? Object.fromEntries(Object.entries(s.ceSolved).map(([k, v]) => [k, v instanceof Set ? v : new Set(Array.isArray(v) ? v : [])])) : {};
  const inv = Array.isArray(s.inventory) ? s.inventory.slice() : base.inventory.slice();

  const lines = compiled.lines || [];
  const maxIndex = Math.max(0, lines.length - 1);
  const index = typeof s.index === 'number' ? clamp(s.index, 0, maxIndex) : base.index;

  const hpMax = typeof s.hpMax === 'number' && s.hpMax > 0 ? s.hpMax : base.hpMax;
  const hp = typeof s.hp === 'number' ? clamp(s.hp, 0, hpMax) : base.hp;

  const line = lines[index];
  const ceTotal = line?.type === 'cross_exam' ? (line.statements?.length || 0) : 0;
  const ceIndex = typeof s.ceIndex === 'number' ? clamp(s.ceIndex, 0, Math.max(0, ceTotal - 1)) : base.ceIndex;

  return { ...base, ...s, index, hpMax, hp, ceIndex, inventory: inv, ceSolved };
}
function reducer(compiled, state, action) {
  const lines = compiled.lines || [];
  const cur = lines[state.index] || null;

  switch (action.type) {
    case ActionTypes.INIT:
    case ActionTypes.RESET:
      return makeInitialState(compiled);

    case ActionTypes.HYDRATE:
      return normalizeHydrate(compiled, action.state || null);

    case ActionTypes.OPEN_EVIDENCE:
      return { ...state, evidenceOpen: true };
    case ActionTypes.CLOSE_EVIDENCE:
      return { ...state, evidenceOpen: false };

    case ActionTypes.PRESS_START: {
      if (!isCELine(cur)) return state;
      const stmt = stmtAt(cur, state.ceIndex);
      if (!stmt?.pressResponse?.length && !stmt?.press) return state;
      return { ...state, pressMode: true, pressIndex: 0 };
    }
    case ActionTypes.PRESS_NEXT: {
      if (!state.pressMode) return state;
      const stmt = stmtAt(cur, state.ceIndex);
      const n = stmt?.pressResponse?.length || 0;
      if (n <= 0) return { ...state, pressMode: false, pressIndex: 0 };
      if (state.pressIndex < n - 1) return { ...state, pressIndex: state.pressIndex + 1 };
      return { ...state, pressMode: false, pressIndex: 0 };
    }
    case ActionTypes.NEXT: {
      if (state.ending || state.gameOver) return state;
      if (state.pressMode) return reducer(compiled, state, { type: ActionTypes.PRESS_NEXT });

      if (cur?.type === 'end') return { ...state, ending: true };

      if (isCELine(cur)) {
        const len = cur.statements?.length || 0;
        const last = state.ceIndex >= len - 1;

        if (last) {
          const un = unresolvedCount(state, cur, state.index);
          if (state.requireSolveWeaknessToAdvance && un > 0) return { ...state, ceIndex: firstUnresolvedIndex(state, cur, state.index) };
          return { ...state, index: clamp(state.index + 1, 0, lines.length - 1), ceIndex: 0 };
        }
        return { ...state, ceIndex: state.ceIndex + 1 };
      }

      return { ...state, index: clamp(state.index + 1, 0, lines.length - 1) };
    }
    case ActionTypes.PRESENT: {
      if (state.ending || state.gameOver) return state;
      if (!isCELine(cur)) return state;
      const stmt = stmtAt(cur, state.ceIndex);
      const key = action.evidenceKey;

      if (stmt?.weakness && stmt?.contradiction === key) {
        const nextSolved = { ...(state.ceSolved || {}) };
        const old = solvedSet(state, state.index);
        const ns = new Set(old);
        ns.add(state.ceIndex);
        nextSolved[state.index] = ns;
        return { ...state, ceSolved: nextSolved, evidenceOpen: false, pressMode: false, pressIndex: 0, ceIndex: 0, index: clamp(state.index + 1, 0, lines.length - 1) };
      }

      const nh = Math.max(0, state.hp - 1);
      return { ...state, hp: nh, gameOver: nh <= 0 };
    }
    default:
      return state;
  }
}

/* =========================================================
   8) View Builder (clean)
========================================================= */
function buildView(compiled, state, injectLine = null, injectCursor = 0) {
  const lines = compiled.lines || [];
  const base = lines[state.index] || null;
  const isCE = base?.type === 'cross_exam';
  const stmt = isCE ? (base.statements?.[state.ceIndex] || null) : null;

  const speakerKey = (() => {
    if (injectLine?.type === 'talk' && injectLine.charKey) return injectLine.charKey;
    if (state.pressMode && stmt?.pressResponse?.[state.pressIndex]?.charKey) return stmt.pressResponse[state.pressIndex].charKey;
    if (isCE) return base.witnessCharKey || 'witness1';
    return base?.charKey || 'narrator';
  })();

  const chars = compiled.characters || {};
  const speaker = chars[speakerKey] || chars.narrator;

  const rawText = (() => {
    if (injectLine?.type === 'talk') return String(injectLine.text || '');
    if (state.pressMode && stmt?.pressResponse?.[state.pressIndex]?.text) return String(stmt.pressResponse[state.pressIndex].text);
    if (isCE) return String(stmt?.text || '');
    if (base?.type === 'talk') return String(base.text || '');
    if (base?.type === 'end') return String(base.text || 'THE END');
    return '';
  })();

  const un = isCE ? unresolvedCount(state, base, state.index) : 0;
  const stress = computeStress({ hp: state.hp, hpMax: state.hpMax, isCE, unresolvedCount: un, pressMode: state.pressMode });
  const mode = isCE ? 'court' : 'narration';
  const seed = hash32(`${speakerKey}::${rawText}::${state.index}::${state.ceIndex}::inj${injectCursor}`);
  const text = applyVoice(speakerKey, speaker, rawText, { mode, stress, seed });

  const bgKey = base?.bgKey || compiled.meta?.ui?.coverBgKey || 'court';
  const bgClass = compiled.backgrounds?.[bgKey] || 'bg-gradient-to-br from-slate-950 via-slate-900 to-black';

  return {
    line: base,
    text,
    isCE,
    ceTitle: isCE ? base.title : null,
    ceIndex: isCE ? state.ceIndex : 0,
    ceTotal: isCE ? (base.statements?.length || 0) : 0,
    isFinal: isCE ? !!base.isFinal : false,
    unresolvedCount: un,
    hp: state.hp,
    hpMax: state.hpMax,
    speaker,
    face: injectLine?.face || base?.face || 'normal',
    bgKey,
    bgClass,
    invItems: (state.inventory || []).map((k) => ({ key: k, ...(compiled.evidence?.[k] || { name: k, icon: '🗂️', desc: '' }) })),
    modeFlags: { evidenceOpen: !!state.evidenceOpen, pressMode: !!state.pressMode },
  };
}

/* =========================================================
   9) Admission Engine (minimal UI-driven)
========================================================= */
function createAdmissionState() {
  return {
    admitted: new Set(),
    denied: new Map(),
    pending: new Map(), // requestId -> {requestId,evidenceKey,objections:[]}
  };
}
function requestAdmission(adm, evidenceKey) {
  if (adm.admitted.has(evidenceKey)) return { state: adm, requestId: null };
  const next = { ...adm, pending: new Map(adm.pending) };
  const requestId = uid('adm');
  next.pending.set(requestId, { requestId, evidenceKey, objections: [] });
  return { state: next, requestId };
}
function objectAdmission(adm, requestId, ground, argument) {
  const next = { ...adm, pending: new Map(adm.pending) };
  const req = next.pending.get(requestId);
  if (!req) return next;
  req.objections.push({ ts: now(), ground, argument });
  next.pending.set(requestId, req);
  return next;
}
function ruleAdmission(adm, requestId, decision) {
  const next = { ...adm, admitted: new Set(adm.admitted), denied: new Map(adm.denied), pending: new Map(adm.pending) };
  const req = next.pending.get(requestId);
  if (!req) return next;
  next.pending.delete(requestId);
  if (decision === 'ADMIT') next.admitted.add(req.evidenceKey);
  if (decision === 'DENY') next.denied.set(req.evidenceKey, { ts: now(), evidenceKey: req.evidenceKey, rationale: 'denied' });
  return next;
}

/* =========================================================
   10) Integrated Engine Hook (clean)
========================================================= */
function useIntegratedEngine(caseBundle) {
  const compiled = useMemo(() => compileCase(caseBundle), [caseBundle]);
  const [state, dispatch] = useReducer((s, a) => reducer(compiled, s, a), compiled, makeInitialState);

  // minimal court state
  const [admission, setAdmission] = useState(() => {
    const a = createAdmissionState();
    // auto-admit initialEvidence for testing (so play isn't blocked)
    for (const k of caseBundle.meta.initialEvidence || []) a.admitted.add(k);
    return a;
  });

  const [needAdmission, setNeedAdmission] = useState(null); // { evidenceKey, note }
  const [injectQueue, setInjectQueue] = useState([]);
  const [injectCursor, setInjectCursor] = useState(0);

  const injecting = injectQueue.length > 0 && injectCursor < injectQueue.length;
  const injectLine = injecting ? injectQueue[injectCursor] : null;

  const view = useMemo(() => {
    const v = buildView(compiled, state, injectLine, injectCursor);
    return { ...v, injecting, needAdmission };
  }, [compiled, state, injectLine, injectCursor, injecting, needAdmission]);

  const flushInject = (arr) => {
    if (!Array.isArray(arr) || !arr.length) return;
    setInjectQueue((p) => p.concat(arr));
  };
  const consumeInject = () => {
    if (!injecting) return false;
    setInjectCursor((c) => c + 1);
    setTimeout(() => {
      setInjectQueue((q) => {
        const nx = injectCursor + 1;
        if (nx >= q.length) {
          setInjectCursor(0);
          return [];
        }
        return q;
      });
    }, 0);
    return true;
  };

  const act = useMemo(() => {
    return {
      next: () => {
        if (consumeInject()) return;
        dispatch({ type: ActionTypes.NEXT });
      },
      press: () => dispatch({ type: ActionTypes.PRESS_START }),
      openEvidence: () => dispatch({ type: ActionTypes.OPEN_EVIDENCE }),
      closeEvidence: () => dispatch({ type: ActionTypes.CLOSE_EVIDENCE }),
      reset: () => {
        setNeedAdmission(null);
        setInjectQueue([]);
        setInjectCursor(0);
        dispatch({ type: ActionTypes.RESET });
      },
      hydrate: (engineState, admissionState) => {
        dispatch({ type: ActionTypes.HYDRATE, state: engineState });
        if (admissionState) setAdmission(admissionState);
      },

      // admission UI ops
      offerEvidence: (evidenceKey) => {
        const res = requestAdmission(admission, evidenceKey);
        setAdmission(res.state);
        return res.requestId;
      },
      objectEvidence: (requestId, ground, argument) => {
        setAdmission((a) => objectAdmission(a, requestId, ground, argument));
      },
      ruleEvidence: (requestId, mode) => {
        setAdmission((a) => ruleAdmission(a, requestId, mode));
      },

      present: (evidenceKey) => {
        // gate: admitted only
        if (!admission.admitted.has(evidenceKey)) {
          setNeedAdmission({ evidenceKey, note: '이 증거는 아직 채택되지 않았습니다. 채택 심리를 진행하세요.' });
          return;
        }
        dispatch({ type: ActionTypes.PRESENT, evidenceKey });
      },

      ackNeedAdmission: () => setNeedAdmission(null),

      // expose
      _dispatch: dispatch,
    };
  }, [admission, injecting, injectCursor, injectQueue]); // eslint-disable-line react-hooks/exhaustive-deps

  return { compiled, state, view, act, admission, setAdmission, needAdmission };
}

/* =========================================================
   11) UI Components (clean)
========================================================= */
function Pill({ children, className = '' }) {
  return <div className={`px-4 py-2 rounded-full border border-white/10 bg-black/40 backdrop-blur-md ${className}`}>{children}</div>;
}

function ModalShell({ open, onClose, title, icon, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-black/70 backdrop-blur-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/10 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
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
        <div className="p-6">{children}</div>
        {footer ? <div className="px-6 py-4 border-t border-white/10">{footer}</div> : null}
      </div>
    </div>
  );
}

function EvidenceModal({ open, onClose, items, admittedSet, onPresent, onOpenAdmission, onReset, hint }) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="증거 목록"
      icon={<FileText className="w-5 h-5 text-amber-300" />}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
            {hint || ''}
          </div>
          <div className="flex gap-2">
            <button onClick={onReset} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
              리셋
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
              닫기
            </button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((it) => {
          const admitted = admittedSet.has(it.key);
          return (
            <div key={it.key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start gap-4">
                <div className="text-4xl">{it.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-base font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {it.name}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full border ${admitted ? 'border-amber-400/40 text-amber-200 bg-amber-500/10' : 'border-white/10 text-gray-300 bg-black/20'}`}>
                      {admitted ? '채택됨' : '미채택'}
                    </span>
                    <span className="text-xs font-mono px-2 py-1 rounded-full bg-black/30 border border-white/10 text-gray-300">
                      {it.key}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-300 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {it.desc}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => onPresent(it.key)}
                  className="px-4 py-2 rounded-xl bg-amber-600/80 hover:bg-amber-500 border border-amber-400/30 font-semibold"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  제시
                </button>
                <button
                  onClick={() => onOpenAdmission(it.key)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-semibold"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  채택/이의
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}

function AdmissionModal({ open, onClose, evidence, request, admitted, denied, denial, onOffer, onObject, onRule }) {
  const [ground, setGround] = useState('foundation');
  const [argument, setArgument] = useState('');
  const [judgeNote, setJudgeNote] = useState('');

  const GROUNDS = [
    { key: 'relevance', label: '관련성 없음' },
    { key: 'hearsay', label: '전문 증거' },
    { key: 'foundation', label: '기초 부족' },
    { key: 'integrity', label: '무결성' },
    { key: 'chain', label: '보관연쇄' },
    { key: 'prejudice', label: '부당한 편견' },
  ];

  const status = admitted ? 'ADMITTED' : denied ? 'DENIED' : request ? 'PENDING' : 'NOT_REQUESTED';

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="증거 채택 심리"
      icon={<ShieldAlert className="w-5 h-5 text-amber-300" />}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
            상태: {status}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
              닫기
            </button>
          </div>
        </div>
      }
    >
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start gap-4">
          <div className="text-4xl">{evidence?.icon || '🗂️'}</div>
          <div className="min-w-0">
            <div className="text-lg font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
              {evidence?.name || ''}
              <span className="ml-2 text-xs font-mono text-gray-400">{evidence?.key || ''}</span>
            </div>
            <div className="mt-2 text-sm text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>
              {evidence?.desc || ''}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold text-white mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
            이의 제기
          </div>
          <label className="text-sm text-gray-200" style={{ fontFamily: 'Inter, sans-serif' }}>
            근거
            <select value={ground} onChange={(e) => setGround(e.target.value)} className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white">
              {GROUNDS.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-gray-200 mt-3 block" style={{ fontFamily: 'Inter, sans-serif' }}>
            주장(선택)
            <textarea value={argument} onChange={(e) => setArgument(e.target.value)} rows={4} className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white resize-none" />
          </label>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onObject?.({ ground, argument })}
              disabled={!request?.requestId}
              className="px-4 py-2 rounded-xl bg-amber-600/80 hover:bg-amber-500 border border-amber-400/30 font-semibold disabled:opacity-40"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              이의
            </button>
            <button
              onClick={() => {
                setArgument('');
                setGround('foundation');
              }}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-semibold"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              초기화
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold text-white mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
            판사 결정
          </div>
          <label className="text-sm text-gray-200 block" style={{ fontFamily: 'Inter, sans-serif' }}>
            메모(선택)
            <textarea value={judgeNote} onChange={(e) => setJudgeNote(e.target.value)} rows={4} className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white resize-none" />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => onOffer?.()}
              disabled={!!request?.requestId}
              className="px-4 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-500 border border-blue-400/30 font-semibold disabled:opacity-40"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              신청
            </button>
            <button
              onClick={() => onRule?.({ mode: 'AUTO', judgeNote })}
              disabled={!request?.requestId}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold disabled:opacity-40"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              AUTO
            </button>
            <button
              onClick={() => onRule?.({ mode: 'ADMIT', judgeNote })}
              disabled={!request?.requestId}
              className="px-4 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 border border-emerald-400/30 font-semibold disabled:opacity-40"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              채택
            </button>
            <button
              onClick={() => onRule?.({ mode: 'DENY', judgeNote })}
              disabled={!request?.requestId}
              className="px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-500 border border-rose-400/30 font-semibold disabled:opacity-40"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              기각
            </button>
          </div>

          {denied && denial ? (
            <div className="mt-3 text-xs text-rose-200 bg-rose-500/10 border border-rose-400/20 rounded-xl p-3">
              기각: {denial.rationale || 'denied'}
            </div>
          ) : null}
        </div>
      </div>
    </ModalShell>
  );
}

function SaveLoadModal({ open, onClose, caseId, onSave, onLoad, onDelete }) {
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
      footer={
        <div className="flex items-center justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
            닫기
          </button>
        </div>
      }
    >
      {toast ? (
        <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${toast.ok ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-100' : 'bg-rose-500/10 border-rose-400/20 text-rose-100'}`}>
          {toast.msg}
        </div>
      ) : null}

      <div className="text-sm text-gray-300 mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
        caseId: <span className="font-mono text-gray-200">{caseId}</span>
      </div>

      <div className="space-y-3">
        {[1, 2, 3].map((slot) => (
          <div key={slot} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
              슬롯 {slot}
            </div>
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

/* =========================================================
   12) Main Page
========================================================= */
export default function Page() {
  const engine = useIntegratedEngine(CASE);

  // assets
  const assetRef = useRef(null);
  const unlockedRef = useRef(false);

  // ui
  const [muted, setMuted] = useState(false);
  const [bgUrl, setBgUrl] = useState(null);
  const [bgClass, setBgClass] = useState(engine.view.bgClass);

  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [overlayMsg, setOverlayMsg] = useState(null);
  const [effectText, setEffectText] = useState(null);

  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [admissionOpen, setAdmissionOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const [admissionKey, setAdmissionKey] = useState(null);

  const doShake = (ms = 420) => (setShake(true), setTimeout(() => setShake(false), ms));
  const doFlash = (ms = 160) => (setFlash(true), setTimeout(() => setFlash(false), ms));
  const doOverlay = (t, ms = 1100) => (setOverlayMsg(t), setTimeout(() => setOverlayMsg(null), ms));
  const doEffect = (t, ms = 850) => (setEffectText(t), setTimeout(() => setEffectText(null), ms));

  // setup assets
  useEffect(() => {
    assetRef.current = createAssetManager(CASE.assets);
  }, []);

  // mute sync
  useEffect(() => {
    assetRef.current?.setMuted(muted).catch?.(() => {});
  }, [muted]);

  // bg update
  useEffect(() => {
    const bgKey = engine.view.bgKey || CASE.meta.ui.coverBgKey || 'court';
    setBgClass(CASE.backgrounds[bgKey] || engine.view.bgClass);
    const url = assetRef.current?.resolveBg(bgKey);
    if (!url) {
      setBgUrl(null);
      return;
    }
    assetRef.current.preloadBg(bgKey).then(() => setBgUrl(url));
  }, [engine.view.bgKey, engine.view.bgClass]);

  // bgm update (scene)
  useEffect(() => {
    const line = engine.view.line;
    if (line?.type === 'scene' && line?.bgmKey) assetRef.current?.bgmPlay(line.bgmKey).catch?.(() => {});
  }, [engine.view.line?.type, engine.view.line?.bgmKey]);

  // needAdmission auto open
  useEffect(() => {
    const na = engine.needAdmission;
    if (!na?.evidenceKey) return;
    setAdmissionKey(na.evidenceKey);
    setAdmissionOpen(true);
    doOverlay(na.note || '채택 심리가 필요합니다.');
  }, [engine.needAdmission?.evidenceKey]);

  const unlockAudioIfNeeded = async () => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;
    await assetRef.current?.unlock().catch?.(() => {});
  };
  const sfx = async (k) => assetRef.current?.sfxPlay(k).catch?.(() => false);

  // admitted/denied/pending
  const admittedSet = engine.admission.admitted instanceof Set ? engine.admission.admitted : new Set();
  const deniedMap = engine.admission.denied instanceof Map ? engine.admission.denied : new Map();
  const pendingMap = engine.admission.pending instanceof Map ? engine.admission.pending : new Map();

  const admissionEvidence = useMemo(() => {
    if (!admissionKey) return null;
    const e = engine.compiled.evidence?.[admissionKey];
    return { key: admissionKey, ...(e || { name: admissionKey, icon: '🗂️', desc: '' }) };
  }, [admissionKey, engine.compiled.evidence]);

  const admissionRequest = useMemo(() => {
    if (!admissionKey) return null;
    for (const req of pendingMap.values()) {
      if (req.evidenceKey === admissionKey) return req;
    }
    return null;
  }, [admissionKey, pendingMap]);

  const denial = admissionKey ? deniedMap.get(admissionKey) : null;

  // bg style
  const bgStyle = bgUrl
    ? { backgroundImage: `url(${bgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined;

  // ending / gameover
  if (engine.view.gameOver) {
    return (
      <div className={`min-h-screen ${bgClass} text-white flex items-center justify-center p-8`} style={bgStyle}>
        <style jsx global>{GLOBAL_CSS}</style>
        <div className="w-full max-w-lg rounded-3xl bg-black/60 border border-white/10 backdrop-blur-xl p-8 text-center">
          <div className="text-6xl mb-4">💥</div>
          <div className="text-4xl font-bold mb-3" style={{ fontFamily: 'Crimson Pro, serif' }}>
            게임 오버
          </div>
          <div className="text-gray-300 mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
            페널티가 누적되어 더는 진행할 수 없습니다.
          </div>
          <button onClick={() => engine.act.reset()} className="px-6 py-3 rounded-xl bg-white text-black font-semibold">
            다시 시작
          </button>
        </div>
      </div>
    );
  }

  if (engine.view.ending) {
    return (
      <div className={`min-h-screen ${bgClass} text-white flex items-center justify-center p-8`} style={bgStyle}>
        <style jsx global>{GLOBAL_CSS}</style>
        <div className="w-full max-w-2xl rounded-3xl bg-black/60 border border-white/10 backdrop-blur-xl p-8 text-center">
          <Scale className="w-20 h-20 mx-auto mb-5 text-blue-400" />
          <div className="text-6xl font-bold mb-3" style={{ fontFamily: 'Crimson Pro, serif' }}>
            {CASE.meta.title}
          </div>
          <div className="text-gray-300 mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
            {CASE.meta.tagline}
          </div>
          <button onClick={() => engine.act.reset()} className="px-6 py-3 rounded-xl bg-white text-black font-semibold">
            다시하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-full relative overflow-hidden ${bgUrl ? '' : bgClass} ${shake ? 'animate-shake' : ''}`} style={bgStyle}>
      <style jsx global>{GLOBAL_CSS}</style>

      {/* dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10 pointer-events-none" />

      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between">
        <Pill className="flex items-center gap-3">
          <Scale className="w-5 h-5 text-blue-300" />
          <div className="flex gap-1.5">
            {[...Array(engine.view.hpMax)].map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i < engine.view.hp ? 'bg-blue-400 shadow shadow-blue-400/40' : 'bg-gray-700'}`} />
            ))}
          </div>
        </Pill>

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              await unlockAudioIfNeeded();
              setSaveOpen(true);
              await sfx('tap');
            }}
            className="w-11 h-11 rounded-full bg-black/40 border border-white/10 hover:border-white/20 backdrop-blur-md flex items-center justify-center"
            aria-label="save"
          >
            <Save className="w-5 h-5 text-gray-200" />
          </button>

          <button
            onClick={async () => {
              await unlockAudioIfNeeded();
              setMuted((m) => !m);
              await sfx('tap');
            }}
            className="w-11 h-11 rounded-full bg-black/40 border border-white/10 hover:border-white/20 backdrop-blur-md flex items-center justify-center"
            aria-label="mute"
          >
            {muted ? <VolumeX className="w-5 h-5 text-gray-200" /> : <Volume2 className="w-5 h-5 text-gray-200" />}
          </button>

          <button
            onClick={async () => {
              await unlockAudioIfNeeded();
              setEvidenceOpen(true);
              engine.act.openEvidence();
              await sfx('tap');
            }}
            className="h-11 px-4 rounded-full bg-black/40 border border-white/10 hover:border-white/20 backdrop-blur-md flex items-center gap-2"
            aria-label="evidence"
          >
            <FileText className="w-5 h-5 text-amber-300" />
            <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
              {engine.view.invItems.length}/{Object.keys(engine.compiled.evidence || {}).length}
            </span>
          </button>
        </div>
      </div>

      {/* Effects */}
      {effectText ? (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative">
            <div className="absolute inset-0 bg-white/10 blur-3xl pulse-soft" />
            <div className="relative text-7xl md:text-8xl font-black tracking-tight text-white" style={{ fontFamily: 'Crimson Pro, serif' }}>
              {effectText}
            </div>
          </div>
        </div>
      ) : null}

      {overlayMsg ? (
        <div className="absolute inset-0 z-[75] flex items-start justify-center pt-24 pointer-events-none animate-fade-in">
          <div className="px-5 py-3 rounded-2xl bg-black/70 border border-white/10 backdrop-blur-xl text-white text-sm font-semibold">
            {overlayMsg}
          </div>
        </div>
      ) : null}

      {flash ? <div className="absolute inset-0 z-[70] bg-white/20 pointer-events-none" /> : null}

      {/* Character */}
      {engine.view.speaker ? (
        <div className="absolute inset-x-0 bottom-44 flex items-center justify-center z-20 pointer-events-none">
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-2xl opacity-30" style={{ backgroundColor: engine.view.speaker.color }} />
            <img
              src={engine.view.speaker.faces?.[engine.view.face] || engine.view.speaker.avatar || ''}
              alt={engine.view.speaker.name}
              className="relative w-28 h-28 md:w-32 md:h-32 rounded-full border-2 border-white/20 shadow-2xl"
            />
          </div>
        </div>
      ) : null}

      {/* CE pill */}
      {engine.view.isCE ? (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 animate-slide-up">
          <div className={`px-6 py-2 rounded-full border ${engine.view.isFinal ? 'bg-red-950/70 border-red-500/40 text-red-200' : 'bg-blue-950/70 border-blue-500/40 text-blue-200'} backdrop-blur-md`}>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
                {engine.view.isFinal ? '최후의 증언' : engine.view.ceTitle} · {engine.view.ceIndex + 1}/{engine.view.ceTotal} · 미해결 {engine.view.unresolvedCount}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Dialogue */}
      <div className="absolute bottom-0 left-0 right-0 z-40 p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
          {engine.view.speaker ? (
            <div className="mb-2 ml-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-t-xl bg-black/60 border border-white/10">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: engine.view.speaker.color }} />
                <span className="text-xs font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {engine.view.speaker.name}
                </span>
              </div>
            </div>
          ) : null}

          <div
            onClick={async () => {
              await unlockAudioIfNeeded();
              await sfx('tap');
              if (engine.view.modeFlags.pressMode) engine.act.next(); // press mode auto-advance
              else engine.act.next();
            }}
            className="relative bg-black/80 border border-white/10 rounded-2xl p-5 md:p-6 min-h-[150px] backdrop-blur-xl cursor-pointer hover:border-white/20 transition"
          >
            <div className="text-lg md:text-xl text-white leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
              {engine.view.text}
            </div>

            {/* CE actions */}
            {engine.view.isCE && !engine.view.modeFlags.pressMode ? (
              <div className="absolute -top-16 right-0 flex gap-2">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await unlockAudioIfNeeded();
                    await sfx('tap');
                    engine.act.press();
                    const line = engine.compiled.lines[engine.state.index];
                    if (line?.type === 'cross_exam') {
                      const st = line.statements?.[engine.state.ceIndex];
                      if (st?.press) doOverlay(String(st.press), 900);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-500 border border-blue-400/30 font-semibold flex items-center gap-2"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <Search className="w-4 h-4" />
                  추궁
                </button>

                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await unlockAudioIfNeeded();
                    await sfx('tap');
                    setEvidenceOpen(true);
                    engine.act.openEvidence();
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600/80 hover:bg-amber-500 border border-amber-400/30 font-semibold flex items-center gap-2"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <FileText className="w-4 h-4" />
                  증거
                </button>
              </div>
            ) : null}

            <div className="absolute bottom-4 right-4 opacity-50">
              <ChevronRight className="w-6 h-6 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Evidence Modal */}
      <EvidenceModal
        open={evidenceOpen && engine.state.evidenceOpen}
        onClose={async () => {
          await unlockAudioIfNeeded();
          await sfx('tap');
          setEvidenceOpen(false);
          engine.act.closeEvidence();
        }}
        items={engine.view.invItems}
        admittedSet={admittedSet}
        hint={engine.view.isCE && engine.view.unresolvedCount > 0 ? '약한 문장에서 증거를 제시하세요.' : ''}
        onReset={async () => {
          await unlockAudioIfNeeded();
          await sfx('tap');
          engine.act.reset();
          doOverlay('리셋', 700);
        }}
        onPresent={async (k) => {
          await unlockAudioIfNeeded();
          await sfx('flash');
          setFlash(true);
          setTimeout(() => setFlash(false), 150);

          const prevHp = engine.view.hp;
          engine.act.present(k);

          setTimeout(async () => {
            if (engine.view.hp < prevHp) {
              doOverlay('틀렸습니다!', 900);
              doShake(520);
              await sfx('fail');
            } else {
              doEffect('OBJECTION!', 900);
              doOverlay('모순이다!', 900);
              await sfx('objection');
            }
          }, 40);
        }}
        onOpenAdmission={(key) => {
          setAdmissionKey(key);
          setAdmissionOpen(true);
        }}
      />

      {/* Admission Modal */}
      <AdmissionModal
        open={admissionOpen}
        onClose={() => {
          setAdmissionOpen(false);
          engine.act.ackNeedAdmission?.();
        }}
        evidence={admissionEvidence}
        request={admissionRequest}
        admitted={admissionKey ? admittedSet.has(admissionKey) : false}
        denied={admissionKey ? deniedMap.has(admissionKey) : false}
        denial={denial}
        onOffer={async () => {
          if (!admissionKey) return;
          await unlockAudioIfNeeded();
          await sfx('tap');
          engine.act.offerEvidence(admissionKey);
          doOverlay('증거 신청', 900);
        }}
        onObject={async ({ ground, argument }) => {
          if (!admissionRequest?.requestId) return;
          await unlockAudioIfNeeded();
          await sfx('tap');
          engine.act.objectEvidence(admissionRequest.requestId, ground, argument);
          doOverlay(`이의: ${ground}`, 900);
        }}
        onRule={async ({ mode }) => {
          if (!admissionRequest?.requestId) return;
          await unlockAudioIfNeeded();
          engine.act.ruleEvidence(admissionRequest.requestId, mode);
          if (mode === 'ADMIT') await sfx('admit');
          else if (mode === 'DENY') await sfx('deny');
          else await sfx('tap');
          doOverlay(mode === 'ADMIT' ? '채택' : mode === 'DENY' ? '기각' : 'AUTO', 900);
          engine.act.ackNeedAdmission?.();
        }}
      />

      {/* Save/Load */}
      <SaveLoadModal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        caseId={CASE.meta.id}
        onSave={async (slot) => {
          const blob = saveBlob(CASE.meta.id, engine.state, { admission: engine.admission });
          const res = saveLS(CASE.meta.id, slot, blob);
          return { ok: res.ok, msg: res.ok ? `슬롯 ${slot} 저장 완료` : `저장 실패: ${res.reason}` };
        }}
        onLoad={async (slot) => {
          const res = loadLS(CASE.meta.id, slot);
          if (!res.ok) return { ok: false, msg: `로드 실패: ${res.reason}` };
          const eng = res.data.engine;
          const adm = res.data.court?.admission;
          engine.act.hydrate(eng, adm ? adm : null);
          return { ok: true, msg: `슬롯 ${slot} 로드 완료` };
        }}
        onDelete={async (slot) => {
          const res = delLS(CASE.meta.id, slot);
          return { ok: res.ok, msg: res.ok ? `슬롯 ${slot} 삭제 완료` : `삭제 실패: ${res.reason}` };
        }}
      />
    </div>
  );
    }
