'use client';

import React from 'react';
import { MessageCircleMore, LockKeyhole, Sparkles } from 'lucide-react';
import AssetImage from './AssetImage';
import { NOBLE_ASSET } from '../shared/assets';
import { witnessUnlockState } from '../shared/utils';

function RequirementText({ witness, myData }) {
  const state = witnessUnlockState(myData, witness);
  if (state.ready) return <span className="text-emerald-200">열림</span>;
  return (
    <span className="text-slate-300">
      {state.missingThreads.length ? state.missingThreads.join(' · ') : ''}
      {state.needCrosschecks > 0 ? `${state.missingThreads.length ? ' · ' : ''}대조 ${state.needCrosschecks}` : ''}
    </span>
  );
}

export default function NobleStrip({ witnesses = [], myData, onOpenWitness }) {
  return (
    <section className="panel p-3">
      <div className="mb-3 flex items-center gap-2 text-white">
        <MessageCircleMore size={16} className="text-sky-200" />
        <div className="text-base font-black">추궁 대상</div>
      </div>

      {witnesses.length ? (
        <div className="scroll-strip-x -mx-1 flex gap-3 px-1 pb-1">
          {witnesses.map((witness) => {
            const state = witnessUnlockState(myData, witness);
            return (
              <button
                key={witness.id}
                type="button"
                onClick={() => onOpenWitness?.(witness)}
                className={[
                  'tap-feedback relative w-[210px] shrink-0 overflow-hidden rounded-[28px] border text-left',
                  state.ready ? 'border-emerald-300/30 bg-emerald-500/12' : 'border-white/10 bg-slate-950/42',
                ].join(' ')}
              >
                <div className="flex gap-3 p-3">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[22px] border border-white/10 bg-slate-950/50">
                    <AssetImage src={NOBLE_ASSET[witness.assetId]} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-black text-white">{witness.title}</div>
                        <div className="mt-1 text-[11px] font-bold text-slate-300">{witness.role}</div>
                      </div>
                      {state.ready ? <Sparkles size={15} className="text-emerald-200" /> : <LockKeyhole size={15} className="text-slate-500" />}
                    </div>
                    <div className="mt-2 line-clamp-2 text-[11px] font-bold leading-5 text-slate-200">{witness.quote}</div>
                    <div className="mt-2 text-[10px] font-black tracking-[0.14em]"><RequirementText witness={witness} myData={myData} /></div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/30 px-4 py-8 text-center text-sm font-black text-slate-400">
          더 남은 인물이 없다.
        </div>
      )}
    </section>
  );
}
