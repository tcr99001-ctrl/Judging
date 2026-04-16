import { CASE_TAGLINE, CASE_TITLE } from './constants';

export const CASE_BRIEFING = [
  '경매는 멈췄다.',
  '시신은 전시장 안에서 발견됐다.',
  '왕관은 사라졌다.',
];

export const GUIDE_STEPS = [
  { title: '단서', body: '공개 보드에서 가져온다.' },
  { title: '리드', body: '내 수첩에 따로 세운다.' },
  { title: '대조', body: '겹치는 흔적을 묶는다.' },
  { title: '추궁', body: '열린 인물을 압박한다.' },
  { title: '고발', body: '범인, 동기, 수법을 찍는다.' },
];

export const SUSPECTS = [
  {
    id: 'aria_veil',
    name: '아리아 베일',
    role: '경매 진행자',
    clue: '표정은 평온한데 숨 고르는 박자가 한 번씩 늦다.',
    reveal: '행사의 흐름을 가장 가까이서 조율하던 인물이었다.',
  },
  {
    id: 'seo_dohyun',
    name: '서도현',
    role: '왕실 기록관',
    clue: '종이 냄새가 짙다. 누락을 숨기는 손이 익숙하다.',
    reveal: '출입과 보관 기록을 만질 수 있던 사람이다.',
  },
  {
    id: 'yun_sora',
    name: '윤소라',
    role: '보조 큐레이터',
    clue: '전시 동선을 너무 잘 안다. 그게 오히려 거슬린다.',
    reveal: '진열 교체와 조명 전환 시각을 꿰고 있었다.',
  },
  {
    id: 'kang_ryeon',
    name: '강련',
    role: '야간 경비 책임자',
    clue: '눈은 정면인데 신경은 늘 출입문 쪽에 가 있다.',
    reveal: '순찰 공백과 봉인 절차를 통제하던 인물이었다.',
  },
  {
    id: 'matteo_bern',
    name: '마테오 번',
    role: '해외 감정사',
    clue: '가치 이야기를 꺼낼 때만 말끝이 날카로워진다.',
    reveal: '진품과 위조를 가장 빨리 구분할 수 있던 사람이다.',
  },
  {
    id: 'lee_narin',
    name: '이나린',
    role: '경매 비서',
    clue: '동선을 다 외운 척한다. 가끔 너무 빠르다.',
    reveal: '연락망과 후문 코드에 닿을 수 있던 사람이다.',
  },
];

export const MOTIVES = [
  {
    id: 'debt',
    label: '빚 탕감',
    detail: '거액의 채무를 한 번에 지우려 했다.',
    reveal: '왕관은 물건이 아니라 출구였다.',
  },
  {
    id: 'revenge',
    label: '오래된 원한',
    detail: '묻힌 사건을 되갚으려 했다.',
    reveal: '우발처럼 보였지만 감정은 오래 썩어 있었다.',
  },
  {
    id: 'blackmail',
    label: '협박 은폐',
    detail: '자신을 조이는 자료를 지우려 했다.',
    reveal: '사라진 건 보석만이 아니었다.',
  },
  {
    id: 'inheritance',
    label: '상속 다툼',
    detail: '자리와 이름을 빼앗기지 않으려 했다.',
    reveal: '피보다 차가운 건 호명 순서였다.',
  },
  {
    id: 'forgery',
    label: '위조 거래',
    detail: '진품을 빼고 가짜를 세우려 했다.',
    reveal: '전시는 거래의 가면일 뿐이었다.',
  },
];

export const METHODS = [
  {
    id: 'poison_tea',
    label: '독이 든 티잔',
    detail: '다과 시간에 독을 탔다.',
    reveal: '한 모금이면 충분했다.',
  },
  {
    id: 'wire_fall',
    label: '조명 와이어 절단',
    detail: '사고로 보이게 장치를 건드렸다.',
    reveal: '빛이 꺼진 순간 각도가 생겼다.',
  },
  {
    id: 'hidden_blade',
    label: '장갑 속 얇은 칼',
    detail: '군중 틈에서 은밀히 찔렀다.',
    reveal: '금속은 손끝보다 조용했다.',
  },
  {
    id: 'secret_passage',
    label: '비밀 통로 역이용',
    detail: '봉인된 방처럼 보이게 만들었다.',
    reveal: '문이 아니라 벽이 열렸다.',
  },
  {
    id: 'key_swap',
    label: '열쇠 바꿔치기',
    detail: '접근 권한을 뒤섞었다.',
    reveal: '맞는 열쇠가 아니라 뒤집힌 순서였다.',
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
    ? `${culprit.name}이 ${motive.label} 때문에 ${method.label}을 이용해 전시 책임자를 제거하고 왕관을 빼돌렸다.`
    : '기록이 끊겨 진상을 끝까지 복원하지 못했다.';

  return {
    culpritId: culprit?.id || null,
    culpritName: culprit?.name || '불명',
    culpritRole: culprit?.role || '',
    motiveId: motive?.id || null,
    motiveLabel: motive?.label || '불명',
    methodId: method?.id || null,
    methodLabel: method?.label || '불명',
    headline: culprit ? `${culprit.name}의 가면이 벗겨졌다.` : '가면이 찢어졌다.',
    summary,
    endingLines: [
      CASE_TAGLINE,
      culprit?.reveal || '',
      motive?.reveal || '',
      method?.reveal || '',
    ].filter(Boolean),
  };
}
