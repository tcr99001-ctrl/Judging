import { ACCUSATION_THRESHOLD, COLORS, LOG_LIMIT, MAX_RESERVED, STALE_PLAYER_MS } from './constants';
import { METHODS, MOTIVES, SUSPECTS, getCandidateName } from './caseData';

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export const vibrate = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
};

export function toMillis(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  if (value && typeof value.seconds === 'number') {
    const nanos = typeof value.nanoseconds === 'number' ? value.nanoseconds : 0;
    return (value.seconds * 1000) + Math.floor(nanos / 1_000_000);
  }
  return 0;
}

export function isPlayerStaleFromPresence({ player, roomPresenceAt, staleMs = STALE_PLAYER_MS }) {
  const lastSeenAt = toMillis(player?.lastSeenAt || 0);
  if (!(roomPresenceAt > 0) || !(lastSeenAt > 0)) return false;
  return (roomPresenceAt - lastSeenAt) > staleMs;
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

export function createEmptyNotebook() {
  return {
    eliminatedSuspects: [],
    eliminatedMotives: [],
    eliminatedMethods: [],
    notes: [],
  };
}

export function createEmptyLineProfile() {
  return {
    white: 0,
    blue: 0,
    green: 0,
    red: 0,
    black: 0,
  };
}

export function countLineProfile(clues = []) {
  const next = createEmptyLineProfile();
  for (const clue of clues) {
    const line = clue?.line;
    if (COLORS.includes(line)) next[line] += 1;
  }
  return next;
}

export function pushLog(log = [], entry) {
  return [...(Array.isArray(log) ? log : []), entry].slice(-LOG_LIMIT);
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

function dedupe(list = []) {
  return [...new Set(list.filter(Boolean))];
}

export function cloneNotebook(notebook = null) {
  return {
    eliminatedSuspects: [...(notebook?.eliminatedSuspects || [])],
    eliminatedMotives: [...(notebook?.eliminatedMotives || [])],
    eliminatedMethods: [...(notebook?.eliminatedMethods || [])],
    notes: [...(notebook?.notes || [])],
  };
}

export function applyNotebookEffect(notebook = null, effect = {}, note = '') {
  const next = cloneNotebook(notebook);
  next.eliminatedSuspects = dedupe([...next.eliminatedSuspects, ...(effect?.eliminateSuspects || [])]);
  next.eliminatedMotives = dedupe([...next.eliminatedMotives, ...(effect?.eliminateMotives || [])]);
  next.eliminatedMethods = dedupe([...next.eliminatedMethods, ...(effect?.eliminateMethods || [])]);
  if (note) next.notes = [...next.notes, note].slice(-12);
  return next;
}

export function buildNotebookSnapshot(notebook = null) {
  const safe = cloneNotebook(notebook);
  const remainingSuspects = SUSPECTS.map((entry) => entry.id).filter((id) => !safe.eliminatedSuspects.includes(id));
  const remainingMotives = MOTIVES.map((entry) => entry.id).filter((id) => !safe.eliminatedMotives.includes(id));
  const remainingMethods = METHODS.map((entry) => entry.id).filter((id) => !safe.eliminatedMethods.includes(id));
  return {
    ...safe,
    remainingSuspects,
    remainingMotives,
    remainingMethods,
    eliminatedTotal: safe.eliminatedSuspects.length + safe.eliminatedMotives.length + safe.eliminatedMethods.length,
  };
}

export function getRemainingSuspectIds(notebook = null) {
  return buildNotebookSnapshot(notebook).remainingSuspects;
}

export function getRemainingMotiveIds(notebook = null) {
  return buildNotebookSnapshot(notebook).remainingMotives;
}

export function getRemainingMethodIds(notebook = null) {
  return buildNotebookSnapshot(notebook).remainingMethods;
}

export function resolveCaseProgress(player = {}) {
  return Number(player?.caseProgress || 0);
}

export function countBreakthroughs(player = {}) {
  return Number(player?.breakthroughs || 0);
}

export function pairKey(a, b) {
  return [String(a || ''), String(b || '')].sort().join('::');
}

export function getAllKnownClues(player = {}) {
  const privateClues = Array.isArray(player?.privateClues) ? player.privateClues : [];
  const reservedLeads = Array.isArray(player?.reservedLeads) ? player.reservedLeads : [];
  const map = new Map();
  [...privateClues, ...reservedLeads].forEach((clue) => {
    if (clue?.id) map.set(clue.id, clue);
  });
  return [...map.values()];
}

export function findClueById(player = {}, clueId) {
  return getAllKnownClues(player).find((card) => card.id === clueId) || null;
}

export function isLeadPinned(player = {}, clueId) {
  return Array.isArray(player?.reservedLeads) && player.reservedLeads.some((card) => card.id === clueId);
}

export function getSharedThreads(cardA, cardB) {
  const a = new Set(cardA?.threads || []);
  const b = new Set(cardB?.threads || []);
  return [...a].filter((item) => b.has(item));
}

export function getPinnedThreads(player = {}) {
  const set = new Set();
  for (const clue of player?.reservedLeads || []) {
    for (const thread of clue?.threads || []) set.add(thread);
  }
  return set;
}

export function getLineProfileFromPrivate(player = {}) {
  return countLineProfile(getAllKnownClues(player));
}

export function canTakeClue(roomData = {}) {
  return [1, 2, 3].some((tier) => Array.isArray(roomData?.board?.[tier]) && roomData.board[tier].length > 0);
}

export function canFileLead(player = {}, clueId = null) {
  const pinned = Array.isArray(player?.reservedLeads) ? player.reservedLeads : [];
  if (clueId && isLeadPinned(player, clueId)) return true;
  if (pinned.length >= MAX_RESERVED) return false;
  const privateClues = Array.isArray(player?.privateClues) ? player.privateClues : [];
  const candidates = privateClues.filter((clue) => !isLeadPinned(player, clue.id));
  if (clueId) return candidates.some((clue) => clue.id === clueId);
  return candidates.length > 0;
}

export function canCrosscheck(player = {}, clueIdA = null, clueIdB = null) {
  const clues = getAllKnownClues(player);
  if (clues.length < 2) return false;
  if (!clueIdA || !clueIdB) return true;
  if (clueIdA === clueIdB) return false;
  const cardA = clues.find((clue) => clue.id === clueIdA);
  const cardB = clues.find((clue) => clue.id === clueIdB);
  if (!cardA || !cardB) return false;
  if (!getSharedThreads(cardA, cardB).length) return false;
  const used = new Set(player?.crosscheckPairs || []);
  return !used.has(pairKey(clueIdA, clueIdB));
}

export function getAvailableCrosschecks(player = {}) {
  const clues = getAllKnownClues(player);
  const used = new Set(player?.crosscheckPairs || []);
  const out = [];
  for (let i = 0; i < clues.length; i += 1) {
    for (let j = i + 1; j < clues.length; j += 1) {
      const sharedThreads = getSharedThreads(clues[i], clues[j]);
      if (!sharedThreads.length) continue;
      const key = pairKey(clues[i].id, clues[j].id);
      if (used.has(key)) continue;
      out.push({ a: clues[i], b: clues[j], key, sharedThreads });
    }
  }
  return out;
}

export function canInterrogate(player = {}, witness = null) {
  if (!witness) return false;
  const used = new Set(player?.interrogatedWitnessIds || []);
  if (used.has(witness.id)) return false;
  const pinnedThreads = getPinnedThreads(player);
  const requiredThreads = witness?.needs?.threads || [];
  const enoughThreads = requiredThreads.every((thread) => pinnedThreads.has(thread));
  const crosschecks = Array.isArray(player?.crosscheckPairs) ? player.crosscheckPairs.length : 0;
  const enoughCrosschecks = crosschecks >= Number(witness?.needs?.crosschecks || 0);
  return enoughThreads && enoughCrosschecks;
}

export function witnessUnlockState(player = {}, witness = null) {
  const pinnedThreads = getPinnedThreads(player);
  const requiredThreads = witness?.needs?.threads || [];
  const missingThreads = requiredThreads.filter((thread) => !pinnedThreads.has(thread));
  const crosschecks = Array.isArray(player?.crosscheckPairs) ? player.crosscheckPairs.length : 0;
  const needCrosschecks = Math.max(0, Number(witness?.needs?.crosschecks || 0) - crosschecks);
  return {
    ready: missingThreads.length === 0 && needCrosschecks === 0 && !((player?.interrogatedWitnessIds || []).includes(witness?.id)),
    missingThreads,
    needCrosschecks,
  };
}

export function canAccuse(player = {}, roomData = {}) {
  if (player?.accusationLocked) return false;
  const threshold = Number(roomData?.accusationThreshold || ACCUSATION_THRESHOLD);
  const progressOk = Number(player?.caseProgress || 0) >= threshold;
  const snapshot = buildNotebookSnapshot(player?.notebook || {});
  const narrowed = snapshot.remainingSuspects.length <= 2 && snapshot.remainingMotives.length <= 2 && snapshot.remainingMethods.length <= 2;
  return progressOk || narrowed;
}

export function hasAnyLegalAction({ player = {}, roomData = {} }) {
  if (canTakeClue(roomData)) return true;
  if (canFileLead(player)) return true;
  if (canCrosscheck(player)) return true;
  if ((roomData?.witnessStrip || []).some((witness) => canInterrogate(player, witness))) return true;
  if (canAccuse(player, roomData)) return true;
  return false;
}

export function describeAccusationChoice(choice = {}) {
  if (!choice) return '';
  return `${getCandidateName('suspect', choice.culpritId)} / ${getCandidateName('motive', choice.motiveId)} / ${getCandidateName('method', choice.methodId)}`;
}

export function totalCandidateEliminations(notebook = null) {
  const snap = buildNotebookSnapshot(notebook);
  return snap.eliminatedTotal;
}

export function comparePlayersForVictory(a = {}, b = {}) {
  const progressDiff = Number(b.caseProgress || 0) - Number(a.caseProgress || 0);
  if (progressDiff !== 0) return progressDiff;
  const eliminationDiff = totalCandidateEliminations(b.notebook) - totalCandidateEliminations(a.notebook);
  if (eliminationDiff !== 0) return eliminationDiff;
  const witnessDiff = Number(b.witnessCount || 0) - Number(a.witnessCount || 0);
  if (witnessDiff !== 0) return witnessDiff;
  return Number(a.turnsTaken || 0) - Number(b.turnsTaken || 0);
}
