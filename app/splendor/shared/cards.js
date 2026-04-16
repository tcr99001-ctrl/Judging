import { TIER_LABEL, TIER_ZONE } from './constants';
import { createSeededRandom, getCandidateName, seededShuffle } from './caseData';

const TIER_1_BLUEPRINTS = [
  {
    key: 'scene_01',
    title: '찢긴 입장 명부',
    summary: '서명 두 줄이 비어 있다.',
    detail: '입구 명부의 잉크 농도가 중간에서 끊긴다. 누군가는 제 시간에 들어오지 않았다.',
    quote: '기록은 지워도 순서는 남아.',
    line: 'blue',
    mark: 'blue',
    threads: ['entry', 'alibi'],
    plan: { suspect: 1 },
  },
  {
    key: 'scene_02',
    title: '유리 파편 각도',
    summary: '낙하보다 밀림에 가깝다.',
    detail: '샹들리에 파편은 아래가 아니라 한쪽으로 쏠려 있다. 누군가 방향을 만들었다.',
    quote: '사고라면 이렇게 예쁘게 깨지지 않아.',
    line: 'green',
    mark: 'green',
    threads: ['wire', 'stage'],
    plan: { method: 1 },
  },
  {
    key: 'scene_03',
    title: '잔 가장자리의 자국',
    summary: '한 번 바뀐 잔이다.',
    detail: '잔 표면에 남은 미세한 긁힘이 손바꿈을 말한다. 다과 쪽이 너무 조용했다.',
    quote: '잔은 웃으며 건넸지. 그게 더 수상해.',
    line: 'red',
    mark: 'red',
    threads: ['tea', 'wine'],
    plan: { motive: 1, method: 1 },
  },
  {
    key: 'scene_04',
    title: '봉인 왁스의 빈틈',
    summary: '도장은 멀쩡하다.',
    detail: '문제는 모양이 아니라 눌린 힘이다. 익숙한 손이 아니면 못 남길 자국이 남았다.',
    quote: '봉인은 멀쩡해. 손놀림이 어긋났을 뿐이지.',
    line: 'black',
    mark: 'black',
    threads: ['seal', 'vault'],
    plan: { method: 1 },
  },
  {
    key: 'scene_05',
    title: '늦게 닫힌 복도문',
    summary: '경첩 먼지가 절반만 벗겨졌다.',
    detail: '복도문은 닫혀 있었지만 급히 지나간 무게가 남았다. 알리바이 하나가 비어 있다.',
    quote: '문은 닫혔어도 발자국은 못 숨기지.',
    line: 'white',
    mark: 'white',
    threads: ['entry', 'passage'],
    plan: { suspect: 1 },
  },
  {
    key: 'scene_06',
    title: '뒤집힌 좌석 카드',
    summary: '대화 상대가 바뀌었다.',
    detail: '이름표 하나가 고의로 뒤집혀 있다. 앉아야 할 자리가 틀어지면서 누군가를 따로 만났다.',
    quote: '자리가 바뀌면 눈길도 바뀐다.',
    line: 'blue',
    mark: 'blue',
    threads: ['buyer', 'schedule'],
    plan: { motive: 1 },
  },
  {
    key: 'scene_07',
    title: '손등의 금가루',
    summary: '왕관 상자 앞에서만 묻는다.',
    detail: '전시장 바닥엔 없던 미세한 금가루가 손등에서 검출됐다. 진열 케이스에 가까이 갔던 흔적이다.',
    quote: '가까이 다녀온 손만 안다.',
    line: 'green',
    mark: 'green',
    threads: ['vault', 'forgery'],
    plan: { suspect: 1 },
  },
  {
    key: 'scene_08',
    title: '접힌 계산 메모',
    summary: '금액보다 날짜가 많다.',
    detail: '간단한 계산처럼 보이지만 날짜가 세 번이나 고쳐져 있다. 급한 거래의 냄새가 난다.',
    quote: '돈보다 마감이 급했던 거야.',
    line: 'red',
    mark: 'red',
    threads: ['debt', 'payment'],
    plan: { motive: 1 },
  },
  {
    key: 'scene_09',
    title: '객석 아래의 단추',
    summary: '숨듯이 숙인 흔적이다.',
    detail: '단추가 떨어진 위치가 지나치게 낮다. 몸을 낮춘 사람만 남길 수 있는 흔적이다.',
    quote: '피한 거지. 넘어진 게 아니야.',
    line: 'white',
    mark: 'white',
    threads: ['alibi', 'mask'],
    plan: { suspect: 1 },
  },
  {
    key: 'scene_10',
    title: '얼룩 없는 장갑',
    summary: '깨끗해서 더 수상하다.',
    detail: '현장 가까이에 있었는데도 지나치게 깨끗하다. 지울 시간이 있었다는 뜻이다.',
    quote: '깨끗함도 흔적이야.',
    line: 'black',
    mark: 'black',
    threads: ['glove', 'coverup'],
    plan: { method: 1, suspect: 1 },
  },
  {
    key: 'scene_11',
    title: '접힌 안내문',
    summary: '표시 없는 출구만 닳았다.',
    detail: '관람객용 안내문인데 비밀 출구 쪽만 심하게 닳아 있다. 누군가 길잡이로 썼다.',
    quote: '지도가 아니라 핑계였겠지.',
    line: 'blue',
    mark: 'blue',
    threads: ['passage', 'code'],
    plan: { method: 1 },
  },
  {
    key: 'scene_12',
    title: '향수와 소독약 냄새',
    summary: '지운 흔적이 겹친다.',
    detail: '강한 향수 아래 소독약 냄새가 깔려 있다. 감춘 건 피가 아니라 접촉 시점이다.',
    quote: '좋은 향일수록 숨긴 게 많아.',
    line: 'black',
    mark: 'black',
    threads: ['coverup', 'tea'],
    plan: { motive: 1, method: 1 },
  },
];

const TIER_2_BLUEPRINTS = [
  {
    key: 'people_01',
    title: '숨긴 보관 계약서',
    summary: '서명보다 덧칠이 많다.',
    detail: '계약 조건 중 보관 책임 조항만 여러 번 고쳐졌다. 누군가 책임선을 옮기려 했다.',
    quote: '서류는 조용히 살인을 돕지.',
    line: 'blue',
    mark: 'blue',
    threads: ['ledger', 'vault'],
    plan: { suspect: 1, motive: 1 },
  },
  {
    key: 'people_02',
    title: '순찰 공백표',
    summary: '비어 있는 7분이 있다.',
    detail: '순찰표는 멀쩡한데, 딱 한 구간만 비어 있다. 그 7분이면 충분하다.',
    quote: '비는 칸이 제일 시끄럽지.',
    line: 'white',
    mark: 'white',
    threads: ['alibi', 'schedule'],
    plan: { suspect: 1, method: 1 },
  },
  {
    key: 'people_03',
    title: '은밀한 송금 기록',
    summary: '금액은 작아도 타이밍이 노골적이다.',
    detail: '사건 직전과 직후에만 움직인 돈이 있다. 누군가를 닥치게 하려는 흐름이다.',
    quote: '큰돈보다 급한 돈이 위험해.',
    line: 'red',
    mark: 'red',
    threads: ['payment', 'debt'],
    plan: { motive: 2 },
  },
  {
    key: 'people_04',
    title: '복원된 통화 녹취',
    summary: '숨은 말버릇이 남아 있다.',
    detail: '문장이 끊겨도 호흡과 말버릇은 남는다. 누가 누구를 오래 알고 있었는지 드러난다.',
    quote: '목소리는 가면을 잘 못 써.',
    line: 'blue',
    mark: 'blue',
    threads: ['alibi', 'buyer'],
    plan: { suspect: 2 },
  },
  {
    key: 'people_05',
    title: '보석 감정 오차표',
    summary: '진품을 본 눈은 같은 실수를 하지 않는다.',
    detail: '감정 수치가 미묘하게 어긋난다. 처음부터 바꿔치기를 준비했을 가능성이 크다.',
    quote: '실수라기엔 너무 계산적이야.',
    line: 'green',
    mark: 'green',
    threads: ['forgery', 'buyer'],
    plan: { motive: 1, method: 1 },
  },
  {
    key: 'people_06',
    title: '무대 뒤 전달 메모',
    summary: '짧은 문장인데 명령처럼 날카롭다.',
    detail: '메모는 짧지만 시간과 위치가 정확하다. 현장을 사고처럼 보이게 만들려던 흔적이다.',
    quote: '누군가는 미리 순서를 짰어.',
    line: 'black',
    mark: 'black',
    threads: ['stage', 'coverup'],
    plan: { method: 2 },
  },
  {
    key: 'people_07',
    title: '가면 보관함 열쇠표',
    summary: '누군가 제 열쇠를 제때 찾지 못했다.',
    detail: '열쇠 반납 시각이 맞지 않는다. 가면과 사람이 다른 선으로 움직였다.',
    quote: '가면은 늘 사람보다 늦게 돌아와.',
    line: 'white',
    mark: 'white',
    threads: ['mask', 'key'],
    plan: { suspect: 1, motive: 1 },
  },
  {
    key: 'people_08',
    title: '사라진 점검 장부',
    summary: '뜯긴 건 한 장뿐이다.',
    detail: '없어진 페이지는 장치 점검표였다. 누가 언제 무대 장치에 손댔는지 그 장만 사라졌다.',
    quote: '없어진 장수까지 말해 줘.',
    line: 'black',
    mark: 'black',
    threads: ['wire', 'ledger'],
    plan: { suspect: 1, method: 1 },
  },
  {
    key: 'people_09',
    title: '접대실 좌석 메모',
    summary: '한 사람이 먼저 침묵했다.',
    detail: '대화 상대를 표시한 메모 끝이 접혀 있다. 협박인지 거래인지, 둘 중 하나다.',
    quote: '말보다 침묵이 더 비싸.',
    line: 'red',
    mark: 'red',
    threads: ['blackmail', 'buyer'],
    plan: { motive: 2 },
  },
  {
    key: 'people_10',
    title: '창고문 안쪽 긁힘',
    summary: '밖이 아니라 안에서 밀었다.',
    detail: '창고문 안쪽 금속에 길게 긁힌 자국이 있다. 숨어 있다가 타이밍을 본 흔적이다.',
    quote: '숨는 쪽은 늘 안쪽이지.',
    line: 'green',
    mark: 'green',
    threads: ['passage', 'vault'],
    plan: { method: 1, suspect: 1 },
  },
  {
    key: 'people_11',
    title: '미완성 사직서',
    summary: '끝맺지 못한 문장이 남았다.',
    detail: '직함을 버리려던 문장인데 마지막 사유가 비어 있다. 누군가는 이미 도망을 준비했다.',
    quote: '떠날 사람은 보통 흔적부터 끊어.',
    line: 'white',
    mark: 'white',
    threads: ['inheritance', 'alibi'],
    plan: { suspect: 1, motive: 1 },
  },
  {
    key: 'people_12',
    title: '와인 재고 누락',
    summary: '병 하나가 조용히 빠졌다.',
    detail: '재고표와 실제 병 수가 맞지 않는다. 다과 라인 누군가가 일부러 숨겼다.',
    quote: '사라진 건 병이 아니라 손길이야.',
    line: 'red',
    mark: 'red',
    threads: ['wine', 'tea'],
    plan: { method: 1, motive: 1 },
  },
];

const TIER_3_BLUEPRINTS = [
  {
    key: 'record_01',
    title: '후문 코드 변경 기록',
    summary: '이상하게 짧은 수정이다.',
    detail: '코드가 바뀐 시각이 사건 직전이다. 내부 사정을 아는 사람 아니면 손댈 수 없다.',
    quote: '숫자는 늘 누굴 들이보냈는지 기억해.',
    line: 'blue',
    mark: 'blue',
    threads: ['code', 'entry'],
    plan: { suspect: 1, method: 1 },
  },
  {
    key: 'record_02',
    title: '복원된 보관실 사진',
    summary: '열쇠의 방향이 거꾸로다.',
    detail: '보관실 사진 속 열쇠 자국이 실제 방향과 다르다. 바꿔치기가 이미 끝난 뒤였다.',
    quote: '맞은 게 아니라 바뀐 거야.',
    line: 'green',
    mark: 'green',
    threads: ['key', 'forgery'],
    plan: { method: 2 },
  },
  {
    key: 'record_03',
    title: '사적인 부채 장부',
    summary: '이름 대신 이니셜만 남았다.',
    detail: '두 이니셜 사이 거래가 오래 이어졌다. 누군가는 돈으로 호흡을 유지하고 있었다.',
    quote: '부채는 사람을 묶고, 묶인 사람은 더 잘 무너져.',
    line: 'red',
    mark: 'red',
    threads: ['debt', 'ledger'],
    plan: { motive: 2, suspect: 1 },
  },
  {
    key: 'record_04',
    title: '찢긴 의료 보고서',
    summary: '상처보다 시간차가 눈에 띈다.',
    detail: '사망 추정 시각과 발견 시각 사이의 공백이 길다. 현장은 뒤늦게 연출됐다.',
    quote: '죽음은 먼저 왔고, 소란은 나중에 왔어.',
    line: 'white',
    mark: 'white',
    threads: ['nurse', 'coverup'],
    plan: { method: 2 },
  },
  {
    key: 'record_05',
    title: '가짜 감정 봉인표',
    summary: '정식 양식인데 종이가 다르다.',
    detail: '봉인 번호는 진짜지만 종이 섬유가 다르다. 위조 라인이 내부로 들어왔다.',
    quote: '정품 얼굴을 한 가짜지.',
    line: 'green',
    mark: 'green',
    threads: ['forgery', 'seal'],
    plan: { motive: 1, method: 1 },
  },
  {
    key: 'record_06',
    title: '가문 통지서 초안',
    summary: '호명 순서가 바뀌어 있다.',
    detail: '상속 통지서 초안에 후계 이름이 여러 번 고쳐졌다. 물건보다 자리 문제였다.',
    quote: '이름 순서 때문에도 사람은 죽어.',
    line: 'red',
    mark: 'red',
    threads: ['inheritance', 'payment'],
    plan: { motive: 2 },
  },
  {
    key: 'record_07',
    title: '비밀 통로 도면 사본',
    summary: '벽 하나가 비어 있다.',
    detail: '관람 동선엔 없는 벽면 통로가 도면 사본에만 표시돼 있다. 누군가 일부만 알고 움직였다.',
    quote: '길을 안다는 건 시간을 가진다는 뜻이야.',
    line: 'blue',
    mark: 'blue',
    threads: ['passage', 'stage'],
    plan: { suspect: 1, method: 1 },
  },
  {
    key: 'record_08',
    title: '교체용 장갑 주문서',
    summary: '사건 전날만 수량이 많다.',
    detail: '같은 장갑 주문인데 전날만 세 배다. 누군가 흔적 하나를 남기지 않으려 했다.',
    quote: '손을 숨기는 주문이었지.',
    line: 'black',
    mark: 'black',
    threads: ['glove', 'payment'],
    plan: { suspect: 1, method: 1 },
  },
  {
    key: 'record_09',
    title: '익명 제보 편지',
    summary: '받는 사람 이름이 비어 있다.',
    detail: '편지엔 거래와 협박이 뒤섞여 있다. 누군가는 먼저 약점을 쥐고 있었다.',
    quote: '겁먹은 쪽은 늘 이름을 비워 둬.',
    line: 'black',
    mark: 'black',
    threads: ['blackmail', 'ledger'],
    plan: { motive: 2, suspect: 1 },
  },
  {
    key: 'record_10',
    title: '리허설 동선표',
    summary: '커튼 타이밍이 두 번 바뀌었다.',
    detail: '무대 전환표에서 커튼 개폐 시각만 이상하게 수정됐다. 누군가 시야를 일부러 끊었다.',
    quote: '보이게 하는 일도, 안 보이게 하는 일도 같은 손이 해.',
    line: 'green',
    mark: 'green',
    threads: ['curtain', 'stage'],
    plan: { method: 1, suspect: 1 },
  },
  {
    key: 'record_11',
    title: '왕관 이동 승인표',
    summary: '특권 서명이 엇갈렸다.',
    detail: '승인표의 서명 순서가 실제 절차와 맞지 않는다. 내부 협조가 없으면 안 되는 흔적이다.',
    quote: '권한은 늘 흔적을 남겨.',
    line: 'white',
    mark: 'white',
    threads: ['vault', 'key'],
    plan: { suspect: 2 },
  },
  {
    key: 'record_12',
    title: '보조 조명 점화표',
    summary: '꺼진 구간이 한 사람을 지웠다.',
    detail: '보조 조명 점화표에서 딱 한 구간만 빠져 있다. 그 어둠 속에서 누군가 자리를 옮겼다.',
    quote: '빛을 끄면 사람도 사라져.',
    line: 'blue',
    mark: 'blue',
    threads: ['wire', 'curtain'],
    plan: { suspect: 1, method: 1 },
  },
];

function buildFalsePools(solution, random) {
  return {
    suspect: seededShuffle(
      ['aria_veil', 'seo_dohyun', 'yun_sora', 'kang_ryeon', 'matteo_bern', 'lee_narin'].filter((id) => id !== solution.culpritId),
      random
    ),
    motive: seededShuffle(['debt', 'revenge', 'blackmail', 'inheritance', 'forgery'].filter((id) => id !== solution.motiveId), random),
    method: seededShuffle(['poison_tea', 'wire_fall', 'hidden_blade', 'secret_passage', 'key_swap'].filter((id) => id !== solution.methodId), random),
  };
}

function pick(pool, cursor, count, random) {
  if (!count) return [];
  const out = [];
  for (let i = 0; i < count; i += 1) {
    if (cursor.index >= pool.length) {
      const reshuffled = seededShuffle(pool, random);
      pool.splice(0, pool.length, ...reshuffled);
      cursor.index = 0;
    }
    const id = pool[cursor.index];
    cursor.index += 1;
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

function buildDirectiveText(effect) {
  const lines = [];
  if (effect.eliminateSuspects.length) lines.push(`용의자 ${effect.eliminateSuspects.map((id) => getCandidateName('suspect', id)).join(', ')} 제외`);
  if (effect.eliminateMotives.length) lines.push(`동기 ${effect.eliminateMotives.map((id) => getCandidateName('motive', id)).join(', ')} 제외`);
  if (effect.eliminateMethods.length) lines.push(`수법 ${effect.eliminateMethods.map((id) => getCandidateName('method', id)).join(', ')} 제외`);
  return lines;
}

function createCard(blueprint, effect) {
  return {
    id: blueprint.key,
    key: blueprint.key,
    tier: blueprint.tier,
    zone: TIER_ZONE[blueprint.tier],
    zoneLabel: TIER_LABEL[blueprint.tier],
    title: blueprint.title,
    summary: blueprint.summary,
    detail: blueprint.detail,
    quote: blueprint.quote,
    line: blueprint.line,
    mark: blueprint.mark,
    threads: [...blueprint.threads],
    directives: effect,
    directiveLines: buildDirectiveText(effect),
  };
}

function buildTierDeck(blueprints, tier, solution, seedKey) {
  const random = createSeededRandom(seedKey);
  const pools = buildFalsePools(solution, random);
  const cursors = {
    suspect: { index: 0 },
    motive: { index: 0 },
    method: { index: 0 },
  };

  const cards = blueprints.map((item) => {
    const effect = {
      eliminateSuspects: pick(pools.suspect, cursors.suspect, item.plan?.suspect || 0, random),
      eliminateMotives: pick(pools.motive, cursors.motive, item.plan?.motive || 0, random),
      eliminateMethods: pick(pools.method, cursors.method, item.plan?.method || 0, random),
    };
    return createCard({ ...item, tier }, effect);
  });

  return seededShuffle(cards, random);
}

export function buildCaseDecks({ solution, seed }) {
  return {
    1: buildTierDeck(TIER_1_BLUEPRINTS, 1, solution, `${seed}:scene`),
    2: buildTierDeck(TIER_2_BLUEPRINTS, 2, solution, `${seed}:people`),
    3: buildTierDeck(TIER_3_BLUEPRINTS, 3, solution, `${seed}:record`),
  };
}
