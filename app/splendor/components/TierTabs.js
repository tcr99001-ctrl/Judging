'use client';

import React from 'react';
import { TIER_LABEL, TIER_THEME } from '../shared/constants';

export default function TierTabs({ activeTier, setActiveTier, decks }) {
  return (
    <section className="motion-soft-in">
      <div className="grid grid-cols-3 gap-2">
        {[3, 2, 1].map((tier) => {
          const theme = TIER_THEME[tier] || TIER_THEME[1];
          return (
            <button
              key={tier}
              type="button"
              onClick={() => setActiveTier(tier)}
              className={[
                'tap-feedback rounded-2xl border px-3 py-3 text-left',
                activeTier === tier ? `${theme.badge} shadow-[0_8px_18px_rgba(15,23,42,0.12)]` : 'border-white/10 bg-slate-900/48 text-slate-300',
              ].join(' ')}
            >
              <div className="text-[11px] font-black tracking-[0.16em]">TIER {tier}</div>
              <div className="mt-1 text-sm font-black">{TIER_LABEL[tier]}</div>
              <div className="mt-1 text-xs font-bold text-slate-500">덱 {decks?.[tier]?.length || 0}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
