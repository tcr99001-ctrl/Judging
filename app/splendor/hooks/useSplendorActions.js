import { useCallback, useMemo } from 'react';
import { txMove } from '../engine/txMove';

export function useSplendorActions({ db, roomCode, roomData, userId, myData, fx }) {
  const doMove = useCallback(async (type, payload = {}, actorId = userId) => {
    if (!db) throw new Error('저장소를 연결하지 못했다.');
    if (!roomCode || roomCode.length !== 4) throw new Error('방 코드가 필요하다.');
    if (!actorId) throw new Error('참가자 정보를 찾지 못했다.');

    return txMove({
      db,
      roomCode,
      actorId,
      type,
      payload,
      requesterId: userId,
    });
  }, [db, roomCode, userId]);

  const onTakeClue = useCallback(async (cardId) => {
    if (!cardId) throw new Error('단서를 찾지 못했다.');
    await doMove('TAKE_CLUE', { cardId });
    fx?.emit?.('highlight', { key: `card:${cardId}` });
  }, [doMove, fx]);

  const onFileLead = useCallback(async (clueId) => {
    if (!clueId) throw new Error('리드를 찾지 못했다.');
    await doMove('FILE_LEAD', { clueId });
  }, [doMove]);

  const onCrosscheck = useCallback(async ({ aId, bId }) => {
    if (!aId || !bId) throw new Error('두 장을 골라야 한다.');
    await doMove('CROSSCHECK', { aId, bId });
  }, [doMove]);

  const onInterrogate = useCallback(async (witnessId) => {
    if (!witnessId) throw new Error('인물을 골라야 한다.');
    await doMove('INTERROGATE', { witnessId });
  }, [doMove]);

  const onAccuse = useCallback(async ({ culpritId, motiveId, methodId }) => {
    await doMove('ACCUSE', { culpritId, motiveId, methodId });
  }, [doMove]);

  const onEndTurn = useCallback(async () => {
    await doMove('END_TURN', {});
  }, [doMove]);

  const onForceStaleSkip = useCallback(async (actorId) => {
    if (!actorId) throw new Error('넘길 차례를 찾지 못했다.');
    await doMove('FORCE_STALE_SKIP', {}, actorId);
  }, [doMove]);

  return useMemo(() => ({
    doMove,
    onTakeClue,
    onFileLead,
    onCrosscheck,
    onInterrogate,
    onAccuse,
    onEndTurn,
    onForceStaleSkip,
  }), [doMove, onAccuse, onCrosscheck, onEndTurn, onFileLead, onForceStaleSkip, onInterrogate, onTakeClue]);
}
