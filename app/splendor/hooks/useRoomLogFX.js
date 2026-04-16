'use client';

import { useEffect, useRef } from 'react';
import { FX } from '../fx/fxTypes';

export function useRoomLogFX({ roomCode, roomData, players, userId, fx }) {
  const lastSeenRef = useRef(null);
  const lastStatusRef = useRef(null);
  const lastTurnRef = useRef(null);

  useEffect(() => {
    lastSeenRef.current = null;
    lastStatusRef.current = null;
    lastTurnRef.current = null;
  }, [roomCode]);

  useEffect(() => {
    if (!fx || !roomData) return;
    const currentId = roomData.turnOrder?.[roomData.turnIndex] || null;
    if (!currentId) return;

    if (lastTurnRef.current && lastTurnRef.current !== currentId) {
      const nextName = players.find((player) => player.id === currentId)?.name || '다음 수사관';
      fx.emit?.(FX.TURN_WAVE, {
        text: currentId === userId ? '내 차례' : `${nextName} 차례`,
        at: { cx: (typeof window !== 'undefined' ? window.innerWidth : 360) * 0.5, cy: 82 },
      });
    }
    lastTurnRef.current = currentId;
  }, [fx, players, roomData, userId]);

  useEffect(() => {
    if (!fx || !Array.isArray(roomData?.log) || !roomData.log.length) return;
    const latest = roomData.log[roomData.log.length - 1];
    const latestSeq = Number(latest?.seq || 0);
    if (lastSeenRef.current == null) {
      lastSeenRef.current = latestSeq;
      return;
    }
    if (latestSeq <= lastSeenRef.current) return;
    lastSeenRef.current = latestSeq;

    const w = typeof window !== 'undefined' ? window.innerWidth : 360;
    const h = typeof window !== 'undefined' ? window.innerHeight : 740;

    if (latest?.type === 'COLLECT_LEADS') {
      fx.emit?.(FX.GEM_BURST_TO_PLAYER, {
        from: { cx: w * 0.18, cy: h * 0.84 },
        to: latest.actorId === userId ? { cx: w * 0.5, cy: h * 0.88 } : { cx: w * 0.5, cy: 92 },
        colors: latest.selected || [],
      });
    }

    if (latest?.type === 'SECURE_CLUE' || latest?.type === 'PIN_LEAD' || latest?.type === 'PIN_TOP_LEAD') {
      fx.emit?.(FX.CARD_FLY_TO_PLAYER, {
        from: { cx: w * 0.5, cy: h * 0.42 },
        to: latest.actorId === userId ? { cx: w * 0.5, cy: h * 0.86 } : { cx: w * 0.5, cy: 98 },
        tier: latest.tier || 1,
      });
    }

    if (latest?.type === 'CHOOSE_WITNESS') {
      fx.emit?.(FX.NOBLE_CEREMONY, {
        at: { cx: w * 0.5, cy: h * 0.3 },
        text: '증언 확보',
      });
    }
  }, [fx, roomData?.log, userId]);

  useEffect(() => {
    if (!fx || !roomData?.status) return;
    if (lastStatusRef.current === roomData.status) return;

    if (roomData.status === 'final_round') {
      fx.emit?.(FX.TURN_WAVE, {
        text: '마지막 라운드',
        at: { cx: (typeof window !== 'undefined' ? window.innerWidth : 360) * 0.5, cy: 82 },
      });
    }

    if (roomData.status === 'ended') {
      const winnerName = players.find((player) => player.id === roomData.winnerId)?.name || '수사관';
      fx.emit?.(FX.VICTORY_BURST, { winnerName });
    }

    lastStatusRef.current = roomData.status;
  }, [fx, players, roomData?.status, roomData?.winnerId]);
}
