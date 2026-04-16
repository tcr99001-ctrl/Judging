'use client';

import React from 'react';
import { TIER_LABEL } from '../shared/constants';

const TONE = {
  1: 'border-emerald-300/20 bg-emerald-500/12 text-emerald-50',
  2: 'border-sky-300/20 bg-sky-500/12 text-sky-50',
  3: 'border-amber-300/20 bg-amber-500/12 text-amber-50',
};

export default function TierTabs({ activeTier, setActiveTier, decks }) {
  return (
    <section className="motion-soft-in">
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((tier) => (
          <button
            key={tier}
            type="button"
            onClick={() => setActiveTier?.(tier)}
            className={[
              'tap-feedback rounded-2xl border px-3 py-3 text-left',
              activeTier === tier ? TONE[tier] : 'border-white/10 bg-slate-900/48 text-slate-300',
            ].join(' ')}
          >
            <div className="text-[11px] font-black tracking-[0.16em]">구역 {tier}</div>
            <div className="mt-1 text-sm font-black">{TIER_LABEL[tier]}</div>
            <div className="mt-1 text-xs font-bold text-slate-400">덱 {(decks?.[tier] || []).length || 0}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
