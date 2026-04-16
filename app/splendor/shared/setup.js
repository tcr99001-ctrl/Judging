import { serverTimestamp } from 'firebase/firestore';
import { ACCUSATION_THRESHOLD, CASE_TITLE } from './constants';
import { CASE_BRIEFING, buildReveal, createCaseSeed, drawSolution } from './caseData';
import { buildCaseDecks } from './cards';
import { buildWitnessStrip } from './nobles';
import { createEmptyNotebook, makeDeckPlaceholders } from './utils';

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function drawBoardFromDecks(hiddenDecks) {
  const board = { 1: [], 2: [], 3: [] };
  for (const tier of [1, 2, 3]) {
    const deck = hiddenDecks[tier];
    while (board[tier].length < 4 && deck.length) {
      board[tier].push(deck.pop());
    }
  }
  return board;
}

export function toPublicDecks(hiddenDecks) {
  return {
    1: makeDeckPlaceholders(hiddenDecks?.[1]),
    2: makeDeckPlaceholders(hiddenDecks?.[2]),
    3: makeDeckPlaceholders(hiddenDecks?.[3]),
  };
}

export function createPublicPlayerPayload(name, isBot = false) {
  return {
    name,
    isBot,
    clueCount: 0,
    reservedCount: 0,
    witnessCount: 0,
    caseProgress: 0,
    breakthroughs: 0,
    turnsTaken: 0,
    accusationLocked: false,
    online: true,
    lastSeenAt: serverTimestamp(),
  };
}

export function createPrivatePlayerPayload() {
  return {
    privateClues: [],
    reservedLeads: [],
    notebook: createEmptyNotebook(),
    accusationHistory: [],
    crosscheckPairs: [],
    interrogatedWitnessIds: [],
  };
}

export function buildCaseSetup({ seed = createCaseSeed() } = {}) {
  const solution = drawSolution(seed);
  const hiddenDecks = buildCaseDecks({ solution, seed });
  const board = drawBoardFromDecks(hiddenDecks);
  const witnessStrip = buildWitnessStrip({ solution, seed });

  return {
    seed,
    public: {
      caseTitle: CASE_TITLE,
      caseBrief: CASE_BRIEFING,
      accusationThreshold: ACCUSATION_THRESHOLD,
      board,
      decks: toPublicDecks(hiddenDecks),
      witnessStrip: deepClone(witnessStrip),
      nobles: deepClone(witnessStrip),
      reveal: null,
    },
    private: {
      hiddenDecks,
      solution,
      caseMeta: {
        createdFromSeed: seed,
        reveal: buildReveal(solution),
      },
    },
  };
}
