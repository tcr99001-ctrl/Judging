'use client';

import { useEffect, useRef } from 'react';
import { BOT_LOOP_MS, BOT_THINK_DELAY_MS } from '../shared/constants';
import { chooseBotAction, chooseBotDiscard, chooseBotWitness } from './botAI';

export function useBotLoop({
  enabled,
  db,
  roomCode,
  roomData,
  players,
  hostId,
  txMove,
}) {
  const inflightRef = useRef(false);
  const processedKeyRef = useRef('');

  useEffect(() => {
    if (!enabled || !db || !roomCode || !roomData || !txMove || !hostId) return undefined;

    let cancelled = false;

    const tick = async () => {
      if (cancelled || inflightRef.current) return;
      if (!(roomData.status === 'playing' || roomData.status === 'final_round')) return;

      const currentId = roomData.turnOrder?.[roomData.turnIndex];
      if (!currentId) return;
      const currentPlayer = players.find((player) => player.id === currentId);
      if (!currentPlayer?.isBot) return;

      const pending = roomData.pending || null;
      const actionLock = roomData.actionLock || null;
      const key = [roomCode, roomData.turnIndex, roomData.turnNumber, currentId, pending?.type || 'none', actionLock?.used ? 'used' : 'open'].join(':');
      if (processedKeyRef.current === key) return;

      inflightRef.current = true;
      try {
        await new Promise((resolve) => window.setTimeout(resolve, BOT_THINK_DELAY_MS));
        if (cancelled) return;

        if (pending?.playerId === currentId) {
          if (pending.type === 'discard') {
            const color = chooseBotDiscard(currentPlayer.resources || currentPlayer.gems || {});
            await txMove({
              db,
              roomCode,
              actorId: currentId,
              type: 'DISCARD_EXCESS',
              payload: { color },
              requesterId: hostId,
            });
            processedKeyRef.current = '';
            return;
          }

          if (pending.type === 'witness') {
            const witnessId = chooseBotWitness(pending);
            if (witnessId) {
              await txMove({
                db,
                roomCode,
                actorId: currentId,
                type: 'CHOOSE_WITNESS',
                payload: { witnessId },
                requesterId: hostId,
              });
              processedKeyRef.current = '';
            }
            return;
          }
        }

        if (actionLock?.used && actionLock.playerId === currentId && actionLock.turnIndex === roomData.turnIndex) {
          await txMove({
            db,
            roomCode,
            actorId: currentId,
            type: 'END_TURN',
            payload: {},
            requesterId: hostId,
          });
          processedKeyRef.current = key;
          return;
        }

        const action = chooseBotAction(roomData, currentPlayer);
        await txMove({
          db,
          roomCode,
          actorId: currentId,
          type: action.type,
          payload: action.payload || {},
          requesterId: hostId,
        });
        processedKeyRef.current = '';
      } catch (error) {
        console.warn('[useBotLoop]', error);
      } finally {
        inflightRef.current = false;
      }
    };

    const interval = window.setInterval(() => {
      void tick();
    }, Math.max(BOT_LOOP_MS, 700));

    void tick();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [enabled, db, hostId, players, roomCode, roomData, txMove]);
}
