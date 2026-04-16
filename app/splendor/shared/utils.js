import {
  ACCUSATION_THRESHOLD,
  ALL,
  COLORS,
  GEM_LABEL,
  GEM_SHORT,
  LOG_LIMIT,
  MAX_GEMS,
  MAX_RESERVED,
  STALE_PLAYER_MS,
} from './constants';
import {
  METHODS,
  MOTIVES,
  SUSPECTS,
  getCandidateName,
} from './caseData';

export const vibrate = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
};

export const createEmptyResources = () => ({
  white: 0,
  blue: 0,
  green: 0,
  red: 0,
  black: 0,
  gold: 0,
});

export const createEmptyGems = createEmptyResources;

export const createEmptyInsights = () => ({
  white: 0,
  blue: 0,
  green: 0,
  red: 0,
  black: 0,
});

export const createEmptyBonuses = createEmptyInsights;

export const createEmptyNotebook = () => ({
  eliminatedSuspects: [],
  eliminatedMotives: [],
  eliminatedMethods: [],
  notes: [],
});

export function normalizeResources(resources = {}) {
  const next = createEmptyResources();
  for (const color of ALL) next[color] = Number(resources?.[color] || 0);
  return next;
}

export function normalizeInsights(insights = {}, clues = null) {
  if (Array.isArray(clues) && clues.length) return deriveInsightsFromClues(clues);
  const next = createEmptyInsights();
  for (const color of COLORS) next[color] = Number(insights?.[color] || 0);
  return next;
}

export const normalizeBonuses = normalizeInsights;

export function deriveInsightsFromClues(clues = []) {
  const next = createEmptyInsights();
  for (const clue of clues) {
    const color = clue?.insight || clue?.bonus;
    if (COLORS.includes(color)) next[color] += 1;
  }
  return next;
}

export function getPlayerInsights(player = {}) {
  return normalizeInsights(player?.insights || player?.bonuses, player?.clues || player?.cards);
}

export const getPlayerBonuses = getPlayerInsights;

export function toMillis(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  if (value && typeof value.seconds === 'number') {
    const nanos = typeof value.nanoseconds === 'number' ? value.nanoseconds : 0;
    return (value.seconds * 1000) + Math.floor(nanos / 1_000_000);
  }
  return 0;
}

export function getTotalResources(resources) {
  if (!resources) return 0;
  return Object.values(resources).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

export const getTotalGems = getTotalResources;

export function isPlayerStaleFromPresence({ player, roomPresenceAt, staleMs = STALE_PLAYER_MS }) {
  const lastSeenAt = toMillis(player?.lastSeenAt || 0);
  if (!(roomPresenceAt > 0) || !(lastSeenAt > 0)) return false;
  return (roomPresenceAt - lastSeenAt) > staleMs;
}

export function perColorBank(playerCount) {
  if (playerCount <= 2) return 4;
  if (playerCount === 3) return 5;
  return 7;
}

export function createBankForPlayers(playerCount) {
  const per = perColorBank(playerCount);
  return {
    white: per,
    blue: per,
    green: per,
    red: per,
    black: per,
    gold: 5,
  };
}

export function getDisplayName(player) {
  if (!player) return '수사관';
  return player.name || String(player.id || '수사관').slice(0, 6);
}

export function makeDeckPlaceholders(value) {
  const count = Array.isArray(value) ? value.length : Number(value || 0);
  return Array.from({ length: Math.max(0, count) }, (_, index) => ({ id: `deck_placeholder_${index}`, placeholder: true }));
}

export function hasRealCardPayload(list) {
  return Array.isArray(list) && list.some((item) => item && typeof item === 'object' && typeof item.id === 'string' && !item.placeholder);
}

export function getOrderedColorEntries(map = {}, { includeGold = false } = {}) {
  const order = includeGold ? [...COLORS, 'gold'] : COLORS;
  return order.map((color) => [color, Number(map?.[color] || 0)]).filter(([, value]) => value > 0);
}

export function formatResourceList(cost = {}, { includeGold = false } = {}) {
  return getOrderedColorEntries(cost, { includeGold })
    .map(([color, value]) => `${GEM_SHORT[color]} ${value}`)
    .join(' · ');
}

export function formatCandidateList(kind, ids = []) {
  return ids.map((id) => getCandidateName(kind, id)).join(', ');
}

export function summarizeNotebookEffect(effect = {}) {
  const lines = [];
  if (effect.eliminateSuspects?.length) lines.push(`용의자 ${formatCandidateList('suspect', effect.eliminateSuspects)} 제외`);
  if (effect.eliminateMotives?.length) lines.push(`동기 ${formatCandidateList('motive', effect.eliminateMotives)} 제외`);
  if (effect.eliminateMethods?.length) lines.push(`수법 ${formatCandidateList('method', effect.eliminateMethods)} 제외`);
  return lines;
}

export function cloneNotebook(notebook = null) {
  return {
    eliminatedSuspects: [...(notebook?.eliminatedSuspects || [])],
    eliminatedMotives: [...(notebook?.eliminatedMotives || [])],
    eliminatedMethods: [...(notebook?.eliminatedMethods || [])],
    notes: [...(notebook?.notes || [])],
  };
}

export function pushNotebookNote(notebook, note) {
  const next = cloneNotebook(notebook);
  if (note) {
    next.notes = [...next.notes, note].slice(-10);
  }
  return next;
}

export function applyNotebookEffect(notebook = null, effect = {}, note = '') {
  const next = cloneNotebook(notebook);
  next.eliminatedSuspects = uniqueIds([...next.eliminatedSuspects, ...(effect?.eliminateSuspects || [])]);
  next.eliminatedMotives = uniqueIds([...next.eliminatedMotives, ...(effect?.eliminateMotives || [])]);
  next.eliminatedMethods = uniqueIds([...next.eliminatedMethods, ...(effect?.eliminateMethods || [])]);
  if (note) next.notes = [...next.notes, note].slice(-10);
  return next;
}

export function uniqueIds(items = []) {
  return [...new Set(items.filter(Boolean))];
}

export function getRemainingSuspectIds(notebook = {}) {
  return SUSPECTS.map((item) => item.id).filter((id) => !new Set(notebook?.eliminatedSuspects || []).has(id));
}

export function getRemainingMotiveIds(notebook = {}) {
  return MOTIVES.map((item) => item.id).filter((id) => !new Set(notebook?.eliminatedMotives || []).has(id));
}

export function getRemainingMethodIds(notebook = {}) {
  return METHODS.map((item) => item.id).filter((id) => !new Set(notebook?.eliminatedMethods || []).has(id));
}

export function buildNotebookSnapshot(notebook = {}) {
  return {
    remainingSuspects: getRemainingSuspectIds(notebook),
    remainingMotives: getRemainingMotiveIds(notebook),
    remainingMethods: getRemainingMethodIds(notebook),
    notes: [...(notebook?.notes || [])],
  };
}

export function canTakeLeadSelection(selected = [], bank = {}) {
  const picks = Array.isArray(selected) ? selected.filter((item) => COLORS.includes(item)) : [];
  if (!picks.length) return { ok: false, reason: '최소 한 개는 골라야 해.' };
  if (picks.length > 3) return { ok: false, reason: '세 개까지만 가능해.' };

  const counts = {};
  for (const color of picks) {
    counts[color] = (counts[color] || 0) + 1;
  }

  for (const [color, count] of Object.entries(counts)) {
    if ((bank?.[color] || 0) < count) return { ok: false, reason: `${GEM_LABEL[color]}이 부족해.` };
  }

  const distinct = Object.keys(counts).length;
  const maxSame = Math.max(...Object.values(counts));

  if (maxSame === 2) {
    const color = Object.keys(counts).find((entry) => counts[entry] === 2);
    if (distinct !== 1) return { ok: false, reason: '같은 색 두 개를 가져가려면 그것만 선택해야 해.' };
    if ((bank?.[color] || 0) < 4) return { ok: false, reason: '같은 색 두 개는 은행에 네 개 이상 있을 때만 가능해.' };
    return { ok: true };
  }

  if (maxSame > 2) return { ok: false, reason: '같은 색을 세 개는 못 가져가.' };
  if (distinct !== picks.length) return { ok: false, reason: '서로 다른 자원 세 개까지 가능해.' };
  return { ok: true };
}

export const isValidTake = canTakeLeadSelection;

export function enumerateLeadSelections(bank = {}) {
  const out = [];
  for (const color of COLORS) {
    if ((bank[color] || 0) >= 4) out.push([color, color]);
  }
  const available = COLORS.filter((color) => (bank[color] || 0) > 0);
  for (let i = 0; i < available.length; i += 1) {
    out.push([available[i]]);
    for (let j = i + 1; j < available.length; j += 1) {
      out.push([available[i], available[j]]);
      for (let k = j + 1; k < available.length; k += 1) {
        out.push([available[i], available[j], available[k]]);
      }
    }
  }
  return out.filter((selection) => canTakeLeadSelection(selection, bank).ok);
}

export function getAffordableState(card, player) {
  const resources = normalizeResources(player?.resources || player?.gems);
  const insights = getPlayerInsights(player);
  const cost = card?.cost || {};
  let goldNeed = 0;
  const missing = {};
  const effective = {};

  for (const color of COLORS) {
    const need = Math.max(0, Number(cost[color] || 0) - Number(insights[color] || 0));
    effective[color] = need;
    const own = Number(resources[color] || 0);
    const shortage = Math.max(0, need - own);
    missing[color] = shortage;
    goldNeed += shortage;
  }

  const canAfford = goldNeed <= Number(resources.gold || 0);
  return { canAfford, missing, effective, goldNeed };
}

export function canSecureClue(card, player) {
  return getAffordableState(card, player).canAfford;
}

export const canBuy = canSecureClue;

export function computeCluePayment(card, player) {
  const resources = normalizeResources(player?.resources || player?.gems);
  const insights = getPlayerInsights(player);
  const cost = card?.cost || {};
  const payment = createEmptyResources();

  for (const color of COLORS) {
    const need = Math.max(0, Number(cost[color] || 0) - Number(insights[color] || 0));
    const spend = Math.min(need, Number(resources[color] || 0));
    payment[color] = spend;
    const remain = need - spend;
    if (remain > 0) payment.gold += remain;
  }

  return payment;
}

export const computePayment = computeCluePayment;

export function getClueAcquireDisplay(card, player) {
  const affordable = getAffordableState(card, player);
  const missingLines = getOrderedColorEntries(affordable.missing)
    .map(([color, value]) => `${GEM_LABEL[color]} ${value}`);
  return {
    ...affordable,
    missingText: missingLines.length ? missingLines.join(', ') : '없음',
  };
}

export function eligibleWitnesses(insights = {}, witnessStrip = []) {
  return (witnessStrip || []).filter((witness) => COLORS.every((color) => Number(insights?.[color] || 0) >= Number(witness?.req?.[color] || 0)));
}

export function countBreakthroughs(player = {}) {
  if (Number.isFinite(player?.breakthroughs)) return Number(player.breakthroughs || 0);
  return (player?.clues || player?.cards || []).filter((item) => Number(item?.tier || 0) >= 3).length + (player?.witnesses || player?.nobles || []).length;
}

export function hasAnyLegalAction({ player, board, decks, bank }) {
  if (!player) return false;
  if (enumerateLeadSelections(bank).length) return true;

  const visible = [...(board?.[1] || []), ...(board?.[2] || []), ...(board?.[3] || [])];
  if (visible.some((card) => canSecureClue(card, player))) return true;
  if ((player?.reservedLeads || player?.reserved || []).some((card) => canSecureClue(card, player))) return true;

  const reservedCount = Number(player?.reservedCount || (player?.reservedLeads || player?.reserved || []).length || 0);
  if (reservedCount < MAX_RESERVED) {
    if (visible.length) return true;
    if ([1, 2, 3].some((tier) => Number(decks?.[tier]?.length || 0) > 0)) return true;
  }

  return false;
}

export function canAccuse(player = {}) {
  return !player?.accusationLocked && Number(player?.caseProgress ?? player?.score ?? 0) >= ACCUSATION_THRESHOLD;
}

export function comparePlayersForVictory(a, b) {
  const progressDiff = Number(b?.caseProgress ?? b?.score ?? 0) - Number(a?.caseProgress ?? a?.score ?? 0);
  if (progressDiff !== 0) return progressDiff;

  const breakthroughDiff = countBreakthroughs(b) - countBreakthroughs(a);
  if (breakthroughDiff !== 0) return breakthroughDiff;

  const clueDiff = Number((b?.clues || b?.cards || []).length || 0) - Number((a?.clues || a?.cards || []).length || 0);
  if (clueDiff !== 0) return clueDiff;

  return Number(a?.turnsTaken || 0) - Number(b?.turnsTaken || 0);
}

export function pushLog(log = [], entry = {}) {
  const next = [...(Array.isArray(log) ? log : []), entry];
  return next.length > LOG_LIMIT ? next.slice(-LOG_LIMIT) : next;
}

export function resolveCaseProgress(player = {}) {
  return Number(player?.caseProgress ?? player?.score ?? 0);
}

export function describeAccusationChoice({ culpritId, motiveId, methodId }) {
  return `${getCandidateName('suspect', culpritId)} / ${getCandidateName('motive', motiveId)} / ${getCandidateName('method', methodId)}`;
}

export function buildPublicNotebookSummary(notebook = {}) {
  const snapshot = buildNotebookSnapshot(notebook);
  return {
    suspects: snapshot.remainingSuspects.length,
    motives: snapshot.remainingMotives.length,
    methods: snapshot.remainingMethods.length,
  };
}

export function getStrongestInsightColor(insights = {}) {
  return COLORS.reduce((best, color) => {
    const value = Number(insights?.[color] || 0);
    if (!best || value > best.value) return { color, value };
    return best;
  }, null);
}
