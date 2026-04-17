import { createSeededRandom, getCandidateName, seededShuffle } from './caseData';

const WITNESS_BLUEPRINTS = [
  {
    id: 'witness_masked_patron',
    assetId: 'witness_patron',
    title: '가면 후원자',
    role: '익명 후원자',
    quote: '결제 시각이 이상했다.',
    statement: '결제 흐름은 분명 이상했다.',
    needs: { threads: ['buyer', 'payment'], crosschecks: 1 },
    plan: { suspect: 1, motive: 1 },
    risk: '근거가 약하면 확인해 주지 않는다.',
  },
  {
    id: 'witness_stage_tailor',
    assetId: 'witness_tailor',
    title: '무대 재단사',
    role: '의상 관리인',
    quote: '가면 끈이 바뀐 걸 봤다.',
    statement: '가면 끈이 바뀐 걸 먼저 봤다.',
    needs: { threads: ['mask', 'stage'], crosschecks: 1 },
    plan: { suspect: 1, method: 1 },
    risk: '정황이 없으면 의상 얘기만 반복한다.',
  },
  {
    id: 'witness_night_medic',
    assetId: 'witness_medic',
    title: '야간 의무원',
    role: '응급 담당',
    quote: '발견 시각이 이상했다.',
    statement: '상처보다 발견 시각 차이가 더 컸다.',
    needs: { threads: ['nurse', 'tea'], crosschecks: 1 },
    plan: { method: 2 },
    risk: '기록이 없으면 더 말하지 않는다.',
  },
  {
    id: 'witness_archive_keeper',
    assetId: 'witness_curator',
    title: '비밀 보관인',
    role: '서고 책임자',
    quote: '숨긴 문서가 있었다.',
    statement: '찢긴 문서는 없었다. 숨긴 문서만 있었다.',
    needs: { threads: ['ledger', 'code'], crosschecks: 2 },
    plan: { motive: 1, suspect: 1 },
    risk: '자료가 반쪽이면 확인이 어렵다.',
  },
  {
    id: 'witness_light_operator',
    assetId: 'witness_guard',
    title: '조명 기사',
    role: '무대 장치 조작자',
    quote: '조명은 누가 손댄 거다.',
    statement: '꺼진 조명은 우연이 아니었다.',
    needs: { threads: ['wire', 'curtain'], crosschecks: 1 },
    plan: { method: 1, suspect: 1 },
    risk: '장치표가 없으면 진술이 짧다.',
  },
  {
    id: 'witness_private_collector',
    assetId: 'witness_auctioneer',
    title: '비밀 수집가',
    role: '경매 VIP',
    quote: '진품이 빠질 거란 걸 누군가는 알았다.',
    statement: '진품이 사라질 걸 미리 안 사람이 있었다.',
    needs: { threads: ['forgery', 'vault'], crosschecks: 1 },
    plan: { motive: 1, suspect: 1 },
    risk: '근거가 약하면 답을 피한다.',
  },
  {
    id: 'witness_door_keeper',
    assetId: 'witness_clerk',
    title: '뒷문 담당자',
    role: '출입 통제원',
    quote: '들어간 수와 나온 수가 달랐다.',
    statement: '들어간 사람보다 나온 사람이 적었다.',
    needs: { threads: ['entry', 'passage'], crosschecks: 1 },
    plan: { suspect: 2 },
    risk: '동선이 없으면 기억을 확정하지 않는다.',
  },
  {
    id: 'witness_wine_steward',
    assetId: 'witness_restorer',
    title: '와인 스튜어드',
    role: '다과 담당',
    quote: '잔이 한 번 바뀌었다.',
    statement: '잔을 바꾼 손이 분명 있었다.',
    needs: { threads: ['wine', 'tea'], crosschecks: 1 },
    plan: { method: 1, motive: 1 },
    risk: '잔 흐름이 안 잡히면 확인이 어렵다.',
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

function buildEffectLines(effect) {
  const lines = [];
  if (effect.eliminateSuspects.length) lines.push(`용의자 ${effect.eliminateSuspects.map((id) => getCandidateName('suspect', id)).join(', ')} 제외`);
  if (effect.eliminateMotives.length) lines.push(`동기 ${effect.eliminateMotives.map((id) => getCandidateName('motive', id)).join(', ')} 제외`);
  if (effect.eliminateMethods.length) lines.push(`수법 ${effect.eliminateMethods.map((id) => getCandidateName('method', id)).join(', ')} 제외`);
  return lines;
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
        effectLines: buildEffectLines(effect),
      };
    }),
    random
  ).slice(0, 6);
}
