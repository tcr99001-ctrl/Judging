'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Scale, AlertCircle, FileText, Search, ChevronRight, Volume2, VolumeX, RotateCcw, Gavel } from 'lucide-react';

/**
 * ✅ 단일 파일(app/page.js) 역전재판형 법정 진실공방 엔진
 * - “현실 미제급” 오리지널 사건(실제 사건/실명/특정 미제 사건명 사용 X)
 * - 법정 공방 50턴+ (증언 문장 60개 이상 + 추궁 + 중간 대사)
 * - 엎치락뒷치락: 6개 심문 라운드(각 라운드 8~12 statement) + 반전 증거 등장
 * - 데이터만 교체하면 자동 생성되는 구조(캐릭터/증거/배경/BGM/스크립트)
 *
 * 사용:
 * - 화면 탭: 다음
 * - 심문 중: [추궁] / [증거 제시]
 * - 증거 제시는 “모순이 있는 문장(weakness:true)”에서만 정답 진행
 * - 틀리면 HP 감소 (0이면 Game Over)
 */

/* =========================
   0) utils
========================= */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
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
   1) WebAudio (simple)
========================= */
function useAudioEngine() {
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const bgmNodesRef = useRef({ o: null, g: null, lfo: null, lfoG: null, cfg: null });
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
    bgmNodesRef.current = { o: null, g: null, lfo: null, lfoG: null, cfg: null };
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

    bgmNodesRef.current = { o, g, lfo, lfoG, cfg: { ...cfg } };
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

  return { muted, setMasterMuted, playBgm, stopBgm, sfxBeep };
}

/* =========================
   2) GAME DB (오리지널 현실감 사건)
========================= */
const GAME_DB = {
  meta: {
    title: '법정 진실공방 엔진',
    subtitle: '오리지널 현실감 사건 · 50턴+ 공방',
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

    // 피고인(익명 처리, 현실감 사건용)
    defendant: {
      name: '피고인(익명)',
      color: '#8B5CF6',
      avatar:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%238B5CF6'/%3E%3Ctext x='50' y='60' font-size='26' text-anchor='middle' fill='white'%3E피고%3C/text%3E%3C/svg%3E",
    },

    // 증인들
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
    usb_photo: { name: 'USB 사진(시간정보)', icon: '💾', desc: '20:36 촬영 메타데이터. 단, 카메라 시계 오차 가능.' },
    printer_log: { name: '프린터 출력 로그', icon: '🖨️', desc: '20:34 “14F-공용프린터” 출력 2장. 사용자 인증 토큰 “A-Temp”.' },
    temp_token: { name: '임시 인증 토큰', icon: '🔑', desc: 'IT가 발급한 1회용 토큰. 발급자/수령자 기록이 불완전.' },
    blood_trace: { name: '혈흔 감정서', icon: '🩸', desc: '피고인 신발에서 미량 혈흔. 2차 전이 가능성 있음.' },
    tool_mark: { name: '둔기(조각상) 감정', icon: '🗿', desc: '사무실 장식 조각상. 손잡이 부분 마모, 지문 불명확.' },
    note_fragment: { name: '쪽지 조각', icon: '🧩', desc: '“20:40… 로비… (찢김)” 필기.' },
    trash_cctv: { name: '쓰레기장 CCTV', icon: '📹', desc: '20:44 누군가 봉투 투척. 얼굴 가림.' },
    bag_receipt: { name: '봉투 구매 영수증', icon: '🛍️', desc: '20:32 편의점 봉투 구매. 결제수단 익명(현금).' },
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

      // DSL
      script: [
        { type: 'scene', bgKey: 'court', bgmKey: 'trial' },
        { type: 'talk', charKey: 'narrator', text: '심야 오피스 건물 14층에서 살인 사건이 발생했다.' },
        { type: 'talk', charKey: 'narrator', text: '피해자는 내부 감사팀 직원. 피고인은 “익명 처리된 내부자”.' },
        { type: 'talk', charKey: 'judge', text: '본 법정은 사실관계 확인을 위해 다수 증인을 채택합니다.' },
        { type: 'talk', charKey: 'prosecutor', text: '피고인은 20:58 로비 CCTV에 등장했고, 21:10 전후 피해자를 살해했습니다.' },
        { type: 'talk', charKey: 'player', text: '증거가 “보이는 것”과 “사실”은 다릅니다. 그 차이를 입증하겠습니다.' },
        { type: 'anim', name: 'flash', sfxKey: 'flash' },
        { type: 'talk', charKey: 'judge', text: '좋습니다. 첫 번째 증인을 부르겠습니다.' },

        /* =========================
           ROUND 1: 경비원 증언 (10 statements)
           weakness: 로비 CCTV의 “확정식별” 주장 깨기 -> 사각지대 도면 제시
        ========================= */
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

        /* =========================
           ROUND 2: 배달기사 증언 (10 statements)
           weakness: 20:46 1402 문앞 전달=피고인 부재 증명? -> 엘리베이터 로그 제시로 “비상모드” 반전
        ========================= */
        {
          type: 'trial',
          title: '배달기사 김○○의 증언 ② (문앞 전달)',
          witnessCharKey: 'witness2',
          bgKey: 'hall',
          statements: [
            { text: '저는 20:46에 14층 1402호 문앞에 물건을 내려놨습니다.' },
            { text: '초인종을 눌렀지만 아무도 응답하지 않았습니다.' },
            { text: '그래서 “문앞” 전달로 처리했습니다. 서명은 없습니다.' },
            { text: '현관 앞 복도는 조용했고, 인기척이 없었습니다.' },
            { text: '그 시간대에 누군가 문을 열었다면 저는 들었을 겁니다.' },
            { text: '따라서 20:46에는 1402 내부에 아무도 없었습니다.' },
            { text: '피고인이 20:58에 로비에 있었다면, 20:46엔 확실히 그 층에 없죠.' },
            { text: '그러니까 검사가 말하는 “20:58 이전 살해 준비”는 말이 안 됩니다.' },
            { text: '제 영수증에도 20:46이 찍혀 있습니다.' },
            {
              text: '결론: 20:46 시점, 피고인이 14층에 있었다는 주장은 성립하지 않습니다.',
              weak: true,
              contradictionEvidenceKey: 'elevator_log',
              failMsg: '배달 시각은 고정이지만, “피고인이 층에 없었다”는 결론은 로그로 깨질 수 있다.',
              pressQ: '당신은 엘리베이터를 이용했습니까?',
              press: [
                { charKey: 'witness2', text: '네. 보통은 카드 태그 없이 호출됩니다.', face: 'normal' },
                { charKey: 'player', text: '(카드 태그가 없다는 건, “기록이 없다”는 의미가 아니다.)' },
              ],
            },
          ],
        },
        { type: 'anim', name: 'objection', sfxKey: 'objection' },
        { type: 'talk', charKey: 'player', text: '잠깐만요. “기록이 없다”가 “이동이 없다”가 아닙니다.', size: 'text-2xl' },
        { type: 'talk', charKey: 'prosecutor', text: '변호인, 당신이 오히려 검찰을 돕는군요?' },
        { type: 'talk', charKey: 'player', text: '(좋아. 첫 반전이다. 이동은 “비상모드”로 가능하다.)' },

        /* =========================
           ROUND 3: 검시관 증언 (12 statements)
           weakness: 사망시각 21:10±20 고정 -> 보완 소견서(20:35±15)로 뒤집기
        ========================= */
        {
          type: 'trial',
          title: '검시관 서○○의 증언 ③ (사망시각)',
          witnessCharKey: 'witness3',
          bgKey: 'tense',
          statements: [
            { text: '피해자의 직접 사인은 둔기성 두부 손상입니다.' },
            { text: '현장 둔기로는 장식 조각상이 의심됩니다.' },
            { text: '외상 형태는 조각상 손잡이와 부합합니다.' },
            { text: '피해자 주변에는 격렬한 몸싸움 흔적이 제한적입니다.' },
            { text: '사망 추정시각은 21:10을 중심으로 ±20분입니다.' },
            { text: '이 범위는 통상적인 체온/경직 소견에 기반합니다.' },
            { text: '따라서 20:50 이전 사망은 가능성이 낮습니다.' },
            { text: '로비 CCTV 20:58과 시간대가 정합합니다.' },
            { text: '게다가 21:05에 피고인의 카드 재출입이 있습니다.' },
            { text: '사망 직전 재출입 → 범행 기회는 충분합니다.' },
            { text: '이 사건은 시간축이 명확합니다.' },
            {
              text: '즉, 사망시각을 흔들 증거는 없습니다.',
              weak: true,
              contradictionEvidenceKey: 'revised_autopsy',
              failMsg: '사망시각은 “보완 소견서”가 핵심이다. 아직 법정에 제출되지 않았다면, 제출을 요구해야 한다.',
              pressQ: '당신은 “위 내용물 분석”을 했습니까?',
              press: [
                { charKey: 'witness3', text: '초기에는 제한적이었습니다. 보완 분석은…', face: 'sweat' },
                { charKey: 'player', text: '(보완 분석이 있다. “초기 소견”을 절대시하면 진다.)' },
              ],
            },
          ],
        },
        { type: 'anim', name: 'objection', sfxKey: 'objection' },
        { type: 'talk', charKey: 'player', text: '이의 있습니다! 검시관의 말은 “초기 소견”에 불과합니다!', size: 'text-3xl', color: 'text-red-500' },
        { type: 'talk', charKey: 'player', text: '보완 소견서에 따르면 사망 추정시각이 20:35±15로 수정됩니다!' },
        { type: 'talk', charKey: 'prosecutor', text: '…수정? 그럼 로비 CCTV 20:58은 “사후 움직임”이 된다.' },
        { type: 'talk', charKey: 'judge', text: '시간축이 뒤집혔군요. 이제 누가 “20:58의 인물”인지가 더 중요해졌습니다.' },

        /* =========================
           ROUND 4: 경비원 재증언 (8 statements)
           weakness: 20:58 인물=피고인 확정 -> CCTV 캡처 자체(화질 불량)로 “확정 불가” 공격
        ========================= */
        {
          type: 'trial',
          title: '경비원 박○○의 증언 ④ (식별)',
          witnessCharKey: 'witness1',
          bgKey: 'hall',
          statements: [
            { text: '저는 20:58의 인물이 피고인이라고 계속 생각합니다.' },
            { text: '모자, 코트, 체형이 유사합니다.' },
            { text: '피고인의 카드기록도 20:28, 21:05로 연결됩니다.' },
            { text: '피고인은 20:33~20:52 기지국 기록도 근처입니다.' },
            { text: '즉, 피고인은 “그 주변”에 있었습니다.' },
            { text: '사망시각이 20:35로 당겨져도, 피고인은 여전히 의심됩니다.' },
            { text: '저는 현장에서 20:58의 인물을 똑똑히 봤습니다.' },
            {
              text: '따라서 20:58 인물은 피고인으로 확정됩니다.',
              weak: true,
              contradictionEvidenceKey: 'cctv_lobby',
              failMsg: '“확정”을 깨려면 로비 CCTV 캡처의 식별 불가능성을 드러내야 한다.',
              pressQ: '당신은 어느 거리에서 봤습니까?',
              press: [
                { charKey: 'witness1', text: '…로비 기둥 뒤쪽에서요. 조명이 좀…', face: 'sweat' },
                { charKey: 'player', text: '(조명. 반사. 화질. “확정”은 무리다.)' },
              ],
            },
          ],
        },
        { type: 'anim', name: 'objection', sfxKey: 'objection' },
        { type: 'talk', charKey: 'player', text: '확정? 불가능합니다.', size: 'text-3xl', color: 'text-blue-400' },
        { type: 'talk', charKey: 'player', text: '로비 CCTV 캡처는 얼굴 식별이 되지 않습니다. “확정”은 추정입니다.' },
        { type: 'talk', charKey: 'prosecutor', text: '좋다. 그럼 남는 건 “출입기록”이다. 피고인이 20:28에 14층에 들어간 건 사실이다.' },

        /* =========================
           ROUND 5: IT관리자 증언 (10 statements)
           weakness: 카드기록=결정적 -> 프린터 로그(20:34 A-Temp)로 “임시토큰/비상모드” 반전
        ========================= */
        {
          type: 'trial',
          title: 'IT관리자 정○○의 증언 ⑤ (기록의 의미)',
          witnessCharKey: 'witness4',
          bgKey: 'press',
          statements: [
            { text: '출입문 카드기록은 “카드가 태그된 순간”만 남습니다.' },
            { text: '피고인 카드: 20:28 14층 출입, 21:05 재출입입니다.' },
            { text: '그 사이에 피고인이 나갔다면 기록이 있어야 합니다.' },
            { text: '그러나 20:28 이후 “피고인 카드로” 나간 기록은 없습니다.' },
            { text: '즉, 피고인은 20:28부터 21:05까지 14층에 있었다고 보는 게 합리적입니다.' },
            { text: '엘리베이터 로그의 “비상모드”는 드문 상황입니다.' },
            { text: '비상모드는 관리 권한이 있어야 합니다.' },
            { text: '또한 비상모드라고 해도 흔적은 남습니다.' },
            { text: '따라서 기록을 뒤집기 어렵습니다.' },
            {
              text: '결론: 기록상 피고인의 알리바이는 성립하지 않습니다.',
              weak: true,
              contradictionEvidenceKey: 'printer_log',
              failMsg: '“기록=절대”를 깨는 건 동일 시스템의 다른 로그(프린터/토큰)이다.',
              pressQ: '당신은 “임시토큰(A-Temp)”을 아십니까?',
              press: [
                { charKey: 'witness4', text: '그건… 일회용 인증 토큰입니다.', face: 'sweat' },
                { charKey: 'player', text: '(드물다? 하지만 존재한다. 그 순간 기록 신뢰도가 흔들린다.)' },
              ],
            },
          ],
        },
        { type: 'anim', name: 'objection', sfxKey: 'objection' },
        { type: 'talk', charKey: 'player', text: '기록이 “절대”라면, 이 로그는 뭡니까?', size: 'text-3xl', color: 'text-red-500' },
        { type: 'talk', charKey: 'player', text: '20:34 공용 프린터 출력. 사용자 토큰은 “A-Temp”입니다!' },
        { type: 'talk', charKey: 'prosecutor', text: '…임시토큰이 사용됐다면, 누군가 “권한”을 갖고 시스템을 조작했을 가능성도 있다.' },
        { type: 'talk', charKey: 'judge', text: '그럼 쟁점은 “누가 임시토큰을 썼는가”로 이동합니다.' },

        /* =========================
           ROUND 6: IT관리자 재증언 (10 statements)
           weakness: 토큰은 피고인이 받았다 -> temp_token(발급 불완전)로 깨고, 최종 반전: 주차정산(20:37) + 보완검시(20:35) 조합으로 “피고인 외부” 설계
        ========================= */
        {
          type: 'trial',
          title: 'IT관리자 정○○의 증언 ⑥ (임시토큰의 행방)',
          witnessCharKey: 'witness4',
          bgKey: 'tense',
          isFinal: true,
          statements: [
            { text: 'A-Temp는 제가 발급할 수 있는 일회용 토큰입니다.' },
            { text: '보통은 출입기 오류나 프린터 인증 오류 때 씁니다.' },
            { text: '20:34 토큰 사용은 “누군가 요청”했음을 의미합니다.' },
            { text: '그 요청자는 현장 근처에 있었을 가능성이 큽니다.' },
            { text: '피고인이 14층에 있었다면, 피고인이 요청했을 수도 있습니다.' },
            { text: '저는 그날 “피고인에게 토큰을 줬다”고 기억합니다.' },
            { text: '따라서 토큰 사용자도 피고인일 겁니다.' },
            { text: '피고인이 토큰으로 프린터를 쓰고, 그 후 범행했을 수 있습니다.' },
            { text: '이건 시스템상 가장 자연스러운 설명입니다.' },
            {
              text: '결론: A-Temp는 피고인의 손에 있었고, 사건 시간대와 일치합니다.',
              weak: true,
              contradictionEvidenceKey: 'temp_token',
              failMsg: '“기억”을 깨려면 “발급 기록 불완전” 자체가 증거다.',
              pressQ: '발급 로그에 “수령자”가 남습니까?',
              press: [
                { charKey: 'witness4', text: '…정상이라면 남지만, 그날은 시스템 점검 중이라…', face: 'sweat' },
                { charKey: 'player', text: '(점검 중? 그럼 “기억”은 증거가 아니다.)' },
              ],
            },
          ],
        },
        { type: 'anim', name: 'objection', sfxKey: 'objection' },
        { type: 'talk', charKey: 'player', text: '이의 있습니다. “기억”은 증거가 아닙니다!', size: 'text-3xl', color: 'text-blue-400' },
        { type: 'talk', charKey: 'player', text: '임시토큰은 발급/수령자 기록이 불완전합니다. 즉, 피고인에게 갔다고 “증명”되지 않습니다.' },
        { type: 'talk', charKey: 'prosecutor', text: '그래도 피고인은 기지국 기록이 20:33~20:52 “근처”다.' },
        { type: 'talk', charKey: 'player', text: '근처는 “근처”일 뿐. 그래서 저는 시간축을 “물리적으로” 고정하겠습니다.' },

        // 최종 결론 파트: “사망시각 20:35±15” + “주차정산 20:37/출차 20:39”로 피고인이 건물 외부에 있었던 가능성 제시
        {
          type: 'trial',
          title: '최후의 논리 ⑦ (시간축 고정)',
          witnessCharKey: 'witness3',
          bgKey: 'tense',
          isFinal: true,
          statements: [
            { text: '보완 소견서에 따르면 사망 추정시각은 20:35±15입니다.' },
            { text: '즉, 20:20~20:50 사이에 사망했을 가능성이 큽니다.' },
            { text: '이 시간대는 배달(20:46)과 겹칩니다.' },
            { text: '하지만 배달은 “문앞” 전달이라 실내를 확인하지 못했습니다.' },
            { text: '따라서 범행은 20:35 전후에도 가능했습니다.' },
            { text: '그럼 피고인의 위치가 핵심이 됩니다.' },
            { text: '기지국 기록은 실내/실외를 구분하지 못합니다.' },
            { text: '출입기록은 카드 태그가 없으면 공백이 생깁니다.' },
            { text: '따라서 “결정적”인 것은 제3의 고정 기록입니다.' },
            {
              text: '그런 고정 기록은 존재하지 않습니다.',
              weak: true,
              contradictionEvidenceKey: 'parking_ticket',
              failMsg: '시간축 고정의 마지막 퍼즐은 “주차정산/출차”다.',
              pressQ: '당신은 사건일지를 전체로 봤습니까?',
              press: [
                { charKey: 'witness3', text: '검시는… 의학 소견입니다. 다른 기록은 수사 파트죠.', face: 'normal' },
                { charKey: 'player', text: '(좋아. 의학은 시간 “범위”를 주고, 고정은 다른 기록이 한다.)' },
              ],
            },
          ],
        },
        { type: 'anim', name: 'objection', sfxKey: 'objection' },
        { type: 'talk', charKey: 'player', text: '존재합니다. “주차정산 기록”.', size: 'text-4xl text-red-500' },
        { type: 'talk', charKey: 'player', text: '20:37 정산 완료, 20:39 출차. 사망 범위(20:20~20:50) 한복판입니다.' },
        { type: 'talk', charKey: 'prosecutor', text: '…피고인이 출차했다면, 14층에 있을 수 없다. 그럼 20:28 출입 이후 이동은?' },
        { type: 'talk', charKey: 'player', text: '바로 그 지점에서 “비상모드/임시토큰”이 의미를 갖습니다.' },
        { type: 'talk', charKey: 'judge', text: '검찰은 “확정”을 말했고, 변호인은 “고정 기록”으로 시간을 잠갔습니다.' },
        { type: 'talk', charKey: 'judge', text: '이 법정은 합리적 의심을 배제할 만큼의 입증이 부족하다고 판단합니다.' },
        { type: 'scene', bgKey: 'ending', bgmKey: 'victory' },
        { type: 'anim', name: 'victory', sfxKey: 'success' },
        { type: 'talk', charKey: 'judge', text: '피고인에게 무죄를 선고합니다.', size: 'text-3xl' },
        { type: 'talk', charKey: 'narrator', text: '사건은 “완전한 진범 특정” 없이도, 법정에서 뒤집혔다.' },
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
   4) UI bits
========================= */
function TopPills({ hp, hpMax, evCount, evMax, onOpenEvidence, muted, onToggleMute, turn }) {
  return (
    <>
      <div className="absolute top-6 left-6 z-50 flex items-center gap-3">
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

        <div className="hidden md:flex items-center gap-2 bg-black/40 backdrop-blur-md px-5 py-3 rounded-full border border-white/10">
          <Gavel className="w-5 h-5 text-gray-200" />
          <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
            TURN {turn}
          </span>
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
              className="relative text-8xl md:text-9xl font-bold tracking-tighter text-white drop-shadow-2xl"
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
  if (!char) return null;
  const src = char.avatars?.[face] || char.avatar || null;
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

function CrossExamPill({ title, isFinal, cur, total, witnessName }) {
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
            {isFinal ? '최후의 증언' : title} · {cur}/{total} · {witnessName}
          </span>
        </div>
      </div>
    </div>
  );
}

function DialogueBox({ char, text, colorClass, sizeClass, onNext, isCE, pressMode, onPress, onOpenEvidence }) {
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

          <div className="absolute bottom-6 right-6 opacity-40 group-hover:opacity-100 transition-opacity pointer-events-none">
            <ChevronRight className="w-6 h-6 text-white animate-pulse" strokeWidth={2} />
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
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <FileText className="w-8 h-8 text-amber-400" strokeWidth={2} />
            <h2 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Crimson Pro, serif' }}>
              증거 목록
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

/* =========================
   5) MAIN
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

  const [evidenceMode, setEvidenceMode] = useState(false);

  const [pressMode, setPressMode] = useState(false);
  const [pressIndex, setPressIndex] = useState(0);

  const [ceIndex, setCeIndex] = useState(0);
  const [ceLocked, setCeLocked] = useState(false);

  const [isEnding, setIsEnding] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const [invKeys, setInvKeys] = useState(gameCase.initialEvidence || []);

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
  const advance = (d = 1) => setIndex((p) => clamp(p + d, 0, lines.length - 1));

  const reset = () => {
    setIndex(0);
    setBgKey(gameCase.coverBgKey || 'court');
    setHp(hpMax);
    setShake(false);
    setFlash(false);
    setEffectText(null);
    setOverlayMsg(null);
    setEvidenceMode(false);
    setPressMode(false);
    setPressIndex(0);
    setCeIndex(0);
    setCeLocked(false);
    setIsEnding(false);
    setGameOver(false);
    setInvKeys(gameCase.initialEvidence || []);
    audio.playBgm(GAME_DB.bgm[gameCase.defaultBgmKey] || GAME_DB.bgm.trial);
  };

  // init BGM
  useEffect(() => {
    audio.playBgm(GAME_DB.bgm[gameCase.defaultBgmKey] || GAME_DB.bgm.trial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setTimeout(() => advance(1), 260);
        return;
      }
      if (currentLine.name === 'objection') {
        doEffect('OBJECTION!', 1200);
        doShake(520);
        doFlash(220);
        sfx(currentLine.sfxKey || 'objection');
        setTimeout(() => advance(1), 900);
        return;
      }
      if (currentLine.name === 'victory') {
        doEffect('VICTORY', 1600);
        sfx(currentLine.sfxKey || 'success');
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

  const penalty = (msg) => {
    doOverlay(msg || '그 증거는 맞지 않습니다!', 1200);
    doShake(520);
    sfx('fail');
    setHp(Math.max(0, hpRef.current - 1));
  };

  const correct = () => {
    setCeLocked(true);
    setEvidenceMode(false);
    doEffect('OBJECTION!', 1200);
    doFlash(240);
    doShake(520);
    sfx('objection');
    doOverlay('모순이다!', 800);
    setTimeout(() => {
      setCeLocked(false);
      setCeIndex(0);
      advance(1);
    }, 1050);
  };

  const presentEvidence = (key) => {
    if (!isCE || !stmt) {
      doOverlay('법정 심문에서만 제시 가능합니다.', 1000);
      sfx('fail');
      return;
    }
    if (stmt.weakness && stmt.contradiction === key) {
      correct();
    } else {
      penalty(stmt.failMsg || '그 증거는 맞지 않습니다!');
    }
  };

  const turnCounter = useMemo(() => {
    // “턴”을 더 현실적으로: CE의 현재 statement까지 누적
    // - index는 라인 진행
    // - CE 내부는 ceIndex를 turn에 반영
    let t = 1;
    for (let i = 0; i < index; i++) {
      const l = lines[i];
      if (!l) continue;
      if (l.type === 'cross_exam') {
        const n = l.statements?.length || 0;
        t += Math.max(1, n); // CE 하나를 큰 덩어리로 간주해도 되지만, 누적은 statement 수로
      } else if (l.type === 'talk') t += 1;
      else if (l.type === 'anim') t += 1;
      else if (l.type === 'scene') t += 0;
      else t += 1;
    }
    if (isCE) t += ceIndex;
    return t;
  }, [index, isCE, ceIndex, lines]);

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
            법정은 합리적 의심을 넘어설 수 없었다.
          </p>
          <button
            onClick={reset}
            className="px-10 py-4 bg-white text-black font-semibold rounded-md hover:bg-gray-100 transition-all duration-300 hover:scale-105"
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
            판사님이 더는 들어주지 않습니다.
            <br />
            논리를 다시 쌓아올리세요.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={reset}
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

  const hint = isCE && stmt?.weakness ? '팁: 이 문장에 모순이 있습니다. 알맞은 증거를 제시하세요.' : null;

  return (
    <div className={`h-screen w-full relative overflow-hidden select-none transition-all duration-700 ${bgClass} ${shake ? 'animate-shake' : ''}`}>
      <style jsx global>{globalCss}</style>

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>

      <TopPills
        hp={hp}
        hpMax={hpMax}
        evCount={invItems.length}
        evMax={evMax}
        onOpenEvidence={() => setEvidenceMode(true)}
        muted={audio.muted}
        onToggleMute={() => audio.setMasterMuted(!audio.muted)}
        turn={turnCounter}
      />

      <EffectLayer effectText={effectText} flash={flash} overlayMsg={overlayMsg} />

      <CharacterAvatar char={speaker} face={face} />

      {isCE && (
        <CrossExamPill
          title={currentLine.title}
          isFinal={!!currentLine.isFinal}
          cur={ceIndex + 1}
          total={currentLine.statements?.length || 0}
          witnessName={witnessChar?.name || '증인'}
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
    </div>
  );
}

const globalCss = `
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
`;
