'use client';

import { useEffect, useRef } from 'react';
import { FX } from '../fx/fxTypes';
import { getOrderedColorEntries } from '../shared/utils';

export function useRoomLogFX({ roomCode, roomData, players, userId, fx }) {
  const lastSeenLogSeqRef = useRef(null);

  useEffect(() => {
    lastSeenLogSeqRef.current = null;
  }, [roomCode]);

  const fallbackRect = (x, y) => ({ cx: x, cy: y });


  const playerMetaKey = Array.isArray(players)
    ? players.map((player) => `${player.id}:${player.name || ''}:${player.score || 0}`).join('|')
    : '';
  const destRectForActor = (actorId) => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 360;
    const h = typeof window !== 'undefined' ? window.innerHeight : 740;
    const isMe = actorId && userId && actorId === userId;
    return isMe ? { cx: w * 0.5, cy: h * 0.86 } : { cx: w * 0.5, cy: h * 0.18 };
  };

  useEffect(() => {
    if (!fx) return;
    if (!roomData || !Array.isArray(roomData.log)) return;
    if (typeof window === 'undefined') return;

    const logs = roomData.log;
    const latestSeq = Number(logs[logs.length - 1]?.seq || 0);
    if (lastSeenLogSeqRef.current == null) {
      lastSeenLogSeqRef.current = latestSeq;
      return;
    }

    const lastSeenSeq = Number(lastSeenLogSeqRef.current || 0);
    let newItems = [];

    newItems = logs.filter((entry) => Number(entry?.seq || 0) > lastSeenSeq);
    if (!newItems.length) {
      if (latestSeq > lastSeenSeq) lastSeenLogSeqRef.current = latestSeq;
      return;
    }
    lastSeenLogSeqRef.current = Number(newItems[newItems.length - 1]?.seq || latestSeq);

    const w = window.innerWidth;
    const h = window.innerHeight;

    const bankRect = fx.getAnchorRect?.('bank:center') || fallbackRect(w * 0.18, h * 0.8);
    const deckFallback = fallbackRect(w * 0.84, h * 0.22);

    for (const e of newItems) {
      const type = e?.type;
      const actorId = e?.actorId;
      if (!type || !actorId) continue;

      const toHud = fx.getAnchorRect?.(`hud:${actorId}`) || destRectForActor(actorId);
      const scoreRect = fx.getAnchorRect?.(`hudScore:${actorId}`) || toHud;
      const reserveStripRect = fx.getAnchorRect?.(`reserved-strip:${actorId}`) || toHud;

      if (type === 'END_TURN') {
        const nextId = roomData?.turnOrder?.[e.nextTurnIndex];
        const nextName = players?.find((player) => player.id === nextId)?.name || '다음 플레이어';
        fx.emit?.(FX.TURN_WAVE, {
          text: e.status === 'final_round' ? '마지막 라운드 시작' : nextId === userId ? '내 차례' : `${nextName} 차례`,
          at: { cx: w * 0.5, cy: 72 },
        });

        if (e.autoNoble?.nobleId) {
          fx.emit?.(FX.NOBLE_CEREMONY, { at: `noble:${e.autoNoble.nobleId}`, text: '귀족 방문' });
          fx.emit?.(FX.SCORE_POP, { at: scoreRect, text: `+${e.autoNoble.points || 3}`, tone: 'gold' });
        }

        if (e.status === 'ended' && e.winnerId) {
          const winnerName = players?.find((p) => p.id === e.winnerId)?.name || String(e.winnerId).slice(0, 6);
          fx.emit?.(FX.VICTORY_BURST, { winnerName });
        }
        continue;
      }

      if (type === 'TAKE_GEMS') {
        const colors = Array.isArray(e.selected) ? e.selected : [];
        if (colors.length) {
          fx.emitBatch?.(
            colors.map((color) => ({
              type: FX.GEM_BURST_TO_PLAYER,
              payload: {
                from: fx.getAnchorRect?.(`bank:${color}`) || bankRect,
                to: toHud,
                colors: [color],
              },
            }))
          );
        }
        continue;
      }

      if (type === 'RESERVE' || type === 'RESERVE_DECK') {
        const cardId = e.cardId || null;
        const fromCard = cardId ? fx.getAnchorRect?.(`card:${cardId}`) : null;
        const from = fromCard || deckFallback;
        const reserveDest = actorId === userId ? reserveStripRect : toHud;

        fx.emit?.(FX.CARD_FLY_TO_PLAYER, {
          from,
          to: reserveDest,
          tier: e.tier || 1,
          label: '',
        });

        if (e.tookGold) {
          fx.emit?.(FX.GEM_BURST_TO_PLAYER, {
            from: fx.getAnchorRect?.('bank:gold') || bankRect,
            to: reserveDest,
            colors: ['gold'],
          });
        }

        if (e.refill?.tier) {
          const toSlot = fx.getAnchorRect?.(`card:${e.refill.newCardId}`) || fallbackRect(w * 0.5, h * 0.42);
          fx.emit?.(FX.CARD_SLIDE_IN, {
            from: deckFallback,
            to: toSlot,
            tier: e.refill.tier,
            flipAfter: true,
          });
        }
        continue;
      }

      if (type === 'BUY') {
        const cardId = e.cardId || null;
        const fromCard = cardId ? fx.getAnchorRect?.(`card:${cardId}`) : null;
        const from = fromCard || (e.fromReserved ? reserveStripRect : fallbackRect(w * 0.5, h * 0.46));

        const paymentEntries = getOrderedColorEntries(e.payment || {}, { includeGold: true }).flatMap(([color, count]) =>
          Array.from({ length: count || 0 }).map(() => color)
        );
        if (paymentEntries.length) {
          fx.emitBatch?.(
            paymentEntries.map((color) => ({
              type: FX.GEM_BURST_TO_PLAYER,
              payload: {
                from: toHud,
                to: fx.getAnchorRect?.(`bank:${color}`) || bankRect,
                colors: [color],
              },
            }))
          );
        }

        fx.emit?.(FX.CARD_FLY_TO_PLAYER, {
          from,
          to: toHud,
          tier: e.tier || 1,
          label: '',
        });

        const pts = typeof e.points === 'number' ? e.points : 0;
        fx.emit?.(FX.SCORE_POP, { at: scoreRect, text: pts > 0 ? `+${pts}` : '+', tone: 'gold' });

        if (e.refill?.tier) {
          const toSlot = fx.getAnchorRect?.(`card:${e.refill.newCardId}`) || fallbackRect(w * 0.5, h * 0.42);
          fx.emit?.(FX.CARD_SLIDE_IN, {
            from: deckFallback,
            to: toSlot,
            tier: e.refill.tier,
            flipAfter: true,
          });
        }
        continue;
      }

      if (type === 'CHOOSE_NOBLE') {
        fx.emit?.(FX.NOBLE_CEREMONY, { at: `noble:${e.nobleId}`, text: '귀족 방문' });
        const pts = typeof e.noblePoints === 'number' ? e.noblePoints : 3;
        fx.emit?.(FX.SCORE_POP, { at: scoreRect, text: `+${pts}`, tone: 'gold' });
        continue;
      }

      if (type === 'DISCARD') {
        if (e.gem) {
          fx.emit?.(FX.GEM_BURST_TO_PLAYER, {
            from: toHud,
            to: fx.getAnchorRect?.(`bank:${e.gem}`) || bankRect,
            colors: [e.gem],
          });
        }
      }
    }
  }, [roomCode, roomData?.log, roomData?.status, roomData?.turnIndex, roomData?.turnOrder?.join('|'), playerMetaKey, userId, fx]);
}

