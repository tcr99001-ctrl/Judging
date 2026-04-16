'use client';

import React, { memo } from 'react';
import { Archive } from 'lucide-react';
import CardFace from './CardFace';
import { TIER_LABEL } from '../shared/constants';

function EmptySlot() {
  return (
    <div className="reserved-slot flex min-h-[188px] items-center justify-center rounded-[1.35rem] text-xs font-black tracking-[0.16em] text-slate-500">
      빈 슬롯
    </div>
  );
}

function TierSection({ tier, cards, deckCount, canPinTop, onPinTopLead, onOpenCard }) {
  return (
    <article className="panel overflow-hidden px-3 py-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">단계 {tier}</div>
          <div className="mt-1 text-sm font-black text-white">{TIER_LABEL[tier]}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-white/10 bg-slate-900/50 px-2.5 py-1 text-[11px] font-black text-slate-200">
            남은 리드 {deckCount}
          </div>
          <button
            type="button"
            onClick={() => canPinTop && onPinTopLead?.(tier)}
            disabled={!canPinTop}
            className="tap-feedback rounded-full border border-white/10 bg-slate-900/50 px-3 py-1.5 text-[11px] font-black text-slate-100 disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-500"
          >
            <span className="inline-flex items-center gap-1.5"><Archive size={12} /> 상단 리드</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((slotIndex) => {
          const card = cards?.[slotIndex] || null;
          if (!card) return <EmptySlot key={`${tier}_${slotIndex}`} />;
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
    </article>
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
    <section className="space-y-3">
      {[3, 2, 1].map((tier) => (
        <TierSection
          key={tier}
          tier={tier}
          cards={board?.[tier] || []}
          deckCount={decks?.[tier]?.length || 0}
          canPinTop={isMyTurn && !lockUsed && !pendingForMe && Number(decks?.[tier]?.length || 0) > 0}
          onPinTopLead={onPinTopLead}
          onOpenCard={onOpenCard}
        />
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
