'use client';

import React from 'react';
import { ShieldAlert, X } from 'lucide-react';
import GemAsset from '../components/GemAsset';
import { ALL, GEM_LABEL } from '../shared/constants';
import { getDisplayName, getTotalResources, resolveCaseProgress } from '../shared/utils';

export default function OpponentModal({ open, player, onClose }) {
  if (!open || !player) return null;

  return (
    <div className="modal-layer">
      <button type="button" className="modal-scrim modal-dismiss" onClick={onClose} aria-label="상대 정보 닫기" />
      <div className="panel modal-panel max-w-lg" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-white/10 px-4 py-4">
          <div>
            <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">공개 정보</div>
            <div className="mt-1 text-lg font-black text-white">{getDisplayName(player)}</div>
          </div>
          <button type="button" onClick={onClose} className="tap-feedback rounded-2xl border border-white/10 bg-slate-900/55 p-2 text-slate-200">
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-4 px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-white/10 bg-slate-900/46 px-3 py-3 text-sm font-black text-white">진척 {resolveCaseProgress(player)}</div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/46 px-3 py-3 text-sm font-black text-white">자원 {getTotalResources(player.resources || player.gems || {})}</div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/46 px-3 py-3 text-sm font-black text-white">단서 {(player.clues || player.cards || []).length}</div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/46 px-3 py-3 text-sm font-black text-white">추궁 {(player.witnesses || player.nobles || []).length}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/46 px-4 py-4">
            <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">공개 자원</div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ALL.map((color) => (
                <div key={color} className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                  <div className="flex items-center gap-2">
                    <GemAsset color={color} className="h-4.5 w-4.5" />
                    <div className="text-[11px] font-black text-slate-100">{GEM_LABEL[color]}</div>
                  </div>
                  <div className="mt-2 text-sm font-black text-white">{player?.resources?.[color] || player?.gems?.[color] || 0}</div>
                </div>
              ))}
            </div>
          </div>

          {player.accusationLocked ? (
            <div className="rounded-2xl border border-rose-300/24 bg-rose-500/12 px-4 py-3 text-sm font-black text-rose-50">
              <span className="inline-flex items-center gap-2"><ShieldAlert size={15} /> 고발 봉인</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
