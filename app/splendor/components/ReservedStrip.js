'use client';

import React, { memo } from 'react';
import { LockKeyhole } from 'lucide-react';
import CardFace from './CardFace';
import { MAX_RESERVED } from '../shared/constants';

function ReservedStripImpl({ reserved = [], reservedCount = 0, onOpenCard, playerId = 'ME' }) {
  return (
    <section className="panel motion-soft-in overflow-hidden px-3 py-3" id={`reserved-strip:${playerId}`}>
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div>
          <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">비공개 리드</div>
          <div className="mt-1 flex items-center gap-2 text-sm font-black text-white">
            <LockKeyhole size={15} className="text-amber-200" /> 비공개 리드
          </div>
        </div>
        <div className="text-xs font-bold text-slate-400">{reservedCount}/{MAX_RESERVED}</div>
      </div>
      <div className="scroll-strip-x flex gap-3 pb-1">
        {reserved.map((card) => (
          <div key={card.id} className="w-[168px] flex-none sm:w-[186px]">
            <CardFace
              card={card}
              compact
              sourceLabel="수첩 속 리드"
              onClick={() => onOpenCard?.({ ...card, sourceType: 'reserved' })}
            />
          </div>
        ))}
        {Array.from({ length: Math.max(0, MAX_RESERVED - reservedCount) }).map((_, index) => (
          <div key={`empty_${index}`} className="reserved-slot flex w-[168px] flex-none items-center justify-center text-center text-xs font-black tracking-[0.18em] text-slate-500 sm:w-[186px]">
            아직 비어 있는 슬롯
          </div>
        ))}
      </div>
    </section>
  );
}

function areEqual(prev, next) {
  return prev.reserved === next.reserved && prev.reservedCount === next.reservedCount;
}

const ReservedStrip = memo(ReservedStripImpl, areEqual);
export default ReservedStrip;
