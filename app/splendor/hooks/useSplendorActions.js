'use client';

import { useCallback, useMemo } from 'react';
import { txMove } from '../engine/txMove';
import { FX } from '../fx/fxTypes';
import { canSecureClue } from '../shared/utils';

export function useSplendorActions({
  db,
  roomCode,
  roomData,
  userId,
  fx,
  myData,
  setActiveCard,
  setShowLeadModal,
  setSelectedLeads,
  selectedLeads,
}) {
  const doMove = useCallback(async (type, payload = {}, actorIdOverride = null) => {
    const actorId = actorIdOverride || userId;
    if (!db) throw new Error('데이터베이스 연결이 아직 준비되지 않았어.');
    if (!roomCode) throw new Error('방 코드가 비어 있어.');
    if (!actorId) throw new Error('수사관 정보가 아직 없어.');

    await txMove({
      db,
      roomCode,
      actorId,
      type,
      payload,
      requesterId: userId || actorId,
      requesterSessionId: roomData?.sessionId || null,
    });
  }, [db, roomCode, roomData?.sessionId, userId]);

  const onEndTurn = useCallback(async () => {
    await doMove('END_TURN');
  }, [doMove]);

  const confirmCollectLeads = useCallback(async (selectedOverride = null) => {
    const selected = Array.isArray(selectedOverride) ? selectedOverride : selectedLeads;
    try {
      await doMove('COLLECT_LEADS', { selected });
      if (typeof setShowLeadModal === 'function') setShowLeadModal(false);
      if (typeof setSelectedLeads === 'function') setSelectedLeads([]);
    } catch (error) {
      fx?.emit?.(FX.BUY_FAIL_SHAKE, { at: 'bank:center', text: '선택 재확인' });
      throw error;
    }
  }, [doMove, fx, selectedLeads, setSelectedLeads, setShowLeadModal]);

  const onSecureClue = useCallback(async (cardOrId, fromReserved = false) => {
    const card = typeof cardOrId === 'string' ? { id: cardOrId } : cardOrId;
    if (!card?.id) throw new Error('단서 정보가 비어 있어.');
    fx?.emit?.(FX.CARD_PICK_HIGHLIGHT, { at: `card:${card.id}` });
    if (card?.cost && !canSecureClue(card, myData)) {
      fx?.emit?.(FX.BUY_FAIL_SHAKE, { at: `card:${card.id}`, text: '자원 부족' });
      throw new Error('조사 자원이 아직 모자라.');
    }
    await doMove('SECURE_CLUE', { cardId: card.id, fromReserved: !!fromReserved });
    if (typeof setActiveCard === 'function') setActiveCard(null);
  }, [doMove, fx, myData, setActiveCard]);

  const onPinLead = useCallback(async (cardOrId) => {
    const card = typeof cardOrId === 'string' ? { id: cardOrId } : cardOrId;
    if (!card?.id) throw new Error('고정할 리드가 비어 있어.');
    fx?.emit?.(FX.CARD_PICK_HIGHLIGHT, { at: `card:${card.id}` });
    await doMove('PIN_LEAD', { cardId: card.id });
    if (typeof setActiveCard === 'function') setActiveCard(null);
  }, [doMove, fx, setActiveCard]);

  const onPinTopLead = useCallback(async (tier) => {
    await doMove('PIN_TOP_LEAD', { tier });
  }, [doMove]);

  const onDiscardExcess = useCallback(async (color) => {
    await doMove('DISCARD_EXCESS', { color });
  }, [doMove]);

  const onChooseWitness = useCallback(async (witnessId, close) => {
    if (!witnessId) throw new Error('증언 하나는 골라야 해.');
    await doMove('CHOOSE_WITNESS', { witnessId });
    if (typeof close === 'function') close();
  }, [doMove]);

  const onAccuse = useCallback(async ({ culpritId, motiveId, methodId }) => {
    await doMove('ACCUSE', { culpritId, motiveId, methodId });
  }, [doMove]);

  const onForceStaleSkip = useCallback(async (actorId) => {
    if (!actorId) throw new Error('정리할 차례의 수사관이 비어 있어.');
    await doMove('FORCE_STALE_SKIP', {}, actorId);
  }, [doMove]);

  return useMemo(() => ({
    doMove,
    onEndTurn,
    confirmCollectLeads,
    onSecureClue,
    onPinLead,
    onPinTopLead,
    onDiscardExcess,
    onChooseWitness,
    onAccuse,
    onForceStaleSkip,
  }), [confirmCollectLeads, doMove, onAccuse, onChooseWitness, onDiscardExcess, onEndTurn, onForceStaleSkip, onPinLead, onPinTopLead, onSecureClue]);
}
