'use client';

import React, { memo } from 'react';
import { Archive, Pin } from 'lucide-react';
import CardFace from './CardFace';
import { TIER_LABEL, TIER_THEME } from '../shared/constants';

function DeckButton({ tier, count, canPin, onPinTopLead }) {
  const theme = TIER_THEME[tier] || TIER_THEME[1];
  return (
    <button
      type="button"
      onClick={() => canPin && onPinTopLead?.(tier)}
      disabled={!canPin}
      className={[
        'tap-feedback motion-deck-sheen relative flex min-h-[180px] flex-col items-center justify-center overflow-hidden rounded-[1.35rem] border text-center',
        theme.deck,
        canPin ? 'shadow-[0_10px_24px_rgba(15,23,42,0.18)]' : 'opacity-70',
      ].join(' ')}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),_transparent_45%)]" />
      <Archive size={26} className="relative z-[1] text-slate-700" />
      <div className="relative z-[1] mt-3 text-sm font-black text-slate-700">비공개 리드</div>
      <div className="relative z-[1] mt-1 text-2xl font-black text-slate-900">{count}</div>
      <div className="relative z-[1] mt-2 inline-flex items-center gap-1 rounded-full border border-slate-400/60 bg-white/55 px-2 py-1 text-[11px] font-black text-slate-700">
        <Pin size={12} /> 상단 고정
      </div>
    </button>
  );
}

function MarketGridImpl({
  board,
  decks,
  isMyTurn,
  lockUsed,
  pendingForMe,
  onOpenCard,
  onPinTopLead,
}) {
  return (
    <section className="space-y-4">
      {[3, 2, 1].map((tier) => (
        <div key={tier} className="panel motion-soft-in overflow-hidden px-3 py-3">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div>
              <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">단계 {tier}</div>
              <div className="mt-1 text-sm font-black text-white">{TIER_LABEL[tier]}</div>
            </div>
            <div className="text-xs font-bold text-slate-400">남은 리드 {decks?.[tier]?.length || 0}</div>
          </div>

          <div className="grid grid-cols-[88px_repeat(4,minmax(0,1fr))] gap-3 sm:grid-cols-[112px_repeat(4,minmax(0,1fr))]">
            <DeckButton
              tier={tier}
              count={decks?.[tier]?.length || 0}
              canPin={isMyTurn && !lockUsed && !pendingForMe && Number(decks?.[tier]?.length || 0) > 0}
              onPinTopLead={onPinTopLead}
            />
            {[0, 1, 2, 3].map((slotIndex) => {
              const card = board?.[tier]?.[slotIndex] || null;
              if (!card) {
                return (
                  <div key={`${tier}_${slotIndex}`} className="reserved-slot flex min-h-[180px] items-center justify-center text-xs font-black tracking-[0.16em] text-slate-500">
                    빈 슬롯
                  </div>
                );
              }
              return (
                <CardFace
                  key={card.id}
                  card={card}
                  compact
                  onClick={() => onOpenCard?.({ ...card, sourceType: 'board', tier })}
                />
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

function areEqual(prev, next) {
  return prev.board === next.board
    && prev.decks === next.decks
    && prev.isMyTurn === next.isMyTurn
    && prev.lockUsed === next.lockUsed
    && prev.pendingForMe === next.pendingForMe;
}

const MarketGrid = memo(MarketGridImpl, areEqual);
export default MarketGrid;
