'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import GemAsset from '../components/GemAsset';
import { ALL, GEM_LABEL } from '../shared/constants';

export default function DiscardModal({ open, pending, resources, onDiscard }) {
  if (!open || !pending) return null;

  return (
    <div className="modal-layer">
      <div className="modal-scrim" />
      <div className="panel modal-panel max-w-lg" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-2 text-lg font-black text-white"><AlertTriangle size={18} className="text-amber-200" /> 자원 정리</div>
          <div className="mt-2 text-sm font-bold text-slate-300">{pending.need}개 더 버려야 한다.</div>
        </div>

        <div className="grid gap-2 px-4 py-4">
          {ALL.filter((color) => Number(resources?.[color] || 0) > 0).map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onDiscard?.(color)}
              className="tap-feedback rounded-2xl border border-white/10 bg-slate-900/48 px-4 py-3 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/56">
                  <GemAsset color={color} className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-white">{GEM_LABEL[color]}</div>
                  <div className="mt-1 text-[11px] font-bold text-slate-400">보유 {resources?.[color] || 0}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
