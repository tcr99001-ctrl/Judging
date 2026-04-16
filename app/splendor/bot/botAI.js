import { canAccuse, canCrosscheck, canFileLead, canInterrogate, getAvailableCrosschecks, getPinnedThreads, getRemainingMethodIds, getRemainingMotiveIds, getRemainingSuspectIds, witnessUnlockState } from '../shared/utils';

function flattenBoard(board = {}) {
  return [...(board?.[1] || []), ...(board?.[2] || []), ...(board?.[3] || [])];
}

function effectSize(effect = {}) {
  return (effect.eliminateSuspects?.length || 0) + (effect.eliminateMotives?.length || 0) + (effect.eliminateMethods?.length || 0);
}

function chooseAccusation(bot) {
  const suspects = getRemainingSuspectIds(bot.notebook || {});
  const motives = getRemainingMotiveIds(bot.notebook || {});
  const methods = getRemainingMethodIds(bot.notebook || {});
  if (suspects.length === 1 && motives.length === 1 && methods.length === 1) {
    return {
      type: 'ACCUSE',
      payload: {
        culpritId: suspects[0],
        motiveId: motives[0],
        methodId: methods[0],
      },
    };
  }
  return null;
}

function chooseWitness(roomData, bot) {
  const available = (roomData?.witnessStrip || []).filter((witness) => canInterrogate(bot, witness));
  if (!available.length) return null;
  const best = [...available].sort((a, b) => effectSize(b.effect) - effectSize(a.effect))[0];
  return { type: 'INTERROGATE', payload: { witnessId: best.id } };
}

function chooseCrosscheck(bot) {
  if (!canCrosscheck(bot)) return null;
  const pairs = getAvailableCrosschecks(bot);
  if (!pairs.length) return null;
  const best = [...pairs].sort((a, b) => {
    const scoreA = effectSize(a.a.directives) + effectSize(a.b.directives) + a.sharedThreads.length;
    const scoreB = effectSize(b.a.directives) + effectSize(b.b.directives) + b.sharedThreads.length;
    return scoreB - scoreA;
  })[0];
  return { type: 'CROSSCHECK', payload: { aId: best.a.id, bId: best.b.id } };
}

function chooseLead(bot, roomData) {
  if (!canFileLead(bot)) return null;
  const pinnedThreads = getPinnedThreads(bot);
  const lockedWitnesses = (roomData?.witnessStrip || []).map((witness) => ({
    witness,
    state: witnessUnlockState(bot, witness),
  })).filter((item) => !item.state.ready);

  const candidates = (bot.privateClues || []).filter((clue) => !(bot.reservedLeads || []).some((lead) => lead.id === clue.id));
  if (!candidates.length) return null;

  const scored = candidates.map((clue) => {
    let value = effectSize(clue.directives || {}) + (clue.threads?.length || 0) * 0.3;
    for (const item of lockedWitnesses) {
      for (const thread of item.state.missingThreads) {
        if ((clue.threads || []).includes(thread) && !pinnedThreads.has(thread)) value += 2.5;
      }
    }
    return { clue, value };
  }).sort((a, b) => b.value - a.value);

  return scored[0] ? { type: 'FILE_LEAD', payload: { clueId: scored[0].clue.id } } : null;
}

function chooseClue(roomData, bot) {
  const clues = flattenBoard(roomData?.board || {});
  if (!clues.length) return null;

  const lockedWitnesses = (roomData?.witnessStrip || []).map((witness) => ({
    witness,
    state: witnessUnlockState(bot, witness),
  })).filter((item) => !item.state.ready);

  const scored = clues.map((clue) => {
    let value = effectSize(clue.directives || {});
    for (const item of lockedWitnesses) {
      for (const thread of item.state.missingThreads) {
        if ((clue.threads || []).includes(thread)) value += 1.5;
      }
    }
    return { clue, value };
  }).sort((a, b) => b.value - a.value);

  return scored[0] ? { type: 'TAKE_CLUE', payload: { cardId: scored[0].clue.id } } : null;
}

export function chooseBotAction(roomData, bot) {
  const accusationReady = canAccuse(bot, roomData);
  if (accusationReady) {
    const accusation = chooseAccusation(bot);
    if (accusation) return accusation;
  }

  const witness = chooseWitness(roomData, bot);
  if (witness) return witness;

  const crosscheck = chooseCrosscheck(bot);
  if (crosscheck) return crosscheck;

  const lead = chooseLead(bot, roomData);
  if (lead) return lead;

  const clue = chooseClue(roomData, bot);
  if (clue) return clue;

  return { type: 'END_TURN', payload: {} };
}
