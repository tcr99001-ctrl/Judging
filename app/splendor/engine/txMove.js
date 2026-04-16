import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase';
import {
  ACCUSATION_THRESHOLD,
  ALL,
  COLORS,
  GEM_LABEL,
  MAX_GEMS,
  STALE_PLAYER_MS,
} from '../shared/constants';
import { buildReveal } from '../shared/caseData';
import {
  applyNotebookEffect,
  canAccuse,
  canSecureClue,
  canTakeLeadSelection,
  comparePlayersForVictory,
  computeCluePayment,
  countBreakthroughs,
  createEmptyResources,
  describeAccusationChoice,
  eligibleWitnesses,
  getDisplayName,
  getPlayerInsights,
  getTotalResources,
  hasAnyLegalAction,
  isPlayerStaleFromPresence,
  makeDeckPlaceholders,
  normalizeResources,
  pushLog,
  resolveCaseProgress,
  summarizeNotebookEffect,
  toMillis,
  buildNotebookSnapshot,
} from '../shared/utils';

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

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

function highestResourceColor(resources = {}) {
  return [...ALL].sort((a, b) => Number(resources?.[b] || 0) - Number(resources?.[a] || 0))[0] || null;
}

export async function txMove({
  db,
  roomCode,
  actorId,
  type,
  payload = {},
  requesterId = null,
  requesterSessionId = null,
}) {
  const roomRef = doc(db, 'rooms', roomCode);
  const roomPrivateRef = doc(db, 'rooms', roomCode, 'meta', 'private');
  const actorPublicRef = doc(db, 'rooms', roomCode, 'players', actorId);
  const actorPrivateRef = doc(db, 'rooms', roomCode, 'playersPrivate', actorId);

  await runTransaction(db, async (tx) => {
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists()) throw new Error('사건 방을 찾지 못했어.');
    const room = roomSnap.data();
    if (room.status !== 'playing' && room.status !== 'final_round') {
      throw new Error('지금은 수사가 진행 중이 아니야.');
    }

    const roomPrivateSnap = await tx.get(roomPrivateRef);
    if (!roomPrivateSnap.exists()) throw new Error('비공개 사건 파일이 비어 있어.');
    const roomPrivate = roomPrivateSnap.data();
    const solution = roomPrivate.solution;
    const reveal = roomPrivate.caseMeta?.reveal || buildReveal(solution);

    const turnOrder = Array.isArray(room.turnOrder) ? room.turnOrder : [];
    const turnIndex = Number(room.turnIndex || 0);
    const turnNumber = Number(room.turnNumber || 1);
    const currentId = turnOrder[turnIndex];
    if (!currentId) throw new Error('현재 차례가 비어 있어.');
    if (currentId !== actorId) throw new Error('지금 움직일 차례가 아니야.');

    const actorPublicSnap = await tx.get(actorPublicRef);
    if (!actorPublicSnap.exists()) throw new Error('수사관 정보가 없어.');
    const actorPrivateSnap = await tx.get(actorPrivateRef);
    const mePublic = actorPublicSnap.data();
    const mePrivate = actorPrivateSnap.exists() ? actorPrivateSnap.data() : { reservedLeads: [], reserved: [], notebook: {}, accusationHistory: [] };

    const callerId = requesterId || auth.currentUser?.uid || actorId;
    const roomPresenceAt = toMillis(room.presenceAt || room.updatedAt || 0);
    let callerIsActiveParticipant = turnOrder.includes(callerId);
    if (callerIsActiveParticipant && callerId !== actorId) {
      const callerSnap = await tx.get(doc(db, 'rooms', roomCode, 'players', callerId));
      if (!callerSnap.exists()) callerIsActiveParticipant = false;
      else {
        const callerPlayer = callerSnap.data();
        if (isPlayerStaleFromPresence({ player: callerPlayer, roomPresenceAt, staleMs: STALE_PLAYER_MS })) {
          callerIsActiveParticipant = false;
        }
      }
    }

    const isSelfRequest = callerId === actorId;
    const isHostDrivingBot = !!mePublic.isBot && callerId === room.hostId;
    const isStaleOverrideRequester = type === 'FORCE_STALE_SKIP' && callerId !== actorId && callerIsActiveParticipant;
    if (!isSelfRequest && !isHostDrivingBot && !isStaleOverrideRequester) {
      throw new Error('지금 이 수사관을 대신 움직일 권한이 없어.');
    }

    const pending = room.pending || null;
    if (pending?.playerId === actorId) {
      if (pending.type === 'discard' && type !== 'DISCARD_EXCESS' && type !== 'FORCE_STALE_SKIP') {
        throw new Error('먼저 넘친 자원부터 정리해야 해.');
      }
      if (pending.type === 'witness' && type !== 'CHOOSE_WITNESS' && type !== 'FORCE_STALE_SKIP') {
        throw new Error('열린 증언부터 골라야 해.');
      }
    } else if (pending && pending.playerId !== actorId && type !== 'FORCE_STALE_SKIP') {
      throw new Error('다른 수사관의 정리 단계가 아직 끝나지 않았어.');
    }

    const mainActionTypes = ['COLLECT_LEADS', 'SECURE_CLUE', 'PIN_LEAD', 'PIN_TOP_LEAD', 'ACCUSE'];
    const lock = room.actionLock || { turnIndex, playerId: actorId, used: false };
    if (mainActionTypes.includes(type)) {
      if (lock.turnIndex !== turnIndex || lock.playerId !== actorId) throw new Error('행동 잠금 정보가 어긋났어.');
      if (lock.used) throw new Error('이번 턴의 메인 액션은 이미 썼어.');
    }

    const board = cloneBoard(room.board || { 1: [], 2: [], 3: [] });
    const hiddenDecks = cloneDecks(roomPrivate.hiddenDecks || { 1: [], 2: [], 3: [] });
    let witnessStrip = Array.isArray(room.witnessStrip) ? deepClone(room.witnessStrip) : (Array.isArray(room.nobles) ? deepClone(room.nobles) : []);

    let myResources = normalizeResources(mePublic.resources || mePublic.gems);
    let myClues = Array.isArray(mePublic.clues) ? deepClone(mePublic.clues) : (Array.isArray(mePublic.cards) ? deepClone(mePublic.cards) : []);
    let myInsights = getPlayerInsights({ insights: mePublic.insights || mePublic.bonuses, clues: myClues, cards: myClues });
    let myReservedLeads = Array.isArray(mePrivate.reservedLeads) ? deepClone(mePrivate.reservedLeads) : (Array.isArray(mePrivate.reserved) ? deepClone(mePrivate.reserved) : []);
    let myNotebook = deepClone(mePrivate.notebook || { eliminatedSuspects: [], eliminatedMotives: [], eliminatedMethods: [], notes: [] });
    let myAccusationHistory = Array.isArray(mePrivate.accusationHistory) ? deepClone(mePrivate.accusationHistory) : [];
    let myWitnesses = Array.isArray(mePublic.witnesses) ? deepClone(mePublic.witnesses) : (Array.isArray(mePublic.nobles) ? deepClone(mePublic.nobles) : []);
    let myBreakthroughs = Number(mePublic.breakthroughs || countBreakthroughs(mePublic));
    let myAccusationLocked = !!mePublic.accusationLocked;
    let myTurnsTaken = Number(mePublic.turnsTaken || 0);
    let myProgress = Number(mePublic.caseProgress ?? mePublic.score ?? 0);

    const bank = normalizeResources(room.bank || createEmptyResources());

    const setRoom = (updates) => {
      tx.set(roomRef, { ...updates, updatedAt: serverTimestamp() }, { merge: true });
    };

    const setRoomPrivate = (updates) => {
      tx.set(roomPrivateRef, updates, { merge: true });
    };

    const updateActorPublic = (extra = {}) => {
      myInsights = getPlayerInsights({ clues: myClues, cards: myClues });
      const publicPayload = {
        resources: myResources,
        gems: myResources,
        clues: myClues,
        cards: myClues,
        insights: myInsights,
        bonuses: myInsights,
        caseProgress: myProgress,
        score: myProgress,
        reservedCount: myReservedLeads.length,
        witnesses: myWitnesses,
        nobles: myWitnesses,
        breakthroughs: myBreakthroughs,
        accusationLocked: myAccusationLocked,
        ...extra,
      };
      tx.set(actorPublicRef, publicPayload, { merge: true });
    };

    const updateActorPrivate = () => {
      tx.set(actorPrivateRef, {
        reservedLeads: myReservedLeads,
        reserved: myReservedLeads,
        notebook: myNotebook,
        accusationHistory: myAccusationHistory,
      }, { merge: true });
    };

    const syncBoardAndDecks = () => {
      setRoom({
        board,
        decks: toPublicDecks(hiddenDecks),
      });
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

    const pushRoomLog = (message, extra = {}) => {
      const nextSeq = Number(room.logSeq || 0) + 1;
      setRoom({
        logSeq: nextSeq,
        log: pushLog(room.log, {
          seq: nextSeq,
          ts: Date.now(),
          type,
          actorId,
          message,
          ...extra,
        }),
      });
    };

    const buildActorSnapshot = () => ({
      ...mePublic,
      id: actorId,
      caseProgress: myProgress,
      score: myProgress,
      breakthroughs: myBreakthroughs,
      clues: myClues,
      cards: myClues,
      turnsTaken: myTurnsTaken,
    });

    const collectRankingPlayers = async () => {
      const players = [];
      for (const playerId of turnOrder) {
        if (playerId === actorId) {
          players.push(buildActorSnapshot());
          continue;
        }
        const snap = await tx.get(doc(db, 'rooms', roomCode, 'players', playerId));
        if (!snap.exists()) continue;
        players.push({ id: playerId, ...snap.data() });
      }
      return players.sort(comparePlayersForVictory);
    };

    const collectFinalReports = async () => {
      const reports = [];
      for (const playerId of turnOrder) {
        let publicData = null;
        let privateData = null;

        if (playerId === actorId) {
          publicData = buildActorSnapshot();
          privateData = {
            notebook: myNotebook,
            accusationHistory: myAccusationHistory,
            reservedLeads: myReservedLeads,
          };
        } else {
          const publicSnap = await tx.get(doc(db, 'rooms', roomCode, 'players', playerId));
          if (!publicSnap.exists()) continue;
          publicData = { id: playerId, ...publicSnap.data() };
          const privateSnap = await tx.get(doc(db, 'rooms', roomCode, 'playersPrivate', playerId));
          privateData = privateSnap.exists() ? privateSnap.data() : {};
        }

        const notebook = privateData?.notebook || {};
        const snapshot = buildNotebookSnapshot(notebook);
        const reservedLeads = Array.isArray(privateData?.reservedLeads)
          ? privateData.reservedLeads
          : (Array.isArray(privateData?.reserved) ? privateData.reserved : []);
        const accusationHistory = Array.isArray(privateData?.accusationHistory) ? privateData.accusationHistory : [];
        const clues = Array.isArray(publicData?.clues) ? publicData.clues : (Array.isArray(publicData?.cards) ? publicData.cards : []);
        const witnesses = Array.isArray(publicData?.witnesses) ? publicData.witnesses : (Array.isArray(publicData?.nobles) ? publicData.nobles : []);

        reports.push({
          id: playerId,
          name: getDisplayName(publicData),
          caseProgress: Number(publicData?.caseProgress ?? publicData?.score ?? 0),
          score: Number(publicData?.caseProgress ?? publicData?.score ?? 0),
          breakthroughs: Number(publicData?.breakthroughs || 0),
          turnsTaken: Number(publicData?.turnsTaken || 0),
          accusationLocked: !!publicData?.accusationLocked,
          clues,
          cards: clues,
          witnesses,
          nobles: witnesses,
          cluesCount: clues.length,
          witnessesCount: witnesses.length,
          reservedCount: reservedLeads.length,
          remainingSuspects: snapshot.remainingSuspects,
          remainingMotives: snapshot.remainingMotives,
          remainingMethods: snapshot.remainingMethods,
          notes: snapshot.notes,
          accusationHistory: accusationHistory.slice(-3),
        });
      }
      return reports.sort(comparePlayersForVictory);
    };

    const computeTurnAdvance = async ({ thresholdReached = myProgress >= Number(room.accusationThreshold || ACCUSATION_THRESHOLD) } = {}) => {
      let status = room.status;
      let finalRound = room.finalRound || null;
      const threshold = Number(room.accusationThreshold || ACCUSATION_THRESHOLD);
      if (status === 'playing' && thresholdReached) {
        finalRound = {
          started: true,
          endIndex: turnIndex,
          triggerPlayerId: actorId,
        };
        status = 'final_round';
      }

      const nextTurnIndex = (turnIndex + 1) % turnOrder.length;
      const nextTurnNumber = turnNumber + 1;
      let winnerId = room.winnerId || null;
      let publicReveal = room.reveal || null;

      if (status === 'final_round' && finalRound?.started && nextTurnIndex === finalRound.endIndex) {
        const ranking = await collectRankingPlayers();
        winnerId = ranking[0]?.id || actorId;
        status = 'ended';
        publicReveal = publicReveal || reveal;
      }

      return { status, finalRound, nextTurnIndex, nextTurnNumber, winnerId, publicReveal };
    };

    const isStalePlayer = isPlayerStaleFromPresence({ player: mePublic, roomPresenceAt, staleMs: STALE_PLAYER_MS });

    if (type === 'DISCARD_EXCESS') {
      if (pending?.type !== 'discard' || pending?.playerId !== actorId) throw new Error('지금 버릴 차례가 아니야.');
      const color = payload.color;
      if (!ALL.includes(color)) throw new Error('그 자원은 정리할 수 없어.');
      if ((myResources[color] || 0) <= 0) throw new Error('버릴 자원이 없어.');

      myResources[color] -= 1;
      bank[color] = (bank[color] || 0) + 1;
      updateActorPublic();
      updateActorPrivate();
      setRoom({
        bank,
        pending: getTotalResources(myResources) > MAX_GEMS
          ? { type: 'discard', playerId: actorId, need: getTotalResources(myResources) - MAX_GEMS }
          : null,
      });
      pushRoomLog(`${getDisplayName(mePublic)}이 ${color === 'gold' ? '특권' : GEM_LABEL[color]} 자원을 정리했다.`, {
        discarded: color,
        totalAfter: getTotalResources(myResources),
      });
      return;
    }

    if (type === 'COLLECT_LEADS') {
      const selected = Array.isArray(payload.selected) ? payload.selected : [];
      const valid = canTakeLeadSelection(selected, bank);
      if (!valid.ok) throw new Error(valid.reason);

      for (const color of selected) {
        bank[color] -= 1;
        myResources[color] = (myResources[color] || 0) + 1;
      }

      updateActorPublic();
      updateActorPrivate();
      setRoom({
        bank,
        actionLock: { turnIndex, playerId: actorId, used: true },
      });
      if (getTotalResources(myResources) > MAX_GEMS) {
        setRoom({
          pending: { type: 'discard', playerId: actorId, need: getTotalResources(myResources) - MAX_GEMS },
        });
      }
      pushRoomLog(`${getDisplayName(mePublic)}이 수사 자원을 챙겼다.`, {
        selected,
        totalAfter: getTotalResources(myResources),
      });
      return;
    }

    if (type === 'PIN_TOP_LEAD') {
      const tier = Number(payload.tier || 0);
      if (![1, 2, 3].includes(tier)) throw new Error('잘못된 단서 묶음이야.');
      if (myReservedLeads.length >= 3) throw new Error('비공개 리드는 세 개까지야.');
      if (!(hiddenDecks[tier] || []).length) throw new Error('그 묶음은 이미 바닥났어.');

      const card = hiddenDecks[tier].pop();
      myReservedLeads.push(card);
      let gotGold = false;
      if ((bank.gold || 0) > 0) {
        bank.gold -= 1;
        myResources.gold += 1;
        gotGold = true;
      }

      updateActorPublic();
      updateActorPrivate();
      syncBoardAndDecks();
      setRoom({
        bank,
        actionLock: { turnIndex, playerId: actorId, used: true },
      });
      if (getTotalResources(myResources) > MAX_GEMS) {
        setRoom({ pending: { type: 'discard', playerId: actorId, need: getTotalResources(myResources) - MAX_GEMS } });
      }
      pushRoomLog(`${getDisplayName(mePublic)}이 상단 리드를 수첩에 고정했다.`, {
        tier,
        tookGold: gotGold,
      });
      return;
    }

    if (type === 'PIN_LEAD') {
      const cardId = payload.cardId;
      if (!cardId) throw new Error('고정할 리드가 비어 있어.');
      if (myReservedLeads.length >= 3) throw new Error('비공개 리드는 세 개까지야.');

      let foundTier = null;
      let foundIndex = -1;
      let card = null;
      for (const tier of [1, 2, 3]) {
        const index = board[tier].findIndex((entry) => entry.id === cardId);
        if (index >= 0) {
          foundTier = tier;
          foundIndex = index;
          card = board[tier][index];
          break;
        }
      }
      if (!card || !foundTier) throw new Error('그 리드는 이미 누가 잡아갔어.');

      myReservedLeads.push(card);
      const refill = refillBoardSlot(foundTier, foundIndex);
      let gotGold = false;
      if ((bank.gold || 0) > 0) {
        bank.gold -= 1;
        myResources.gold += 1;
        gotGold = true;
      }

      updateActorPublic();
      updateActorPrivate();
      syncBoardAndDecks();
      setRoom({
        bank,
        actionLock: { turnIndex, playerId: actorId, used: true },
      });
      if (getTotalResources(myResources) > MAX_GEMS) {
        setRoom({ pending: { type: 'discard', playerId: actorId, need: getTotalResources(myResources) - MAX_GEMS } });
      }
      pushRoomLog(`${getDisplayName(mePublic)}이 ${card.title} 리드를 비공개로 고정했다.`, {
        cardId,
        tier: foundTier,
        refillCardId: refill?.id || null,
        tookGold: gotGold,
      });
      return;
    }

    if (type === 'SECURE_CLUE') {
      const cardId = payload.cardId;
      const fromReserved = !!payload.fromReserved;
      if (!cardId) throw new Error('확보할 단서가 비어 있어.');

      let card = null;
      let tier = null;
      let index = -1;
      if (fromReserved) {
        index = myReservedLeads.findIndex((entry) => entry.id === cardId);
        if (index < 0) throw new Error('수첩에 그런 리드는 없어.');
        card = myReservedLeads[index];
        myReservedLeads.splice(index, 1);
      } else {
        for (const candidateTier of [1, 2, 3]) {
          index = board[candidateTier].findIndex((entry) => entry.id === cardId);
          if (index >= 0) {
            tier = candidateTier;
            card = board[candidateTier][index];
            break;
          }
        }
        if (!card) throw new Error('그 단서는 이미 사라졌어.');
      }

      if (!canSecureClue(card, { resources: myResources, clues: myClues, insights: myInsights })) {
        throw new Error('조사 자원이 아직 모자라.');
      }

      const payment = computeCluePayment(card, { resources: myResources, clues: myClues, insights: myInsights });
      for (const color of [...COLORS, 'gold']) {
        const spend = Number(payment[color] || 0);
        if (!spend) continue;
        if ((myResources[color] || 0) < spend) throw new Error('지불 계산이 어긋났어.');
        myResources[color] -= spend;
        bank[color] += spend;
      }

      myClues.push(card);
      myInsights = getPlayerInsights({ clues: myClues, cards: myClues });
      myProgress += Number(card.progress || card.points || 0);
      if (Number(card.tier || 0) >= 3) myBreakthroughs += 1;
      myNotebook = applyNotebookEffect(
        myNotebook,
        card.effect,
        `${card.title}: ${summarizeNotebookEffect(card.effect).join(' / ') || '정리 완료'}`
      );

      let refill = null;
      if (!fromReserved) {
        refill = refillBoardSlot(tier, index);
        syncBoardAndDecks();
      }

      updateActorPublic();
      updateActorPrivate();
      setRoom({
        bank,
        actionLock: { turnIndex, playerId: actorId, used: true },
      });
      pushRoomLog(`${getDisplayName(mePublic)}이 ${card.title} 단서를 확보했다.`, {
        cardId,
        fromReserved,
        tier,
        refillCardId: refill?.id || null,
        progressAfter: myProgress,
      });
      return;
    }

    if (type === 'CHOOSE_WITNESS') {
      const witnessId = payload.witnessId;
      if (pending?.type !== 'witness' || pending?.playerId !== actorId) throw new Error('지금 고를 증언이 없어.');
      if (!pending.options?.includes(witnessId)) throw new Error('그 증언은 지금 선택할 수 없어.');

      const witnessIndex = witnessStrip.findIndex((entry) => entry.id === witnessId);
      if (witnessIndex < 0) throw new Error('그 증인은 이미 입을 닫았어.');
      const witness = witnessStrip.splice(witnessIndex, 1)[0];
      myWitnesses.push(witness);
      myProgress += Number(witness.progress || 0);
      myBreakthroughs += 1;
      myNotebook = applyNotebookEffect(
        myNotebook,
        witness.effect,
        `${witness.title}: ${summarizeNotebookEffect(witness.effect).join(' / ') || '증언 채택'}`
      );

      myTurnsTaken += 1;
      updateActorPublic({ turnsTaken: myTurnsTaken });
      updateActorPrivate();
      syncWitnessStrip();

      const advance = await computeTurnAdvance();
      const finalReports = advance.status === 'ended' ? await collectFinalReports() : null;
      setRoom({
        pending: null,
        status: advance.status,
        finalRound: advance.finalRound || null,
        winnerId: advance.status === 'ended' ? advance.winnerId : null,
        turnIndex: advance.status === 'ended' ? room.turnIndex : advance.nextTurnIndex,
        turnNumber: advance.status === 'ended' ? turnNumber : advance.nextTurnNumber,
        actionLock: advance.status === 'ended'
          ? null
          : { turnIndex: advance.nextTurnIndex, playerId: turnOrder[advance.nextTurnIndex], used: false },
        reveal: advance.publicReveal || null,
        finalReports: finalReports || null,
      });
      pushRoomLog(`${getDisplayName(mePublic)}이 ${witness.title}의 증언을 채택했다.`, {
        witnessId,
        progressAfter: myProgress,
        winnerId: advance.status === 'ended' ? advance.winnerId : null,
      });
      return;
    }

    if (type === 'ACCUSE') {
      if (!canAccuse({ caseProgress: myProgress, score: myProgress, accusationLocked: myAccusationLocked })) {
        throw new Error('아직 최종 고발을 열 만큼 사건이 정리되지 않았어.');
      }
      const culpritId = payload.culpritId;
      const motiveId = payload.motiveId;
      const methodId = payload.methodId;
      if (!culpritId || !motiveId || !methodId) throw new Error('범인, 동기, 수법을 모두 골라야 해.');

      const attempt = { culpritId, motiveId, methodId, at: Date.now() };
      const attemptText = describeAccusationChoice(attempt);
      const isCorrect = culpritId === solution.culpritId && motiveId === solution.motiveId && methodId === solution.methodId;
      myAccusationHistory = [...myAccusationHistory, { ...attempt, correct: isCorrect }].slice(-6);

      if (isCorrect) {
        myTurnsTaken += 1;
        updateActorPublic({ turnsTaken: myTurnsTaken });
        updateActorPrivate();
        const finalReports = await collectFinalReports();
        setRoom({
          status: 'ended',
          winnerId: actorId,
          pending: null,
          actionLock: null,
          finalRound: room.finalRound || null,
          reveal,
          finalReports,
        });
        pushRoomLog(`${getDisplayName(mePublic)}이 최종 고발에 성공했다.`, {
          culpritId,
          motiveId,
          methodId,
          correct: true,
        });
        return;
      }

      const previousProgress = myProgress;
      myProgress = Math.max(0, myProgress - 3);
      myAccusationLocked = true;
      myTurnsTaken += 1;
      updateActorPublic({ turnsTaken: myTurnsTaken });
      updateActorPrivate();

      const advance = await computeTurnAdvance({
        thresholdReached: previousProgress >= Number(room.accusationThreshold || ACCUSATION_THRESHOLD) || myProgress >= Number(room.accusationThreshold || ACCUSATION_THRESHOLD),
      });
      const finalReports = advance.status === 'ended' ? await collectFinalReports() : null;
      setRoom({
        pending: null,
        status: advance.status,
        finalRound: advance.finalRound || null,
        winnerId: advance.status === 'ended' ? advance.winnerId : null,
        turnIndex: advance.status === 'ended' ? room.turnIndex : advance.nextTurnIndex,
        turnNumber: advance.status === 'ended' ? turnNumber : advance.nextTurnNumber,
        actionLock: advance.status === 'ended'
          ? null
          : { turnIndex: advance.nextTurnIndex, playerId: turnOrder[advance.nextTurnIndex], used: false },
        reveal: advance.publicReveal || null,
        finalReports: finalReports || null,
      });
      pushRoomLog(`${getDisplayName(mePublic)}의 최종 고발이 빗나갔다.`, {
        correct: false,
        accusation: attemptText,
        progressAfter: myProgress,
      });
      return;
    }

    if (type === 'FORCE_STALE_SKIP') {
      if (!isStaleOverrideRequester) throw new Error('강제 정리는 다른 참가자만 할 수 있어.');
      if (!isStalePlayer) throw new Error('지금은 강제 정리할 정도로 오래 비지 않았어.');

      if (pending?.type === 'discard' && pending.playerId === actorId) {
        while (getTotalResources(myResources) > MAX_GEMS) {
          const color = highestResourceColor(myResources);
          if (!color || (myResources[color] || 0) <= 0) break;
          myResources[color] -= 1;
          bank[color] += 1;
        }
      }

      if (pending?.type === 'witness' && pending.playerId === actorId && Array.isArray(pending.options) && pending.options.length) {
        const witnessIndex = witnessStrip.findIndex((entry) => entry.id === pending.options[0]);
        if (witnessIndex >= 0) {
          const witness = witnessStrip.splice(witnessIndex, 1)[0];
          myWitnesses.push(witness);
          myProgress += Number(witness.progress || 0);
          myBreakthroughs += 1;
          myNotebook = applyNotebookEffect(myNotebook, witness.effect, `${witness.title}: 강제 정리로 채택`);
        }
      }

      myTurnsTaken += 1;
      updateActorPublic({ turnsTaken: myTurnsTaken });
      updateActorPrivate();
      syncWitnessStrip();

      const advance = await computeTurnAdvance();
      const finalReports = advance.status === 'ended' ? await collectFinalReports() : null;
      setRoom({
        bank,
        pending: null,
        status: advance.status,
        finalRound: advance.finalRound || null,
        winnerId: advance.status === 'ended' ? advance.winnerId : null,
        turnIndex: advance.status === 'ended' ? room.turnIndex : advance.nextTurnIndex,
        turnNumber: advance.status === 'ended' ? turnNumber : advance.nextTurnNumber,
        actionLock: advance.status === 'ended'
          ? null
          : { turnIndex: advance.nextTurnIndex, playerId: turnOrder[advance.nextTurnIndex], used: false },
        reveal: advance.publicReveal || null,
        finalReports: finalReports || null,
      });
      pushRoomLog(`${getDisplayName(mePublic)}의 차례가 오래 비어 강제 정리됐다.`, {
        forcedBy: callerId,
      });
      return;
    }

    if (type === 'END_TURN') {
      if (!lock.used) {
        const canStillAct = hasAnyLegalAction({
          player: {
            ...mePublic,
            resources: myResources,
            gems: myResources,
            clues: myClues,
            cards: myClues,
            insights: myInsights,
            bonuses: myInsights,
            reservedLeads: myReservedLeads,
            reserved: myReservedLeads,
            reservedCount: myReservedLeads.length,
            caseProgress: myProgress,
            score: myProgress,
          },
          board,
          decks: toPublicDecks(hiddenDecks),
          bank,
        });
        if (canStillAct) throw new Error('이번 턴의 메인 액션을 아직 안 썼어.');
      }

      if (getTotalResources(myResources) > MAX_GEMS) {
        updateActorPublic();
        updateActorPrivate();
        setRoom({
          pending: { type: 'discard', playerId: actorId, need: getTotalResources(myResources) - MAX_GEMS },
        });
        pushRoomLog(`${getDisplayName(mePublic)}이 자원 정리를 먼저 해야 한다.`, {
          need: getTotalResources(myResources) - MAX_GEMS,
        });
        return;
      }

      const claimable = eligibleWitnesses(myInsights, witnessStrip);
      if (claimable.length >= 2) {
        updateActorPublic();
        updateActorPrivate();
        setRoom({
          pending: { type: 'witness', playerId: actorId, options: claimable.map((entry) => entry.id) },
        });
        pushRoomLog(`${getDisplayName(mePublic)} 앞에 겹치는 증언이 열렸다.`, {
          options: claimable.map((entry) => entry.id),
        });
        return;
      }

      if (claimable.length === 1) {
        const witnessIndex = witnessStrip.findIndex((entry) => entry.id === claimable[0].id);
        if (witnessIndex >= 0) {
          const witness = witnessStrip.splice(witnessIndex, 1)[0];
          myWitnesses.push(witness);
          myProgress += Number(witness.progress || 0);
          myBreakthroughs += 1;
          myNotebook = applyNotebookEffect(
            myNotebook,
            witness.effect,
            `${witness.title}: ${summarizeNotebookEffect(witness.effect).join(' / ') || '증언 자동 채택'}`
          );
          syncWitnessStrip();
        }
      }

      myTurnsTaken += 1;
      updateActorPublic({ turnsTaken: myTurnsTaken });
      updateActorPrivate();
      const advance = await computeTurnAdvance();
      const finalReports = advance.status === 'ended' ? await collectFinalReports() : null;
      setRoom({
        pending: null,
        status: advance.status,
        finalRound: advance.finalRound || null,
        winnerId: advance.status === 'ended' ? advance.winnerId : null,
        turnIndex: advance.status === 'ended' ? room.turnIndex : advance.nextTurnIndex,
        turnNumber: advance.status === 'ended' ? turnNumber : advance.nextTurnNumber,
        actionLock: advance.status === 'ended'
          ? null
          : { turnIndex: advance.nextTurnIndex, playerId: turnOrder[advance.nextTurnIndex], used: false },
        reveal: advance.publicReveal || null,
        finalReports: finalReports || null,
      });
      pushRoomLog(`${getDisplayName(mePublic)}이 턴을 정리했다.`, {
        nextTurnIndex: advance.nextTurnIndex,
        progressAfter: myProgress,
        winnerId: advance.status === 'ended' ? advance.winnerId : null,
      });
      return;
    }

    throw new Error('알 수 없는 행동이야.');
  });
}
