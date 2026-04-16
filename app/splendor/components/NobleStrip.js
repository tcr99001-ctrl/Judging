'use client';

import React, { memo } from 'react';
import AssetImage from './AssetImage';
import GemAsset from './GemAsset';
import { NOBLE_ASSET } from '../shared/assets';
import { COLORS } from '../shared/constants';
import { eligibleWitnesses } from '../shared/utils';

function WitnessReq({ req = {} }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {COLORS.filter((color) => Number(req?.[color] || 0) > 0).map((color) => (
        <span key={color} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/8 px-2 py-1 text-[11px] font-black text-slate-100">
          <GemAsset color={color} className="h-4 w-4" /> {req[color]}
        </span>
      ))}
    </div>
  );
}

function NobleStripImpl({ witnessStrip = [], myInsights = {}, pendingOptions = [] }) {
  const claimableIds = new Set(eligibleWitnesses(myInsights, witnessStrip).map((entry) => entry.id));
  const pendingSet = new Set(pendingOptions || []);

  return (
    <section className="panel motion-soft-in overflow-hidden px-3 py-3">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div>
          <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">증언선</div>
          <div className="mt-1 text-sm font-black text-white">입을 열 수 있는 사람들</div>
        </div>
        <div className="text-xs font-bold text-slate-400">남은 증언 {witnessStrip.length}</div>
      </div>
      <div className="scroll-strip-x flex gap-3 pb-1">
        {witnessStrip.map((witness) => {
          const claimable = claimableIds.has(witness.id);
          const pending = pendingSet.has(witness.id);
          return (
            <article
              key={witness.id}
              className={`panel-soft relative w-[228px] flex-none overflow-hidden px-4 py-4 ${claimable ? 'ring-1 ring-amber-300/40' : ''}`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_42%)]" />
              <div className="relative z-[1] flex items-start gap-3">
                <div className="relative h-16 w-16 flex-none rounded-2xl border border-white/10 bg-slate-950/28 p-2">
                  <AssetImage src={NOBLE_ASSET[witness.assetId]} className="h-full w-full" decorative />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-black text-white">{witness.title}</div>
                    {pending ? <span className="rounded-full border border-amber-300/25 bg-amber-500/12 px-2 py-1 text-[10px] font-black text-amber-100">지금 선택</span> : null}
                    {!pending && claimable ? <span className="rounded-full border border-emerald-300/25 bg-emerald-500/12 px-2 py-1 text-[10px] font-black text-emerald-100">조건 충족</span> : null}
                  </div>
                  <div className="mt-1 text-xs font-bold text-slate-400">{witness.role}</div>
                  <div className="mt-2 text-xs font-bold leading-5 text-slate-300">{witness.quote}</div>
                </div>
              </div>
              <WitnessReq req={witness.req} />
              {witness.effectLines?.length ? (
                <div className="relative z-[1] mt-3 rounded-2xl border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-[11px] font-black text-amber-50">
                  {witness.effectLines[0]}
                </div>
              ) : null}
              <div className="relative z-[1] mt-2 text-xs font-bold text-slate-400">채택 시 사건 진척 +{witness.progress}</div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function areEqual(prev, next) {
  return prev.witnessStrip === next.witnessStrip && prev.myInsights === next.myInsights && prev.pendingOptions === next.pendingOptions;
}

const NobleStrip = memo(NobleStripImpl, areEqual);
export default NobleStrip;
