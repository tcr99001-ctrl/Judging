import { createSeededRandom, getCandidateName, seededShuffle } from './caseData';

const WITNESS_BLUEPRINTS = [
  {
    id: 'witness_masked_patron',
    assetId: 'noble_wbk_333',
    title: '가면 후원자',
    role: '익명 후원자',
    quote: '난 돈 냄새는 맡아도 피 냄새는 싫어.',
    req: { white: 1, blue: 1, green: 0, red: 0, black: 1 },
    progress: 2,
    plan: { suspect: 1, motive: 1 },
  },
  {
    id: 'witness_stage_tailor',
    assetId: 'noble_bgr_333',
    title: '무대 재단사',
    role: '의상 관리인',
    quote: '가면 끈이 바뀐 건 내가 먼저 봤지.',
    req: { white: 0, blue: 1, green: 1, red: 1, black: 0 },
    progress: 2,
    plan: { suspect: 1, method: 1 },
  },
  {
    id: 'witness_night_medic',
    assetId: 'noble_wrk_333',
    title: '야간 의무원',
    role: '응급 담당',
    quote: '상처보다 시간차가 더 이상했어.',
    req: { white: 1, blue: 0, green: 0, red: 1, black: 1 },
    progress: 2,
    plan: { method: 2 },
  },
  {
    id: 'witness_archive_keeper',
    assetId: 'noble_gr_44',
    title: '비밀 보관인',
    role: '기록 서고 책임자',
    quote: '찢긴 문서는 없어. 숨긴 문서만 있지.',
    req: { white: 0, blue: 0, green: 2, red: 2, black: 0 },
    progress: 2,
    plan: { motive: 2 },
  },
  {
    id: 'witness_light_operator',
    assetId: 'noble_bg_44',
    title: '조명 기사',
    role: '무대 장치 조작자',
    quote: '그 순간 꺼진 조명은 우연이 아니야.',
    req: { white: 0, blue: 2, green: 2, red: 0, black: 0 },
    progress: 2,
    plan: { method: 1, suspect: 1 },
  },
  {
    id: 'witness_private_collector',
    assetId: 'noble_rk_44',
    title: '비밀 수집가',
    role: '경매 VIP',
    quote: '진품이 사라진 밤이면, 누군가는 미리 가격을 안다는 뜻이지.',
    req: { white: 0, blue: 0, green: 0, red: 2, black: 2 },
    progress: 2,
    plan: { motive: 1, suspect: 1 },
  },
  {
    id: 'witness_door_keeper',
    assetId: 'noble_wk_44',
    title: '뒷문 담당자',
    role: '출입 통제원',
    quote: '들어간 사람보다 나온 사람이 더 적었어.',
    req: { white: 2, blue: 0, green: 0, red: 0, black: 2 },
    progress: 2,
    plan: { suspect: 2 },
  },
  {
    id: 'witness_house_musician',
    assetId: 'noble_wbg_333',
    title: '상주 연주자',
    role: '현장 연주 감독',
    quote: '박자 하나 밀린 순간, 누군가 자리를 비웠어.',
    req: { white: 1, blue: 1, green: 1, red: 0, black: 0 },
    progress: 2,
    plan: { motive: 1, method: 1 },
  },
  {
    id: 'witness_wine_steward',
    assetId: 'noble_grk_333',
    title: '와인 스튜어드',
    role: '다과 담당',
    quote: '잔을 바꾼 손은 분명 있었어.',
    req: { white: 0, blue: 0, green: 1, red: 1, black: 1 },
    progress: 2,
    plan: { method: 1, motive: 1 },
  },
  {
    id: 'witness_curtain_master',
    assetId: 'noble_wb_44',
    title: '커튼 마스터',
    role: '무대 전환 책임자',
    quote: '커튼은 다 숨겨 줘. 대신 순서를 기억하지.',
    req: { white: 2, blue: 2, green: 0, red: 0, black: 0 },
    progress: 2,
    plan: { suspect: 1, method: 1 },
  },
];

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
      const next = seededShuffle(pool, random);
      pool.splice(0, pool.length, ...next);
      cursor.index = 0;
    }
    const id = pool[cursor.index];
    cursor.index += 1;
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

export const NOBLES = WITNESS_BLUEPRINTS;

export function buildWitnessStrip({ solution, seed }) {
  const random = createSeededRandom(`${seed}:witness`);
  const pools = buildFalsePools(solution, random);
  const cursors = {
    suspect: { index: 0 },
    motive: { index: 0 },
    method: { index: 0 },
  };

  return seededShuffle(
    WITNESS_BLUEPRINTS.map((item) => {
      const effect = {
        eliminateSuspects: pick(pools.suspect, cursors.suspect, item.plan?.suspect || 0, random),
        eliminateMotives: pick(pools.motive, cursors.motive, item.plan?.motive || 0, random),
        eliminateMethods: pick(pools.method, cursors.method, item.plan?.method || 0, random),
      };
      return {
        ...item,
        effect,
        effectLines: describeEffect(effect),
      };
    }),
    random
  ).slice(0, 6);
}
