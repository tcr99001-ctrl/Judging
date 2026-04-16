'use client';

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import GemAsset from '../components/GemAsset';
import { ALL, GEM_LABEL } from '../shared/constants';

export default function DiscardModal({ open, pending, resources, onDiscard }) {
  if (!open || !pending) return null;

  return (
    <div className="modal-layer">
      <div className="modal-scrim" />
      <div className="panel modal-panel max-w-lg" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3 text-lg font-black text-white">
            <AlertTriangle size={18} className="text-amber-200" /> 자원 정리
          </div>
          <div className="mt-2 text-sm font-bold leading-6 text-slate-300">
            손에 든 자원이 너무 많다. {pending.need}개를 정리해야 턴이 끝난다.
          </div>
        </div>

        <div className="px-5 py-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ALL.filter((color) => Number(resources?.[color] || 0) > 0).map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onDiscard?.(color)}
                className="tap-feedback rounded-3xl border border-white/10 bg-slate-900/48 px-4 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/56">
                    <GemAsset color={color} className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">{GEM_LABEL[color]}</div>
                    <div className="mt-1 text-xs font-bold text-slate-400">보유 {resources?.[color] || 0}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {!ALL.some((color) => Number(resources?.[color] || 0) > 0) ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/48 px-4 py-4 text-sm font-bold text-slate-400">
              버릴 자원이 남아 있지 않다. 새로고침 뒤 다시 확인해 줘.
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/10 px-5 py-4 text-xs font-bold text-slate-400">
          <span className="inline-flex items-center gap-2"><RotateCcw size={14} /> 한 개씩 정리하면 된다.</span>
        </div>
      </div>
    </div>
  );
}
