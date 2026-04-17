import { CASE_TAGLINE, CASE_TITLE } from './constants';

export const CASE_BRIEFING = [
  '전시장 안에서 시신이 발견됐다.',
  '왕관도 사라졌다.',
];

export const GUIDE_STEPS = [
  { title: '단서 확보', body: '보드에서 단서 한 장을 확보한다.' },
  { title: '리드 정리', body: '중요한 단서를 따로 묶어 둔다.' },
  { title: '기록 대조', body: '키워드가 겹치는 두 장을 맞춰 본다.' },
  { title: '추궁', body: '조건이 맞는 인물을 확인한다.' },
  { title: '고발', body: '범인, 동기, 수법을 선택한다.' },
];

export const SUSPECTS = [
  {
    id: 'aria_veil',
    name: '아리아 베일',
    role: '경매 진행자',
    clue: '행사 진행을 가장 가까이서 봤다.',
    reveal: '진행 순서와 현장 흐름을 알고 있었다.',
  },
  {
    id: 'seo_dohyun',
    name: '서도현',
    role: '왕실 기록관',
    clue: '출입 기록과 보관 기록을 다뤘다.',
    reveal: '문서와 승인 기록을 수정할 수 있었다.',
  },
  {
    id: 'yun_sora',
    name: '윤소라',
    role: '보조 큐레이터',
    clue: '전시 동선과 조명 전환을 알고 있었다.',
    reveal: '전시장 안 움직임을 세세하게 알고 있었다.',
  },
  {
    id: 'kang_ryeon',
    name: '강련',
    role: '야간 경비 책임자',
    clue: '순찰과 출입 통제를 맡았다.',
    reveal: '순찰 공백과 봉인 절차를 통제했다.',
  },
  {
    id: 'matteo_bern',
    name: '마테오 번',
    role: '해외 감정사',
    clue: '진품과 위조를 빠르게 구분할 수 있었다.',
    reveal: '바꿔치기 가능성을 가장 먼저 알아볼 수 있었다.',
  },
  {
    id: 'lee_narin',
    name: '이나린',
    role: '경매 비서',
    clue: '연락망과 후문 코드를 다뤘다.',
    reveal: '후문 출입과 일정 조율에 접근할 수 있었다.',
  },
];

export const MOTIVES = [
  {
    id: 'debt',
    label: '빚 탕감',
    detail: '거액의 채무를 한 번에 정리하려 했다.',
    reveal: '돈 문제를 해결하려 했다.',
  },
  {
    id: 'revenge',
    label: '오래된 원한',
    detail: '묻힌 사건을 되갚으려 했다.',
    reveal: '감정이 오래 남아 있었다.',
  },
  {
    id: 'blackmail',
    label: '협박 은폐',
    detail: '자신을 조이는 자료를 없애려 했다.',
    reveal: '약점이 드러나는 걸 막으려 했다.',
  },
  {
    id: 'inheritance',
    label: '상속 다툼',
    detail: '자리와 이름을 지키려 했다.',
    reveal: '지위 문제와 연결돼 있었다.',
  },
  {
    id: 'forgery',
    label: '위조 거래',
    detail: '진품을 빼고 가짜를 세우려 했다.',
    reveal: '거래 자체가 목적이었다.',
  },
];

export const METHODS = [
  {
    id: 'poison_tea',
    label: '독이 든 티잔',
    detail: '다과 시간에 독을 탔다.',
    reveal: '음료가 사용됐다.',
  },
  {
    id: 'wire_fall',
    label: '조명 와이어 절단',
    detail: '사고처럼 보이게 장치를 건드렸다.',
    reveal: '무대 장치가 쓰였다.',
  },
  {
    id: 'hidden_blade',
    label: '장갑 속 얇은 칼',
    detail: '군중 틈에서 은밀히 찔렀다.',
    reveal: '날붙이가 쓰였다.',
  },
  {
    id: 'secret_passage',
    label: '비밀 통로 역이용',
    detail: '봉인된 방처럼 보이게 만들었다.',
    reveal: '통로를 이용했다.',
  },
  {
    id: 'key_swap',
    label: '열쇠 바꿔치기',
    detail: '접근 권한을 뒤섞었다.',
    reveal: '열쇠 순서를 바꿨다.',
  },
];

export function getSuspectById(id) {
  return SUSPECTS.find((entry) => entry.id === id) || null;
}

export function getMotiveById(id) {
  return MOTIVES.find((entry) => entry.id === id) || null;
}

export function getMethodById(id) {
  return METHODS.find((entry) => entry.id === id) || null;
}

export function getCandidateName(kind, id) {
  if (kind === 'suspect') return getSuspectById(id)?.name || id;
  if (kind === 'motive') return getMotiveById(id)?.label || id;
  if (kind === 'method') return getMethodById(id)?.label || id;
  return id;
}

function hashSeed(input) {
  const text = String(input || CASE_TITLE);
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

export function createSeededRandom(seed) {
  const nextHash = hashSeed(seed);
  let state = nextHash();
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle(list, random = Math.random) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function createCaseSeed() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`.toUpperCase();
}

export function drawSolution(seed) {
  const random = createSeededRandom(`${seed}:solution`);
  return {
    culpritId: SUSPECTS[Math.floor(random() * SUSPECTS.length)].id,
    motiveId: MOTIVES[Math.floor(random() * MOTIVES.length)].id,
    methodId: METHODS[Math.floor(random() * METHODS.length)].id,
  };
}

export function buildReveal(solution) {
  const culprit = getSuspectById(solution?.culpritId);
  const motive = getMotiveById(solution?.motiveId);
  const method = getMethodById(solution?.methodId);

  const summary = culprit && motive && method
    ? `${culprit.name}이 ${motive.label} 때문에 ${method.label}을 사용했다.`
    : '정답을 확정하지 못했다.';

  return {
    culpritId: culprit?.id || null,
    culpritName: culprit?.name || '불명',
    culpritRole: culprit?.role || '',
    motiveId: motive?.id || null,
    motiveLabel: motive?.label || '불명',
    methodId: method?.id || null,
    methodLabel: method?.label || '불명',
    headline: '사건 정리',
    summary,
    endingLines: [
      '사건 정리가 끝났다.',
      culprit ? `범인: ${culprit.name} · ${culprit.role}` : '',
      motive ? `동기: ${motive.label}` : '',
      method ? `수법: ${method.label}` : '',
    ].filter(Boolean),
  };
}
