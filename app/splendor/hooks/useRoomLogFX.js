'use client';

import { useEffect, useRef } from 'react';
import { FX } from '../fx/fxTypes';
import { getDisplayName } from '../shared/utils';

export function useRoomLogFX({ roomCode, roomData, players, userId, fx }) {
  const lastSeenLogSeqRef = useRef(null);

  useEffect(() => {
    lastSeenLogSeqRef.current = null;
  }, [roomCode]);

  useEffect(() => {
    if (!fx || !roomData || !Array.isArray(roomData.log) || typeof window === 'undefined') return;

    const logs = roomData.log;
    const latestSeq = Number(logs[logs.length - 1]?.seq || 0);
    if (lastSeenLogSeqRef.current == null) {
      lastSeenLogSeqRef.current = latestSeq;
      return;
    }

    const seen = Number(lastSeenLogSeqRef.current || 0);
    const fresh = logs.filter((entry) => Number(entry?.seq || 0) > seen);
    if (!fresh.length) return;
    lastSeenLogSeqRef.current = Number(fresh[fresh.length - 1]?.seq || latestSeq);

    const w = window.innerWidth;
    const actorName = (actorId) => {
      const player = players?.find((entry) => entry.id === actorId);
      return actorId === userId ? '나' : getDisplayName(player);
    };

    for (const entry of fresh) {
      const type = entry?.type;
      const name = actorName(entry?.actorId);

      if (type === 'TAKE_CLUE') {
        fx.emit?.(FX.TURN_WAVE, {
          text: `${name} · 단서 확보`,
          at: { cx: w * 0.5, cy: 72 },
        });
        continue;
      }

      if (type === 'FILE_LEAD') {
        fx.emit?.(FX.SCORE_POP, {
          at: { cx: w * 0.5, cy: window.innerHeight * 0.82 },
          text: '리드',
          tone: 'gold',
        });
        continue;
      }

      if (type === 'CROSSCHECK') {
        fx.emit?.(FX.TURN_WAVE, {
          text: `${name} · 대조`,
          at: { cx: w * 0.5, cy: 72 },
        });
        continue;
      }

      if (type === 'INTERROGATE') {
        fx.emit?.(FX.NOBLE_CEREMONY, {
          text: '추궁',
          at: { cx: w * 0.5, cy: window.innerHeight * 0.28 },
        });
        continue;
      }

      if (type === 'ACCUSE') {
        if (entry.correct) {
          fx.emit?.(FX.VICTORY_BURST, { winnerName: name === '나' ? '나' : name });
        } else {
          fx.emit?.(FX.TURN_WAVE, {
            text: '오발',
            at: { cx: w * 0.5, cy: 72 },
          });
        }
        continue;
      }

      if (type === 'FORCE_STALE_SKIP') {
        fx.emit?.(FX.TURN_WAVE, {
          text: `${name} · 차례 넘김`,
          at: { cx: w * 0.5, cy: 72 },
        });
        continue;
      }

      if (type === 'END_TURN') {
        const nextId = roomData?.turnOrder?.[entry.nextTurnIndex];
        const nextPlayer = players?.find((player) => player.id === nextId);
        fx.emit?.(FX.TURN_WAVE, {
          text: nextId === userId ? '내 차례' : `${getDisplayName(nextPlayer)} 차례`,
          at: { cx: w * 0.5, cy: 72 },
        });
      }
    }
  }, [fx, players, roomCode, roomData, userId]);
}
