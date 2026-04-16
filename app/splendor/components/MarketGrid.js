'use client';

import React from 'react';
import CardFace from './CardFace';
import { TIER_LABEL } from '../shared/constants';
import { useFX } from '../fx/FXProvider';

function DeckBadge({ count }) {
  return (
    <div className="rounded-full border border-white/10 bg-slate-950/50 px-2.5 py-1 text-[11px] font-black text-slate-200">
      남은 장수 {count}
    </div>
  );
}

export default function MarketGrid({ roomData, onOpenCard }) {
  const fx = useFX();

  return (
    <div className="grid gap-4">
      {[1, 2, 3].map((tier) => {
        const cards = roomData?.board?.[tier] || [];
        const deckCount = Array.isArray(roomData?.decks?.[tier]) ? roomData.decks[tier].length : 0;
        return (
          <section key={tier} className="panel p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-black tracking-[0.2em] text-slate-400">수사 보드</div>
                <div className="mt-1 text-base font-black text-white">{TIER_LABEL[tier]}</div>
              </div>
              <DeckBadge count={deckCount} />
            </div>

            {cards.length ? (
              <div className="grid grid-cols-2 gap-3">
                {cards.map((card) => (
                  <button
                    key={card.id}
                    ref={fx.anchorRef(`card:${card.id}`)}
                    type="button"
                    onClick={() => onOpenCard?.(card, 'board')}
                    className="tap-feedback text-left"
                  >
                    <CardFace card={card} className="motion-card-enter" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/30 px-4 py-8 text-center text-sm font-black text-slate-400">
                더 나올 단서가 없다.
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
