'use client';

import React from 'react';
import { Pin } from 'lucide-react';
import CardFace from './CardFace';
import { MAX_RESERVED } from '../shared/constants';

export default function ReservedStrip({ leads = [], onOpenCard }) {
  return (
    <section className="panel p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-white">
          <Pin size={16} className="text-amber-200" />
          <div className="text-base font-black">비공개 리드</div>
        </div>
        <div className="rounded-full border border-white/10 bg-slate-950/46 px-2.5 py-1 text-[11px] font-black text-slate-200">
          {leads.length}/{MAX_RESERVED}
        </div>
      </div>

      {leads.length ? (
        <div className="scroll-strip-x -mx-1 flex gap-3 px-1 pb-1">
          {leads.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => onOpenCard?.(card, 'reserved')}
              className="tap-feedback w-[164px] shrink-0 text-left"
            >
              <CardFace card={card} size="mini" emphasis />
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-[20px] border border-dashed border-white/10 bg-slate-950/30 px-4 py-8 text-center text-sm font-black text-slate-400">
          저장한 리드가 없다.
        </div>
      )}
    </section>
  );
}
