요청하신 테마의 게임 코드를 작성했습니다. **스토리/캐릭터/증거/배경/음악을 JSON처럼 넣으면 자동 배치되는 “역전재판 엔진 단일 파일”**입니다.

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Scale, AlertCircle, FileText, Search, ChevronRight, Volume2, VolumeX, RotateCcw, Music, Image as ImageIcon } from 'lucide-react';

/**
 * AceAttorney Modular Engine (Single File)
 * - 데이터(스토리/캐릭터/증거/배경/BGM/SFX)만 바꾸면 자동으로 게임이 생성되는 틀
 * - Scene/Dialogue/Choice/Investigation(Mini)/Trial(CrossExam)/PresentEvidence/Anim/End 를 DSL로 제공
 * - "자동 할당" 기능:
 *   - 라벨(id) 자동 생성(없으면 내부에서 부여)
 *   - jump/choice next를 라벨로 연결
 *   - evidence_add / evidence_give / evidence_take / inventory 제약
 *   - CrossExam: statements 배열 길이만큼 자동 처리
 *   - 미니게임: items 갯수만큼 자동 그리드 배치
 * - 확장 포인트:
 *   - GAME_DB 아래만 교체하면 케이스 수 만큼 자동 생성
 *   - 장면 배경/음악/효과는 "키"로만 참조
 *   - 나중에 파일 분리하기 좋게 레이어를 나눠둠 (Engine / UI / Content)
 */

/* =========================
   0) 유틸
========================= */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
}
function safeGet(obj, path, fallback) {
  try {
    const parts = path.split('.');
    let cur = obj;
    for (const p of parts) {
      if (cur == null) return fallback;
      cur = cur[p];
    }
    return cur == null ? fallback : cur;
  } catch {
    return fallback;
  }
}
function useLatestRef(value) {
  const r = useRef(value);
  useEffect(() => {
    r.current = value;
  }, [value]);
  return r;
}

/* =========================
   1) 오디오: WebAudio 간단 BGM/SFX
========================= */
function useAudioEngine() {
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const bgmOscRef = useRef(null);
  const bgmGainRef = useRef(null);
  const bgmCfgRef = useRef(null);
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
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (bgmOscRef.current) {
      try {
        bgmOscRef.current.stop();
      } catch {}
      try {
        bgmOscRef.current.disconnect();
      } catch {}
      bgmOscRef.current = null;
    }
    if (bgmGainRef.current) {
      try {
        bgmGainRef.current.disconnect();
      } catch {}
      bgmGainRef.current = null;
    }
    bgmCfgRef.current = null;
  };

  const playBgm = (cfg) => {
    const ctx = ensure();
    if (!ctx || !masterRef.current) return;
    if (!cfg) {
      stopBgm();
      return;
    }

    // 같은 설정이면 재시작하지 않음
    const same =
      bgmCfgRef.current &&
      bgmCfgRef.current.type === cfg.type &&
      bgmCfgRef.current.freq === cfg.freq &&
      bgmCfgRef.current.rate === cfg.rate &&
      bgmCfgRef.current.volume === cfg.volume;
    if (same) return;

    stopBgm();

    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = cfg.type || 'sine';
    o.frequency.value = cfg.freq || 220;
    // LFO 느낌으로 간단 비브라토/펄스
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = cfg.rate || 0.2;
    lfoGain.gain.value = (cfg.depth ?? 6);

    lfo.connect(lfoGain);
    lfoGain.connect(o.frequency);

    g.gain.value = cfg.volume ?? 0.03;

    o.connect(g);
    g.connect(masterRef.current);

    o.start();
    lfo.start();

    bgmOscRef.current = o;
    bgmGainRef.current = g;
    bgmCfgRef.current = { ...cfg };

    // tidy
    o.onended = () => {
      try { lfo.stop(); } catch {}
      try { lfo.disconnect(); } catch {}
      try { lfoGain.disconnect(); } catch {}
    };
  };

  const sfxBeep = (freq = 880, dur = 0.07, vol = 0.06, type = 'square') => {
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
      try { o.stop(); } catch {}
      try { o.disconnect(); } catch {}
      try { g.disconnect(); } catch {}
    }, dur * 1000);
  };

  return { muted, setMasterMuted, playBgm, stopBgm, sfxBeep };
}

/* =========================
   2) 콘텐츠 DB (여기만 바꾸면 자동 생성)
   - case 목록을 늘리면 자동으로 Case Select 화면에서 분배
========================= */
const GAME_DB = {
  meta: {
    title: 'Ace Modular Court',
    subtitle: '데이터만 넣으면 자동 생성되는 역전재판형 엔진',
  },

  // 배경 키 -> Tailwind 클래스 or 커스텀
  backgrounds: {
    prologue: 'bg-gradient-to-b from-slate-950 via-slate-900 to-black',
    artRoom: 'bg-gradient-to-br from-indigo-950 to-slate-900',
    hallway: 'bg-gradient-to-b from-slate-800 to-slate-900',
    storage: 'bg-gradient-to-br from-amber-950 to-slate-900',
    court: 'bg-gradient-to-b from-slate-900 to-slate-800',
    ending: 'bg-gradient-to-br from-slate-950 via-slate-900 to-black',
    gameover: 'bg-gradient-to-br from-black via-red-950 to-slate-950',
  },

  // BGM 키 -> WebAudio 간단 설정(실제 mp3로 바꾸려면 추후 교체)
  bgm: {
    calm: { type: 'sine', freq: 180, rate: 0.15, depth: 5, volume: 0.02 },
    tense: { type: 'triangle', freq: 240, rate: 0.22, depth: 7, volume: 0.025 },
    trial: { type: 'square', freq: 210, rate: 0.35, depth: 9, volume: 0.02 },
    victory: { type: 'sine', freq: 420, rate: 0.12, depth: 3, volume: 0.025 },
  },

  // SFX 키(간단 비프)
  sfx: {
    tap: { freq: 520, dur: 0.04, vol: 0.035, type: 'square' },
    success: { freq: 980, dur: 0.06, vol: 0.06, type: 'square' },
    fail: { freq: 210, dur: 0.08, vol: 0.06, type: 'sawtooth' },
    objection: { freq: 1080, dur: 0.07, vol: 0.08, type: 'square' },
    flash: { freq: 760, dur: 0.03, vol: 0.03, type: 'triangle' },
  },

  // 캐릭터 키 -> 자동 UI
  characters: {
    judge: {
      name: '재판장',
      color: '#6B7280',
      avatar:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23374151'/%3E%3Ctext x='50' y='60' font-size='40' text-anchor='middle' fill='white'%3E⚖%3C/text%3E%3C/svg%3E",
    },
    prosecutor: {
      name: '나검사',
      color: '#DC2626',
      avatar:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23DC2626'/%3E%3Ctext x='50' y='60' font-size='40' text-anchor='middle' fill='white'%3E검%3C/text%3E%3C/svg%3E",
    },
    player: {
      name: '김변호',
      color: '#2563EB',
      avatar:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%232563EB'/%3E%3Ctext x='50' y='60' font-size='40' text-anchor='middle' fill='white'%3E변%3C/text%3E%3C/svg%3E",
    },
    witness: {
      name: '최태오',
      color: '#10B981',
      avatars: {
        normal:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%2310B981'/%3E%3Ctext x='50' y='60' font-size='35' text-anchor='middle' fill='white'%3E태오%3C/text%3E%3C/svg%3E",
        sweat:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23FBBF24'/%3E%3Ctext x='50' y='60' font-size='35' text-anchor='middle' fill='white'%3E😰%3C/text%3E%3C/svg%3E",
        angry:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23EF4444'/%3E%3Ctext x='50' y='60' font-size='35' text-anchor='middle' fill='white'%3E😡%3C/text%3E%3C/svg%3E",
        breakdown:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23DC2626'/%3E%3Ctext x='50' y='60' font-size='35' text-anchor='middle' fill='white'%3E🤯%3C/text%3E%3C/svg%3E",
      },
    },
    jimin: {
      name: '이지민',
      color: '#8B5CF6',
      avatar:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%238B5CF6'/%3E%3Ctext x='50' y='60' font-size='35' text-anchor='middle' fill='white'%3E지민%3C/text%3E%3C/svg%3E",
    },
    narrator: { name: '내레이션', color: '#9CA3AF', avatar: null },
    police: {
      name: '경찰',
      color: '#1F2937',
      avatar:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%231F2937'/%3E%3Ctext x='50' y='60' font-size='40' text-anchor='middle' fill='white'%3E경%3C/text%3E%3C/svg%3E",
    },
  },

  // 증거 정의(키 기반)
  evidence: {
    floor_photo: { name: '현장 바닥 사진', icon: '📸', desc: '반경 2m 물감 범벅.' },
    picture: { name: '훼손된 그림', icon: '🖼️', desc: '붉은 물감으로 뒤덮인 태오의 작품.' },
    cctv: { name: '복도 CCTV', icon: '📹', desc: '15:58~16:02 복도에 아무도 없었다.' },
    storage_photo: { name: '창고 창문 사진', icon: '🪟', desc: '쇠창살로 완전히 막혀있음.' },
    apron: { name: '지민의 앞치마', icon: '🎽', desc: '물감 한 방울 없이 깨끗.' },
    stained_glove: { name: '태오의 장갑', icon: '🥊', desc: '★결정적★ 붉은 물감 범벅. [태오] 이름.' },
    police_report: { name: '수색 보고서', icon: '👮', desc: '창고 안 아무도 없었음.' },
    floor_map: { name: '미술실 도면', icon: '🗺️', desc: '앞문과 뒷문 2개 출구.' },
  },

  // 케이스 목록: 늘리면 자동으로 "케이스 선택"에 배분됨
  cases: [
    {
      id: 'case_art_room',
      title: '역전의 미술실',
      tagline: '그림 훼손 사건의 진실',
      coverBgKey: 'artRoom',
      defaultBgmKey: 'calm',
      hpMax: 5,

      // "라인" DSL: type으로 분기
      // - scene: {bgKey, bgClass?, bgmKey?}
      // - talk: {charKey, text, face?, size?, color?}
      // - choice: {question, options:[{text,next,success?}], onFail?:{...}}
      // - give: {evidenceKeys:[...]} // 여러개 한 번에
      // - mini: {kind:'observation'|'search'|'timing', instruction, attempts?, timeLimit?, items:[{name, icon, correct, give?}]}
      // - trial: {title, isFinal?, statements:[{text, weak?, contradictionEvidenceKey?, failMsg?, pressQ?, press:[{charKey,text,face?}]}]}
      // - anim: {name:'objection'|'flash'|'victory', sfxKey?}
      // - end: {text}
      script: [
        { type: 'scene', bgKey: 'prologue', bgmKey: 'calm' },
        { type: 'talk', charKey: 'narrator', text: '어느 날 오후, 세화고 미술실에서 충격적인 사건이 발생했다.' },
        { type: 'scene', bgKey: 'artRoom', bgmKey: 'tense' },
        { type: 'talk', charKey: 'narrator', text: '미술부 부장 최태오의 수상작이 무참히 훼손당했다.' },
        { type: 'talk', charKey: 'witness', text: '내 그림이... 내 그림이!!!!', face: 'angry' },
        { type: 'talk', charKey: 'narrator', text: '현장에 있던 유일한 사람, 이지민.' },
        { type: 'talk', charKey: 'jimin', text: '저... 정말 아니에요...', face: 'normal' },
        { type: 'talk', charKey: 'player', text: '걱정 마세요. 반드시 진실을 밝혀내겠습니다!' },

        // 탐정
        { type: 'scene', bgKey: 'artRoom', bgmKey: 'calm', id: 'inv_start' },
        { type: 'talk', charKey: 'police', text: '변호사님, 아직 수사 중입니다. 증거는 나중에 법정에서 보세요.' },
        {
          type: 'choice',
          question: '경찰이 출입을 막고 있다.',
          options: [
            { text: '정중히 부탁한다', next: 'inv_ok', success: true },
            { text: '강제로 밀고 들어간다', next: 'inv_fail', success: false },
          ],
        },
        { type: 'talk', id: 'inv_fail', charKey: 'police', text: '뭐 하시는 겁니까?! 이건 방해 행위입니다!' },
        { type: 'talk', charKey: 'player', text: '(젠장... 다시 시도해야겠다.)' },
        { type: 'jump', to: 'inv_start' },

        { type: 'talk', id: 'inv_ok', charKey: 'player', text: '저는 피고인 변호사입니다. 변호 준비를 위해 현장 확인이 필요합니다.' },
        { type: 'talk', charKey: 'police', text: '...알겠습니다. 단, 만지지는 마세요.' },

        {
          type: 'mini',
          kind: 'observation',
          instruction: '현장을 관찰하세요',
          attempts: 2,
          items: [
            { name: '바닥 물감', icon: '🎨', correct: true, give: ['floor_photo'] },
            { name: '그림', icon: '🖼️', correct: true, give: ['picture'] },
            { name: '의자', icon: '🪑', correct: false },
            { name: '환풍기', icon: '🌀', correct: false },
          ],
        },

        { type: 'talk', charKey: 'player', text: '(좋아. 현장 사진과 훼손된 그림... 단서를 모았다.)' },
        { type: 'scene', bgKey: 'hallway', bgmKey: 'tense' },
        { type: 'talk', charKey: 'player', text: '(CCTV실... 잠겨있다.)' },
        {
          type: 'choice',
          question: 'CCTV실 문이 잠겨있다.',
          options: [
            { text: '선생님께 부탁한다', next: 'get_cctv', success: true },
            { text: '문을 억지로 연다', next: 'no_cctv', success: false },
          ],
        },
        { type: 'talk', id: 'no_cctv', charKey: 'player', text: '(위험해... 다른 길을 찾아야 한다.)' },
        { type: 'jump', to: 'get_cctv' }, // 데모: 결국 얻도록

        { type: 'talk', id: 'get_cctv', charKey: 'police', text: 'CCTV요? 자료 확보해뒀습니다.' },
        { type: 'give', evidenceKeys: ['cctv'] },
        { type: 'talk', charKey: 'player', text: '(복도 CCTV... 15:58~16:02 아무도 없다.)' },

        { type: 'scene', bgKey: 'storage', bgmKey: 'calm' },
        {
          type: 'mini',
          kind: 'search',
          instruction: '창고를 수색하세요',
          attempts: 3,
          items: [
            { name: '창문', icon: '🪟', correct: true, give: ['storage_photo'] },
            { name: '수색 보고서', icon: '📋', correct: true, give: ['police_report'] },
            { name: '빈 상자', icon: '📦', correct: false },
            { name: '걸레', icon: '🧽', correct: false },
          ],
        },
        { type: 'give', evidenceKeys: ['floor_map'] },
        { type: 'talk', charKey: 'player', text: '(쇠창살... 탈출 불가능. 도면도 확보.)' },

        { type: 'scene', bgKey: 'artRoom', bgmKey: 'tense' },
        {
          type: 'mini',
          kind: 'timing',
          instruction: '청소부가 오기 전에 빨리!',
          timeLimit: 5,
          giveOnSuccess: ['stained_glove'],
        },
        { type: 'talk', charKey: 'player', text: '(장갑?! 손목에 [태오]... 그리고 붉은 물감 범벅.)' },
        { type: 'give', evidenceKeys: ['apron'] },
        { type: 'talk', charKey: 'player', text: '(지민의 앞치마는 깨끗하다... 마지막 퍼즐이 맞춰졌다.)' },

        // 재판
        { type: 'scene', bgKey: 'court', bgmKey: 'trial' },
        { type: 'talk', charKey: 'judge', text: '재판을 시작합니다.' },
        { type: 'talk', charKey: 'prosecutor', text: '증거는 세 가지입니다. ① 지문, ② 목격자, ③ 스케치북!' },
        {
          type: 'trial',
          title: '목격 증언',
          statements: [
            {
              text: '저는 4시에 앞문으로 미술실에 들어갔습니다.',
              pressQ: '4시 정확히 들어갔나요?',
              press: [{ charKey: 'witness', text: '네, 시계를 봤습니다.', face: 'normal' }],
            },
            {
              text: '그림이 망가져 있었고, 지민이가 나이프를 들고 있었습니다.',
              pressQ: "정확히 '들고' 있었나요?",
              press: [{ charKey: 'witness', text: '옆에 떨어져 있었던 것 같네요.', face: 'sweat' }],
            },
            {
              text: '지민이는 복도로 뛰어갔습니다!',
              weak: true,
              contradictionEvidenceKey: 'cctv',
              failMsg: '복도 CCTV와 관련된 증거가 필요합니다.',
            },
          ],
        },
        { type: 'anim', name: 'objection', sfxKey: 'objection' },
        { type: 'talk', charKey: 'player', text: '이의 있습니다!', size: 'text-3xl', color: 'text-blue-400' },
        { type: 'talk', charKey: 'player', text: '복도 CCTV를 보십시오! 15:58~16:02 사이 아무도 없었습니다!' },

        {
          type: 'trial',
          title: '수정된 증언',
          statements: [
            {
              text: '지민이는 뒷문으로 창고에 들어갔습니다.',
              pressQ: '직접 봤나요?',
              press: [{ charKey: 'witness', text: '네! 뒷문이 열리는 걸 봤어요!', face: 'normal' }],
            },
            {
              text: '창고를 열었을 땐 비어있었어요. 창문으로 탈출했을 겁니다!',
              weak: true,
              contradictionEvidenceKey: 'storage_photo',
              failMsg: '창고 창문에 대한 증거가 필요합니다.',
            },
          ],
        },
        { type: 'anim', name: 'objection', sfxKey: 'objection' },
        { type: 'talk', charKey: 'player', text: '불가능합니다!', size: 'text-3xl', color: 'text-red-500' },
        { type: 'talk', charKey: 'player', text: '쇠창살로 막혀있습니다! 탈출 불가능!' },

        {
          type: 'trial',
          title: '현장 목격',
          isFinal: true,
          statements: [
            {
              text: '지민이가 나이프로 물감통을 찔렀습니다!',
              pressQ: '직접 봤나요?',
              press: [{ charKey: 'witness', text: '펑 하고 터지는 걸 봤어요!', face: 'angry' }],
            },
            {
              text: '지민이는 온몸에 물감을 뒤집어쓰고 웃고 있었어요!',
              weak: true,
              contradictionEvidenceKey: 'apron',
              failMsg: '지민의 옷에 관한 증거가 필요합니다.',
            },
          ],
        },
        { type: 'anim', name: 'objection', sfxKey: 'objection' },
        { type: 'talk', charKey: 'player', text: '온몸에 물감을 뒤집어썼다고요?!', size: 'text-4xl text-red-500' },
        { type: 'talk', charKey: 'player', text: '지민의 앞치마를 보십시오! 물감 한 방울도 없습니다!' },

        { type: 'talk', charKey: 'witness', text: '저는 물감에 손도 안 댔어요!', face: 'sweat' },
        { type: 'talk', charKey: 'player', text: '그럼 이 장갑은 뭡니까!', size: 'text-3xl' },
        { type: 'talk', charKey: 'witness', text: '으... 으아아아악!', face: 'breakdown' },

        { type: 'scene', bgKey: 'ending', bgmKey: 'victory' },
        { type: 'anim', name: 'victory', sfxKey: 'success' },
        { type: 'talk', charKey: 'judge', text: '피고인 이지민에게 무죄를 선고합니다!', size: 'text-3xl' },
        { type: 'end', text: 'THE END' },
      ],
    },
  ],
};

/* =========================
   3) 컴파일러: DSL -> Runtime Lines
   - id 없는 라인은 자동 id 부여
   - jump/to, choice/next는 id로 연결
   - give는 evidence_add로 펼침
   - trial은 cross_exam 형태로 변환
========================= */
function compileCase(dbCase) {
  const lines = [];
  const mapIdToIndex = new Map();

  const pushLine = (line) => {
    const l = { ...line };
    if (!l.id && (l.type === 'scene' || l.type === 'talk' || l.type === 'choice' || l.type === 'trial' || l.type === 'mini')) {
      l.id = uid(l.type);
    }
    const idx = lines.length;
    lines.push(l);
    if (l.id) mapIdToIndex.set(l.id, idx);
  };

  for (const raw of dbCase.script) {
    if (!raw || !raw.type) continue;

    if (raw.type === 'give') {
      const evs = raw.evidenceKeys || [];
      for (const k of evs) pushLine({ type: 'evidence_add', id: k });
      continue;
    }

    if (raw.type === 'scene') {
      pushLine({
        ...raw,
        type: 'scene',
        bgKey: raw.bgKey,
        bgmKey: raw.bgmKey,
      });
      continue;
    }

    if (raw.type === 'talk') {
      pushLine({
        ...raw,
        type: 'talk',
        charKey: raw.charKey,
        text: raw.text ?? '',
        face: raw.face ?? 'normal',
        size: raw.size,
        color: raw.color,
      });
      continue;
    }

    if (raw.type === 'choice') {
      pushLine({
        ...raw,
        type: 'choice',
        question: raw.question ?? '',
        options: (raw.options || []).map((o) => ({ ...o })),
      });
      continue;
    }

    if (raw.type === 'jump') {
      pushLine({ ...raw, type: 'jump', to: raw.to });
      continue;
    }

    if (raw.type === 'mini') {
      pushLine({
        ...raw,
        type: 'mini_game',
        game_type: raw.kind,
        instruction: raw.instruction,
        attempts: raw.attempts,
        time_limit: raw.timeLimit,
        items: raw.items,
        giveOnSuccess: raw.giveOnSuccess,
      });
      continue;
    }

    if (raw.type === 'trial') {
      pushLine({
        ...raw,
        type: 'cross_exam',
        title: raw.title,
        isFinal: !!raw.isFinal,
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

    if (raw.type === 'anim') {
      pushLine({ ...raw, type: 'anim', name: raw.name, sfxKey: raw.sfxKey });
      continue;
    }

    if (raw.type === 'end') {
      pushLine({ ...raw, type: 'end', text: raw.text ?? 'THE END' });
      continue;
    }
  }

  // 2-pass: jump/choice next resolve는 런타임에서 findIndex로 처리하되, 라벨 누락 대비 id 보정용
  return { lines, mapIdToIndex };
}

/* =========================
   4) UI Components (단일 파일 내 모듈화)
========================= */
function TopPills({ hp, hpMax, evCount, evMax, onOpenEvidence, muted, onToggleMute }) {
  return (
    <>
      <div className="absolute top-6 left-6 z-50">
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-5 py-3 rounded-full border border-white/10">
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
      </div>

      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <button
          onClick={onToggleMute}
          className="flex items-center justify-center w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:border-white/20 transition-all"
          aria-label="mute"
        >
          {muted ? <VolumeX className="w-5 h-5 text-gray-200" /> : <Volume2 className="w-5 h-5 text-gray-200" />}
        </button>

        <button
          onClick={onOpenEvidence}
          className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-5 py-3 rounded-full border border-white/10 hover:border-white/20 transition-all"
        >
          <FileText className="w-5 h-5 text-amber-400" strokeWidth={2} />
          <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
            {evCount} / {evMax}
          </span>
        </button>
      </div>
    </>
  );
}

function EffectLayer({ effectText, flash, overlayMsg }) {
  return (
    <>
      {effectText && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-blue-600/20 to-red-600/20 backdrop-blur-sm">
          <div className="relative">
            <div className="absolute inset-0 bg-white/10 blur-3xl pulse-soft"></div>
            <h1
              className="relative text-9xl font-bold tracking-tighter text-white drop-shadow-2xl"
              style={{
                fontFamily: 'Crimson Pro, serif',
                textShadow: '0 0 40px rgba(59, 130, 246, 0.8), 0 0 80px rgba(59, 130, 246, 0.4)',
              }}
            >
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

function CharacterAvatar({ char, face }) {
  const src = char?.avatars?.[face] || char?.avatar || null;
  if (!char) return null;
  return (
    <div className="absolute bottom-80 left-1/2 transform -translate-x-1/2 z-10 animate-fade-in pointer-events-none">
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

function CrossExamPill({ title, isFinal, cur, total }) {
  return (
    <div className="absolute top-28 left-1/2 transform -translate-x-1/2 z-20 animate-slide-up">
      <div
        className={`px-8 py-3 rounded-full border ${
          isFinal ? 'bg-red-950/80 border-red-500/50 text-red-200' : 'bg-blue-950/80 border-blue-500/50 text-blue-200'
        } backdrop-blur-md`}
      >
        <div className="flex items-center gap-3">
          <AlertCircle className="w-4 h-4" strokeWidth={2} />
          <span className="text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
            {isFinal ? '최후의 증언' : title} · {cur}/{total}
          </span>
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
  hintRight = true,
}) {
  return (
    <div onClick={onNext} className="absolute bottom-0 left-0 right-0 p-6 md:p-8 z-30 transition-all duration-500">
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

        <div className="relative bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-7 md:p-8 min-h-[160px] cursor-pointer hover:border-white/20 transition-all duration-300 group">
          <p
            className={`text-xl leading-relaxed ${colorClass || 'text-white'} ${sizeClass || ''}`}
            style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}
          >
            {text}
          </p>

          {isCE && !pressMode && (
            <div className="absolute -top-20 right-0 flex gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPress();
                }}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600/90 hover:bg-blue-500 text-white font-semibold rounded-xl backdrop-blur-sm transition-all duration-300 hover:scale-105 border border-blue-400/30"
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
                className="flex items-center gap-2 px-6 py-3 bg-amber-600/90 hover:bg-amber-500 text-white font-semibold rounded-xl backdrop-blur-sm transition-all duration-300 hover:scale-105 border border-amber-400/30"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <FileText className="w-5 h-5" strokeWidth={2} />
                <span>증거 제시</span>
              </button>
            </div>
          )}

          {hintRight && (
            <div className="absolute bottom-6 right-6 opacity-40 group-hover:opacity-100 transition-opacity pointer-events-none">
              <ChevronRight className="w-6 h-6 text-white animate-pulse" strokeWidth={2} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChoiceModal({ question, options, onPick }) {
  return (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-40 flex items-center justify-center p-6 md:p-8">
      <div className="max-w-2xl w-full space-y-6 animate-slide-up">
        <h2 className="text-2xl font-semibold text-white text-center mb-8" style={{ fontFamily: 'Crimson Pro, serif' }}>
          {question}
        </h2>
        <div className="space-y-4">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => onPick(opt)}
              className="w-full p-6 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-left transition-all duration-300 hover:scale-[1.02] group"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-semibold group-hover:bg-blue-500/30 transition-colors">
                  {i + 1}
                </div>
                <span className="text-lg font-medium text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {opt.text}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniGameModal({ data, attemptsLeft, timeLeft, onPick, onSkip }) {
  return (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-40 flex items-center justify-center p-6 md:p-8">
      <div className="max-w-4xl w-full animate-slide-up">
        <div className="flex items-center justify-between gap-3 mb-8">
          <h2 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Crimson Pro, serif' }}>
            {data.instruction}
          </h2>

          <div className="flex items-center gap-3">
            {(data.game_type === 'search' || data.game_type === 'observation') && (
              <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-200">
                남은 기회: <span className="font-semibold text-white">{attemptsLeft}</span>
              </div>
            )}
            {data.game_type === 'timing' && (
              <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-200">
                남은 시간: <span className="font-semibold text-white">{Math.ceil(timeLeft)}</span>s
              </div>
            )}
            <button
              onClick={onSkip}
              className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white transition-all"
            >
              건너뛰기
            </button>
          </div>
        </div>

        {(data.game_type === 'observation' || data.game_type === 'search') && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
            {data.items.map((item, i) => (
              <button
                key={i}
                onClick={() => onPick(item)}
                className="p-7 md:p-8 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/50 rounded-2xl transition-all duration-300 hover:scale-105 group"
              >
                <div className="text-center">
                  <div className="text-5xl mb-4 opacity-60 group-hover:opacity-100 transition-opacity">{item.icon || '🔎'}</div>
                  <h3 className="text-xl font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {item.name}
                  </h3>
                  {item.correct === false && (
                    <div className="mt-2 text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                      (함정)
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {data.game_type === 'timing' && (
          <div className="flex flex-col items-center justify-center gap-6">
            <div className="text-gray-300 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
              제한 시간 안에 버튼을 눌러 증거를 확보하세요.
            </div>
            <button
              onClick={() => onPick({ correct: true })}
              className="px-16 py-12 bg-red-600/80 hover:bg-red-500 text-white text-2xl font-bold rounded-2xl transition-all duration-300 hover:scale-110 border-2 border-red-400/30 animate-pulse"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              빨리 클릭! ⏱️
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EvidenceModal({ title, items, isTrial, hint, onClose, onPresent, onReset }) {
  return (
    <div className="absolute inset-0 bg-black/95 backdrop-blur-xl z-40 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <FileText className="w-8 h-8 text-amber-400" strokeWidth={2} />
            <h2 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Crimson Pro, serif' }}>
              {title}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-all"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <RotateCcw className="w-4 h-4" />
              <span>리셋</span>
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-all"
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
          <div className="text-center text-gray-400 py-28">
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
                className="p-6 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/50 rounded-2xl transition-all duration-300 hover:scale-[1.02] text-left group"
              >
                <div className="flex items-start gap-6">
                  <div className="text-5xl flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
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

function CaseSelect({ meta, cases, onPick }) {
  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white p-6 md:p-10 relative overflow-hidden">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');

        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slideUp 0.55s cubic-bezier(0.16, 1, 0.3, 1); }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { animation: fadeIn 0.45s ease-out; }

        @keyframes shake {
          0%, 100% { transform: translate(0); }
          25% { transform: translate(-8px, 4px); }
          75% { transform: translate(8px, -4px); }
        }
        .animate-shake { animation: shake 0.25s ease-in-out 3; }

        @keyframes pulseSoft {
          0%,100% { transform: scale(1); opacity: .75; }
          50% { transform: scale(1.03); opacity: 1; }
        }
        .pulse-soft { animation: pulseSoft 1.2s ease-in-out infinite; }
      `}</style>

      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute -top-28 -left-28 w-[34rem] h-[34rem] bg-blue-500 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-28 -right-28 w-[34rem] h-[34rem] bg-purple-500 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-6 mb-10">
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-200">
              <Scale className="w-4 h-4 text-blue-300" />
              <span style={{ fontFamily: 'Inter, sans-serif' }}>{meta.subtitle}</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mt-4" style={{ fontFamily: 'Crimson Pro, serif' }}>
              {meta.title}
            </h1>
            <p className="text-gray-300 mt-3 max-w-2xl" style={{ fontFamily: 'Inter, sans-serif' }}>
              케이스/캐릭터/증거/배경/BGM을 DB에 추가하면 자동으로 플레이 가능한 케이스가 생성됩니다.
            </p>
          </div>

          <div className="hidden md:flex items-center gap-3 animate-fade-in">
            <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-200 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              <span style={{ fontFamily: 'Inter, sans-serif' }}>BG Key</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-200 flex items-center gap-2">
              <Music className="w-4 h-4" />
              <span style={{ fontFamily: 'Inter, sans-serif' }}>BGM Key</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cases.map((c) => (
            <button
              key={c.id}
              onClick={() => onPick(c.id)}
              className="group rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300 p-6 md:p-7 text-left hover:scale-[1.01]"
            >
              <div className={`rounded-2xl overflow-hidden border border-white/10 h-32 ${safeGet(GAME_DB, `backgrounds.${c.coverBgKey}`, 'bg-slate-900')}`}>
                <div className="h-full w-full bg-gradient-to-t from-black/60 to-transparent" />
              </div>

              <div className="mt-5">
                <h2 className="text-2xl font-semibold text-white" style={{ fontFamily: 'Crimson Pro, serif' }}>
                  {c.title}
                </h2>
                <p className="text-gray-300 mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {c.tagline}
                </p>

                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="px-3 py-1 rounded-full bg-black/30 border border-white/10 text-xs text-gray-200" style={{ fontFamily: 'Inter, sans-serif' }}>
                    BG: {c.coverBgKey}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-black/30 border border-white/10 text-xs text-gray-200" style={{ fontFamily: 'Inter, sans-serif' }}>
                    BGM: {c.defaultBgmKey}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-black/30 border border-white/10 text-xs text-gray-200" style={{ fontFamily: 'Inter, sans-serif' }}>
                    HP: {c.hpMax}
                  </span>
                </div>

                <div className="mt-5 text-blue-300 text-sm font-semibold opacity-70 group-hover:opacity-100 transition-opacity" style={{ fontFamily: 'Inter, sans-serif' }}>
                  시작하기 →
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================
   5) 메인 엔진: 런타임 상태머신
========================= */
export default function Page() {
  const audio = useAudioEngine();

  const [pickedCaseId, setPickedCaseId] = useState(null);

  const pickedCase = useMemo(() => {
    if (!pickedCaseId) return null;
    return GAME_DB.cases.find((c) => c.id === pickedCaseId) || null;
  }, [pickedCaseId]);

  const compiled = useMemo(() => {
    if (!pickedCase) return null;
    return compileCase(pickedCase);
  }, [pickedCase]);

  // 런타임: 공통 상태
  const [index, setIndex] = useState(0);
  const [bgKey, setBgKey] = useState('prologue');
  const [hp, setHp] = useState(5);

  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [effectText, setEffectText] = useState(null);
  const [overlayMsg, setOverlayMsg] = useState(null);

  const [evidenceMode, setEvidenceMode] = useState(false);
  const [choiceMode, setChoiceMode] = useState(false);
  const [miniGameMode, setMiniGameMode] = useState(false);
  const [miniGameData, setMiniGameData] = useState(null);

  const [pressMode, setPressMode] = useState(false);
  const [pressIndex, setPressIndex] = useState(0);

  const [ceIndex, setCeIndex] = useState(0);
  const [ceLocked, setCeLocked] = useState(false);

  const [isEnding, setIsEnding] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // inventory: key 배열
  const [invKeys, setInvKeys] = useState([]);

  const hpRef = useLatestRef(hp);
  const idxRef = useLatestRef(index);
  const evidenceModeRef = useLatestRef(evidenceMode);
  const choiceModeRef = useLatestRef(choiceMode);
  const miniGameModeRef = useLatestRef(miniGameMode);
  const pressModeRef = useLatestRef(pressMode);
  const ceLockedRef = useLatestRef(ceLocked);

  // 미니게임 카운터
  const [mgAttemptsLeft, setMgAttemptsLeft] = useState(0);
  const [mgTimeLeft, setMgTimeLeft] = useState(0);
  const mgTimerRef = useRef(null);

  const stopMgTimer = () => {
    if (mgTimerRef.current) {
      clearInterval(mgTimerRef.current);
      mgTimerRef.current = null;
    }
  };

  const doFlash = (ms = 220) => {
    setFlash(true);
    setTimeout(() => setFlash(false), ms);
    const cfg = GAME_DB.sfx.flash;
    audio.sfxBeep(cfg.freq, cfg.dur, cfg.vol, cfg.type);
  };

  const doShake = (ms = 520) => {
    setShake(true);
    setTimeout(() => setShake(false), ms);
  };

  const doEffect = (text, ms = 1200) => {
    setEffectText(text);
    setTimeout(() => setEffectText(null), ms);
  };

  const doOverlay = (text, ms = 1300) => {
    setOverlayMsg(text);
    setTimeout(() => setOverlayMsg(null), ms);
  };

  const sfx = (key) => {
    const cfg = GAME_DB.sfx[key];
    if (!cfg) return;
    audio.sfxBeep(cfg.freq, cfg.dur, cfg.vol, cfg.type);
  };

  const bgClass = useMemo(() => safeGet(GAME_DB, `backgrounds.${bgKey}`, GAME_DB.backgrounds.prologue), [bgKey]);

  const lines = compiled?.lines || [];
  const currentLine = lines[index] || {};
  const isCE = currentLine.type === 'cross_exam';
  const stmt = isCE ? currentLine.statements?.[ceIndex] : null;

  const text = useMemo(() => {
    if (pressMode && stmt?.pressResponse?.[pressIndex]?.text) return stmt.pressResponse[pressIndex].text;
    if (isCE) return stmt?.text || '';
    return currentLine.text || '';
  }, [pressMode, stmt, pressIndex, isCE, currentLine.text]);

  const char = useMemo(() => {
    if (pressMode && stmt?.pressResponse?.[pressIndex]?.charKey) {
      return GAME_DB.characters[stmt.pressResponse[pressIndex].charKey] || null;
    }
    if (isCE) return GAME_DB.characters.witness;
    if (currentLine.charKey) return GAME_DB.characters[currentLine.charKey] || null;
    return null;
  }, [pressMode, stmt, pressIndex, isCE, currentLine.charKey]);

  const face = useMemo(() => {
    if (pressMode && stmt?.pressResponse?.[pressIndex]?.face) return stmt.pressResponse[pressIndex].face;
    return currentLine.face || 'normal';
  }, [pressMode, stmt, pressIndex, currentLine.face]);

  const colorClass = currentLine.color;
  const sizeClass = currentLine.size;

  const invItems = useMemo(() => {
    return invKeys
      .map((k) => {
        const ev = GAME_DB.evidence[k];
        if (!ev) return null;
        return { key: k, ...ev };
      })
      .filter(Boolean);
  }, [invKeys]);

  const hpMax = pickedCase?.hpMax ?? 5;

  const canTapAdvance = !evidenceMode && !choiceMode && !miniGameMode && !isEnding && !gameOver && !ceLocked;

  const gotoId = (id, fallbackDelta = 1) => {
    if (!id) {
      setIndex((p) => clamp(p + fallbackDelta, 0, lines.length - 1));
      return;
    }
    const target = lines.findIndex((l) => l && l.id === id);
    setIndex((p) => (target !== -1 ? target : clamp(p + fallbackDelta, 0, lines.length - 1)));
  };

  const advance = (delta = 1) => setIndex((p) => clamp(p + delta, 0, lines.length - 1));

  const resetRun = () => {
    stopMgTimer();
    setIndex(0);
    setBgKey('prologue');
    setHp(hpMax);
    setShake(false);
    setFlash(false);
    setEffectText(null);
    setOverlayMsg(null);
    setEvidenceMode(false);
    setChoiceMode(false);
    setMiniGameMode(false);
    setMiniGameData(null);
    setPressMode(false);
    setPressIndex(0);
    setCeIndex(0);
    setCeLocked(false);
    setIsEnding(false);
    setGameOver(false);
    setInvKeys([]);
    audio.playBgm(GAME_DB.bgm[pickedCase?.defaultBgmKey] || GAME_DB.bgm.calm);
  };

  // 케이스 선택 시 초기화
  useEffect(() => {
    if (!pickedCase) return;
    setHp(pickedCase.hpMax ?? 5);
    setBgKey(pickedCase.coverBgKey || 'prologue');
    setIndex(0);
    setInvKeys([]);
    setIsEnding(false);
    setGameOver(false);
    setCeIndex(0);
    setCeLocked(false);
    setPressMode(false);
    setPressIndex(0);
    setEvidenceMode(false);
    setChoiceMode(false);
    setMiniGameMode(false);
    setMiniGameData(null);
    audio.playBgm(GAME_DB.bgm[pickedCase.defaultBgmKey] || GAME_DB.bgm.calm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedCaseId]);

  // HP 0 => game over
  useEffect(() => {
    if (hp <= 0 && !gameOver) {
      setGameOver(true);
      setEvidenceMode(false);
      setChoiceMode(false);
      setMiniGameMode(false);
      setPressMode(false);
      setCeLocked(false);
      stopMgTimer();
      audio.playBgm(null);
      sfx('fail');
      doOverlay('판사님이 더는 들어주지 않습니다.', 1500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hp]);

  // 자동 처리: scene/evidence_add/choice/mini/anim/end/jump
  useEffect(() => {
    if (!pickedCase) return;
    if (!currentLine?.type) return;

    if (currentLine.type === 'scene') {
      if (currentLine.bgKey) setBgKey(currentLine.bgKey);
      if (currentLine.bgmKey) audio.playBgm(GAME_DB.bgm[currentLine.bgmKey] || null);
      advance(1);
      return;
    }

    if (currentLine.type === 'evidence_add') {
      const k = currentLine.id;
      if (k && !invKeys.includes(k)) {
        setInvKeys((prev) => (prev.includes(k) ? prev : [...prev, k]));
        sfx('success');
        doFlash(260);
      }
      advance(1);
      return;
    }

    if (currentLine.type === 'choice') {
      setChoiceMode(true);
      return;
    }

    if (currentLine.type === 'mini_game') {
      setMiniGameMode(true);
      setMiniGameData(currentLine);
      const attempts = currentLine.attempts ?? 3;
      setMgAttemptsLeft(attempts);

      if (currentLine.game_type === 'timing') {
        stopMgTimer();
        const limit = currentLine.time_limit ?? 5;
        const start = now();
        setMgTimeLeft(limit);
        mgTimerRef.current = setInterval(() => {
          const left = Math.max(0, limit - (now() - start) / 1000);
          setMgTimeLeft(left);
          if (left <= 0.0001) {
            stopMgTimer();
            sfx('fail');
            doOverlay('시간 초과!', 1100);
            setMiniGameMode(false);
            setMiniGameData(null);
            advance(1);
          }
        }, 60);
      }
      return;
    }

    if (currentLine.type === 'anim') {
      if (currentLine.name === 'objection') {
        doEffect('OBJECTION!', 1200);
        doShake(520);
        sfx(currentLine.sfxKey || 'objection');
        setTimeout(() => advance(1), 950);
        return;
      }
      if (currentLine.name === 'victory') {
        doEffect('VICTORY', 1600);
        sfx(currentLine.sfxKey || 'success');
        setTimeout(() => advance(1), 1450);
        return;
      }
      if (currentLine.name === 'flash') {
        doFlash(220);
        setTimeout(() => advance(1), 320);
        return;
      }
      advance(1);
      return;
    }

    if (currentLine.type === 'jump') {
      gotoId(currentLine.to, 1);
      return;
    }

    if (currentLine.type === 'end') {
      setIsEnding(true);
      audio.playBgm(GAME_DB.bgm.victory);
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // 키보드 지원
  useEffect(() => {
    const onKey = (e) => {
      if (!pickedCase) return;
      if (e.key === 'Escape') {
        if (evidenceModeRef.current) setEvidenceMode(false);
        if (choiceModeRef.current) setChoiceMode(false);
        if (miniGameModeRef.current) {
          setMiniGameMode(false);
          setMiniGameData(null);
          stopMgTimer();
        }
        if (pressModeRef.current) {
          setPressMode(false);
          setPressIndex(0);
        }
      }
      if (e.key === 'Enter' || e.key === ' ') {
        if (canTapAdvance) handleNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedCase, canTapAdvance]);

  const handleNext = () => {
    if (!canTapAdvance) return;
    sfx('tap');

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
      if (ceIndex < len - 1) {
        setCeIndex((p) => p + 1);
      } else {
        setCeIndex(0);
        advance(1);
      }
      return;
    }

    advance(1);
  };

  const handlePickChoice = (opt) => {
    setChoiceMode(false);
    if (opt?.success === true) {
      sfx('success');
      doOverlay('성공!', 600);
    } else if (opt?.success === false) {
      sfx('fail');
      doShake(420);
      doOverlay('실패...', 700);
    }
    gotoId(opt?.next, 1);
  };

  const handleMiniPick = (item) => {
    if (!miniGameData) return;
    const type = miniGameData.game_type;

    if (type === 'timing') {
      stopMgTimer();
      const give = miniGameData.giveOnSuccess || [];
      if (give.length) {
        setInvKeys((prev) => {
          const next = [...prev];
          for (const k of give) if (k && !next.includes(k)) next.push(k);
          return next;
        });
      }
      sfx('success');
      doOverlay('성공! 증거 확보!', 1000);
      setMiniGameMode(false);
      setMiniGameData(null);
      advance(1);
      return;
    }

    const correct = item?.correct !== false;
    if (correct) {
      const give = item?.give || [];
      if (give.length) {
        setInvKeys((prev) => {
          const next = [...prev];
          for (const k of give) if (k && !next.includes(k)) next.push(k);
          return next;
        });
      }
      sfx('success');
      doOverlay('단서 확보!', 900);
      setMiniGameMode(false);
      setMiniGameData(null);
      advance(1);
    } else {
      setMgAttemptsLeft((prev) => {
        const next = prev - 1;
        sfx('fail');
        doOverlay(next > 0 ? `헛수고! 남은 기회 ${next}` : '수색 실패...', 1000);
        if (next <= 0) {
          setMiniGameMode(false);
          setMiniGameData(null);
          advance(1);
          return 0;
        }
        return next;
      });
    }
  };

  const handleSkipMini = () => {
    stopMgTimer();
    setMiniGameMode(false);
    setMiniGameData(null);
    advance(1);
  };

  const handlePress = () => {
    if (!isCE || !stmt?.pressResponse?.length) return;
    setPressMode(true);
    setPressIndex(0);
    doOverlay(stmt.press || '추궁!', 900);
    sfx('tap');
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

  const presentEvidence = (key) => {
    if (!isCE || !stmt) {
      doOverlay('법정에서만 제시할 수 있습니다.', 1100);
      sfx('fail');
      return;
    }

    if (stmt.weakness && stmt.contradiction === key) {
      setCeLocked(true);
      setEvidenceMode(false);
      doEffect('OBJECTION!', 1200);
      doFlash(220);
      doShake(520);
      sfx('objection');
      doOverlay('그 증언은 증거와 모순됩니다!', 900);

      setTimeout(() => {
        setCeLocked(false);
        setCeIndex(0);
        advance(1);
      }, 1100);
    } else {
      doOverlay(stmt.failMsg || '그 증거는 맞지 않습니다!', 1200);
      doShake(520);
      sfx('fail');
      const nextHp = Math.max(0, hpRef.current - 1);
      setHp(nextHp);
    }
  };

  // 케이스 선택 전
  if (!pickedCaseId) {
    return <CaseSelect meta={GAME_DB.meta} cases={GAME_DB.cases} onPick={setPickedCaseId} />;
  }

  // 게임오버
  if (gameOver) {
    return (
      <div className={`h-screen w-full ${GAME_DB.backgrounds.gameover} text-white flex items-center justify-center p-8 relative overflow-hidden`}>
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
            판사님이 더는 들어주지 않습니다.
            <br />
            사건을 처음부터 다시 진행하세요.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setPickedCaseId(null);
                audio.playBgm(null);
              }}
              className="px-6 py-3 bg-white/10 text-white font-semibold rounded-xl border border-white/10 hover:bg-white/15 hover:scale-105 transition-all"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              케이스 선택
            </button>
            <button
              onClick={resetRun}
              className="px-6 py-3 bg-white text-black font-semibold rounded-xl hover:scale-105 transition-all"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              다시 시작
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 엔딩
  if (isEnding) {
    return (
      <div className={`h-screen w-full ${GAME_DB.backgrounds.ending} text-white flex flex-col items-center justify-center p-8 relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10 text-center">
          <Scale className="w-24 h-24 mx-auto mb-8 text-blue-400" strokeWidth={1.5} />
          <h1 className="text-7xl font-bold mb-6 tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
            {pickedCase.title}
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent mx-auto mb-8"></div>
          <p className="text-xl text-gray-300 mb-12 max-w-lg mx-auto leading-relaxed" style={{ fontFamily: 'system-ui, sans-serif' }}>
            사건은 마무리되었다.
            <br />
            진실은 언제나 하나다.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setPickedCaseId(null);
                audio.playBgm(null);
              }}
              className="px-7 py-4 bg-white/10 text-white font-semibold rounded-md hover:bg-white/15 transition-all duration-300 hover:scale-105 border border-white/10"
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              케이스 선택
            </button>
            <button
              onClick={resetRun}
              className="px-10 py-4 bg-white text-black font-semibold rounded-md hover:bg-gray-100 transition-all duration-300 hover:scale-105"
              style={{ fontFamily: 'system-ui, sans-serif' }}
            >
              다시하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 메인 게임 화면
  return (
    <div className={`h-screen w-full relative overflow-hidden select-none transition-all duration-700 ${bgClass} ${shake ? 'animate-shake' : ''}`}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');

        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { animation: fadeIn 0.5s ease-out; }

        @keyframes shake {
          0%, 100% { transform: translate(0); }
          25% { transform: translate(-8px, 4px); }
          75% { transform: translate(8px, -4px); }
        }
        .animate-shake { animation: shake 0.25s ease-in-out 3; }

        @keyframes pulseSoft {
          0%,100% { transform: scale(1); opacity: .75; }
          50% { transform: scale(1.03); opacity: 1; }
        }
        .pulse-soft { animation: pulseSoft 1.2s ease-in-out infinite; }
      `}</style>

      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>

      <TopPills
        hp={hp}
        hpMax={hpMax}
        evCount={invItems.length}
        evMax={Object.keys(GAME_DB.evidence).length}
        onOpenEvidence={() => setEvidenceMode(true)}
        muted={audio.muted}
        onToggleMute={() => audio.setMasterMuted(!audio.muted)}
      />

      <EffectLayer effectText={effectText} flash={flash} overlayMsg={overlayMsg} />

      <CharacterAvatar char={char} face={face} />

      {isCE && (
        <CrossExamPill
          title={currentLine.title}
          isFinal={!!currentLine.isFinal}
          cur={ceIndex + 1}
          total={currentLine.statements?.length || 0}
        />
      )}

      <DialogueBox
        char={char}
        text={text}
        colorClass={colorClass}
        sizeClass={sizeClass}
        onNext={handleNext}
        isCE={isCE}
        pressMode={pressMode}
        onPress={handlePress}
        onOpenEvidence={() => setEvidenceMode(true)}
      />

      {choiceMode && currentLine.type === 'choice' && (
        <ChoiceModal question={currentLine.question} options={currentLine.options || []} onPick={handlePickChoice} />
      )}

      {miniGameMode && miniGameData && (
        <MiniGameModal
          data={miniGameData}
          attemptsLeft={mgAttemptsLeft}
          timeLeft={mgTimeLeft}
          onPick={handleMiniPick}
          onSkip={handleSkipMini}
        />
      )}

      {evidenceMode && (
        <EvidenceModal
          title="증거 목록"
          items={invItems}
          isTrial={isCE}
          hint={isCE && stmt?.weakness ? '팁: 지금 증언은 모순이 있습니다. 알맞은 증거를 제시하세요.' : null}
          onClose={() => setEvidenceMode(false)}
          onPresent={presentEvidence}
          onReset={() => {
            setPickedCaseId(null);
            audio.playBgm(null);
          }}
        />
      )}
    </div>
  );
         }
