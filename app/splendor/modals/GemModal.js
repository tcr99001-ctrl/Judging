'use client';

import React, { useMemo } from 'react';
import { RefreshCw, Search, X } from 'lucide-react';
import GemAsset from '../components/GemAsset';
import { COLORS, GEM_LABEL, RESOURCE_DESC } from '../shared/constants';
import { canTakeLeadSelection } from '../shared/utils';

function countOf(selected, color) {
  return selected.filter((item) => item === color).length;
}

function toggleLead(selected, color, bank) {
  const counts = Object.fromEntries(COLORS.map((entry) => [entry, countOf(selected, entry)]));
  const current = counts[color] || 0;
  const bankLeft = Number(bank?.[color] || 0);
  if (current > 0) {
    const index = selected.indexOf(color);
    if (index >= 0) {
      const next = [...selected];
      next.splice(index, 1);
      return next;
    }
    return selected;
  }

  const distinct = selected.length;
  const sameColorAllowed = bankLeft >= 4 && selected.length === 1 && selected[0] === color;
  if (!sameColorAllowed && distinct >= 3) return selected;

  if (selected.length === 0) return [color];
  if (selected.length === 1 && selected[0] === color && bankLeft >= 4) return [color, color];
  if (selected.length === 2 && selected[0] === color && selected[1] === color) return selected;
  if (selected.includes(color)) return selected;
  if (selected.length >= 2 && selected[0] === selected[1]) return selected;

  return [...selected, color];
}

export default function GemModal({
  open,
  bank,
  selected,
  setSelected,
  onClose,
  onConfirm,
}) {
  const verdict = useMemo(() => canTakeLeadSelection(selected, bank), [selected, bank]);

  if (!open) return null;

  return (
    <div className="modal-layer">
      <button type="button" className="modal-scrim modal-dismiss" onClick={onClose} aria-label="자원 확보 닫기" />
      <div className="panel modal-panel max-w-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">수사 자원</div>
            <div className="mt-1 text-lg font-black text-white">수사 자원 확보</div>
          </div>
          <button type="button" onClick={onClose} className="tap-feedback rounded-2xl border border-white/10 bg-slate-900/55 p-2 text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="rounded-2xl border border-white/10 bg-slate-900/46 px-4 py-3 text-sm font-bold leading-6 text-slate-200">
            서로 다른 자원은 최대 세 개, 같은 자원 두 개는 그 색이 네 개 이상 남아 있을 때만 가능하다.
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {COLORS.map((color) => {
              const chosen = countOf(selected, color);
              const left = Number(bank?.[color] || 0);
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelected((current) => toggleLead(current, color, bank))}
                  disabled={left <= 0}
                  className={[
                    'tap-feedback rounded-3xl border px-4 py-4 text-left transition',
                    chosen ? 'border-sky-300/30 bg-sky-500/12' : 'border-white/10 bg-slate-900/44',
                    left <= 0 ? 'opacity-45' : '',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/56">
                        <GemAsset color={color} className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-white">{GEM_LABEL[color]}</div>
                        <div className="mt-1 text-xs font-bold leading-5 text-slate-400">{RESOURCE_DESC[color]}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-white">남음 {left}</div>
                      <div className="mt-1 text-xs font-black text-sky-100">선택 {chosen}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-500/10 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-black text-amber-50"><Search size={15} /> 선택한 자원</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {selected.length ? selected.map((color, index) => (
                <span key={`${color}_${index}`} className="inline-flex items-center gap-2 rounded-full border border-amber-300/24 bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-50">
                  <GemAsset color={color} className="h-4 w-4" /> {GEM_LABEL[color]}
                </span>
              )) : <span className="text-sm font-bold text-amber-50/85">아직 아무 것도 고르지 않았다.</span>}
            </div>
            {!verdict.ok ? <div className="mt-3 text-xs font-black text-rose-100">{verdict.reason}</div> : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={() => setSelected([])}
            className="tap-feedback min-h-12 rounded-2xl border border-white/10 bg-slate-900/55 px-4 py-3 text-sm font-black text-slate-200"
          >
            <span className="inline-flex items-center gap-2"><RefreshCw size={15} /> 선택 초기화</span>
          </button>
          <button
            type="button"
            onClick={() => verdict.ok && onConfirm?.(selected)}
            disabled={!verdict.ok}
            className="tap-feedback motion-cta min-h-12 rounded-2xl border border-sky-300/25 bg-sky-500/14 px-4 py-3 text-sm font-black text-sky-50 disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
          >
            선택한 자원 가져가기
          </button>
        </div>
      </div>
    </div>
  );
}
