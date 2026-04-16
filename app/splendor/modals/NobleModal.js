'use client';

import React from 'react';
import { MessageCircleMore } from 'lucide-react';
import AssetImage from '../components/AssetImage';
import GemAsset from '../components/GemAsset';
import { NOBLE_ASSET } from '../shared/assets';
import { COLORS } from '../shared/constants';

export default function NobleModal({ open, witnesses = [], onChoose }) {
  if (!open) return null;

  return (
    <div className="modal-layer">
      <div className="modal-scrim" />
      <div className="panel modal-panel max-w-xl" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-2 text-lg font-black text-white"><MessageCircleMore size={18} className="text-amber-200" /> 추궁 선택</div>
        </div>

        <div className="grid gap-3 px-4 py-4">
          {witnesses.map((witness) => (
            <button
              key={witness.id}
              type="button"
              onClick={() => onChoose?.(witness.id)}
              className="tap-feedback rounded-3xl border border-white/10 bg-slate-900/46 px-4 py-4 text-left"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/56 p-2">
                  <AssetImage src={NOBLE_ASSET[witness.assetId]} className="h-full w-full" decorative />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-white">{witness.title}</div>
                  <div className="mt-1 text-[11px] font-bold text-slate-400">{witness.role}</div>
                  <div className="mt-2 text-xs font-bold leading-5 text-slate-300">{witness.quote}</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {COLORS.filter((color) => Number(witness?.req?.[color] || 0) > 0).map((color) => (
                  <span key={color} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-black text-slate-100">
                    <GemAsset color={color} className="h-3.5 w-3.5" />
                    {witness.req[color]}
                  </span>
                ))}
              </div>

              <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-[11px] font-black text-amber-50">
                {witness.effectLines?.[0] || '새 정보'}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
