'use client';

import React from 'react';
import { LockKeyhole, Sparkles } from 'lucide-react';
import AssetImage from './AssetImage';
import { NOBLE_ASSET, UI_ASSET } from '../shared/assets';
import { witnessUnlockState } from '../shared/utils';

function RequirementText({ witness, myData }) {
  const state = witnessUnlockState(myData, witness);
  if (state.done) return <span className="text-[#c4b6a1]">처리 완료</span>;
  if (state.ready) return <span className="text-[#d9e6d1]">추궁 가능</span>;
  const parts = [];
  if (state.missingThreads.length) parts.push(`키워드 ${state.missingThreads.join(', ')}`);
  if (state.needCrosschecks > 0) parts.push(`대조 ${state.needCrosschecks}`);
  return <span className="text-[#c4b6a1]">{parts.join(' · ') || '조건 확인'}</span>;
}

export default function NobleStrip({ witnesses = [], myData, onOpenWitness }) {
  return (
    <section className="panel p-4">
      <div className="mb-3 flex items-center justify-between gap-2 text-[#f4ead7]">
        <div>
          <div className="text-[11px] font-black tracking-[0.18em] text-[#c9b086]">인물 파일</div>
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
                  'tap-feedback relative w-[236px] shrink-0 rounded-[22px] border text-left',
                  state.ready ? 'border-[#7c8f73]/45 bg-[#272d25]' : 'border-[#5d4a3f] bg-[#1d1714]',
                ].join(' ')}
              >
                <div className="flex gap-3 p-3">
                  <div className="relative h-[92px] w-[78px] shrink-0 overflow-hidden rounded-[16px] border border-[#6a5647]/35 bg-[#14100e]">
                    <AssetImage src={NOBLE_ASSET[witness.assetId]} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="break-words text-sm font-black leading-5 text-[#f7efe3]">{witness.title}</div>
                        <div className="mt-1 text-[11px] font-black text-[#cdbda8]">{witness.role}</div>
                      </div>
                      {state.ready ? <Sparkles size={15} className="shrink-0 text-[#d8e7cf]" /> : <LockKeyhole size={15} className="shrink-0 text-[#9d8875]" />}
                    </div>
                    <div className="mt-2 break-words text-[11px] font-bold leading-5 text-[#efe3d0]">{witness.statement || witness.quote}</div>
                    <div className="mt-2 text-[10px] font-black tracking-[0.12em]"><RequirementText witness={witness} myData={myData} /></div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[20px] border border-dashed border-white/10 bg-black/10 px-4 py-8 text-center text-sm font-black text-[#bcae9b]">
          확인할 인물이 더 없다.
        </div>
      )}
    </section>
  );
}
