'use client';

import React, { useMemo } from 'react';
import { RefreshCw, X } from 'lucide-react';
import GemAsset from '../components/GemAsset';
import { COLORS, GEM_LABEL } from '../shared/constants';
import { canTakeLeadSelection } from '../shared/utils';

function removeAt(list, index) {
  return list.filter((_, idx) => idx !== index);
}

export default function GemModal({ open, bank, selected, setSelected, onClose, onConfirm }) {
  const verdict = useMemo(() => canTakeLeadSelection(selected, bank), [bank, selected]);
  if (!open) return null;

  const pushColor = (color) => {
    const next = [...selected, color];
    if (canTakeLeadSelection(next, bank).ok || next.length === 1) {
      setSelected(next);
    }
  };

  return (
    <div className="modal-layer">
      <button type="button" className="modal-scrim modal-dismiss" onClick={onClose} aria-label="자원 선택 닫기" />
      <div className="panel modal-panel max-w-lg" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-white/10 px-4 py-4">
          <div>
            <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">자원</div>
            <div className="mt-1 text-lg font-black text-white">수사 자원 선택</div>
          </div>
          <button type="button" onClick={onClose} className="tap-feedback rounded-2xl border border-white/10 bg-slate-900/55 p-2 text-slate-200">
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-4 px-4 py-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/46 px-4 py-3">
            <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">선택</div>
            <div className="mt-3 flex min-h-10 flex-wrap gap-2">
              {selected.length ? selected.map((color, index) => (
                <button
                  key={`${color}_${index}`}
                  type="button"
                  onClick={() => setSelected(removeAt(selected, index))}
                  className="tap-feedback inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-500/12 px-3 py-2 text-sm font-black text-amber-50"
                >
                  <GemAsset color={color} className="h-4 w-4" />
                  {GEM_LABEL[color]}
                </button>
              )) : <div className="text-sm font-bold text-slate-400">아직 없다.</div>}
            </div>
            {!verdict.ok && selected.length ? <div className="mt-3 text-sm font-bold text-rose-200">{verdict.reason}</div> : null}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => pushColor(color)}
                disabled={Number(bank?.[color] || 0) <= 0}
                className="tap-feedback rounded-2xl border border-white/10 bg-slate-900/48 px-3 py-3 text-left disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-500"
              >
                <div className="flex items-center gap-2">
                  <GemAsset color={color} className="h-5 w-5" />
                  <div className="text-sm font-black text-white">{GEM_LABEL[color]}</div>
                </div>
                <div className="mt-2 text-xs font-bold text-slate-400">은행 {bank?.[color] || 0}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-white/10 px-4 py-4">
          <button
            type="button"
            onClick={() => setSelected([])}
            className="tap-feedback min-h-12 rounded-2xl border border-white/10 bg-slate-900/55 px-4 py-3 text-sm font-black text-slate-100"
          >
            <span className="inline-flex items-center gap-2"><RefreshCw size={15} /> 초기화</span>
          </button>
          <button
            type="button"
            onClick={() => verdict.ok && onConfirm?.(selected)}
            disabled={!verdict.ok}
            className="tap-feedback min-h-12 rounded-2xl border border-sky-300/25 bg-sky-500/12 px-4 py-3 text-sm font-black text-sky-50 disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-500"
          >
            가져가기
          </button>
        </div>
      </div>
    </div>
  );
}
