import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase';
import { ACCUSATION_THRESHOLD, MAX_RESERVED, STALE_PLAYER_MS } from '../shared/constants';
import { buildReveal } from '../shared/caseData';
import {
  applyNotebookEffect,
  buildNotebookSnapshot,
  canAccuse,
  canInterrogate,
  comparePlayersForVictory,
  deepClone,
  describeAccusationChoice,
  findClueById,
  getDisplayName,
  getSharedThreads,
  hasAnyLegalAction,
  isLeadPinned,
  isPlayerStaleFromPresence,
  makeDeckPlaceholders,
  pairKey,
  pushLog,
  summarizeNotebookEffect,
  toMillis,
} from '../shared/utils';

function cloneBoard(board = {}) {
  return {
    1: Array.isArray(board?.[1]) ? deepClone(board[1]) : [],
    2: Array.isArray(board?.[2]) ? deepClone(board[2]) : [],
    3: Array.isArray(board?.[3]) ? deepClone(board[3]) : [],
  };
}

function cloneDecks(hiddenDecks = {}) {
  return {
    1: Array.isArray(hiddenDecks?.[1]) ? deepClone(hiddenDecks[1]) : [],
    2: Array.isArray(hiddenDecks?.[2]) ? deepClone(hiddenDecks[2]) : [],
    3: Array.isArray(hiddenDecks?.[3]) ? deepClone(hiddenDecks[3]) : [],
  };
}

function toPublicDecks(hiddenDecks) {
  return {
    1: makeDeckPlaceholders(hiddenDecks?.[1]),
    2: makeDeckPlaceholders(hiddenDecks?.[2]),
    3: makeDeckPlaceholders(hiddenDecks?.[3]),
  };
}

function currentPlayerCanTriggerFinalRound(player, room) {
  const threshold = Number(room?.accusationThreshold || ACCUSATION_THRESHOLD);
  const snapshot = buildNotebookSnapshot(player?.notebook || {});
  return Number(player?.caseProgress || 0) >= threshold || (
    snapshot.remainingSuspects.length <= 2 &&
    snapshot.remainingMotives.length <= 2 &&
    snapshot.remainingMethods.length <= 2
  );
}

export async function txMove({
  db,
  roomCode,
  actorId,
  type,
  payload = {},
  requesterId = null,
}) {
  const roomRef = doc(db, 'rooms', roomCode);
  const roomPrivateRef = doc(db, 'rooms', roomCode, 'meta', 'private');
  const actorPublicRef = doc(db, 'rooms', roomCode, 'players', actorId);
  const actorPrivateRef = doc(db, 'rooms', roomCode, 'playersPrivate', actorId);

  await runTransaction(db, async (tx) => {
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists()) throw new Error('방을 찾지 못했다.');
    const room = roomSnap.data();
    if (room.status !== 'playing' && room.status !== 'final_round') throw new Error('지금은 진행 중이 아니다.');

    const roomPrivateSnap = await tx.get(roomPrivateRef);
    if (!roomPrivateSnap.exists()) throw new Error('사건 파일을 읽지 못했다.');
    const roomPrivate = roomPrivateSnap.data();
    const solution = roomPrivate.solution;
    const reveal = roomPrivate.caseMeta?.reveal || buildReveal(solution);

    const turnOrder = Array.isArray(room.turnOrder) ? room.turnOrder : [];
    const turnIndex = Number(room.turnIndex || 0);
    const turnNumber = Number(room.turnNumber || 1);
    const currentId = turnOrder[turnIndex];
    if (!currentId) throw new Error('현재 차례를 확인할 수 없다.');

    const roomPresenceAt = toMillis(room.presenceAt || room.updatedAt || 0);
    const callerId = requesterId || auth.currentUser?.uid || actorId;
    const callerIsParticipant = turnOrder.includes(callerId);

    if (type === 'FORCE_STALE_SKIP') {
      if (actorId !== currentId) throw new Error('현재 차례만 넘길 수 있다.');
      if (!callerIsParticipant || callerId === actorId) throw new Error('다른 참가자만 넘길 수 있다.');
    } else {
      if (actorId !== currentId) throw new Error('지금은 내 차례가 아니다.');
    }

    const actorPublicSnap = await tx.get(actorPublicRef);
    if (!actorPublicSnap.exists()) throw new Error('참가자 정보를 찾지 못했다.');
    const actorPrivateSnap = await tx.get(actorPrivateRef);

    const mePublic = actorPublicSnap.data();
    const mePrivate = actorPrivateSnap.exists()
      ? actorPrivateSnap.data()
      : { privateClues: [], reservedLeads: [], notebook: {}, accusationHistory: [], crosscheckPairs: [], interrogatedWitnessIds: [] };

    const isSelfRequest = callerId === actorId;
    const isHostDrivingBot = !!mePublic.isBot && callerId === room.hostId;
    if (type !== 'FORCE_STALE_SKIP' && !isSelfRequest && !isHostDrivingBot) {
      throw new Error('이 참가자를 대신 움직일 수 없다.');
    }

    const board = cloneBoard(room.board || { 1: [], 2: [], 3: [] });
    const hiddenDecks = cloneDecks(roomPrivate.hiddenDecks || { 1: [], 2: [], 3: [] });
    let witnessStrip = Array.isArray(room.witnessStrip)
      ? deepClone(room.witnessStrip)
      : Array.isArray(room.nobles)
        ? deepClone(room.nobles)
        : [];

    let privateClues = Array.isArray(mePrivate.privateClues) ? deepClone(mePrivate.privateClues) : [];
    let reservedLeads = Array.isArray(mePrivate.reservedLeads) ? deepClone(mePrivate.reservedLeads) : [];
    let notebook = deepClone(mePrivate.notebook || { eliminatedSuspects: [], eliminatedMotives: [], eliminatedMethods: [], notes: [] });
    let accusationHistory = Array.isArray(mePrivate.accusationHistory) ? deepClone(mePrivate.accusationHistory) : [];
    let crosscheckPairs = Array.isArray(mePrivate.crosscheckPairs) ? [...mePrivate.crosscheckPairs] : [];
    let interrogatedWitnessIds = Array.isArray(mePrivate.interrogatedWitnessIds) ? [...mePrivate.interrogatedWitnessIds] : [];

    let clueCount = Number(mePublic.clueCount || privateClues.length);
    let reservedCount = Number(mePublic.reservedCount || reservedLeads.length);
    let witnessCount = Number(mePublic.witnessCount || 0);
    let caseProgress = Number(mePublic.caseProgress || 0);
    let breakthroughs = Number(mePublic.breakthroughs || 0);
    let turnsTaken = Number(mePublic.turnsTaken || 0);
    let accusationLocked = !!mePublic.accusationLocked;

    const lock = room.actionLock || { turnIndex, playerId: actorId, used: false };
    const mainActionTypes = ['TAKE_CLUE', 'FILE_LEAD', 'CROSSCHECK', 'INTERROGATE', 'ACCUSE'];
    if (mainActionTypes.includes(type)) {
      if (lock.playerId !== actorId || lock.turnIndex !== turnIndex) throw new Error('행동 상태를 다시 확인해 주세요.');
      if (lock.used) throw new Error('이번 턴 행동은 이미 끝났다.');
    }

    const setRoom = (updates) => {
      tx.set(roomRef, { ...updates, updatedAt: serverTimestamp() }, { merge: true });
    };

    const setRoomPrivate = (updates) => {
      tx.set(roomPrivateRef, updates, { merge: true });
    };

    const syncBoardAndDecks = () => {
      setRoom({ board, decks: toPublicDecks(hiddenDecks) });
      setRoomPrivate({ hiddenDecks });
    };

    const syncWitnessStrip = () => {
      setRoom({ witnessStrip, nobles: witnessStrip });
    };

    const refillBoardSlot = (tier, slotIndex) => {
      const deck = hiddenDecks[tier] || [];
      const nextCard = deck.length ? deck.pop() : null;
      if (nextCard) board[tier][slotIndex] = nextCard;
      else board[tier].splice(slotIndex, 1);
      return nextCard;
    };

    const updateActorPublic = (extra = {}) => {
      clueCount = privateClues.length;
      reservedCount = reservedLeads.length;
      tx.set(actorPublicRef, {
        clueCount,
        reservedCount,
        witnessCount,
        caseProgress,
        breakthroughs,
        turnsTaken,
        accusationLocked,
        ...extra,
      }, { merge: true });
    };

    const updateActorPrivate = () => {
      tx.set(actorPrivateRef, {
        privateClues,
        reservedLeads,
        notebook,
        accusationHistory,
        crosscheckPairs,
        interrogatedWitnessIds,
      }, { merge: true });
    };

    const pushRoomLog = (message, extra = {}) => {
      const nextSeq = Number(room.logSeq || 0) + 1;
      setRoom({
        logSeq: nextSeq,
        log: pushLog(room.log, {
          seq: nextSeq,
          ts: Date.now(),
          actorId,
          type,
          message,
          ...extra,
        }),
      });
    };

    const buildActorSnapshot = () => ({
      ...mePublic,
      id: actorId,
      clueCount: privateClues.length,
      reservedCount: reservedLeads.length,
      witnessCount,
      caseProgress,
      breakthroughs,
      turnsTaken,
      accusationLocked,
      notebook,
    });

    const collectFinalReports = async () => {
      const reports = [];
      for (const playerId of turnOrder) {
        if (!playerId) continue;
        let publicData;
        let privateData;
        if (playerId === actorId) {
          publicData = buildActorSnapshot();
          privateData = { notebook, accusationHistory, reservedLeads, privateClues };
        } else {
          const publicSnap = await tx.get(doc(db, 'rooms', roomCode, 'players', playerId));
          const privateSnap = await tx.get(doc(db, 'rooms', roomCode, 'playersPrivate', playerId));
          if (!publicSnap.exists()) continue;
          publicData = { id: playerId, ...publicSnap.data() };
          privateData = privateSnap.exists() ? privateSnap.data() : { notebook: {}, accusationHistory: [] };
        }
        const snapshot = buildNotebookSnapshot(privateData?.notebook || {});
        reports.push({
          id: playerId,
          name: getDisplayName(publicData),
          isBot: !!publicData?.isBot,
          caseProgress: Number(publicData?.caseProgress || 0),
          clueCount: Number(publicData?.clueCount || 0),
          reservedCount: Number(publicData?.reservedCount || 0),
          witnessCount: Number(publicData?.witnessCount || 0),
          accusationLocked: !!publicData?.accusationLocked,
          notebook: snapshot,
          accusationHistory: Array.isArray(privateData?.accusationHistory) ? privateData.accusationHistory.slice(-3) : [],
        });
      }
      return reports;
    };

    const computeAdvance = async () => {
      let nextStatus = room.status === 'final_round' ? 'final_round' : 'playing';
      let nextFinalRound = room.finalRound || null;

      if (!nextFinalRound && currentPlayerCanTriggerFinalRound({ caseProgress, notebook }, room)) {
        nextStatus = 'final_round';
        nextFinalRound = {
          triggeredBy: actorId,
          endsAfter: turnNumber + Math.max(0, turnOrder.length - 1),
        };
      }

      const nextTurnIndex = (turnIndex + 1) % turnOrder.length;
      const nextTurnNumber = turnNumber + 1;

      if (nextFinalRound && nextTurnNumber > Number(nextFinalRound.endsAfter || 0)) {
        const reports = await collectFinalReports();
        const ranked = [...reports].sort(comparePlayersForVictory);
        return {
          status: 'ended',
          nextTurnIndex,
          nextTurnNumber,
          finalRound: nextFinalRound,
          winnerId: ranked[0]?.id || null,
          finalReports: reports,
          reveal,
          reason: 'deadline',
        };
      }

      return {
        status: nextStatus,
        nextTurnIndex,
        nextTurnNumber,
        finalRound: nextFinalRound,
        winnerId: null,
        finalReports: null,
        reveal: null,
        reason: null,
      };
    };

    if (type === 'TAKE_CLUE') {
      const cardId = payload.cardId;
      let picked = null;
      let pickedTier = null;
      let pickedIndex = -1;
      for (const tier of [1, 2, 3]) {
        const index = (board[tier] || []).findIndex((card) => card.id === cardId);
        if (index >= 0) {
          picked = deepClone(board[tier][index]);
          pickedTier = tier;
          pickedIndex = index;
          break;
        }
      }
      if (!picked || pickedTier == null || pickedIndex < 0) throw new Error('선택한 단서를 찾지 못했다.');

      privateClues.push(picked);
      refillBoardSlot(pickedTier, pickedIndex);
      updateActorPublic();
      updateActorPrivate();
      syncBoardAndDecks();
      setRoom({ actionLock: { turnIndex, playerId: actorId, used: true }, pending: null });
      pushRoomLog(`${getDisplayName(mePublic)}이 단서를 확보했다.`, { cardId: picked.id, tier: pickedTier });
      return;
    }

    if (type === 'FILE_LEAD') {
      const clueId = payload.clueId;
      if (!clueId) throw new Error('정리할 리드가 없다.');

      if (isLeadPinned({ reservedLeads }, clueId)) {
        reservedLeads = reservedLeads.filter((card) => card.id !== clueId);
        notebook = applyNotebookEffect(notebook, {}, '리드 해제');
      } else {
        const clue = privateClues.find((card) => card.id === clueId);
        if (!clue) throw new Error('내 단서만 리드로 둘 수 있다.');
        if (reservedLeads.length >= MAX_RESERVED) throw new Error('리드는 세 장까지 둘 수 있다.');
        reservedLeads.push(deepClone(clue));
        notebook = applyNotebookEffect(notebook, {}, `${clue.title} 고정`);
      }

      updateActorPublic();
      updateActorPrivate();
      setRoom({ actionLock: { turnIndex, playerId: actorId, used: true }, pending: null });
      pushRoomLog(`${getDisplayName(mePublic)}이 리드를 정리했다.`, { clueId });
      return;
    }

    if (type === 'CROSSCHECK') {
      const aId = payload.aId;
      const bId = payload.bId;
      if (!aId || !bId || aId === bId) throw new Error('단서 두 장이 필요하다.');

      const cardA = findClueById({ privateClues, reservedLeads }, aId);
      const cardB = findClueById({ privateClues, reservedLeads }, bId);
      if (!cardA || !cardB) throw new Error('대조할 단서를 찾지 못했다.');

      const shared = getSharedThreads(cardA, cardB);
      if (!shared.length) throw new Error('겹치는 키워드가 없다.');
      const key = pairKey(aId, bId);
      if (crosscheckPairs.includes(key)) throw new Error('이미 대조한 조합이다.');

      crosscheckPairs.push(key);
      const combined = {
        eliminateSuspects: [...(cardA.directives?.eliminateSuspects || []), ...(cardB.directives?.eliminateSuspects || [])],
        eliminateMotives: [...(cardA.directives?.eliminateMotives || []), ...(cardB.directives?.eliminateMotives || [])],
        eliminateMethods: [...(cardA.directives?.eliminateMethods || []), ...(cardB.directives?.eliminateMethods || [])],
      };
      const sharedLabel = shared.join(' · ');
      const effectText = summarizeNotebookEffect(combined).join(' / ') || '새 내용 없음';
      notebook = applyNotebookEffect(notebook, combined, `${cardA.title} ↔ ${cardB.title} · ${sharedLabel} · ${effectText}`);
      breakthroughs += 1;
      caseProgress += 1;

      updateActorPublic();
      updateActorPrivate();
      setRoom({ actionLock: { turnIndex, playerId: actorId, used: true }, pending: null });
      pushRoomLog(`${getDisplayName(mePublic)}이 단서를 대조했다.`, { aId, bId, shared });
      return;
    }

    if (type === 'INTERROGATE') {
      const witnessId = payload.witnessId;
      const index = witnessStrip.findIndex((entry) => entry.id === witnessId);
      if (index < 0) throw new Error('해당 인물을 찾지 못했다.');
      const witness = witnessStrip[index];
      if (!canInterrogate({ reservedLeads, crosscheckPairs, interrogatedWitnessIds }, witness)) {
        throw new Error('아직 추궁할 수 없다.');
      }
      witnessStrip.splice(index, 1);
      interrogatedWitnessIds.push(witnessId);
      notebook = applyNotebookEffect(
        notebook,
        witness.effect,
        `${witness.title} · ${summarizeNotebookEffect(witness.effect).join(' / ') || '진술 확보'}`
      );
      witnessCount += 1;
      breakthroughs += 1;
      caseProgress += 2;

      updateActorPublic();
      updateActorPrivate();
      syncWitnessStrip();
      setRoom({ actionLock: { turnIndex, playerId: actorId, used: true }, pending: null });
      pushRoomLog(`${getDisplayName(mePublic)}이 ${witness.title}을 추궁했다.`, { witnessId });
      return;
    }

    if (type === 'ACCUSE') {
      if (!canAccuse({ caseProgress, accusationLocked, notebook }, room)) throw new Error('아직 고발할 수 없다.');
      const culpritId = payload.culpritId;
      const motiveId = payload.motiveId;
      const methodId = payload.methodId;
      if (!culpritId || !motiveId || !methodId) throw new Error('범인, 동기, 수법을 모두 골라야 한다.');

      const attempt = { culpritId, motiveId, methodId, at: Date.now() };
      const isCorrect = culpritId === solution.culpritId && motiveId === solution.motiveId && methodId === solution.methodId;
      accusationHistory = [...accusationHistory, { ...attempt, correct: isCorrect }].slice(-6);

      if (isCorrect) {
        turnsTaken += 1;
        updateActorPublic({ turnsTaken });
        updateActorPrivate();
        const finalReports = await collectFinalReports();
        setRoom({
          status: 'ended',
          winnerId: actorId,
          reveal,
          finalReports,
          finalReason: 'accusation',
          actionLock: null,
          pending: null,
          finalRound: room.finalRound || null,
        });
        pushRoomLog(`${getDisplayName(mePublic)}이 고발에 성공했다.`, { correct: true, accusation: describeAccusationChoice(attempt) });
        return;
      }

      accusationLocked = true;
      caseProgress = Math.max(0, caseProgress - 1);
      notebook = applyNotebookEffect(notebook, {}, '고발 실패');
      updateActorPublic();
      updateActorPrivate();
      setRoom({ actionLock: { turnIndex, playerId: actorId, used: true }, pending: null });
      pushRoomLog(`${getDisplayName(mePublic)}의 고발이 빗나갔다.`, { correct: false, accusation: describeAccusationChoice(attempt) });
      return;
    }

    if (type === 'FORCE_STALE_SKIP') {
      const currentPlayerSnap = await tx.get(doc(db, 'rooms', roomCode, 'players', actorId));
      if (!currentPlayerSnap.exists()) throw new Error('현재 참가자를 찾지 못했다.');
      const currentPlayer = currentPlayerSnap.data();
      const stale = !currentPlayer.isBot && isPlayerStaleFromPresence({ player: currentPlayer, roomPresenceAt, staleMs: STALE_PLAYER_MS });
      if (!stale) throw new Error('아직 차례를 넘길 수 없다.');

      turnsTaken += 1;
      updateActorPublic({ turnsTaken });
      updateActorPrivate();
      const advance = await computeAdvance();
      if (advance.status === 'ended') {
        setRoom({
          status: 'ended',
          winnerId: advance.winnerId,
          reveal: advance.reveal,
          finalReports: advance.finalReports,
          finalReason: advance.reason,
          actionLock: null,
          pending: null,
          finalRound: advance.finalRound,
        });
      } else {
        setRoom({
          status: advance.status,
          finalRound: advance.finalRound,
          turnIndex: advance.nextTurnIndex,
          turnNumber: advance.nextTurnNumber,
          actionLock: { turnIndex: advance.nextTurnIndex, playerId: turnOrder[advance.nextTurnIndex], used: false },
          pending: null,
        });
      }
      pushRoomLog(`${getDisplayName(currentPlayer)}의 차례가 넘겨졌다.`, { forcedBy: callerId });
      return;
    }

    if (type === 'END_TURN') {
      turnsTaken += 1;
      updateActorPublic({ turnsTaken });
      updateActorPrivate();
      const advance = await computeAdvance();
      if (advance.status === 'ended') {
        setRoom({
          status: 'ended',
          winnerId: advance.winnerId,
          reveal: advance.reveal,
          finalReports: advance.finalReports,
          finalReason: advance.reason,
          actionLock: null,
          pending: null,
          finalRound: advance.finalRound,
        });
      } else {
        setRoom({
          status: advance.status,
          finalRound: advance.finalRound,
          turnIndex: advance.nextTurnIndex,
          turnNumber: advance.nextTurnNumber,
          actionLock: { turnIndex: advance.nextTurnIndex, playerId: turnOrder[advance.nextTurnIndex], used: false },
          pending: null,
        });
      }
      pushRoomLog(`${getDisplayName(mePublic)}이 턴을 넘겼다.`, { nextTurnIndex: advance.nextTurnIndex, winnerId: advance.winnerId || null });
      return;
    }

    throw new Error('처리할 수 없는 행동이다.');
  });
}
