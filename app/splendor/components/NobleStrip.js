'use client';

import React, { memo } from 'react';
import AssetImage from './AssetImage';
import GemAsset from './GemAsset';
import { NOBLE_ASSET } from '../shared/assets';
import { COLORS } from '../shared/constants';
import { eligibleWitnesses } from '../shared/utils';

function ReqRow({ req = {} }) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {COLORS.filter((color) => Number(req?.[color] || 0) > 0).map((color) => (
        <span key={color} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-black text-slate-100">
          <GemAsset color={color} className="h-3.5 w-3.5" />
          {req[color]}
        </span>
      ))}
    </div>
  );
}

function NobleStripImpl({ witnessStrip = [], myInsights = {}, pendingOptions = [] }) {
  const claimableSet = new Set(eligibleWitnesses(myInsights, witnessStrip).map((entry) => entry.id));
  const pendingSet = new Set(pendingOptions || []);

  return (
    <section className="panel overflow-hidden px-3 py-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">추궁선</div>
          <div className="mt-1 text-sm font-black text-white">입을 열 사람들</div>
        </div>
        <div className="rounded-full border border-white/10 bg-slate-900/50 px-2.5 py-1 text-[11px] font-black text-slate-200">
          {witnessStrip.length}
        </div>
      </div>

      <div className="scroll-strip-x">
        <div className="flex min-w-max gap-3 pb-1">
          {witnessStrip.map((witness) => {
            const claimable = claimableSet.has(witness.id);
            const pending = pendingSet.has(witness.id);
            return (
              <article
                key={witness.id}
                className={[
                  'panel-soft w-[210px] flex-none overflow-hidden px-3 py-3',
                  claimable ? 'ring-1 ring-amber-300/35' : '',
                ].join(' ')}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/56 p-2">
                    <AssetImage src={NOBLE_ASSET[witness.assetId]} className="h-full w-full" decorative />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div className="truncate text-sm font-black text-white">{witness.title}</div>
                      {pending ? <span className="rounded-full border border-amber-300/25 bg-amber-500/12 px-2 py-0.5 text-[10px] font-black text-amber-100">선택</span> : null}
                      {!pending && claimable ? <span className="rounded-full border border-emerald-300/25 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-black text-emerald-100">열림</span> : null}
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-slate-400">{witness.role}</div>
                    <div className="mt-2 text-xs font-bold leading-5 text-slate-300">{witness.quote}</div>
                  </div>
                </div>

                <ReqRow req={witness.req} />

                <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-black text-slate-100">
                  {witness.effectLines?.[0] || '새 정보'}
                </div>
                <div className="mt-2 text-[11px] font-bold text-slate-400">진척 +{witness.progress}</div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function areEqual(prev, next) {
  return prev.witnessStrip === next.witnessStrip && prev.myInsights === next.myInsights && prev.pendingOptions === next.pendingOptions;
}

const NobleStrip = memo(NobleStripImpl, areEqual);
export default NobleStrip;
