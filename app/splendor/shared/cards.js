import { TIER_LABEL } from './constants';
import {
  MOTIVES,
  METHODS,
  SUSPECTS,
  createSeededRandom,
  getCandidateName,
  seededShuffle,
} from './caseData';

const TIER_1_BLUEPRINTS = [
  {
    key: 't1_01',
    title: '찢긴 입장 명부',
    subtitle: '입구 담당자가 서명을 두 줄이나 긁어냈다.',
    mark: 'blue',
    insight: 'blue',
    progress: 1,
    cost: { white: 0, blue: 1, green: 1, red: 0, black: 0 },
    plan: { suspect: 1 },
    detail: '서명 순서와 잉크 농도가 미묘하게 어긋나 있다. 누군가는 제 시간에 들어오지 않았다.',
  },
  {
    key: 't1_02',
    title: '샹들리에 유리 파편',
    subtitle: '조명 틀보다 바닥이 먼저 울었다.',
    mark: 'green',
    insight: 'green',
    progress: 1,
    cost: { white: 1, blue: 0, green: 1, red: 0, black: 1 },
    plan: { method: 1 },
    detail: '파편 방향이 사고라기엔 너무 단정하다. 누군가 손을 댔다.',
  },
  {
    key: 't1_03',
    title: '와인 잔 가장자리 흠집',
    subtitle: '잔을 든 손보다 놓는 손이 더 떨렸다.',
    mark: 'red',
    insight: 'red',
    progress: 1,
    cost: { white: 1, blue: 0, green: 0, red: 1, black: 1 },
    plan: { motive: 1 },
    detail: '잔 표면에 남은 미세한 긁힘이 긴장을 말해 준다. 대화가 평범하진 않았다.',
  },
  {
    key: 't1_04',
    title: '봉인 왁스의 빈틈',
    subtitle: '도장은 멀쩡한데, 눌린 힘이 다르다.',
    mark: 'black',
    insight: 'black',
    progress: 1,
    cost: { white: 0, blue: 1, green: 0, red: 1, black: 1 },
    plan: { method: 1 },
    detail: '봉인 자체보다 손놀림이 수상하다. 익숙한 사람이 아니면 못 낸 자국이다.',
  },
  {
    key: 't1_05',
    title: '늦게 닫힌 복도문',
    subtitle: '경첩의 먼지가 절반만 벗겨져 있다.',
    mark: 'white',
    insight: 'white',
    progress: 1,
    cost: { white: 1, blue: 1, green: 0, red: 1, black: 0 },
    plan: { suspect: 1 },
    detail: '복도문은 닫혔지만 사람 하나가 급히 지나간 흔적이 남았다.',
  },
  {
    key: 't1_06',
    title: '뒤집힌 좌석 카드',
    subtitle: '이름표가 누군가를 향해 등을 돌렸다.',
    mark: 'blue',
    insight: 'blue',
    progress: 1,
    cost: { white: 0, blue: 2, green: 0, red: 0, black: 1 },
    plan: { motive: 1 },
    detail: '자리 배치가 바뀐 순간, 누군가의 대화 상대도 바뀌었다.',
  },
  {
    key: 't1_07',
    title: '손등에 튄 금가루',
    subtitle: '왕관 상자 앞에서만 묻는 가루다.',
    mark: 'green',
    insight: 'green',
    progress: 1,
    cost: { white: 1, blue: 0, green: 2, red: 0, black: 0 },
    plan: { suspect: 1 },
    detail: '진열 케이스 쪽을 다녀온 사람만 가질 수 있는 흔적이다.',
  },
  {
    key: 't1_08',
    title: '메모지에 남은 계산식',
    subtitle: '금액보다 날짜가 더 많이 적혀 있다.',
    mark: 'red',
    insight: 'red',
    progress: 1,
    cost: { white: 0, blue: 1, green: 1, red: 2, black: 0 },
    plan: { motive: 1 },
    detail: '단순한 거래 계산이 아니라, 누군가의 조급함이 박혀 있는 수식이다.',
  },
  {
    key: 't1_09',
    title: '객석 아래의 단추',
    subtitle: '급하게 숙일 때만 떨어질 위치다.',
    mark: 'white',
    insight: 'white',
    progress: 1,
    cost: { white: 2, blue: 0, green: 1, red: 0, black: 0 },
    plan: { suspect: 1 },
    detail: '숨는 동작이 아니면 설명되지 않는 위치에서 발견됐다.',
  },
  {
    key: 't1_10',
    title: '얼룩 없는 장갑',
    subtitle: '깨끗한 게 오히려 수상한 밤이다.',
    mark: 'black',
    insight: 'black',
    progress: 1,
    cost: { white: 0, blue: 0, green: 1, red: 1, black: 2 },
    plan: { method: 1 },
    detail: '현장에 있었는데도 지나치게 깨끗한 건, 지울 시간이 있었다는 뜻이다.',
  },
  {
    key: 't1_11',
    title: '작게 접힌 안내문',
    subtitle: '표시되지 않은 출구 쪽만 유난히 닳았다.',
    mark: 'blue',
    insight: 'blue',
    progress: 1,
    cost: { white: 1, blue: 2, green: 0, red: 0, black: 0 },
    plan: { method: 1 },
    detail: '관람객용 안내문이 비밀 동선을 가리키는 지도 역할을 했다.',
  },
  {
    key: 't1_12',
    title: '향수와 소독약 냄새',
    subtitle: '누군가 향을 덧씌워 흔적을 눌렀다.',
    mark: 'red',
    insight: 'red',
    progress: 1,
    cost: { white: 1, blue: 0, green: 1, red: 1, black: 1 },
    plan: { motive: 1 },
    detail: '감정이 흔들린 사람은 흔적을 지울 때도 과하게 움직인다.',
  },
];

const TIER_2_BLUEPRINTS = [
  {
    key: 't2_01',
    title: '숨긴 보관 계약서',
    subtitle: '사인보다 덧칠이 많다.',
    mark: 'blue',
    insight: 'blue',
    progress: 2,
    cost: { white: 1, blue: 2, green: 1, red: 0, black: 1 },
    plan: { motive: 1, suspect: 1 },
    detail: '계약 조건을 바꾼 사람이 있다. 정식 경로로는 설명되지 않는 수정이다.',
  },
  {
    key: 't2_02',
    title: '경비 순찰 공백표',
    subtitle: '비어 있는 7분이 누군가에게는 전부였다.',
    mark: 'white',
    insight: 'white',
    progress: 2,
    cost: { white: 2, blue: 1, green: 1, red: 0, black: 1 },
    plan: { suspect: 1, method: 1 },
    detail: '순찰표는 깔끔하지만 공백 시간만 이상하게 길다. 누군가 손댔다.',
  },
  {
    key: 't2_03',
    title: '은밀한 송금 기록',
    subtitle: '금액은 작아도 타이밍이 노골적이다.',
    mark: 'red',
    insight: 'red',
    progress: 2,
    cost: { white: 0, blue: 2, green: 0, red: 2, black: 1 },
    plan: { motive: 2 },
    detail: '사건 전후로 움직인 돈이 누구를 조용하게 만들었는지 보여 준다.',
  },
  {
    key: 't2_04',
    title: '복원된 통화 녹취',
    subtitle: '목소리는 작아도 숨은 말버릇은 크다.',
    mark: 'blue',
    insight: 'blue',
    progress: 2,
    cost: { white: 1, blue: 2, green: 0, red: 1, black: 1 },
    plan: { suspect: 2 },
    detail: '끊긴 문장을 잇자, 서로를 오래 알고 있던 두 사람의 온도가 드러난다.',
  },
  {
    key: 't2_05',
    title: '보석 감정 오차표',
    subtitle: '진품을 본 눈은 같은 실수를 하지 않는다.',
    mark: 'green',
    insight: 'green',
    progress: 2,
    cost: { white: 0, blue: 1, green: 2, red: 1, black: 1 },
    plan: { motive: 1, method: 1 },
    detail: '왕관 보석이 바뀌었다면, 처음부터 준비한 손이 있었다는 뜻이다.',
  },
  {
    key: 't2_06',
    title: '무대 뒤 전달 메모',
    subtitle: '짧은 문장인데 명령어처럼 날카롭다.',
    mark: 'black',
    insight: 'black',
    progress: 2,
    cost: { white: 1, blue: 0, green: 1, red: 1, black: 2 },
    plan: { method: 2 },
    detail: '현장을 사고처럼 보이게 만들려던 지시가 메모 끝에 남았다.',
  },
  {
    key: 't2_07',
    title: '가면 보관함 열쇠표',
    subtitle: '누구는 제 열쇠를 제때 찾지 못했다.',
    mark: 'white',
    insight: 'white',
    progress: 2,
    cost: { white: 2, blue: 0, green: 1, red: 1, black: 1 },
    plan: { suspect: 1, motive: 1 },
    detail: '가면이 바뀐 시점과 출입 시점이 정확히 겹친다.',
  },
  {
    key: 't2_08',
    title: '사라진 점검 장부',
    subtitle: '뜯긴 페이지가 딱 한 장이다.',
    mark: 'black',
    insight: 'black',
    progress: 2,
    cost: { white: 0, blue: 1, green: 2, red: 0, black: 2 },
    plan: { method: 1, suspect: 1 },
    detail: '숨긴 건 페이지가 아니라 그날의 점검 순서다.',
  },
  {
    key: 't2_09',
    title: '접대실 좌석 메모',
    subtitle: '마주 앉은 두 사람 중 한 명이 먼저 침묵했다.',
    mark: 'red',
    insight: 'red',
    progress: 2,
    cost: { white: 1, blue: 1, green: 0, red: 2, black: 1 },
    plan: { motive: 1, suspect: 1 },
    detail: '어떤 대화는 거래였고, 어떤 침묵은 협박이었다.',
  },
  {
    key: 't2_10',
    title: '창고문 안쪽 긁힘',
    subtitle: '밖에서 연 게 아니라 안에서 밀어냈다.',
    mark: 'green',
    insight: 'green',
    progress: 2,
    cost: { white: 1, blue: 0, green: 2, red: 1, black: 0 },
    plan: { method: 1, suspect: 1 },
    detail: '누군가는 안쪽에 숨어 있다가 타이밍을 봤다.',
  },
  {
    key: 't2_11',
    title: '미완성 사직서',
    subtitle: '끝맺지 못한 문장이 더 많은 걸 말한다.',
    mark: 'white',
    insight: 'white',
    progress: 2,
    cost: { white: 2, blue: 1, green: 0, red: 2, black: 0 },
    plan: { motive: 2 },
    detail: '그만두기 직전의 사람은 대개 한 번 더 흔들린다.',
  },
  {
    key: 't2_12',
    title: '복도 거울의 손자국',
    subtitle: '멈칫한 사람만 남길 수 있는 높이다.',
    mark: 'black',
    insight: 'black',
    progress: 2,
    cost: { white: 0, blue: 1, green: 1, red: 1, black: 2 },
    plan: { suspect: 1, method: 1 },
    detail: '도주한 사람이 아니라, 돌아보고 마음을 굳힌 사람이 남긴 자국이다.',
  },
];

const TIER_3_BLUEPRINTS = [
  {
    key: 't3_01',
    title: '보관실 재봉합 사진',
    subtitle: '찢어진 천이 아니라 알리바이가 다시 꿰매졌다.',
    mark: 'black',
    insight: 'black',
    progress: 3,
    cost: { white: 1, blue: 2, green: 2, red: 1, black: 2 },
    plan: { suspect: 2, method: 1 },
    detail: '사건 후에 고쳐 놓은 흔적이라서 더 선명하다. 누군가는 아주 늦게까지 현장에 남아 있었다.',
  },
  {
    key: 't3_02',
    title: '왕관 받침대 교체 시각',
    subtitle: '실제 사건은 박수 소리 뒤에 일어났다.',
    mark: 'green',
    insight: 'green',
    progress: 3,
    cost: { white: 1, blue: 1, green: 3, red: 1, black: 1 },
    plan: { method: 2 },
    detail: '진열 시간을 다시 맞추자 범행 창이 급격히 좁아진다.',
  },
  {
    key: 't3_03',
    title: '봉인 실험 결과서',
    subtitle: '저 방식이면 안쪽에서만 가능하다.',
    mark: 'blue',
    insight: 'blue',
    progress: 3,
    cost: { white: 1, blue: 3, green: 1, red: 1, black: 1 },
    plan: { method: 1, motive: 1 },
    detail: '추측이 아니라 재현이다. 이제 남는 건 누가 그걸 해낼 수 있었느냐뿐이다.',
  },
  {
    key: 't3_04',
    title: '위조 감정의 결정적 오차',
    subtitle: '눈썰미가 아니라 습관이 배신했다.',
    mark: 'red',
    insight: 'red',
    progress: 3,
    cost: { white: 0, blue: 2, green: 1, red: 3, black: 1 },
    plan: { suspect: 1, motive: 2 },
    detail: '가짜를 만진 사람만 남길 수 있는 판단 흔들림이 있다.',
  },
  {
    key: 't3_05',
    title: '환영사 원고의 덧문장',
    subtitle: '누군가 특정 사람을 무대 앞으로 끌어내려 했다.',
    mark: 'white',
    insight: 'white',
    progress: 3,
    cost: { white: 3, blue: 1, green: 1, red: 2, black: 0 },
    plan: { motive: 1, suspect: 1 },
    detail: '우발이 아니라 유도였다. 누군가는 피해자를 정해진 위치로 불러냈다.',
  },
  {
    key: 't3_06',
    title: '비밀 통로 도면 수정본',
    subtitle: '원본에는 없던 표시가 새겨져 있다.',
    mark: 'blue',
    insight: 'blue',
    progress: 3,
    cost: { white: 1, blue: 3, green: 1, red: 0, black: 2 },
    plan: { method: 2 },
    detail: '누군가는 벽이 열린다는 사실을 오래전부터 알고 있었다.',
  },
  {
    key: 't3_07',
    title: '사건 당일 보험 변경 건',
    subtitle: '보석이 아니라 책임의 방향이 바뀌었다.',
    mark: 'red',
    insight: 'red',
    progress: 3,
    cost: { white: 1, blue: 2, green: 0, red: 3, black: 1 },
    plan: { motive: 2 },
    detail: '누군가 이 밤이 조용히 끝나지 않을 걸 알고 있었다.',
  },
  {
    key: 't3_08',
    title: '보안 로그의 역순 기록',
    subtitle: '삭제가 아니라 뒤집기였다.',
    mark: 'black',
    insight: 'black',
    progress: 3,
    cost: { white: 0, blue: 2, green: 1, red: 1, black: 3 },
    plan: { suspect: 2 },
    detail: '접속 순서를 바꾼 사람은 시스템 습관을 알고 있던 사람이다.',
  },
  {
    key: 't3_09',
    title: '마지막 배달 영수증',
    subtitle: '도착한 건 물건이 아니라 도구였다.',
    mark: 'green',
    insight: 'green',
    progress: 3,
    cost: { white: 1, blue: 1, green: 3, red: 0, black: 2 },
    plan: { method: 1, motive: 1 },
    detail: '범행은 즉흥이 아니라 준비된 작업이었다.',
  },
  {
    key: 't3_10',
    title: '숨겨 둔 협박 편지',
    subtitle: '무서운 건 내용보다 답장 시각이다.',
    mark: 'black',
    insight: 'black',
    progress: 3,
    cost: { white: 1, blue: 0, green: 1, red: 2, black: 3 },
    plan: { suspect: 1, motive: 2 },
    detail: '누군가는 오래전부터 궁지에 몰려 있었다.',
  },
  {
    key: 't3_11',
    title: '왕실 봉인 해제 허가서',
    subtitle: '진짜 허가서라서 더 끔찍하다.',
    mark: 'white',
    insight: 'white',
    progress: 4,
    cost: { white: 3, blue: 2, green: 1, red: 1, black: 1 },
    plan: { suspect: 1, method: 1, motive: 1 },
    detail: '누군가는 정식 권한을 가장해 범행 순간을 열어젖혔다.',
  },
  {
    key: 't3_12',
    title: '대조된 손글씨 보고서',
    subtitle: '같은 필체가 아니라고 말해 주는 획이다.',
    mark: 'white',
    insight: 'white',
    progress: 4,
    cost: { white: 2, blue: 2, green: 0, red: 2, black: 1 },
    plan: { suspect: 2, motive: 1 },
    detail: '서명이 아니라 습관이 범인을 끌어냈다.',
  },
];

const BLUEPRINTS = {
  1: TIER_1_BLUEPRINTS,
  2: TIER_2_BLUEPRINTS,
  3: TIER_3_BLUEPRINTS,
};

function normalizeCost(cost = {}) {
  return {
    white: Number(cost.white || 0),
    blue: Number(cost.blue || 0),
    green: Number(cost.green || 0),
    red: Number(cost.red || 0),
    black: Number(cost.black || 0),
  };
}

function cloneEffect(effect) {
  return {
    eliminateSuspects: [...(effect?.eliminateSuspects || [])],
    eliminateMotives: [...(effect?.eliminateMotives || [])],
    eliminateMethods: [...(effect?.eliminateMethods || [])],
  };
}

function makeFalsePools(solution, random) {
  return {
    suspect: seededShuffle(SUSPECTS.filter((item) => item.id !== solution.culpritId).map((item) => item.id), random),
    motive: seededShuffle(MOTIVES.filter((item) => item.id !== solution.motiveId).map((item) => item.id), random),
    method: seededShuffle(METHODS.filter((item) => item.id !== solution.methodId).map((item) => item.id), random),
  };
}

function takeFromPool(pool, cursors, type, count, random) {
  if (!count) return [];
  if (!Array.isArray(pool[type]) || pool[type].length === 0) return [];

  const picked = [];
  for (let step = 0; step < count; step += 1) {
    if (cursors[type] >= pool[type].length) {
      pool[type] = seededShuffle(pool[type], random);
      cursors[type] = 0;
    }
    const candidate = pool[type][cursors[type]];
    cursors[type] += 1;
    if (candidate && !picked.includes(candidate)) picked.push(candidate);
  }
  return picked;
}

function describeEffect(effect) {
  const lines = [];
  if (effect.eliminateSuspects.length) {
    lines.push(`용의자 정리: ${effect.eliminateSuspects.map((id) => getCandidateName('suspect', id)).join(', ')} 제외`);
  }
  if (effect.eliminateMotives.length) {
    lines.push(`동기 정리: ${effect.eliminateMotives.map((id) => getCandidateName('motive', id)).join(', ')} 제외`);
  }
  if (effect.eliminateMethods.length) {
    lines.push(`수법 정리: ${effect.eliminateMethods.map((id) => getCandidateName('method', id)).join(', ')} 제외`);
  }
  return lines;
}

function buildCardFromBlueprint(blueprint, tier, pools, cursors, random) {
  const effect = cloneEffect({
    eliminateSuspects: takeFromPool(pools, cursors, 'suspect', blueprint.plan?.suspect || 0, random),
    eliminateMotives: takeFromPool(pools, cursors, 'motive', blueprint.plan?.motive || 0, random),
    eliminateMethods: takeFromPool(pools, cursors, 'method', blueprint.plan?.method || 0, random),
  });

  return {
    id: blueprint.key,
    tier,
    title: blueprint.title,
    subtitle: blueprint.subtitle,
    category: TIER_LABEL[tier],
    mark: blueprint.mark,
    insight: blueprint.insight,
    bonus: blueprint.insight,
    progress: blueprint.progress,
    points: blueprint.progress,
    cost: normalizeCost(blueprint.cost),
    detail: blueprint.detail,
    effect,
    effectLines: describeEffect(effect),
  };
}

export function buildCaseDecks({ solution, seed }) {
  const random = createSeededRandom(`${seed}:deck`);
  const pools = makeFalsePools(solution, random);
  const cursors = { suspect: 0, motive: 0, method: 0 };
  const decks = { 1: [], 2: [], 3: [] };

  for (const tier of [1, 2, 3]) {
    decks[tier] = seededShuffle(
      BLUEPRINTS[tier].map((blueprint) => buildCardFromBlueprint(blueprint, tier, pools, cursors, random)),
      random
    );
  }

  return decks;
}

export function generateCards({ solution, seed }) {
  const decks = buildCaseDecks({ solution, seed });
  return [...decks[1], ...decks[2], ...decks[3]];
}
