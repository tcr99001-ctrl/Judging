'use client';

import React from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { getDisplayName } from '../shared/utils';

export default function OpponentModal({ open, player, onClose }) {
  if (!open || !player) return null;

  return (
    <div className="modal-layer">
      <button type="button" className="modal-scrim modal-dismiss" onClick={onClose} aria-label="상대 닫기" />
      <div className="panel modal-panel max-w-lg" onClick={(event) => event.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between border-b border-white/10 px-4 py-4">
          <div>
            <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">공개 기록</div>
            <div className="mt-1 text-lg font-black text-white">{getDisplayName(player)}</div>
          </div>
          <button type="button" onClick={onClose} className="tap-feedback rounded-2xl border border-white/10 bg-slate-900/55 p-2 text-slate-200">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-4 py-4">
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[18px] border border-white/10 bg-slate-950/46 px-3 py-3 text-sm font-black text-white">단서 {player.clueCount || 0}</div>
              <div className="rounded-[18px] border border-white/10 bg-slate-950/46 px-3 py-3 text-sm font-black text-white">리드 {player.reservedCount || 0}</div>
              <div className="rounded-[18px] border border-white/10 bg-slate-950/46 px-3 py-3 text-sm font-black text-white">대조 {player.breakthroughs || 0}</div>
              <div className="rounded-[18px] border border-white/10 bg-slate-950/46 px-3 py-3 text-sm font-black text-white">추궁 {player.witnessCount || 0}</div>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-slate-950/46 px-4 py-4 text-sm font-bold leading-6 text-slate-300">
              진척 {player.caseProgress || 0}
              <br />
              턴 {player.turnsTaken || 0}
            </div>

            {player.accusationLocked ? (
              <div className="rounded-[18px] border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm font-black text-rose-50">
                <span className="inline-flex items-center gap-2"><ShieldAlert size={15} /> 고발 불가</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
