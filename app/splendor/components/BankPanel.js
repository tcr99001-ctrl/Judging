'use client';

import React, { memo } from 'react';
import GemAsset from './GemAsset';
import { ALL, GEM_LABEL } from '../shared/constants';
import { useFX } from '../fx/FXProvider';

function BankPanelImpl({ bank }) {
  const fx = useFX();

  return (
    <section ref={fx.anchorRef('bank:center')} className="panel-soft motion-soft-in px-2 py-1.5">
      <div className="grid grid-cols-6 gap-1">
        {ALL.map((color) => {
          const count = bank?.[color] ?? 0;
          const canTakeDouble = color !== 'gold' && count >= 4;
          return (
            <div key={color} className="relative flex min-h-[44px] items-center justify-center">
              <span
                ref={fx.anchorRef(`bank:${color}`)}
                className="relative inline-flex h-9 w-9 items-center justify-center"
                aria-label={`${GEM_LABEL[color]} 은행 토큰 ${count}개`}
              >
                <GemAsset color={color} className="h-full w-full drop-shadow-[0_4px_10px_rgba(15,23,42,0.22)]" />
                <span className="absolute -bottom-1.5 left-1/2 inline-flex min-w-[1.15rem] -translate-x-1/2 items-center justify-center rounded-full border border-white/10 bg-slate-950/78 px-1 py-0.5 text-[10px] font-black leading-none text-white shadow-[0_3px_8px_rgba(2,6,23,0.24)]">
                  <span key={`${color}_${count}`} className="motion-count-pop inline-block leading-none">{count}</span>
                </span>
              </span>
              {canTakeDouble ? (
                <span className="motion-badge-reveal absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-emerald-300/28 bg-emerald-500/12 px-1 text-[10px] font-black text-emerald-100">
                  2
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function areEqual(prev, next) {
  return ALL.every((color) => (prev.bank?.[color] ?? 0) === (next.bank?.[color] ?? 0));
}

const BankPanel = memo(BankPanelImpl, areEqual);
export default BankPanel;
