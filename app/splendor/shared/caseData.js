import { CASE_TAGLINE, CASE_TITLE } from './constants';

export const CASE_BRIEFING = [
  '경매는 멈췄다.',
  '시신은 전시장 안에서 발견됐다.',
  '왕관은 사라졌다.',
];

export const GUIDE_STEPS = [
  { title: '한 턴', body: '자원, 단서, 리드 중 하나.' },
  { title: '비공개 리드', body: '내용은 너만 본다.' },
  { title: '추궁', body: '조건이 맞으면 연다.' },
  { title: '고발', body: '범인, 동기, 수법을 찍는다.' },
];

export const SUSPECTS = [
  {
    id: 'aria_veil',
    name: '아리아 베일',
    role: '가면 경매 진행자',
    clue: '목소리는 태연한데, 손끝이 지나치게 침착하다.',
    reveal: '경매장의 흐름을 가장 잘 알던 사람이다.',
  },
  {
    id: 'seo_dohyun',
    name: '서도현',
    role: '왕실 기록관',
    clue: '문서철을 들고 다니며 누구보다 빨리 부재 기록을 지운다.',
    reveal: '보관 기록과 출입 명부를 만질 수 있던 사람이다.',
  },
  {
    id: 'yun_sora',
    name: '윤소라',
    role: '전시 보조 큐레이터',
    clue: '전시 동선을 누구보다 정확히 알고 있다.',
    reveal: '진열 교체 시각과 보안 틈을 읽고 있었다.',
  },
  {
    id: 'kang_ryeon',
    name: '강련',
    role: '야간 경비 책임자',
    clue: '조용히 서 있는데도 발소리가 너무 무겁다.',
    reveal: '봉인과 순찰 경로를 통제하던 사람이다.',
  },
  {
    id: 'matteo_bern',
    name: '마테오 번',
    role: '해외 감정사',
    clue: '보석의 가치를 입에 올릴 때만 눈빛이 살아난다.',
    reveal: '보석 진위와 교체 가능성을 가장 잘 안다.',
  },
  {
    id: 'lee_narin',
    name: '이나린',
    role: '경매 비서',
    clue: '누가 어디로 갔는지 다 기억하는 척한다.',
    reveal: '연락망과 뒷문 출입 코드를 쥔 사람이다.',
  },
];

export const MOTIVES = [
  {
    id: 'debt',
    label: '빚 탕감',
    detail: '거액의 채무를 한 번에 지우려 했다.',
    reveal: '돈줄을 바꾸면 신분도 갈아입을 수 있다고 믿었다.',
  },
  {
    id: 'revenge',
    label: '오래된 원한',
    detail: '몇 해 전 감춰진 사건을 되갚으려 했다.',
    reveal: '사건은 우발처럼 보였지만 감정은 오래 숙성돼 있었다.',
  },
  {
    id: 'blackmail',
    label: '협박 은폐',
    detail: '자신을 조이는 증거를 없애려 했다.',
    reveal: '왕관보다 먼저 지우고 싶던 기록이 있었다.',
  },
  {
    id: 'inheritance',
    label: '상속 다툼',
    detail: '가문과 권리, 다음 이름표를 둘러싼 다툼이었다.',
    reveal: '살인은 물건이 아니라 자리를 차지하기 위한 수였다.',
  },
  {
    id: 'forgery',
    label: '위조 거래',
    detail: '진품을 빼돌리고 가짜를 올려치려 했다.',
    reveal: '누군가는 전시가 끝나기 전에 바꿔치기를 끝내려 했다.',
  },
];

export const METHODS = [
  {
    id: 'poison_tea',
    label: '독이 든 티잔',
    detail: '혼잡한 환영 다과 시간에 독을 탔다.',
    reveal: '눈에 띄지 않는 한 모금이 사건의 시작이었다.',
  },
  {
    id: 'wire_fall',
    label: '조명 와이어 절단',
    detail: '무대 장치를 건드려 사고로 위장했다.',
    reveal: '조명 하나의 흔들림이 죽음의 각도를 만들었다.',
  },
  {
    id: 'hidden_blade',
    label: '장갑 속 얇은 칼',
    detail: '접촉이 많은 군중 틈에서 은밀히 찔렀다.',
    reveal: '춤추듯 스친 손끝에 금속이 숨어 있었다.',
  },
  {
    id: 'secret_passage',
    label: '비밀 통로 역이용',
    detail: '봉인된 방처럼 보이게 만들고 사라졌다.',
    reveal: '문이 아니라 벽이 열렸고, 시간은 거꾸로 흘렀다.',
  },
  {
    id: 'key_swap',
    label: '열쇠 바꿔치기',
    detail: '보관실 접근 권한을 엇갈리게 만들었다.',
    reveal: '열쇠가 맞았던 게 아니라, 순서가 뒤집혀 있었다.',
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
  const suspect = SUSPECTS[Math.floor(random() * SUSPECTS.length)];
  const motive = MOTIVES[Math.floor(random() * MOTIVES.length)];
  const method = METHODS[Math.floor(random() * METHODS.length)];
  return {
    culpritId: suspect.id,
    motiveId: motive.id,
    methodId: method.id,
  };
}

export function buildReveal(solution) {
  const culprit = getSuspectById(solution?.culpritId);
  const motive = getMotiveById(solution?.motiveId);
  const method = getMethodById(solution?.methodId);

  const summary = culprit && motive && method
    ? `${culprit.name}이 ${motive.label} 때문에 ${method.label}을 이용해 전시 책임자를 제거하고 왕관 보석을 빼돌렸다.`
    : '기록이 손상돼 진상을 완전히 복원하지 못했다.';

  return {
    culpritId: culprit?.id || null,
    culpritName: culprit?.name || '불명',
    culpritRole: culprit?.role || '',
    motiveId: motive?.id || null,
    motiveLabel: motive?.label || '불명',
    methodId: method?.id || null,
    methodLabel: method?.label || '불명',
    headline: culprit ? `${culprit.name}의 가면이 벗겨졌다` : '사건의 가면이 찢어졌다',
    summary,
    endingLines: [
      CASE_TAGLINE,
      culprit?.reveal || '',
      motive?.reveal || '',
      method?.reveal || '',
    ].filter(Boolean),
  };
}
