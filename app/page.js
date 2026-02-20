'use client';

import React, { useEffect, useMemo, useRef, useState, useReducer } from 'react';
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
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  HardDrive,
  FolderOpen,
  Trash2,
  MessageSquare,
  Info,
} from 'lucide-react';

/* =========================================================
   ✅ SINGLE FILE DEMO (app/page.js) — 2/4
   - From this part through 4/4: final single-file runnable.
========================================================= */

/* =========================================================
   0) Utils
========================================================= */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;

function hash32(str) {
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
   1) Asset Loader (BG/BGM/SFX)
========================================================= */
function preloadImage(url) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve({ ok: false, url, reason: 'no_window' });
    if (!url) return resolve({ ok: false, url, reason: 'empty_url' });
    const img = new Image();
    img.onload = () => resolve({ ok: true, url });
    img.onerror = () => resolve({ ok: false, url, reason: 'error' });
    img.src = url;
  });
}
async function preloadImages(urls, { concurrency = 6 } = {}) {
  const list = Array.isArray(urls) ? urls.filter(Boolean) : [];
  const results = [];
  let i = 0;
  async function worker() {
    while (i < list.length) {
      const idx = i++;
      const url = list[idx];
      // eslint-disable-next-line no-await-in-loop
      results[idx] = await preloadImage(url);
    }
  }
  const n = clamp(concurrency, 1, 16);
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, () => worker()));
  return results;
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
function createBgmManager(bgmMap, { baseVolume = 0.7, defaultFadeMs = 650 } = {}) {
  const map = isObj(bgmMap) ? bgmMap : {};
  const cache = new Map();
  let currentKey = null;
  let currentAudio = null;
  let muted = false;

  const ensure = (key) => {
    const url = map[key];
    if (!url) return null;
    if (cache.has(key)) return cache.get(key);
    const a = makeAudio(url, { loop: true, volume: 0 });
    cache.set(key, a);
    return a;
  };

  const unlock = async () => {
    if (typeof window === 'undefined') return { ok: false, reason: 'no_window' };
    try {
      const a = new Audio();
      a.muted = true;
      await a.play().catch(() => {});
      a.pause();
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: String(e) };
    }
  };

  const setMuted = async (m) => {
    muted = !!m;
    if (currentAudio) currentAudio.volume = muted ? 0 : baseVolume;
    for (const a of cache.values()) a.volume = muted ? 0 : a.volume;
  };

  const play = async (key, { fadeMs = defaultFadeMs, restart = false } = {}) => {
    if (!key) return;
    if (!restart && currentKey === key) return;

    const next = ensure(key);
    if (!next) return;

    try {
      await next.play();
    } catch {}

    const prev = currentAudio;
    currentAudio = next;
    currentKey = key;

    const target = muted ? 0 : baseVolume;
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

  const stop = async ({ fadeMs = defaultFadeMs } = {}) => {
    if (!currentAudio) return;
    const a = currentAudio;
    currentAudio = null;
    currentKey = null;
    await fadeTo(a, 0, fadeMs);
    try {
      a.pause();
    } catch {}
  };

  const preload = async (keys) => {
    const ks = Array.isArray(keys) ? keys : Object.keys(map);
    for (const k of ks) {
      const a = ensure(k);
      if (!a) continue;
      try {
        a.load();
      } catch {}
    }
    return true;
  };

  return { unlock, preload, play, stop, setMuted, getCurrent: () => currentKey, isMuted: () => muted };
}
function createSfxManager(sfxMap, { baseVolume = 0.9, poolSize = 8 } = {}) {
  const map = isObj(sfxMap) ? sfxMap : {};
  const pools = new Map();
  let muted = false;

  const ensurePool = (key) => {
    const url = map[key];
    if (!url) return null;
    if (pools.has(key)) return pools.get(key);
    const arr = Array.from({ length: clamp(poolSize, 1, 16) }, () => {
      const a = makeAudio(url, { loop: false, volume: muted ? 0 : baseVolume });
      a.preload = 'auto';
      return a;
    });
    pools.set(key, arr);
    return arr;
  };

  const setMuted = (m) => {
    muted = !!m;
    for (const arr of pools.values()) {
      for (const a of arr) a.volume = muted ? 0 : baseVolume;
    }
  };

  const play = async (key, { volume = baseVolume } = {}) => {
    const arr = ensurePool(key);
    if (!arr) return false;
    if (muted) return true;

    let picked = arr[0];
    for (const a of arr) {
      if (a.paused || a.ended) {
        picked = a;
        break;
      }
    }
    try {
      picked.volume = clamp(volume, 0, 1);
      try {
        picked.currentTime = 0;
      } catch {}
      await picked.play();
      return true;
    } catch {
      return false;
    }
  };

  const preload = async (keys) => {
    const ks = Array.isArray(keys) ? keys : Object.keys(map);
    for (const k of ks) {
      const arr = ensurePool(k);
      if (!arr) continue;
      for (const a of arr) {
        try {
          a.load();
        } catch {}
      }
    }
    return true;
  };

  return { preload, play, setMuted, isMuted: () => muted };
}
function createAssetManager(assets, { bgConcurrency = 6, bgmVolume = 0.75, sfxVolume = 0.95, sfxPoolSize = 8, bgmFadeMs = 650 } = {}) {
  const a = isObj(assets) ? assets : {};
  const bg = isObj(a.bg) ? a.bg : {};
  const bgm = isObj(a.bgm) ? a.bgm : {};
  const sfx = isObj(a.sfx) ? a.sfx : {};

  const bgmMgr = createBgmManager(bgm, { baseVolume: bgmVolume, defaultFadeMs: bgmFadeMs });
  const sfxMgr = createSfxManager(sfx, { baseVolume: sfxVolume, poolSize: sfxPoolSize });

  const resolveBg = (key) => bg[key] || null;

  const preloadBg = async (keys) => {
    const ks = Array.isArray(keys) ? keys : Object.keys(bg);
    const urls = ks.map((k) => bg[k]).filter(Boolean);
    return preloadImages(urls, { concurrency: bgConcurrency });
  };

  const preloadAll = async ({ bgKeys, bgmKeys, sfxKeys } = {}) => {
    await Promise.all([preloadBg(bgKeys), bgmMgr.preload(bgmKeys), sfxMgr.preload(sfxKeys)]);
    return true;
  };

  const setMuted = async (m) => {
    await bgmMgr.setMuted(m);
    sfxMgr.setMuted(m);
  };

  return { resolveBg, preloadBg, preloadAll, setMuted, bgm: bgmMgr, sfx: sfxMgr, keys: { bg: Object.keys(bg), bgm: Object.keys(bgm), sfx: Object.keys(sfx) } };
}

/* =========================================================
   2) Voice (VN realistic, deterministic)
========================================================= */
function voiceModeFromLine(isCE) {
  return isCE ? 'court' : 'narration';
}
function computeStressPack({ hp, hpMax, isCE, unresolvedCount, pressMode }) {
  const hpFrac = hpMax > 0 ? clamp(1 - hp / hpMax, 0, 1) : 0;
  const u = isCE ? clamp((unresolvedCount || 0) / 3, 0, 1) : 0;
  const press = pressMode ? 0.15 : 0;
  return clamp(0.18 + hpFrac * 0.45 + u * 0.35 + press, 0, 1);
}
function applyVoice(charKey, charObj, rawText, { mode, stress, seed }) {
  let t = String(rawText ?? '');
  if (!t) return t;
  if (charKey === 'narrator') return ensureEndingPunct(t, 'period');

  const voice = charObj?.voice || null;
  const filler = voice?.filler || [];
  const cadence = normalizeCadence(voice?.cadence);
  const punct = voice?.punctuation || { ellipsis: 0.12, exclaim: 0.08, question: 0.08 };
  const tics = voice?.courtroomTics || [];

  const hasEllipsis = t.includes('...');
  const hasBang = t.includes('!');
  const hasQ = t.includes('?');

  if (cadence === 'clinical') {
    t = t.replace(/!+/g, '.');
    t = ensureEndingPunct(t, 'period');
  } else if (cadence === 'assertive') {
    t = ensureEndingPunct(t, hasQ ? 'question' : hasBang ? 'exclaim' : 'period');
    if (!hasBang && chance(seed ^ 0xA1B2C3D4, 0.10 + stress * 0.18)) t = t.replace(/\.$/, '!');
  } else if (cadence === 'probing') {
    t = ensureEndingPunct(t, 'period');
    if (!hasQ && chance(seed ^ 0x1F2E3D4C, 0.10 + stress * 0.22)) t = t.replace(/\.$/, '?');
  } else if (cadence === 'defensive' || cadence === 'guarded') {
    t = ensureEndingPunct(t, 'period');
    if (!hasEllipsis && chance(seed ^ 0x55AA55AA, 0.12 + stress * 0.28)) t = t.replace(/\.$/, '...');
  } else {
    t = ensureEndingPunct(t, 'period');
  }

  const fillerChance = clamp(0.08 + stress * 0.16, 0, 0.28);
  if (mode === 'court' && Array.isArray(filler) && filler.length > 0) {
    const f = pickDet(filler, seed ^ 0x9E3779B9);
    if (f && !t.startsWith('(') && !t.startsWith('"') && chance(seed ^ 0xCAFEBABE, fillerChance)) t = `${f}. ${t}`;
  }

  if (mode === 'court' && Array.isArray(tics) && tics.length > 0) {
    const ticChance = clamp(0.05 + stress * 0.10, 0, 0.18);
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
   3) Engines (Admission / Credibility / Burden / Chain)
========================================================= */

// ---- Admission Engine ----
const RISK_ORDER = { low: 0, medium: 1, high: 2 };
const CONT_ORDER = { low: 0, medium: 1, high: 2 };
const riskLE = (a, b) => (RISK_ORDER[a] ?? 9) <= (RISK_ORDER[b] ?? 9);
const contGE = (a, b) => (CONT_ORDER[a] ?? -1) >= (CONT_ORDER[b] ?? 9);

function createAdmissionState(policyOverrides = {}) {
  const policy = {
    autoAdmit: { enabled: true, allowTypes: new Set(['forensic', 'physical']), maxHearsayRisk: 'low', maxTamperRisk: 'low', minContinuity: 'medium', ...(policyOverrides.autoAdmit || {}) },
    judge: { relevanceThreshold: 0.35, probativeThreshold: 0.35, minContinuity: 'medium', maxTamperRisk: 'medium', ...(policyOverrides.judge || {}) },
    alwaysAdmitKeys: policyOverrides.alwaysAdmitKeys instanceof Set ? policyOverrides.alwaysAdmitKeys : new Set(),
    hardBlockKeys: policyOverrides.hardBlockKeys instanceof Set ? policyOverrides.hardBlockKeys : new Set(),
    tieBreak: policyOverrides.tieBreak || 'admit',
  };
  if (Array.isArray(policyOverrides?.autoAdmit?.allowTypes)) policy.autoAdmit.allowTypes = new Set(policyOverrides.autoAdmit.allowTypes);
  return { admitted: new Set(), denied: new Map(), pending: new Map(), history: [], policy };
}
function isAdmitted(adm, key) {
  return adm?.admitted instanceof Set ? adm.admitted.has(key) : false;
}
function shallowEvidenceSnapshot(meta) {
  return {
    name: meta.name,
    icon: meta.icon,
    desc: meta.desc,
    category: meta.category,
    admissibility: meta.admissibility ? { ...meta.admissibility } : null,
    integrity: meta.integrity ? { ...meta.integrity } : null,
    chainOfCustody: meta.chainOfCustody ? { ...meta.chainOfCustody } : null,
    probativeValue: meta.probativeValue ? { ...meta.probativeValue } : null,
  };
}
function estimateRelevance(meta, purpose) {
  const cat = meta?.category || '';
  const explains = meta?.probativeValue?.explains || [];
  const eText = Array.isArray(explains) ? explains.join(' ') : String(explains || '');
  let base = 0.45;
  if (purpose === 'timeline') base = 0.55;
  if (purpose === 'identity') base = 0.55;
  if (purpose === 'chain') base = 0.5;
  if (purpose === 'impeach') base = 0.52;
  const hit = (s) => (eText.toLowerCase().includes(String(s).toLowerCase()) ? 0.12 : 0);
  let add = 0;
  if (purpose === 'timeline') add += hit('시간') + hit('시간축');
  if (purpose === 'identity') add += hit('식별') + hit('동일');
  if (purpose === 'chain') add += hit('무결성') + hit('연쇄') + hit('권한');
  if (purpose === 'impeach') add += hit('탄핵') + hit('프레임');
  if (purpose === 'timeline' && (cat === 'forensic' || cat === 'access' || cat === 'civil')) add += 0.08;
  if (purpose === 'identity' && (cat === 'video' || cat === 'telecom')) add += 0.08;
  if (purpose === 'chain' && (cat === 'digital' || cat === 'access')) add += 0.08;
  return clamp(base + add, 0, 1);
}
function judgeEvaluate(meta, req, policy) {
  if (!meta) return { decision: 'DENIED', score: 0, rationale: 'no_metadata_foundation' };
  if (policy.hardBlockKeys?.has(req.evidenceKey)) return { decision: 'DENIED', score: 0, rationale: 'hard_block' };
  if (policy.alwaysAdmitKeys?.has(req.evidenceKey)) return { decision: 'ADMITTED', score: 1, rationale: 'always_admit' };

  const hearsay = meta?.admissibility?.hearsayRisk || 'medium';
  const tamper = meta?.integrity?.tamperRisk || 'medium';
  const cont = meta?.chainOfCustody?.continuity || 'low';
  const prob = typeof meta?.probativeValue?.strength === 'number' ? meta.probativeValue.strength : 0.4;
  const rel = estimateRelevance(meta, req.purpose);

  const okRel = rel >= policy.judge.relevanceThreshold;
  const okProb = prob >= policy.judge.probativeThreshold;
  const okCont = contGE(cont, policy.judge.minContinuity);
  const okTamper = riskLE(tamper, policy.judge.maxTamperRisk);

  let score = 0;
  score += clamp(rel, 0, 1) * 0.45;
  score += clamp(prob, 0, 1) * 0.45;
  score -= (RISK_ORDER[tamper] ?? 1) * 0.22;
  score -= (RISK_ORDER[hearsay] ?? 1) * 0.18;
  score -= okCont ? 0 : 0.25;

  const pass = okRel && okProb && okCont && okTamper;
  if (pass) return { decision: 'ADMITTED', score: clamp(score, 0, 1), rationale: 'meets_thresholds' };
  const borderline = score >= 0.38 && okRel && okProb;
  if (borderline) return { decision: policy.tieBreak === 'deny' ? 'DENIED' : 'ADMITTED', score: clamp(score, 0, 1), rationale: 'borderline' };
  return { decision: 'DENIED', score: clamp(score, 0, 1), rationale: 'fails_thresholds' };
}
function requestAdmission(adm, evidenceMap, evidenceKey, { role = 'defense', purpose = 'general', note = '' } = {}) {
  if (isAdmitted(adm, evidenceKey)) return { state: adm, requestId: null, autoRuled: 'ADMITTED' };
  if (adm.denied?.has(evidenceKey)) return { state: adm, requestId: null, autoRuled: 'DENIED' };

  const id = uid('adm');
  const meta = evidenceMap?.[evidenceKey] ? shallowEvidenceSnapshot(evidenceMap[evidenceKey]) : null;
  const req = { requestId: id, evidenceKey, role, purpose, note, ts: now(), metaSnapshot: meta, objections: [], status: 'PENDING', ruling: null };
  const next = {
    ...adm,
    pending: new Map(adm.pending),
    history: (adm.history || []).slice(),
  };
  next.pending.set(id, req);
  next.history.push({ type: 'REQUEST_SUBMITTED', ts: req.ts, requestId: id, evidenceKey, role, purpose });
  return { state: next, requestId: id };
}
function objectAdmission(adm, requestId, { opponentRole = 'prosecution', ground = 'foundation', argument = '' } = {}) {
  if (!adm.pending?.has(requestId)) return { state: adm, ok: false };
  const next = { ...adm, pending: new Map(adm.pending), history: (adm.history || []).slice() };
  const req = next.pending.get(requestId);
  if (!req || req.status !== 'PENDING') return { state: adm, ok: false };
  req.objections.push({ ts: now(), opponentRole, ground, argument });
  next.pending.set(requestId, req);
  next.history.push({ type: 'OBJECTION_RAISED', ts: now(), requestId, evidenceKey: req.evidenceKey, opponentRole, ground });
  return { state: next, ok: true };
}
function ruleAdmission(adm, evidenceMap, requestId, { mode = 'AUTO', judgeNote = '' } = {}) {
  if (!adm.pending?.has(requestId)) return { state: adm, ruling: null };
  const next = {
    ...adm,
    admitted: new Set(adm.admitted),
    denied: new Map(adm.denied),
    pending: new Map(adm.pending),
    history: (adm.history || []).slice(),
  };
  const req = next.pending.get(requestId);
  if (!req || req.status !== 'PENDING') return { state: adm, ruling: null };

  const meta = evidenceMap?.[req.evidenceKey] || req.metaSnapshot || null;
  let decision = null;
  let rationale = '';
  let score = null;

  if (mode === 'ADMIT') {
    decision = 'ADMITTED';
    rationale = 'forced_admit';
    score = 1;
  } else if (mode === 'DENY') {
    decision = 'DENIED';
    rationale = 'forced_deny';
    score = 0;
  } else {
    const judged = judgeEvaluate(meta, req, next.policy);
    decision = judged.decision;
    rationale = judged.rationale;
    score = judged.score;
  }

  const ruling = { ts: now(), requestId, evidenceKey: req.evidenceKey, decision, rationale, score, judgeNote, objections: req.objections.slice() };

  next.pending.delete(requestId);
  if (decision === 'ADMITTED') {
    next.admitted.add(req.evidenceKey);
    next.history.push({ type: 'EVIDENCE_ADMITTED', ts: ruling.ts, requestId, evidenceKey: req.evidenceKey, rationale, score });
  } else {
    next.denied.set(req.evidenceKey, { ts: ruling.ts, requestId, evidenceKey: req.evidenceKey, rationale, score, judgeNote, objections: req.objections.slice() });
    next.history.push({ type: 'EVIDENCE_DENIED', ts: ruling.ts, requestId, evidenceKey: req.evidenceKey, rationale, score });
  }
  return { state: next, ruling };
}

// ---- Credibility Engine (minimal) ----
function createCredibilityState() {
  return { witnesses: {}, policy: { clamp: { min: 0.08, max: 0.95 }, weights: { consistency: 0.34, interest: 0.22, memory: 0.24, integrity: 0.2 } } };
}
function registerWitness(cred, witnessKey, base = 0.55) {
  const w = {
    witnessKey,
    base,
    components: { consistency: base, interest: base, memory: base, integrity: base },
    score: base,
    history: [{ type: 'INIT', ts: now(), base }],
  };
  return { ...cred, witnesses: { ...cred.witnesses, [witnessKey]: w } };
}
function computeCredScore(policy, c) {
  const ws = policy.weights;
  const s = (c.consistency ?? 0.5) * ws.consistency + (c.interest ?? 0.5) * ws.interest + (c.memory ?? 0.5) * ws.memory + (c.integrity ?? 0.5) * ws.integrity;
  return clamp(s, policy.clamp.min, policy.clamp.max);
}
function credApply(cred, witnessKey, delta, type, note) {
  const w0 = cred.witnesses[witnessKey] || { witnessKey, base: 0.55, components: { consistency: 0.55, interest: 0.55, memory: 0.55, integrity: 0.55 }, score: 0.55, history: [] };
  const c = { ...w0.components };
  for (const k of ['consistency', 'interest', 'memory', 'integrity']) {
    if (typeof delta[k] === 'number') c[k] = clamp(c[k] + delta[k], 0, 1);
  }
  const score = computeCredScore(cred.policy, c);
  const w = { ...w0, components: c, score, history: [...(w0.history || []), { type, ts: now(), note: note || '', delta, score }] };
  return { ...cred, witnesses: { ...cred.witnesses, [witnessKey]: w } };
}
function impeach(cred, witnessKey, severity = 'strong', note = '') {
  const d = severity === 'weak' ? { consistency: -0.1, memory: -0.04, integrity: -0.03 } : { consistency: -0.18, memory: -0.08, integrity: -0.06 };
  return credApply(cred, witnessKey, d, 'IMPEACH', note);
}
function reinforce(cred, witnessKey, note = '') {
  return credApply(cred, witnessKey, { integrity: +0.08, memory: +0.04 }, 'REINFORCE', note);
}

// ---- Burden Engine (minimal) ----
function createBurdenState() {
  return {
    thresholds: { convict: 0.85, doubt: 0.55, accept: 0.65 },
    claims: {
      identity_20_58: { id: 'identity_20_58', title: '20:58 인물=피고인', score: 0.5 },
      timeline_21_10: { id: 'timeline_21_10', title: '사망시각 21:10', score: 0.5 },
      timeline_20_35: { id: 'timeline_20_35', title: '사망시각 20:35', score: 0.5 },
      opportunity_14f: { id: 'opportunity_14f', title: '범행 기회', score: 0.5 },
    },
    notes: [],
  };
}
function burdenPivot(burden, claimId, note = '') {
  const next = { ...burden, notes: [...(burden.notes || []), { ts: now(), claimId, note }] };
  return next;
}

// ---- Chain Logic (deep steps) ----
function createChainState() {
  return { active: null, completed: new Set(), history: [] };
}
function makeChain(id, steps) {
  return { id, steps: Array.isArray(steps) ? steps : [] };
}
function stepPresent({ role = 'defense', evidence, say, hook }) {
  return { kind: 'present', role, evidence, say, hook };
}
function stepCounter({ role = 'prosecution', injectMany, inject, hook }) {
  return { kind: 'counter', role, injectMany, inject, hook };
}
function stepAdmit({ evidence, purpose = 'foundation', role = 'judge', say, note }) {
  return { kind: 'admit', evidence, purpose, role, say, note };
}
function stepImpeach({ severity = 'strong', injectMany, inject, note, hook }) {
  return { kind: 'impeach', severity, injectMany, inject, note, hook };
}
function stepBurden({ claimId, injectMany, inject, note, hook }) {
  return { kind: 'burden', claimId, injectMany, inject, note, hook };
}
function stepResolve({ role = 'judge', injectMany, inject, hook }) {
  return { kind: 'resolve', role, injectMany, inject, hook };
}

function getChainDefFromStatement(stmt) {
  const c = stmt?.chain;
  if (!c || !isObj(c)) return null;
  const id = c.id;
  const steps = c.steps;
  if (!id || !Array.isArray(steps) || steps.length === 0) return null;
  return { id, steps };
}
function startChain(chain, { lineIndex, weakStmtIndex, chainDef }) {
  if (!chainDef?.id || !Array.isArray(chainDef.steps) || chainDef.steps.length === 0) return { state: chain, ok: false };
  const active = { chainId: chainDef.id, lineIndex, weakStmtIndex, stepIndex: 0, def: chainDef, _admittedSet: null };
  return { state: { ...chain, active }, ok: true };
}
function chainSync(chain, admittedSet) {
  if (!chain.active) return chain;
  return { ...chain, active: { ...chain.active, _admittedSet: admittedSet instanceof Set ? admittedSet : chain.active._admittedSet } };
}
function normalizeInject(line) {
  if (!line || !isObj(line)) return { type: 'talk', charKey: 'narrator', text: '' };
  if (line.type === 'talk') return { type: 'talk', charKey: line.charKey || 'narrator', text: String(line.text ?? ''), face: line.face || 'normal' };
  if (line.type === 'anim') return { type: 'anim', name: line.name || 'flash', sfxKey: line.sfxKey || null };
  if (line.type === 'scene') return { type: 'scene', bgKey: line.bgKey || null, bgmKey: line.bgmKey || null };
  return { type: 'talk', charKey: line.charKey || 'narrator', text: String(line.text ?? '') };
}
function stepChain(chain, action) {
  if (!chain.active) return { state: chain, effects: { fail: { reason: 'no_active_chain' } }, ok: false };
  const a = chain.active;
  const steps = a.def.steps || [];
  const step = steps[a.stepIndex];

  if (!step) {
    return { state: { ...chain, active: null }, effects: { solved: true }, ok: true };
  }

  if (action.type === 'SYNC') {
    return { state: chainSync(chain, action.admittedSet), effects: {}, ok: true };
  }

  if (step.kind === 'admit') {
    if (action.type !== 'NEXT') return { state: chain, effects: { fail: { reason: 'expected_next_for_admit' } }, ok: false };
    const admittedSet = a._admittedSet instanceof Set ? a._admittedSet : null;
    if (!admittedSet || !admittedSet.has(step.evidence)) {
      return { state: chain, effects: { needAdmission: { evidenceKey: step.evidence, purpose: step.purpose, note: step.note || '채택 필요' } }, ok: true };
    }
    const inject = step.say ? [{ type: 'talk', charKey: step.role || 'judge', text: String(step.say) }] : [];
    return {
      state: { ...chain, active: { ...a, stepIndex: a.stepIndex + 1 } },
      effects: { inject },
      ok: true,
    };
  }

  if (step.kind === 'present') {
    if (action.type !== 'PRESENT') return { state: chain, effects: { fail: { reason: 'expected_present' } }, ok: false };
    if (action.role !== (step.role || 'defense')) return { state: chain, effects: { fail: { reason: 'wrong_role' } }, ok: false };
    if (step.evidence && action.evidenceKey !== step.evidence) {
      return { state: chain, effects: { fail: { reason: 'wrong_evidence', expectedEvidence: step.evidence } }, ok: false };
    }
    const inject = [];
    if (step.say) inject.push({ type: 'talk', charKey: action.role === 'defense' ? 'player' : 'prosecutor', text: String(step.say) });
    return { state: { ...chain, active: { ...a, stepIndex: a.stepIndex + 1 } }, effects: { inject, hook: step.hook || null }, ok: true };
  }

  if (step.kind === 'counter') {
    if (action.type !== 'NEXT') return { state: chain, effects: { fail: { reason: 'expected_next_for_counter' } }, ok: false };
    const inject = [];
    if (step.inject) inject.push(normalizeInject(step.inject));
    if (Array.isArray(step.injectMany)) step.injectMany.forEach((x) => inject.push(normalizeInject(x)));
    return { state: { ...chain, active: { ...a, stepIndex: a.stepIndex + 1 } }, effects: { inject, hook: step.hook || null }, ok: true };
  }

  if (step.kind === 'impeach') {
    if (action.type !== 'NEXT') return { state: chain, effects: { fail: { reason: 'expected_next_for_impeach' } }, ok: false };
    const inject = [];
    if (step.inject) inject.push(normalizeInject(step.inject));
    if (Array.isArray(step.injectMany)) step.injectMany.forEach((x) => inject.push(normalizeInject(x)));
    const hook = step.hook || { type: 'CRED_IMPEACH', payload: { witnessKey: 'witness1', severity: step.severity || 'strong', note: step.note || '' } };
    return { state: { ...chain, active: { ...a, stepIndex: a.stepIndex + 1 } }, effects: { inject, hook }, ok: true };
  }

  if (step.kind === 'burden') {
    if (action.type !== 'NEXT') return { state: chain, effects: { fail: { reason: 'expected_next_for_burden' } }, ok: false };
    const inject = [];
    if (step.inject) inject.push(normalizeInject(step.inject));
    if (Array.isArray(step.injectMany)) step.injectMany.forEach((x) => inject.push(normalizeInject(x)));
    const hook = step.hook || { type: 'BURDEN_PIVOT', payload: { claimId: step.claimId || null, note: step.note || '' } };
    return { state: { ...chain, active: { ...a, stepIndex: a.stepIndex + 1 } }, effects: { inject, hook }, ok: true };
  }

  if (step.kind === 'resolve') {
    if (action.type !== 'NEXT') return { state: chain, effects: { fail: { reason: 'expected_next_for_resolve' } }, ok: false };
    const inject = [];
    if (step.inject) inject.push(normalizeInject(step.inject));
    if (Array.isArray(step.injectMany)) step.injectMany.forEach((x) => inject.push(normalizeInject(x)));
    const nextState = { ...chain, active: { ...a, stepIndex: a.stepIndex + 1 } };
    // if resolve ended chain
    if (a.stepIndex + 1 >= steps.length) {
      return { state: { ...nextState, active: null }, effects: { inject, solved: true, hook: step.hook || null }, ok: true };
    }
    return { state: nextState, effects: { inject, hook: step.hook || null }, ok: true };
  }

  // fallback
  if (action.type === 'NEXT') return { state: { ...chain, active: { ...a, stepIndex: a.stepIndex + 1 } }, effects: {}, ok: true };
  return { state: chain, effects: { fail: { reason: 'unknown_step' } }, ok: false };
}

/* =========================================================
   5) Case Bundle (full) — will be finalized in 3/4, 4/4
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
  meta: { id: 'case_001', title: '밤의 14층', tagline: '확정이 무너지고, 입증 책임이 이동한다', ui: { coverBgKey: 'court' }, rules: { hpMax: 7, requireSolveWeaknessToAdvance: true }, initialEvidence: ['cctv_blindspot','door_access','autopsy','revised_autopsy','printer_log','temp_token','parking_ticket'] },
  assets: {
    bg: { court:'/assets/bg/court_day.webp', hall:'/assets/bg/hallway_dim.webp', press:'/assets/bg/office_14f.webp', tense:'/assets/bg/court_night.webp', ending:'/assets/bg/ending_warm.webp', gameover:'/assets/bg/parking_garage.webp' },
    bgm: { trial:'/assets/bgm/trial.ogg', tense:'/assets/bgm/tense.ogg', climax:'/assets/bgm/climax.ogg', victory:'/assets/bgm/victory.ogg' },
    sfx: { tap:'/assets/sfx/tap.ogg', flash:'/assets/sfx/flash.ogg', objection:'/assets/sfx/objection.ogg', admit:'/assets/sfx/admit.ogg', deny:'/assets/sfx/deny.ogg', success:'/assets/sfx/success.ogg', fail:'/assets/sfx/fail.ogg' },
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
    cctv_blindspot: { name: 'CCTV 사각지대 도면', icon: '🗺️', desc: '반사광 구간으로 얼굴 식별 불가.', admissibility: { type: 'document', hearsayRisk: 'medium' }, integrity: { tamperRisk: 'low' }, chainOfCustody: { continuity: 'stable' }, probativeValue: { strength: 0.65, explains: ['식별 불가'] } },
    door_access: { name: '출입문 카드기록', icon: '🪪', desc: '태그 순간만 기록.', admissibility: { type: 'digital', hearsayRisk: 'low' }, integrity: { tamperRisk: 'medium' }, chainOfCustody: { continuity: 'medium' }, probativeValue: { strength: 0.6, explains: ['태그 이벤트'] } },
    autopsy: { name: '검시 예비 소견서', icon: '🧾', desc: '사망 21:10±20 (초기).', admissibility: { type: 'document', hearsayRisk: 'low' }, integrity: { tamperRisk: 'low' }, chainOfCustody: { continuity: 'high' }, probativeValue: { strength: 0.55, explains: ['시간 범위(초기)'] } },
    revised_autopsy: { name: '검시 보완 소견서', icon: '🧾', desc: '사망 20:35±15로 수정.', admissibility: { type: 'document', hearsayRisk: 'low' }, integrity: { tamperRisk: 'low' }, chainOfCustody: { continuity: 'high' }, probativeValue: { strength: 0.72, explains: ['시간축 갱신'] } },
    printer_log: { name: '프린터 출력 로그', icon: '🖨️', desc: '20:34 A-Temp 토큰.', admissibility: { type: 'digital', hearsayRisk: 'low' }, integrity: { tamperRisk: 'medium' }, chainOfCustody: { continuity: 'medium' }, probativeValue: { strength: 0.66, explains: ['임시 권한'] } },
    temp_token: { name: '임시 인증 토큰', icon: '🔑', desc: '발급/수령 불완전.', admissibility: { type: 'document', hearsayRisk: 'medium' }, integrity: { tamperRisk: 'high' }, chainOfCustody: { continuity: 'low' }, probativeValue: { strength: 0.58, explains: ['무결성 공백'] } },
    parking_ticket: { name: '주차정산 기록', icon: '🅿️', desc: '20:37 정산, 20:39 출차.', admissibility: { type: 'digital', hearsayRisk: 'low' }, integrity: { tamperRisk: 'low' }, chainOfCustody: { continuity: 'high' }, probativeValue: { strength: 0.78, explains: ['독립 고정 로그'] } },
  },
  script: [], // set in 3/4, 4/4
};/* =========================================================
   ✅ SINGLE FILE DEMO (app/page.js) — 3/4
   - Builds script (expert chains), compile to runtime lines
   - Reducer + view builder + integrated engine hook
========================================================= */

/* =========================================================
   6) Expert Script (CASE.script) with deep chains (4~6 steps)
========================================================= */
CASE.script = [
  { type: 'scene', bgKey: 'court', bgmKey: 'trial' },
  { type: 'talk', charKey: 'narrator', text: '심야 오피스 건물 14층에서 살인 사건이 발생했다' },
  { type: 'talk', charKey: 'narrator', text: '피해자는 내부 감사팀 직원, 피고인은 익명 처리된 내부자다' },
  { type: 'talk', charKey: 'judge', text: '오늘은 사실관계만 확인합니다. 입증 책임은 검찰에 있습니다' },
  { type: 'talk', charKey: 'prosecutor', text: '사건은 간단합니다. CCTV, 사망시각, 그리고 출입기록입니다' },
  { type: 'talk', charKey: 'player', text: '간단하다는 말이 제일 위험합니다. “확정”을 “입증”으로 바꾸겠습니다' },
  { type: 'anim', name: 'flash', sfxKey: 'flash' },
  { type: 'talk', charKey: 'judge', text: '좋습니다. 첫 증인을 부르죠' },

  // ROUND 1 (IDENTITY) — 6-step chain
  {
    type: 'trial',
    title: '경비원 박○○의 증언 ①: 로비 인물의 동일성',
    witnessCharKey: 'witness1',
    bgKey: 'hall',
    statements: [
      {
        text: '저는 20:55부터 로비를 보고 있었습니다',
        pressQ: '“보고 있었다”는 의미가 뭡니까? 계속 봤습니까?',
        press: [
          { charKey: 'witness1', text: '계속은 아니고요. 출입 확인도 하고, 무전도 받고…', face: 'sweat' },
          { charKey: 'player', text: '(완전한 감시는 아니었다. 공백이 생긴다.)' },
        ],
      },
      { text: '20:58경, 모자와 코트를 입은 사람이 로비에 들어왔습니다' },
      {
        text: '엘리베이터 앞에서 얼굴은 완벽하진 않았습니다',
        pressQ: '완벽하지 않다—그럼 “확정”은 못 합니다. 맞습니까?',
        press: [
          { charKey: 'witness1', text: '…네. 완벽하진 않았습니다', face: 'sweat' },
          { charKey: 'player', text: '(좋아. 단정 금지.)' },
        ],
      },
      { text: '그 장면은 CCTV에도 남아 있습니다' },
      {
        text: '따라서 20:58의 인물은 피고인으로 확정됩니다',
        weak: true,
        contradictionEvidenceKey: 'cctv_blindspot',
        failMsg: '식별 “확정”을 깨려면 구조적 식별 불가(사각/반사) 증거가 필요하다.',
        chain: makeChain('c1_identity_collapse', [
          stepPresent({
            role: 'defense',
            evidence: 'cctv_blindspot',
            say: '이 구간은 반사광으로 얼굴 식별이 불가능합니다. “확정”은 성립하지 않습니다',
            hook: { type: 'CRED_IMPEACH', payload: { witnessKey: 'witness1', severity: 'weak', note: '식별 확정 주장 약화' } },
          }),
          stepCounter({
            role: 'prosecution',
            injectMany: [
              { type: 'talk', charKey: 'prosecutor', text: '얼굴이 완벽히 안 보여도 됩니다. 우리는 기록으로 갑니다' },
              { type: 'talk', charKey: 'prosecutor', text: '출입기록은 20:28 출입, 21:05 재출입. 공백은 없습니다' },
              { type: 'talk', charKey: 'judge', text: '변호인, 기록을 부정한다면 근거부터 제시하세요' },
            ],
          }),
          stepAdmit({
            evidence: 'door_access',
            purpose: 'timeline',
            role: 'judge',
            say: '출입기록은 채택된 범위에서만 다룹니다',
            note: 'door_access 채택 필요',
          }),
          stepPresent({
            role: 'defense',
            evidence: 'door_access',
            say: '이 기록은 태그 순간만 남습니다. 태그 없는 이동과 대리 태그 가능성을 기록만으로 배제할 수 없습니다',
            hook: { type: 'BURDEN_PIVOT', payload: { claimId: 'opportunity_14f', note: '기회 주장: 기록의 한계 지적' } },
          }),
          stepImpeach({
            severity: 'strong',
            note: '경비원 확정/봤다 진술 탄핵',
            injectMany: [
              { type: 'talk', charKey: 'player', text: '“봤다”는 목격이 아니라 해석입니다. 확정의 근거가 아닙니다' },
              { type: 'talk', charKey: 'prosecutor', text: '해석이든 뭐든, 가장 합리적인 결론은 피고인입니다' },
            ],
            hook: { type: 'CRED_IMPEACH', payload: { witnessKey: 'witness1', severity: 'strong', note: '목격 확정→추정 하향' } },
          }),
          stepBurden({
            claimId: 'identity_20_58',
            note: '동일성 입증책임 전환',
            injectMany: [
              { type: 'talk', charKey: 'judge', text: '지금 상태로는 “확정”을 인정할 수 없습니다. 검찰은 동일성을 더 입증해야 합니다' },
              { type: 'talk', charKey: 'judge', text: '다음은 시간축입니다. 사망시각으로 넘어가겠습니다' },
            ],
            hook: { type: 'BURDEN_PIVOT', payload: { claimId: 'identity_20_58', note: '동일성 claim을 의심 상태로' } },
          }),
          stepResolve({ role: 'judge', inject: { type: 'talk', charKey: 'judge', text: '증인 교체' } }),
        ]),
      },
      { text: '이상입니다' },
    ],
  },

  // ROUND 2 (TOD) — revision chain
  {
    type: 'trial',
    title: '검시관 서○○의 증언 ②: 사망시각의 범위',
    witnessCharKey: 'witness3',
    bgKey: 'tense',
    statements: [
      { text: '직접 사인은 둔기성 두부 손상입니다' },
      { text: '추정시각은 관측치 기반의 범위입니다' },
      {
        text: '사망 추정시각은 21:10을 중심으로 ±20분입니다',
        pressQ: '이건 단정입니까 범위입니까?',
        press: [
          { charKey: 'witness3', text: '범위입니다. 단정은 아닙니다', face: 'normal' },
          { charKey: 'player', text: '(단정 금지. 좋다.)' },
        ],
      },
      {
        text: '따라서 20:50 이전 사망은 가능성이 낮습니다',
        weak: true,
        contradictionEvidenceKey: 'revised_autopsy',
        failMsg: '보완 소견서로 시간축을 이동시켜 단정을 깨야 한다.',
        chain: makeChain('c2_tod_revision', [
          stepPresent({
            role: 'defense',
            evidence: 'revised_autopsy',
            say: '보완 소견서에 따르면 사망시각 범위는 20:35±15로 수정됩니다. “20:50 이전 불가”는 단정입니다',
            hook: { type: 'BURDEN_PIVOT', payload: { claimId: 'timeline_21_10', note: '21:10 claim 약화' } },
          }),
          stepCounter({
            role: 'prosecution',
            injectMany: [
              { type: 'talk', charKey: 'prosecutor', text: '보완은 가정과 모델의 산물입니다. 초기 소견이 무너진다고 결론이 뒤집히진 않습니다' },
              { type: 'talk', charKey: 'judge', text: '검시관, 보완의 근거를 설명하세요' },
            ],
          }),
          stepAdmit({
            evidence: 'revised_autopsy',
            purpose: 'timeline',
            role: 'judge',
            say: '보완 소견서는 채택된 범위에서만 다룹니다',
            note: 'revised_autopsy 채택 필요',
          }),
          stepCounter({
            role: 'judge',
            injectMany: [
              { type: 'talk', charKey: 'witness3', text: '보완은 위 내용물 분석과 환경 변수 교정을 포함합니다. 범위는 좁아지고 근거는 늘었습니다' },
              { type: 'talk', charKey: 'witness3', text: '하지만 여전히 추정입니다. 단일 기록으로 확정하는 건 위험합니다' },
            ],
            hook: { type: 'CRED_REINFORCE', payload: { witnessKey: 'witness3', note: '전문가 설명 강화' } },
          }),
          stepBurden({
            claimId: 'timeline_20_35',
            note: '시간축은 범위로 고정, 단정은 검찰이 입증',
            injectMany: [
              { type: 'talk', charKey: 'player', text: '검사는 범위를 단정으로 바꿉니다. 그 단정이 곧 입증 책임입니다' },
              { type: 'talk', charKey: 'judge', text: '좋습니다. 시간축은 범위로 보겠습니다. 다음은 기록의 무결성입니다' },
            ],
            hook: { type: 'BURDEN_PIVOT', payload: { claimId: 'timeline_20_35', note: '20:35 범위 채택' } },
          }),
          stepResolve({ role: 'judge', inject: { type: 'talk', charKey: 'judge', text: '다음 증인' } }),
        ]),
      },
      { text: '이상입니다' },
    ],
  },

  // ROUND 3 (AUTH/MOTIVE) — A-Temp chain
  {
    type: 'trial',
    title: 'IT관리자 정○○의 증언 ③: 권한과 기록',
    witnessCharKey: 'witness4',
    bgKey: 'press',
    statements: [
      { text: '출입기록은 태그 이벤트만 남습니다' },
      { text: '점검 모드가 걸리면 예외가 발생할 수 있습니다' },
      {
        text: '그러나 사건 시간대에 예외는 없었습니다',
        weak: true,
        contradictionEvidenceKey: 'printer_log',
        failMsg: 'A-Temp(임시 권한) 사용 로그로 예외가 있었음을 증명해야 한다.',
        chain: makeChain('c3_auth_motive', [
          stepPresent({
            role: 'defense',
            evidence: 'printer_log',
            say: '20:34 A-Temp 토큰으로 프린터가 사용됐습니다. 예외가 없었다는 진술은 틀립니다',
            hook: { type: 'CRED_IMPEACH', payload: { witnessKey: 'witness4', severity: 'weak', note: '예외 부정 진술 탄핵' } },
          }),
          stepCounter({
            role: 'prosecution',
            injectMany: [
              { type: 'talk', charKey: 'prosecutor', text: '임시 토큰이 쓰였다는 건 누군가 요청했다는 뜻입니다. 그 요청자는 피고인일 가능성이 큽니다' },
              { type: 'talk', charKey: 'judge', text: '요청자 특정 근거가 있습니까?' },
            ],
          }),
          stepAdmit({
            evidence: 'temp_token',
            purpose: 'chain',
            role: 'judge',
            say: '토큰의 발급/수령 근거를 제시하세요',
            note: 'temp_token 채택 필요',
          }),
          stepPresent({
            role: 'defense',
            evidence: 'temp_token',
            say: '발급/수령자 기록이 불완전합니다. “요청자=피고인”은 추정입니다. 무결성 공백이 존재합니다',
            hook: { type: 'CRED_IMPEACH', payload: { witnessKey: 'witness4', severity: 'strong', note: '기억/추정 결론 탄핵' } },
          }),
          stepImpeach({
            severity: 'strong',
            note: '정상이라면→예외/공백 존재',
            injectMany: [
              { type: 'talk', charKey: 'player', text: '“정상이라면”은 증거가 아닙니다. 예외가 존재하는 순간, 단정은 검찰이 입증해야 합니다' },
              { type: 'talk', charKey: 'judge', text: '맞습니다. 예외가 확인되면 확정은 금지됩니다' },
            ],
            hook: { type: 'BURDEN_PIVOT', payload: { claimId: 'opportunity_14f', note: '권한/무결성 공백으로 의심 확대' } },
          }),
          stepBurden({
            claimId: 'opportunity_14f',
            note: '제3자 권한 개입 가능성으로 합리적 의심 확정',
            injectMany: [
              { type: 'talk', charKey: 'judge', text: '토큰의 주체가 특정되지 않았습니다. 이 상태로 피고인 단정은 어렵습니다' },
              { type: 'talk', charKey: 'judge', text: '마지막으로 독립 고정 기록이 있는지 보겠습니다' },
            ],
          }),
          stepResolve({ role: 'judge', inject: { type: 'talk', charKey: 'judge', text: '최종 쟁점' } }),
        ]),
      },
      { text: '이상입니다' },
    ],
  },

  // ROUND 4 (FIXED LOG) — final
  {
    type: 'trial',
    title: '최후의 논리 ④: 독립 고정 기록',
    witnessCharKey: 'witness3',
    bgKey: 'tense',
    isFinal: true,
    statements: [
      { text: '시간축은 20:20~20:50 범위로 재검토됩니다' },
      { text: '독립 고정 기록이 없다면 단정은 불가능합니다' },
      {
        text: '그런 독립 고정 기록은 없습니다',
        weak: true,
        contradictionEvidenceKey: 'parking_ticket',
        failMsg: '주차정산/출차 기록으로 시간축을 잠가야 한다.',
        chain: makeChain('c4_fixed_log', [
          stepPresent({
            role: 'defense',
            evidence: 'parking_ticket',
            say: '주차정산 20:37, 출차 20:39. 사망 범위 한복판의 독립 고정 기록입니다',
            hook: { type: 'BURDEN_PIVOT', payload: { claimId: 'timeline_20_35', note: '시간축 고정 강화' } },
          }),
          stepCounter({
            role: 'prosecution',
            injectMany: [
              { type: 'talk', charKey: 'prosecutor', text: '차량이 움직였다고 운전자가 피고인이라는 보장은 없습니다' },
              { type: 'talk', charKey: 'prosecutor', text: '대리 출차, 차량 공유. 가능성은 얼마든지 있습니다' },
            ],
          }),
          stepBurden({
            claimId: 'identity_20_58',
            note: '검찰 단정 실패',
            injectMany: [
              { type: 'talk', charKey: 'player', text: '가능성은 검찰의 결론을 돕지 않습니다. 검찰은 단정을 입증해야 합니다' },
              { type: 'talk', charKey: 'judge', text: '검찰은 합리적 의심을 배제할 정도로 입증하지 못했습니다' },
            ],
          }),
          stepResolve({
            role: 'judge',
            injectMany: [
              { type: 'talk', charKey: 'judge', text: '피고인에게 무죄를 선고합니다' },
              { type: 'talk', charKey: 'judge', text: '재판을 종결합니다' },
            ],
          }),
        ]),
      },
      { text: '이상입니다' },
    ],
  },

  { type: 'scene', bgKey: 'ending', bgmKey: 'victory' },
  { type: 'anim', name: 'victory', sfxKey: 'success' },
  { type: 'talk', charKey: 'narrator', text: '법정은 “확정”이 아니라 “입증”으로 움직였다' },
  { type: 'end', text: 'THE END' },
];

/* =========================================================
   7) Compile script -> runtime lines
   - scene / talk / anim / end pass-through
   - trial -> cross_exam with statement normalization
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
    if (raw.type === 'anim') {
      push({ type: 'anim', id: raw.id || uid('anim'), name: raw.name || 'flash', sfxKey: raw.sfxKey || null });
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
        chain: s.chain || null,
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

    // fallback
    push({ ...raw, id: raw.id || uid('line') });
  }

  return { ...bundle, lines, indexById };
}

/* =========================================================
   8) Reducer (base story + CE + HYDRATE)
========================================================= */
const ActionTypes = {
  INIT: 'INIT',
  NEXT: 'NEXT',
  PRESS_START: 'PRESS_START',
  PRESS_NEXT: 'PRESS_NEXT',
  PRESS_END: 'PRESS_END',
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
function stmtAt(line, ceIndex) {
  if (!isCELine(line)) return null;
  const stmts = line.statements || [];
  if (!stmts.length) return null;
  return stmts[clamp(ceIndex, 0, stmts.length - 1)];
}
function weakIndexes(line) {
  if (!isCELine(line)) return [];
  return line._meta?.weakIndexes || [];
}
function solvedSet(state, lineIndex) {
  const set = state.ceSolved?.[lineIndex];
  return set instanceof Set ? set : new Set();
}
function unresolvedCount(state, line, lineIndex) {
  const weak = weakIndexes(line);
  const solved = solvedSet(state, lineIndex);
  let n = 0;
  for (const wi of weak) if (!solved.has(wi)) n++;
  return n;
}
function firstUnresolvedIndex(state, line, lineIndex) {
  const weak = weakIndexes(line);
  const solved = solvedSet(state, lineIndex);
  const first = weak.find((wi) => !solved.has(wi));
  return typeof first === 'number' ? first : 0;
}
function normalizeHydrateState(compiled, incoming) {
  const base = makeInitialState(compiled);
  const s = incoming && typeof incoming === 'object' ? incoming : {};
  const ceSolved = {};
  if (s.ceSolved && typeof s.ceSolved === 'object') {
    for (const [k, v] of Object.entries(s.ceSolved)) {
      if (v instanceof Set) ceSolved[k] = v;
      else if (Array.isArray(v)) ceSolved[k] = new Set(v);
      else ceSolved[k] = new Set();
    }
  }
  const inv = Array.isArray(s.inventory) ? s.inventory.slice() : base.inventory.slice();
  const hpMax = typeof s.hpMax === 'number' && s.hpMax > 0 ? s.hpMax : base.hpMax;
  const hp = typeof s.hp === 'number' ? clamp(s.hp, 0, hpMax) : base.hp;

  const lines = compiled?.lines || [];
  const maxIndex = Math.max(0, lines.length - 1);
  const index = typeof s.index === 'number' ? clamp(s.index, 0, maxIndex) : base.index;

  const line = lines[index];
  const ceTotal = line?.type === 'cross_exam' ? (line.statements?.length || 0) : 0;
  const ceIndex = typeof s.ceIndex === 'number' ? clamp(s.ceIndex, 0, Math.max(0, ceTotal - 1)) : base.ceIndex;

  return {
    ...base,
    index,
    hpMax,
    hp,
    ceIndex,
    pressMode: !!s.pressMode,
    pressIndex: typeof s.pressIndex === 'number' ? Math.max(0, s.pressIndex) : 0,
    evidenceOpen: !!s.evidenceOpen,
    ending: !!s.ending,
    gameOver: !!s.gameOver,
    requireSolveWeaknessToAdvance: typeof s.requireSolveWeaknessToAdvance === 'boolean' ? s.requireSolveWeaknessToAdvance : base.requireSolveWeaknessToAdvance,
    inventory: inv,
    ceSolved,
  };
}
function reducer(compiled, state, action) {
  const lines = compiled?.lines || [];
  const curLine = lines[state.index] || null;

  switch (action.type) {
    case ActionTypes.INIT:
    case ActionTypes.RESET:
      return makeInitialState(compiled);

    case ActionTypes.HYDRATE:
      return normalizeHydrateState(compiled, action.state || action.payload?.state || null);

    case ActionTypes.OPEN_EVIDENCE:
      return { ...state, evidenceOpen: true };
    case ActionTypes.CLOSE_EVIDENCE:
      return { ...state, evidenceOpen: false };

    case ActionTypes.PRESS_START: {
      if (!isCELine(curLine)) return state;
      const stmt = stmtAt(curLine, state.ceIndex);
      if (!stmt?.pressResponse?.length && !stmt?.press) return state;
      return { ...state, pressMode: true, pressIndex: 0 };
    }
    case ActionTypes.PRESS_NEXT: {
      if (!state.pressMode) return state;
      const stmt = stmtAt(curLine, state.ceIndex);
      const n = stmt?.pressResponse?.length || 0;
      if (n <= 0) return { ...state, pressMode: false, pressIndex: 0 };
      if (state.pressIndex < n - 1) return { ...state, pressIndex: state.pressIndex + 1 };
      return { ...state, pressMode: false, pressIndex: 0 };
    }
    case ActionTypes.NEXT: {
      if (state.ending || state.gameOver) return state;

      if (state.pressMode) return reducer(compiled, state, { type: ActionTypes.PRESS_NEXT });

      if (curLine?.type === 'end') return { ...state, ending: true };

      if (isCELine(curLine)) {
        const len = curLine.statements?.length || 0;
        const last = state.ceIndex >= len - 1;
        if (last) {
          const un = unresolvedCount(state, curLine, state.index);
          if (state.requireSolveWeaknessToAdvance && un > 0) return { ...state, ceIndex: firstUnresolvedIndex(state, curLine, state.index) };
          return { ...state, index: clamp(state.index + 1, 0, lines.length - 1), ceIndex: 0 };
        }
        return { ...state, ceIndex: state.ceIndex + 1 };
      }

      return { ...state, index: clamp(state.index + 1, 0, lines.length - 1) };
    }
    case ActionTypes.PRESENT: {
      if (state.ending || state.gameOver) return state;
      if (!isCELine(curLine)) return state;
      const stmt = stmtAt(curLine, state.ceIndex);
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
   9) View Builder (selectors-ish)
========================================================= */
function buildView(compiled, state, injectLine, injectCursor) {
  const lines = compiled.lines || [];
  const line = injectLine || lines[state.index] || null;
  const baseLine = lines[state.index] || null;
  const isCE = baseLine?.type === 'cross_exam';

  const stmt = isCE ? (baseLine.statements?.[state.ceIndex] || null) : null;

  const chars = compiled.characters || {};
  const speakerKey = (() => {
    if (injectLine?.type === 'talk' && injectLine.charKey) return injectLine.charKey;
    if (state.pressMode && stmt?.pressResponse?.[state.pressIndex]?.charKey) return stmt.pressResponse[state.pressIndex].charKey;
    if (isCE) return baseLine.witnessCharKey || 'witness1';
    return baseLine?.charKey || null;
  })();

  const speaker = speakerKey ? (chars[speakerKey] || null) : null;

  const rawText = (() => {
    if (injectLine?.type === 'talk') return String(injectLine.text || '');
    if (state.pressMode && stmt?.pressResponse?.[state.pressIndex]?.text) return String(stmt.pressResponse[state.pressIndex].text);
    if (isCE) return String(stmt?.text || '');
    if (baseLine?.type === 'talk') return String(baseLine.text || '');
    if (baseLine?.type === 'end') return String(baseLine.text || 'THE END');
    return '';
  })();

  const unresolved = isCE ? unresolvedCount(state, baseLine, state.index) : 0;
  const stress = computeStressPack({ hp: state.hp, hpMax: state.hpMax, isCE, unresolvedCount: unresolved, pressMode: state.pressMode });
  const mode = voiceModeFromLine(isCE);

  const seed = hash32(`${speakerKey || ''}::${rawText}::${state.index}::${state.ceIndex}::inj${injectCursor || 0}`);
  const text = speakerKey ? applyVoice(speakerKey, speaker, rawText, { mode, stress, seed }) : rawText;

  const bgKey = baseLine?.bgKey || compiled.meta?.ui?.coverBgKey || 'court';
  const bgClass = compiled.backgrounds?.[bgKey] || 'bg-gradient-to-br from-slate-950 via-slate-900 to-black';

  return {
    line: baseLine,
    injectLine,
    text,
    isCE,
    ceTitle: isCE ? baseLine.title : null,
    ceIndex: isCE ? state.ceIndex : 0,
    ceTotal: isCE ? (baseLine.statements?.length || 0) : 0,
    isFinal: isCE ? !!baseLine.isFinal : false,
    unresolvedCount: unresolved,
    hp: state.hp,
    hpMax: state.hpMax,
    speakerName: speaker?.name || '',
    speakerColor: speaker?.color || '#9CA3AF',
    speakerAvatar: speaker,
    face: injectLine?.face || baseLine?.face || 'normal',
    bgKey,
    bgClass,
    turn: 1 + state.index + (isCE ? state.ceIndex : 0) + (injectLine ? injectCursor + 1 : 0),
    invItems: (state.inventory || []).map((k) => ({ key: k, ...(compiled.evidence?.[k] || { name: k, icon: '🗂️', desc: '' }) })),
    mode: { evidenceOpen: !!state.evidenceOpen, pressMode: !!state.pressMode, injecting: !!injectLine },
  };
        }/* =========================================================
   ✅ SINGLE FILE DEMO (app/page.js) — 4/4
   - Integrated engine (admission + chain + hooks)
   - UI: Evidence / Admission / Verdict / SaveLoad
   - Main Page
========================================================= */

/* =========================================================
   10) Court Systems (single-file)
========================================================= */
function createCourtSystems(caseBundle) {
  // admission
  const admission = createAdmissionState({
    autoAdmit: { enabled: true, allowTypes: ['forensic', 'physical', 'document', 'digital'], maxTamperRisk: 'medium', minContinuity: 'low' },
    judge: { relevanceThreshold: 0.3, probativeThreshold: 0.3, maxTamperRisk: 'high', minContinuity: 'low' },
  });

  // auto-admit initial evidence (best-effort)
  let adm = admission;
  const evMap = caseBundle.evidence || {};
  const inv = caseBundle.meta?.initialEvidence || [];
  for (const k of inv) {
    const req = requestAdmission(adm, evMap, k, { role: 'defense', purpose: 'general', note: '초기 제출' });
    adm = req.state;
    if (req.requestId) {
      const ruled = ruleAdmission(adm, evMap, req.requestId, { mode: 'AUTO', judgeNote: '초기 제출' });
      adm = ruled.state;
    }
  }

  // credibility
  let credibility = createCredibilityState();
  for (const ck of Object.keys(caseBundle.characters || {})) {
    // base role heuristic
    const base = ck === 'judge' ? 0.85 : ck === 'witness3' ? 0.7 : ck === 'witness4' ? 0.6 : ck === 'witness1' ? 0.55 : 0.6;
    credibility = registerWitness(credibility, ck, base);
  }

  // burden
  const burden = createBurdenState();

  // chain
  const chain = createChainState();

  return {
    admission: adm,
    credibility,
    burden,
    chain,
    hookLog: [],
    burdenNotes: [],
  };
}

function applyHookToSystems(sys, hook) {
  if (!hook || !isObj(hook) || !hook.type) return sys;
  const type = String(hook.type);
  const payload = hook.payload || {};
  const next = { ...sys, hookLog: [...(sys.hookLog || []), { ts: now(), type, payload }] };

  if (type === 'CRED_IMPEACH') {
    const w = payload.witnessKey || 'witness1';
    const severity = payload.severity || 'strong';
    const note = payload.note || '';
    next.credibility = impeach(next.credibility, w, severity, note);
    return next;
  }
  if (type === 'CRED_REINFORCE') {
    const w = payload.witnessKey || 'witness3';
    const note = payload.note || '';
    next.credibility = reinforce(next.credibility, w, note);
    return next;
  }
  if (type === 'BURDEN_PIVOT') {
    const claimId = payload.claimId || null;
    const note = payload.note || '';
    next.burden = burdenPivot(next.burden, claimId, note);
    return next;
  }
  return next;
}

/* =========================================================
   11) Integrated Engine Hook (single-file)
   - Handles inject queue, needAdmission, hook apply
========================================================= */
function useIntegratedEngine(caseBundle) {
  const compiled = useMemo(() => compileCase(caseBundle), [caseBundle]);

  const [state, dispatch] = useReducer((s, a) => reducer(compiled, s, a), compiled, makeInitialState);

  // court systems
  const [court, setCourt] = useState(() => createCourtSystems(caseBundle));

  // UI signals
  const [needAdmission, setNeedAdmission] = useState(null);
  const [lastHook, setLastHook] = useState(null);

  // inject queue
  const [injectQueue, setInjectQueue] = useState([]);
  const [injectCursor, setInjectCursor] = useState(0);

  const injecting = injectQueue.length > 0 && injectCursor < injectQueue.length;
  const injectLine = injecting ? injectQueue[injectCursor] : null;

  // build view (voice applied)
  const view = useMemo(() => {
    const v = buildView(compiled, state, injectLine, injectCursor);
    return {
      ...v,
      mode: {
        ...(v.mode || {}),
        needAdmission,
        lastHook,
      },
    };
  }, [compiled, state, injectLine, injectCursor, needAdmission, lastHook]);

  // reset when bundle changes
  useEffect(() => {
    dispatch({ type: ActionTypes.INIT });
    setCourt(createCourtSystems(caseBundle));
    setNeedAdmission(null);
    setLastHook(null);
    setInjectQueue([]);
    setInjectCursor(0);
  }, [caseBundle]); // eslint-disable-line react-hooks/exhaustive-deps

  const flushInject = (lines) => {
    if (!Array.isArray(lines) || lines.length === 0) return;
    setInjectQueue((prev) => prev.concat(lines));
  };

  const consumeInjectNext = () => {
    if (!injecting) return false;
    const cur = injectQueue[injectCursor];
    // scene/anim immediate
    if (cur?.type === 'scene' || cur?.type === 'anim') {
      setInjectCursor((c) => c + 1);
      return true;
    }
    // talk consumes on click
    setInjectCursor((c) => c + 1);
    setTimeout(() => {
      setInjectQueue((q) => {
        const nextCursor = injectCursor + 1;
        if (nextCursor >= q.length) {
          setInjectCursor(0);
          return [];
        }
        return q;
      });
    }, 0);
    return true;
  };

  const preprocessNextForChain = (sys) => {
    if (!sys.chain.active) return { sys, side: { consumed: false } };

    // sync admitted set
    const admittedSet = sys.admission.admitted instanceof Set ? sys.admission.admitted : new Set();
    sys = { ...sys, chain: chainSync(sys.chain, admittedSet).active ? chainSync(sys.chain, admittedSet) : sys.chain };

    const stepped = stepChain(sys.chain, { type: 'NEXT' });
    sys = { ...sys, chain: stepped.state };

    return {
      sys,
      side: {
        consumed: true,
        inject: stepped.effects?.inject,
        solved: stepped.effects?.solved,
        needAdmission: stepped.effects?.needAdmission,
        hook: stepped.effects?.hook,
        fail: stepped.effects?.fail,
      },
    };
  };

  const preprocessPresentForChain = (sys, compiledLines, s, evidenceKey) => {
    const lines = compiledLines.lines || [];
    const line = lines[s.index];
    if (!line || line.type !== 'cross_exam') return { sys, side: { handledByChain: false, allowPresent: true } };
    const stmt = line.statements?.[s.ceIndex];

    // admission gate
    if (!(sys.admission.admitted instanceof Set) || !sys.admission.admitted.has(evidenceKey)) {
      return {
        sys,
        side: {
          handledByChain: false,
          allowPresent: false,
          blockReason: 'not_admitted',
          needAdmission: { evidenceKey, purpose: 'general', note: '이 증거는 아직 채택되지 않았습니다.' },
        },
      };
    }

    const chainDef = getChainDefFromStatement(stmt);
    if (!chainDef) return { sys, side: { handledByChain: false, allowPresent: true } };

    // start chain if not active
    if (!sys.chain.active) {
      const st = startChain(sys.chain, { lineIndex: s.index, weakStmtIndex: s.ceIndex, chainDef });
      if (st.ok) sys = { ...sys, chain: st.state };
    }

    // sync admitted set
    const admittedSet = sys.admission.admitted instanceof Set ? sys.admission.admitted : new Set();
    sys = { ...sys, chain: chainSync(sys.chain, admittedSet) };

    const stepped = stepChain(sys.chain, { type: 'PRESENT', evidenceKey, role: 'defense' });
    sys = { ...sys, chain: stepped.state };

    return {
      sys,
      side: {
        handledByChain: true,
        chainSolved: !!stepped.effects?.solved,
        inject: stepped.effects?.inject,
        needAdmission: stepped.effects?.needAdmission,
        hook: stepped.effects?.hook,
        fail: stepped.effects?.fail,
        blockReason: stepped.effects?.needAdmission ? 'need_admission' : 'chain_in_progress',
        allowPresent: stepped.effects?.fail?.reason === 'wrong_evidence',
      },
    };
  };

  const act = useMemo(() => {
    return {
      next: () => {
        if (consumeInjectNext()) return;

        // chain consumes NEXT if active
        const pre = preprocessNextForChain(court);
        let sysNext = pre.sys;

        if (pre.side?.needAdmission) setNeedAdmission(pre.side.needAdmission);
        if (pre.side?.hook) {
          setLastHook(pre.side.hook);
          sysNext = applyHookToSystems(sysNext, pre.side.hook);
        }

        if (pre.side?.consumed) {
          if (pre.side.inject) flushInject(pre.side.inject);
          setCourt(sysNext);
          return;
        }

        setCourt(sysNext);
        dispatch({ type: ActionTypes.NEXT });
      },

      press: () => {
        if (injecting) return;
        dispatch({ type: ActionTypes.PRESS_START });
      },

      present: (evidenceKey) => {
        if (injecting) return;

        const pre = preprocessPresentForChain(court, compiled, state, evidenceKey);
        let sysNext = pre.sys;

        if (pre.side?.needAdmission) setNeedAdmission(pre.side.needAdmission);
        if (pre.side?.hook) {
          setLastHook(pre.side.hook);
          sysNext = applyHookToSystems(sysNext, pre.side.hook);
        }

        setCourt(sysNext);

        if (pre.side?.handledByChain) {
          if (pre.side.inject) flushInject(pre.side.inject);

          if (pre.side.chainSolved) {
            dispatch({ type: ActionTypes.PRESENT, evidenceKey });
            return;
          }
          if (pre.side.blockReason === 'need_admission') return;
          if (pre.side.blockReason === 'chain_in_progress') return;

          if (pre.side.allowPresent) dispatch({ type: ActionTypes.PRESENT, evidenceKey });
          return;
        }

        if (pre.side?.blockReason === 'not_admitted') return;

        dispatch({ type: ActionTypes.PRESENT, evidenceKey });
      },

      openEvidence: () => {
        if (injecting) return;
        dispatch({ type: ActionTypes.OPEN_EVIDENCE });
      },
      closeEvidence: () => {
        if (injecting) return;
        dispatch({ type: ActionTypes.CLOSE_EVIDENCE });
      },

      reset: () => {
        setInjectQueue([]);
        setInjectCursor(0);
        setNeedAdmission(null);
        setLastHook(null);
        setCourt(createCourtSystems(caseBundle));
        dispatch({ type: ActionTypes.RESET });
      },

      hydrate: (engineState, courtState) => {
        dispatch({ type: ActionTypes.HYDRATE, state: engineState });
        if (courtState) setCourt(courtState);
      },

      ackNeedAdmission: () => setNeedAdmission(null),
      ackHook: () => setLastHook(null),

      // admission UI ops
      offerEvidence: (evidenceKey, purpose = 'general') => {
        const evMap = compiled.evidence || {};
        const req = requestAdmission(court.admission, evMap, evidenceKey, { role: 'defense', purpose, note: 'UI 제출' });
        setCourt((c) => ({ ...c, admission: req.state }));
        return req.requestId;
      },
      objectEvidence: (requestId, ground, argument) => {
        const ob = objectAdmission(court.admission, requestId, { opponentRole: 'prosecution', ground, argument });
        setCourt((c) => ({ ...c, admission: ob.state }));
      },
      ruleEvidence: (requestId, mode, judgeNote) => {
        const evMap = compiled.evidence || {};
        const ruled = ruleAdmission(court.admission, evMap, requestId, { mode, judgeNote });
        setCourt((c) => ({ ...c, admission: ruled.state }));
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compiled, state, injecting, injectCursor, injectQueue, court]);

  return { compiled, state, view, act, court };
}

/* =========================================================
   12) UI Components (Modals/Panels) — minimalist
========================================================= */
const Badge = ({ tone = 'neutral', children }) => {
  const cls =
    tone === 'good'
      ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200'
      : tone === 'bad'
      ? 'bg-rose-500/10 border-rose-400/30 text-rose-200'
      : tone === 'warn'
      ? 'bg-amber-500/10 border-amber-400/30 text-amber-200'
      : 'bg-white/5 border-white/10 text-gray-200';
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${cls}`}>{children}</span>;
};

function AdmissionModal({
  open,
  onClose,
  evidence,
  request,
  admitted,
  denied,
  denial,
  onOffer,
  onObject,
  onRule,
}) {
  const [ground, setGround] = useState('foundation');
  const [argument, setArgument] = useState('');
  const [judgeNote, setJudgeNote] = useState('');
  if (!open) return null;

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
    <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-black/70 backdrop-blur-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/10 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Gavel className="w-5 h-5 text-gray-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-xl font-semibold text-white" style={{ fontFamily: 'Crimson Pro, serif' }}>
                  증거 채택 심리
                </div>
                <Badge tone={status === 'ADMITTED' ? 'good' : status === 'DENIED' ? 'bad' : status === 'PENDING' ? 'warn' : 'neutral'}>
                  {status === 'ADMITTED' ? '채택' : status === 'DENIED' ? '기각' : status === 'PENDING' ? '심리중' : '미신청'}
                </Badge>
              </div>
              <div className="text-sm text-gray-300 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                {evidence?.name || ''} <span className="text-gray-500 font-mono">{evidence?.key || ''}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-gray-200" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start gap-4">
              <div className="text-4xl">{evidence?.icon || '🗂️'}</div>
              <div className="min-w-0">
                <div className="text-lg font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {evidence?.name || '증거'}
                </div>
                <div className="text-sm text-gray-300 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {evidence?.desc || ''}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-semibold text-white mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
              이의 제기
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              <label className="text-sm text-gray-200" style={{ fontFamily: 'Inter, sans-serif' }}>
                주장(선택)
                <textarea value={argument} onChange={(e) => setArgument(e.target.value)} rows={4} className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white resize-none" />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => onObject?.({ ground, argument })}
                disabled={!request?.requestId}
                className="px-4 py-2 rounded-xl bg-amber-600/80 hover:bg-amber-500 text-white font-semibold border border-amber-400/30 disabled:opacity-40"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                이의 제기
              </button>

              <button
                onClick={() => {
                  setArgument('');
                  setGround('foundation');
                }}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold border border-white/10"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                초기화
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-semibold text-white mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
              판사 결정
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm text-gray-200" style={{ fontFamily: 'Inter, sans-serif' }}>
                판사 메모(선택)
                <textarea value={judgeNote} onChange={(e) => setJudgeNote(e.target.value)} rows={3} className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white resize-none" />
              </label>
              <div className="flex flex-wrap gap-2 items-start">
                <button onClick={() => onRule?.({ mode: 'AUTO', judgeNote })} disabled={!request?.requestId} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold border border-white/10 disabled:opacity-40">
                  AUTO
                </button>
                <button onClick={() => onRule?.({ mode: 'ADMIT', judgeNote })} disabled={!request?.requestId} className="px-4 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white font-semibold border border-emerald-400/30 disabled:opacity-40">
                  채택
                </button>
                <button onClick={() => onRule?.({ mode: 'DENY', judgeNote })} disabled={!request?.requestId} className="px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white font-semibold border border-rose-400/30 disabled:opacity-40">
                  기각
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <button onClick={() => onOffer?.()} disabled={!!request?.requestId} className="px-4 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-500 text-white font-semibold border border-blue-400/30 disabled:opacity-40">
                증거 신청
              </button>
              <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold border border-white/10">
                닫기
              </button>
            </div>
          </div>

          {status === 'DENIED' && denial && (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-rose-100 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
              기각 사유: {denial.rationale || '-'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VerdictPanel({ open, onClose, burden }) {
  if (!open) return null;
  const rows = Object.values(burden?.claims || {});
  return (
    <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-black/70 backdrop-blur-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/10 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Scale className="w-5 h-5 text-gray-200" />
            </div>
            <div>
              <div className="text-xl font-semibold text-white" style={{ fontFamily: 'Crimson Pro, serif' }}>
                입증 책임 (Burden)
              </div>
              <div className="text-sm text-gray-300 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                hook(BURDEN_PIVOT) 누적 로그를 포함합니다.
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-gray-200" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold text-white mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
              Claims
            </div>
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="rounded-xl border border-white/10 bg-black/25 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-gray-200" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {r.title}
                    </div>
                    <Badge tone="neutral">{Math.round((r.score || 0) * 100)}%</Badge>
                  </div>
                  <div className="text-xs text-gray-400 mt-1 font-mono">{r.id}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              Pivot Notes
            </div>
            <div className="text-xs text-gray-300 font-mono whitespace-pre-wrap max-h-40 overflow-auto">
              {(burden?.notes || []).map((n, i) => `${i + 1}. ${n.claimId || '-'} :: ${n.note || ''}`).join('\n') || '(없음)'}
            </div>
          </div>
        </div>
      </div>
    </div>
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

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-black/70 backdrop-blur-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/10 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-gray-200" />
            </div>
            <div>
              <div className="text-xl font-semibold text-white" style={{ fontFamily: 'Crimson Pro, serif' }}>
                세이브/로드
              </div>
              <div className="text-sm text-gray-300 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                caseId: <span className="font-mono">{caseId}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-gray-200" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {toast && (
            <div className={`rounded-2xl border p-3 text-sm ${toast.ok ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-100' : 'bg-rose-500/10 border-rose-400/20 text-rose-100'}`} style={{ fontFamily: 'Inter, sans-serif' }}>
              {toast.msg}
            </div>
          )}

          {[1, 2, 3].map((slot) => (
            <div key={slot} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-wrap items-center gap-3">
              <div className="text-sm font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                슬롯 {slot}
              </div>
              <div className="ml-auto flex flex-wrap gap-2">
                <button
                  disabled={busy != null}
                  onClick={() => run(slot, onSave, '저장 완료', '저장 실패')}
                  className="px-4 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-500 text-white font-semibold border border-blue-400/30 disabled:opacity-40"
                >
                  <span className="inline-flex items-center gap-2"><Save className="w-4 h-4" />저장</span>
                </button>
                <button
                  disabled={busy != null}
                  onClick={() => run(slot, onLoad, '로드 완료', '로드 실패')}
                  className="px-4 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white font-semibold border border-emerald-400/30 disabled:opacity-40"
                >
                  <span className="inline-flex items-center gap-2"><FolderOpen className="w-4 h-4" />로드</span>
                </button>
                <button
                  disabled={busy != null}
                  onClick={() => run(slot, onDelete, '삭제 완료', '삭제 실패')}
                  className="px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white font-semibold border border-rose-400/30 disabled:opacity-40"
                >
                  <span className="inline-flex items-center gap-2"><Trash2 className="w-4 h-4" />삭제</span>
                </button>
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-xs text-gray-400 font-mono whitespace-pre-wrap">
            {listSaves().slice(0, 12).join('\n') || '(저장 키 없음)'}
          </div>
        </div>
      </div>
    </div>
  );
}

function EffectLayer({ effectText, overlayMsg, flash }) {
  return (
    <>
      {effectText && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-blue-600/20 to-red-600/20 backdrop-blur-sm">
          <div className="relative">
            <div className="absolute inset-0 bg-white/10 blur-3xl pulse-soft" />
            <h1 className="relative text-8xl md:text-9xl font-bold tracking-tighter text-white drop-shadow-2xl" style={{ fontFamily: 'Crimson Pro, serif' }}>
              {effectText}
            </h1>
          </div>
        </div>
      )}
      {overlayMsg && (
        <div className="absolute inset-0 z-[95] flex items-start justify-center pt-28 pointer-events-none">
          <div className="px-5 py-3 rounded-2xl bg-black/70 border border-white/10 backdrop-blur-xl text-white text-sm font-semibold animate-fade-in">
            {overlayMsg}
          </div>
        </div>
      )}
      {flash && <div className="absolute inset-0 z-[90] bg-white/20 pointer-events-none" />}
    </>
  );
}

function CharacterAvatar({ char, face = 'normal' }) {
  if (!char) return null;
  const src = char.faces?.[face] || char.avatar || null;
  return (
    <div className="absolute bottom-80 left-1/2 -translate-x-1/2 z-10 animate-fade-in pointer-events-none">
      <div className="relative">
        <div className="absolute inset-0 rounded-full blur-2xl opacity-30" style={{ backgroundColor: char.color }} />
        {src ? (
          <img src={src} alt={char.name} className="relative w-32 h-32 rounded-full border-2 border-white/20 shadow-2xl" />
        ) : (
          <div className="relative w-32 h-32 rounded-full border-2 border-white/20 shadow-2xl bg-white/5" />
        )}
      </div>
    </div>
  );
}

function CrossExamPill({ title, isFinal, cur, total, witnessName, unresolvedCount, injecting }) {
  return (
    <div className="absolute top-28 left-1/2 -translate-x-1/2 z-20 animate-slide-up">
      <div className={`px-8 py-3 rounded-full border ${isFinal ? 'bg-red-950/80 border-red-500/50 text-red-200' : 'bg-blue-950/80 border-blue-500/50 text-blue-200'} backdrop-blur-md`}>
        <div className="flex items-center gap-3">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
            {(isFinal ? '최후의 증언' : title) || '심문'} · {cur}/{total} · {witnessName}
            {typeof unresolvedCount === 'number' ? ` · 미해결 ${unresolvedCount}` : ''}
            {injecting ? ' · 반격 진행중' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

function DialogueBox({ name, color, text, onNext, isCE, pressMode, onPress, onOpenEvidence, injecting }) {
  return (
    <div onClick={onNext} className="absolute bottom-0 left-0 right-0 p-6 md:p-8 z-30">
      <div className="max-w-5xl mx-auto">
        {name && (
          <div className="mb-3 ml-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-t-xl bg-black/60 backdrop-blur-md border-t border-x border-white/10">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color || '#9CA3AF' }} />
              <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                {name}
              </span>
            </div>
          </div>
        )}

        <div className="relative bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-7 md:p-8 min-h-[160px] cursor-pointer hover:border-white/20 transition-all group">
          <p className="text-xl leading-relaxed text-white" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
            {text}
          </p>

          {isCE && !pressMode && !injecting && (
            <div className="absolute -top-20 right-0 flex gap-3">
              <button onClick={(e) => (e.stopPropagation(), onPress())} className="flex items-center gap-2 px-6 py-3 bg-blue-600/90 hover:bg-blue-500 text-white font-semibold rounded-xl border border-blue-400/30">
                <Search className="w-5 h-5" />
                추궁
              </button>
              <button onClick={(e) => (e.stopPropagation(), onOpenEvidence())} className="flex items-center gap-2 px-6 py-3 bg-amber-600/90 hover:bg-amber-500 text-white font-semibold rounded-xl border border-amber-400/30">
                <FileText className="w-5 h-5" />
                증거 제시
              </button>
            </div>
          )}

          <div className="absolute bottom-6 right-6 opacity-40 group-hover:opacity-100 transition-opacity pointer-events-none">
            <ChevronRight className="w-6 h-6 text-white animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

function EvidenceModal({ open, items, admittedSet, isTrial, hint, onClose, onPresent, onReset, onOpenAdmission }) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 bg-black/95 backdrop-blur-xl z-40 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <FileText className="w-8 h-8 text-amber-400" />
            <h2 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Crimson Pro, serif' }}>
              증거 목록
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onReset} className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10">
              <RotateCcw className="w-4 h-4" />
              리셋
            </button>
            <button onClick={onClose} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item) => {
            const admitted = admittedSet?.has(item.key);
            return (
              <div key={item.key} className="p-6 border rounded-2xl bg-white/5 border-white/10 hover:border-white/20 transition">
                <button onClick={() => (isTrial ? onPresent(item.key) : null)} className="w-full text-left group">
                  <div className="flex items-start gap-6">
                    <div className="text-5xl flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">{item.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {item.name}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full border ${admitted ? 'border-amber-400/40 text-amber-200 bg-amber-500/10' : 'border-white/10 text-gray-300 bg-black/20'}`}>
                          {admitted ? '채택됨' : '미채택'}
                        </span>
                        <span className="text-xs font-mono px-2 py-1 rounded-full bg-black/30 border border-white/10 text-gray-200">
                          {item.key}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-400 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </button>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-400">{admitted ? '심문에서 제시 가능' : '제시 전 채택 심리 필요'}</div>
                  <button onClick={() => onOpenAdmission(item.key)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold transition">
                    <ShieldAlert className="w-4 h-4" />
                    채택/이의
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   13) Main Page (single-file)
========================================================= */
const globalCss = `
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');
@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.animate-fade-in { animation: fadeIn 0.5s ease-out; }
@keyframes shake { 0%, 100% { transform: translate(0); } 25% { transform: translate(-8px, 4px); } 75% { transform: translate(8px, -4px); } }
.animate-shake { animation: shake 0.25s ease-in-out 3; }
@keyframes pulseSoft { 0%,100% { transform: scale(1); opacity: .75; } 50% { transform: scale(1.03); opacity: 1; } }
.pulse-soft { animation: pulseSoft 1.2s ease-in-out infinite; }
`;

export default function Page() {
  const engine = useIntegratedEngine(CASE);

  // assets
  const assetRef = useRef(null);
  const unlockedRef = useRef(false);

  const [muted, setMuted] = useState(false);
  const [bgUrl, setBgUrl] = useState(null);
  const [bgFallbackClass, setBgFallbackClass] = useState(engine.view.bgClass);

  // UI modals
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [admOpen, setAdmOpen] = useState(false);
  const [admEvidenceKey, setAdmEvidenceKey] = useState(null);
  const [verdictOpen, setVerdictOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  // FX
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [effectText, setEffectText] = useState(null);
  const [overlayMsg, setOverlayMsg] = useState(null);

  const doShake = (ms = 520) => (setShake(true), setTimeout(() => setShake(false), ms));
  const doFlash = (ms = 220) => (setFlash(true), setTimeout(() => setFlash(false), ms));
  const doEffect = (t, ms = 900) => (setEffectText(t), setTimeout(() => setEffectText(null), ms));
  const doOverlay = (t, ms = 1200) => (setOverlayMsg(t), setTimeout(() => setOverlayMsg(null), ms));

  // build asset manager once
  useEffect(() => {
    assetRef.current = createAssetManager(CASE.assets, { bgmVolume: 0.75, sfxVolume: 0.95, sfxPoolSize: 8, bgmFadeMs: 650 });
    assetRef.current.preloadAll({}).catch(() => {});
    assetRef.current.setMuted(muted).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // bg swap
  useEffect(() => {
    const bgKey = engine.view.bgKey || CASE.meta.ui.coverBgKey || 'court';
    setBgFallbackClass(CASE.backgrounds[bgKey] || engine.view.bgClass);
    const url = assetRef.current?.resolveBg(bgKey);
    if (!url) {
      setBgUrl(null);
      return;
    }
    assetRef.current.preloadBg([bgKey]).then(() => setBgUrl(url)).catch(() => setBgUrl(url));
  }, [engine.view.bgKey, engine.view.bgClass]);

  // bgm from scene
  useEffect(() => {
    const line = engine.view.line;
    if (line?.type === 'scene' && line?.bgmKey) {
      assetRef.current?.bgm.play(line.bgmKey).catch(() => {});
    }
  }, [engine.view.line?.type, engine.view.line?.bgmKey]);

  useEffect(() => {
    assetRef.current?.setMuted(muted).catch(() => {});
  }, [muted]);

  const unlockAudioIfNeeded = async () => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;
    await assetRef.current?.bgm.unlock().catch(() => {});
  };
  const playSfx = async (k) => assetRef.current?.sfx.play(k).catch(() => false);

  // needAdmission auto open
  useEffect(() => {
    const na = engine.view.mode?.needAdmission;
    if (!na?.evidenceKey) return;
    setAdmEvidenceKey(na.evidenceKey);
    setAdmOpen(true);
    doOverlay(na.note || '채택 심리가 필요합니다.', 1100);
  }, [engine.view.mode?.needAdmission?.evidenceKey]);

  // hook UX
  useEffect(() => {
    const hk = engine.view.mode?.lastHook;
    if (!hk?.type) return;
    if (hk.type.startsWith('CRED_')) doOverlay('신빙성 반영', 850);
    else if (hk.type.startsWith('BURDEN_')) doOverlay('입증 책임 갱신', 850);
    engine.act.ackHook?.();
  }, [engine.view.mode?.lastHook?.type]);

  // HP change sfx
  const prevHp = useRef(engine.view.hp);
  useEffect(() => {
    if (engine.view.hp < prevHp.current) {
      doShake(520);
      doOverlay('페널티!', 900);
      playSfx('fail');
    }
    prevHp.current = engine.view.hp;
  }, [engine.view.hp]);

  // admitted/denied/pending
  const admittedSet = engine.court.admission?.admitted instanceof Set ? engine.court.admission.admitted : new Set();
  const deniedMap = engine.court.admission?.denied instanceof Map ? engine.court.admission.denied : new Map();
  const pendingList = engine.court.admission?.pending instanceof Map ? Array.from(engine.court.admission.pending.values()) : [];

  const currentRequest = useMemo(() => {
    if (!admEvidenceKey) return null;
    return pendingList.find((r) => r.evidenceKey === admEvidenceKey) || null;
  }, [admEvidenceKey, pendingList]);

  const denial = admEvidenceKey ? deniedMap.get(admEvidenceKey) : null;

  const evidenceObj = useMemo(() => {
    if (!admEvidenceKey) return null;
    const e = engine.compiled.evidence?.[admEvidenceKey];
    return { key: admEvidenceKey, ...(e || { name: admEvidenceKey, icon: '🗂️', desc: '' }) };
  }, [admEvidenceKey, engine.compiled.evidence]);

  // save/load handlers
  const caseId = CASE.meta.id;

  const onSave = async (slot) => {
    const blob = makeSaveBlob({
      caseId,
      engineState: engine.state,
      courtState: {
        admission: {
          admitted: Array.from(engine.court.admission.admitted.values()),
          denied: Array.from(engine.court.admission.denied.entries()),
          pending: Array.from(engine.court.admission.pending.entries()),
          history: engine.court.admission.history || [],
          policy: engine.court.admission.policy || null,
        },
        credibility: engine.court.credibility,
        burden: engine.court.burden,
        chain: engine.court.chain,
        hookLog: engine.court.hookLog || [],
        burdenNotes: engine.court.burdenNotes || [],
      },
    });
    const res = saveToLocalStorage(caseId, slot, blob);
    return { ok: res.ok, msg: res.ok ? `슬롯 ${slot} 저장 완료` : `저장 실패: ${res.reason}` };
  };

  const onLoad = async (slot) => {
    const res = loadFromLocalStorage(caseId, slot);
    if (!res.ok) return { ok: false, msg: `로드 실패: ${res.reason}` };

    const data = res.data;
    const eng = deserializeEngineState(data.engine);

    const courtRaw = data.court || null;
    let courtState = engine.court;
    if (courtRaw?.admission) {
      const adm = courtRaw.admission;
      courtState = {
        ...courtState,
        admission: {
          ...courtState.admission,
          admitted: new Set(adm.admitted || []),
          denied: new Map(adm.denied || []),
          pending: new Map(adm.pending || []),
          history: adm.history || [],
          policy: adm.policy || courtState.admission.policy,
        },
        credibility: courtRaw.credibility || courtState.credibility,
        burden: courtRaw.burden || courtState.burden,
        chain: courtRaw.chain || courtState.chain,
        hookLog: courtRaw.hookLog || [],
        burdenNotes: courtRaw.burdenNotes || [],
      };
    }

    engine.act.hydrate(eng, courtState);
    return { ok: true, msg: `슬롯 ${slot} 로드 완료` };
  };

  const onDelete = async (slot) => {
    const res = deleteFromLocalStorage(caseId, slot);
    return { ok: res.ok, msg: res.ok ? `슬롯 ${slot} 삭제 완료` : `삭제 실패: ${res.reason}` };
  };

  // background style
  const bgStyle = bgUrl ? { backgroundImage: `url(${bgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : null;

  // end/gameover
  if (engine.view.gameOver) {
    return (
      <div className={`h-screen w-full ${bgFallbackClass} text-white flex items-center justify-center p-8`} style={bgStyle || undefined}>
        <style jsx global>{globalCss}</style>
        <div className="max-w-xl w-full bg-black/60 border border-white/10 backdrop-blur-xl rounded-3xl p-8 text-center">
          <div className="text-6xl mb-4">💥</div>
          <div className="text-4xl font-bold mb-3" style={{ fontFamily: 'Crimson Pro, serif' }}>
            게임 오버
          </div>
          <div className="text-gray-300 mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
            페널티가 누적되어 더는 진행할 수 없습니다.
          </div>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => engine.act.reset()} className="px-6 py-3 bg-white text-black font-semibold rounded-xl">
              다시 시작
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (engine.view.ending) {
    return (
      <div className={`h-screen w-full ${bgFallbackClass} text-white flex items-center justify-center p-8`} style={bgStyle || undefined}>
        <style jsx global>{globalCss}</style>
        <div className="max-w-2xl w-full text-center bg-black/50 border border-white/10 backdrop-blur-xl rounded-3xl p-8">
          <Scale className="w-20 h-20 mx-auto mb-6 text-blue-400" />
          <div className="text-6xl font-bold mb-4" style={{ fontFamily: 'Crimson Pro, serif' }}>
            {CASE.meta.title}
          </div>
          <div className="text-gray-300 mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
            {CASE.meta.tagline}
          </div>
          <button onClick={() => engine.act.reset()} className="px-7 py-3 bg-white text-black font-semibold rounded-xl">
            다시하기
          </button>
        </div>
      </div>
    );
  }

  const injecting = !!engine.view.mode?.injecting;

  return (
    <div className={`h-screen w-full relative overflow-hidden select-none transition-all duration-700 ${bgUrl ? '' : bgFallbackClass} ${shake ? 'animate-shake' : ''}`} style={bgStyle || undefined}>
      <style jsx global>{globalCss}</style>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

      {/* Top HUD */}
      <div className="absolute top-6 left-6 z-50 flex items-center gap-3">
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-5 py-3 rounded-full border border-white/10">
          <Scale className="w-5 h-5 text-blue-400" />
          <div className="flex gap-1.5">
            {[...Array(engine.view.hpMax)].map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i < engine.view.hp ? 'bg-blue-400 shadow-lg shadow-blue-400/50' : 'bg-gray-700'}`} />
            ))}
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-black/40 backdrop-blur-md px-5 py-3 rounded-full border border-white/10">
          <Gavel className="w-5 h-5 text-gray-200" />
          <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
            TURN {engine.view.turn}
          </span>
        </div>
      </div>

      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <button onClick={() => setSaveOpen(true)} className="flex items-center justify-center w-11 h-11 rounded-full bg-black/40 border border-white/10 hover:border-white/20">
          <Save className="w-5 h-5 text-gray-200" />
        </button>
        <button onClick={() => setVerdictOpen(true)} className="flex items-center justify-center w-11 h-11 rounded-full bg-black/40 border border-white/10 hover:border-white/20">
          <ScaleIcon className="w-5 h-5 text-gray-200" />
        </button>
        <button
          onClick={async () => {
            await unlockAudioIfNeeded();
            setMuted((m) => !m);
          }}
          className="flex items-center justify-center w-11 h-11 rounded-full bg-black/40 border border-white/10 hover:border-white/20"
        >
          {muted ? <VolumeX className="w-5 h-5 text-gray-200" /> : <Volume2 className="w-5 h-5 text-gray-200" />}
        </button>
        <button onClick={() => (setEvidenceOpen(true), engine.act.openEvidence())} className="flex items-center gap-3 bg-black/40 px-5 py-3 rounded-full border border-white/10 hover:border-white/20">
          <FileText className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
            {engine.view.invItems.length} / {Object.keys(engine.compiled.evidence || {}).length}
          </span>
        </button>
      </div>

      {/* Effects */}
      <EffectLayer effectText={effectText} overlayMsg={overlayMsg} flash={flash} />

      {/* Avatar */}
      <CharacterAvatar char={engine.view.speakerAvatar} face={engine.view.face} />

      {/* CE Pill */}
      {engine.view.isCE && (
        <CrossExamPill
          title={engine.view.ceTitle}
          isFinal={engine.view.isFinal}
          cur={engine.view.ceIndex + 1}
          total={engine.view.ceTotal}
          witnessName={engine.view.speakerName || '증인'}
          unresolvedCount={engine.view.unresolvedCount}
          injecting={injecting}
        />
      )}

      {/* Dialogue */}
      <DialogueBox
        name={engine.view.speakerName}
        color={engine.view.speakerColor}
        text={engine.view.text}
        injecting={injecting}
        isCE={engine.view.isCE}
        pressMode={engine.view.mode.pressMode}
        onPress={async () => {
          await unlockAudioIfNeeded();
          await playSfx('tap');
          engine.act.press();
          const baseLine = engine.compiled.lines[engine.state.index];
          if (baseLine?.type === 'cross_exam') {
            const st = baseLine.statements?.[engine.state.ceIndex];
            if (st?.press) doOverlay(String(st.press), 1000);
          }
        }}
        onOpenEvidence={async () => {
          await unlockAudioIfNeeded();
          await playSfx('tap');
          setEvidenceOpen(true);
          engine.act.openEvidence();
        }}
        onNext={async () => {
          await unlockAudioIfNeeded();
          await playSfx('tap');
          engine.act.next();
        }}
      />

      {/* Evidence Modal */}
      <EvidenceModal
        open={evidenceOpen && engine.view.mode.evidenceOpen}
        items={engine.view.invItems}
        admittedSet={admittedSet}
        isTrial={engine.view.isCE}
        hint={engine.view.isCE && engine.view.unresolvedCount > 0 ? '이 심문은 모순을 해결해야 진행됩니다. 약한 문장에서 증거를 제시하세요.' : null}
        onClose={async () => {
          await unlockAudioIfNeeded();
          await playSfx('tap');
          setEvidenceOpen(false);
          engine.act.closeEvidence();
        }}
        onReset={async () => {
          await unlockAudioIfNeeded();
          await playSfx('tap');
          engine.act.reset();
          doOverlay('리셋', 700);
        }}
        onPresent={async (k) => {
          await unlockAudioIfNeeded();
          await playSfx('flash');
          doFlash(180);
          const prev = engine.view.hp;
          engine.act.present(k);
          setTimeout(async () => {
            if (engine.view.hp < prev) {
              doOverlay('틀렸습니다!', 900);
              doShake(520);
              await playSfx('fail');
            } else {
              doEffect('OBJECTION!', 900);
              doOverlay('모순이다!', 900);
              await playSfx('objection');
            }
          }, 60);
        }}
        onOpenAdmission={(key) => {
          setAdmEvidenceKey(key);
          setAdmOpen(true);
        }}
      />

      {/* Admission Modal */}
      <AdmissionModal
        open={admOpen}
        onClose={() => {
          setAdmOpen(false);
          engine.act.ackNeedAdmission?.();
        }}
        evidence={evidenceObj}
        request={currentRequest}
        admitted={admEvidenceKey ? admittedSet.has(admEvidenceKey) : false}
        denied={admEvidenceKey ? deniedMap.has(admEvidenceKey) : false}
        denial={denial}
        onOffer={async () => {
          if (!admEvidenceKey) return;
          await unlockAudioIfNeeded();
          await playSfx('tap');
          const purpose = engine.view.mode?.needAdmission?.purpose || 'general';
          const reqId = engine.act.offerEvidence(admEvidenceKey, purpose);
          if (reqId) doOverlay('증거 신청 제출', 900);
        }}
        onObject={async ({ ground, argument }) => {
          if (!currentRequest?.requestId) return;
          await unlockAudioIfNeeded();
          await playSfx('tap');
          engine.act.objectEvidence(currentRequest.requestId, ground, argument);
          doOverlay(`이의 제기: ${ground}`, 900);
        }}
        onRule={async ({ mode, judgeNote }) => {
          if (!currentRequest?.requestId) return;
          await unlockAudioIfNeeded();
          engine.act.ruleEvidence(currentRequest.requestId, mode, judgeNote);
          if (mode === 'ADMIT') await playSfx('admit');
          else if (mode === 'DENY') await playSfx('deny');
          else await playSfx('tap');
          doOverlay(mode === 'ADMIT' ? '채택' : mode === 'DENY' ? '기각' : 'AUTO 판정', 900);
          engine.act.ackNeedAdmission?.();
        }}
      />

      {/* Verdict Panel */}
      <VerdictPanel open={verdictOpen} onClose={() => setVerdictOpen(false)} burden={engine.court.burden} />

      {/* Save/Load */}
      <SaveLoadModal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        caseId={caseId}
        onSave={onSave}
        onLoad={onLoad}
        onDelete={onDelete}
      />
    </div>
  );
                 }
