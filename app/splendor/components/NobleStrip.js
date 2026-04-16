'use client';

import React from 'react';
import { LockKeyhole, Sparkles } from 'lucide-react';
import AssetImage from './AssetImage';
import { NOBLE_ASSET, UI_ASSET } from '../shared/assets';
import { witnessUnlockState } from '../shared/utils';

function RequirementText({ witness, myData }) {
  const state = witnessUnlockState(myData, witness);
  if (state.ready) return <span className="text-[#d8e7cf]">열림</span>;
  return (
    <span className="text-[#d5c8b4]">
      {state.missingThreads.length ? state.missingThreads.join(' · ') : ''}
      {state.needCrosschecks > 0 ? `${state.missingThreads.length ? ' · ' : ''}대조 ${state.needCrosschecks}` : ''}
    </span>
  );
}

export default function NobleStrip({ witnesses = [], myData, onOpenWitness }) {
  return (
    <section className="panel overflow-hidden p-3">
      <div className="mb-3 flex items-center justify-between gap-2 text-[#f4ead7]">
        <div>
          <div className="text-[11px] font-black tracking-[0.2em] text-[#c9b086]">인물 파일</div>
          <div className="mt-1 text-base font-black">추궁 대상</div>
        </div>
        <div className="w-20 opacity-80">
          <AssetImage src={UI_ASSET.scratchDivider} className="h-4 w-full object-cover" />
        </div>
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
                  'tap-feedback relative w-[224px] shrink-0 overflow-hidden rounded-[28px] border text-left',
                  state.ready ? 'border-[#7c8f73] bg-[#2f342d]' : 'border-[#5d4a3f] bg-[#241d19]',
                ].join(' ')}
              >
                <div className="absolute inset-x-0 top-0 h-10 bg-[linear-gradient(180deg,rgba(250,243,229,0.08),transparent)]" />
                <div className="flex gap-3 p-3">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[18px] border border-[#6a5647]/40 bg-[#161210]">
                    <AssetImage src={NOBLE_ASSET[witness.assetId]} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-black text-[#f7efe3]">{witness.title}</div>
                        <div className="mt-1 text-[11px] font-black text-[#cdbda8]">{witness.role}</div>
                      </div>
                      {state.ready ? <Sparkles size={15} className="text-[#d8e7cf]" /> : <LockKeyhole size={15} className="text-[#9d8875]" />}
                    </div>
                    <div className="mt-2 line-clamp-2 text-[11px] font-bold leading-5 text-[#efe3d0]">{witness.quote}</div>
                    <div className="mt-2 text-[10px] font-black tracking-[0.14em]"><RequirementText witness={witness} myData={myData} /></div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-white/10 bg-black/10 px-4 py-8 text-center text-sm font-black text-[#bcae9b]">
          더 남은 인물이 없다.
        </div>
      )}
    </section>
  );
}
