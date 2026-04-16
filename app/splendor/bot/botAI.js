import { ALL, COLORS, MAX_GEMS } from '../shared/constants';
import { METHODS, MOTIVES, SUSPECTS } from '../shared/caseData';
import {
  canAccuse,
  canSecureClue,
  canTakeLeadSelection,
  computeCluePayment,
  enumerateLeadSelections,
  getAffordableState,
  getPlayerInsights,
  getRemainingMethodIds,
  getRemainingMotiveIds,
  getRemainingSuspectIds,
  getTotalResources,
} from '../shared/utils';

function flattenBoard(board = {}) {
  return [...(board?.[1] || []), ...(board?.[2] || []), ...(board?.[3] || [])];
}

function clueValue(card, bot) {
  const effectSize = (card?.effect?.eliminateSuspects?.length || 0)
    + (card?.effect?.eliminateMotives?.length || 0)
    + (card?.effect?.eliminateMethods?.length || 0);
  const progress = Number(card?.progress || card?.points || 0);
  const tierWeight = Number(card?.tier || 0) * 0.8;
  const missing = Object.values(getAffordableState(card, bot).missing || {}).reduce((sum, value) => sum + value, 0);
  return (progress * 4) + (effectSize * 2.6) + tierWeight - (missing * 0.7);
}

function pickAffordableClue(roomData, bot) {
  const visible = flattenBoard(roomData.board).filter((card) => canSecureClue(card, bot));
  const reserved = (bot.reservedLeads || bot.reserved || []).filter((card) => canSecureClue(card, bot));
  const bestBoard = [...visible].sort((a, b) => clueValue(b, bot) - clueValue(a, bot))[0] || null;
  const bestReserved = [...reserved].sort((a, b) => clueValue(b, bot) - clueValue(a, bot))[0] || null;
  if (bestBoard && bestReserved) {
    return clueValue(bestBoard, bot) >= clueValue(bestReserved, bot)
      ? { card: bestBoard, fromReserved: false }
      : { card: bestReserved, fromReserved: true };
  }
  if (bestBoard) return { card: bestBoard, fromReserved: false };
  if (bestReserved) return { card: bestReserved, fromReserved: true };
  return null;
}

function pickTargetCard(roomData, bot) {
  const candidates = [
    ...flattenBoard(roomData.board).map((card) => ({ card, fromReserved: false })),
    ...((bot.reservedLeads || bot.reserved || []).map((card) => ({ card, fromReserved: true }))),
  ];

  return candidates
    .map((entry) => {
      const payment = computeCluePayment(entry.card, bot);
      const missing = Object.values(payment || {}).reduce((sum, value) => sum + value, 0) - Number((bot.resources || bot.gems || {}).gold || 0);
      return {
        ...entry,
        score: clueValue(entry.card, bot) - Math.max(0, missing) * 0.75,
      };
    })
    .sort((a, b) => b.score - a.score)[0] || null;
}

function pickLeadSelection(roomData, bot) {
  const bank = roomData.bank || {};
  const selections = enumerateLeadSelections(bank);
  if (!selections.length) return null;

  const target = pickTargetCard(roomData, bot);
  if (!target) {
    return selections.sort((a, b) => b.length - a.length)[0];
  }

  const missing = getAffordableState(target.card, bot).missing;
  const scored = selections.map((selection) => {
    const unique = new Set(selection);
    let value = selection.length * 0.5;
    for (const color of unique) {
      value += (missing[color] || 0) * (selection.filter((item) => item === color).length + 0.2);
    }
    if (getTotalResources(bot.resources || bot.gems) + selection.length > MAX_GEMS) value -= 3;
    return { selection, value };
  }).sort((a, b) => b.value - a.value);

  return scored[0]?.selection || null;
}

function pickReserveAction(roomData, bot) {
  if ((bot.reservedLeads || bot.reserved || []).length >= 3) return null;
  const bestVisible = flattenBoard(roomData.board)
    .map((card) => ({ card, value: clueValue(card, bot) }))
    .sort((a, b) => b.value - a.value)[0];
  if (bestVisible) return { type: 'PIN_LEAD', payload: { cardId: bestVisible.card.id } };

  for (const tier of [3, 2, 1]) {
    if (Number(roomData?.decks?.[tier]?.length || 0) > 0) return { type: 'PIN_TOP_LEAD', payload: { tier } };
  }
  return null;
}

function bestDiscardColor(resources = {}) {
  return [...ALL].sort((a, b) => Number(resources?.[b] || 0) - Number(resources?.[a] || 0))[0] || 'white';
}

function pickAccusation(bot) {
  if (!canAccuse(bot)) return null;
  const notebook = bot.notebook || {};
  const suspects = getRemainingSuspectIds(notebook);
  const motives = getRemainingMotiveIds(notebook);
  const methods = getRemainingMethodIds(notebook);
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

export function chooseBotAction(roomData, bot) {
  if (!roomData || !bot) return { type: 'END_TURN', payload: {} };

  const accusation = pickAccusation(bot);
  if (accusation) return accusation;

  const immediate = pickAffordableClue(roomData, bot);
  if (immediate) {
    return {
      type: 'SECURE_CLUE',
      payload: { cardId: immediate.card.id, fromReserved: immediate.fromReserved },
    };
  }

  const take = pickLeadSelection(roomData, bot);
  if (take && canTakeLeadSelection(take, roomData.bank || {}).ok) {
    return { type: 'COLLECT_LEADS', payload: { selected: take } };
  }

  const reserve = pickReserveAction(roomData, bot);
  if (reserve) return reserve;

  return { type: 'END_TURN', payload: {} };
}

export function chooseBotDiscard(resources = {}) {
  return bestDiscardColor(resources);
}

export function chooseBotWitness(pending = {}) {
  return Array.isArray(pending?.options) && pending.options.length ? pending.options[0] : null;
}
