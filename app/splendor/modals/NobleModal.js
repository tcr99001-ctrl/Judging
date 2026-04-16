'use client';

import React from 'react';
import { LockKeyhole, MessageCircleMore, Sparkles, X } from 'lucide-react';
import AssetImage from '../components/AssetImage';
import { NOBLE_ASSET } from '../shared/assets';
import { witnessUnlockState } from '../shared/utils';

export default function NobleModal({ open, witness, myData, onClose, onConfirm }) {
  if (!open || !witness) return null;
  const state = witnessUnlockState(myData, witness);

  return (
    <div className="modal-layer">
      <button type="button" className="modal-scrim modal-dismiss" onClick={onClose} aria-label="추궁 닫기" />
      <div className="panel modal-panel max-w-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-white/10 px-4 py-4">
          <div>
            <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">추궁</div>
            <div className="mt-1 text-lg font-black text-white">{witness.title}</div>
          </div>
          <button type="button" onClick={onClose} className="tap-feedback rounded-2xl border border-white/10 bg-slate-900/55 p-2 text-slate-200">
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-4 px-4 py-4">
          <div className="grid gap-4 sm:grid-cols-[112px_1fr]">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/50">
              <AssetImage src={NOBLE_ASSET[witness.assetId]} className="h-28 w-full object-cover" />
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/44 px-4 py-4">
              <div className="text-sm font-black text-white">{witness.role}</div>
              <div className="mt-2 text-sm font-bold leading-6 text-slate-200">{witness.quote}</div>
              <div className="mt-3 text-xs font-black tracking-[0.14em] text-slate-400">{witness.risk}</div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/44 px-4 py-4">
            <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">조건</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(witness.needs?.threads || []).map((thread) => (
                <span key={thread} className={`rounded-full border px-3 py-1 text-sm font-black ${state.missingThreads.includes(thread) ? 'border-white/10 bg-white/5 text-slate-300' : 'border-emerald-300/20 bg-emerald-500/12 text-emerald-50'}`}>
                  {thread}
                </span>
              ))}
              {Number(witness.needs?.crosschecks || 0) > 0 ? (
                <span className={`rounded-full border px-3 py-1 text-sm font-black ${state.needCrosschecks > 0 ? 'border-white/10 bg-white/5 text-slate-300' : 'border-emerald-300/20 bg-emerald-500/12 text-emerald-50'}`}>
                  대조 {witness.needs.crosschecks}
                </span>
              ) : null}
            </div>
          </div>

          {witness.effectLines?.length ? (
            <div className="rounded-3xl border border-white/10 bg-slate-950/44 px-4 py-4">
              <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">열리면</div>
              <div className="mt-3 grid gap-2 text-sm font-bold text-slate-200">
                {witness.effectLines.map((line) => (
                  <div key={line} className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2">{line}</div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-2 border-t border-white/10 px-4 py-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => state.ready && onConfirm?.(witness.id)}
            disabled={!state.ready}
            className="tap-feedback min-h-12 rounded-2xl border border-sky-300/25 bg-sky-500/12 px-4 py-3 text-sm font-black text-sky-50 disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-500"
          >
            <span className="inline-flex items-center gap-2">{state.ready ? <Sparkles size={15} /> : <LockKeyhole size={15} />} 추궁</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="tap-feedback min-h-12 rounded-2xl border border-white/10 bg-slate-950/54 px-4 py-3 text-sm font-black text-slate-100"
          >
            <span className="inline-flex items-center gap-2"><MessageCircleMore size={15} /> 닫기</span>
          </button>
        </div>
      </div>
    </div>
  );
}
