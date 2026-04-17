'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Crosshair, X } from 'lucide-react';
import CardFace from '../components/CardFace';
import { getAvailableCrosschecks, pairKey } from '../shared/utils';

export default function GemModal({ open, myData, onClose, onConfirm }) {
  const [selected, setSelected] = useState([]);
  const pairs = useMemo(() => getAvailableCrosschecks(myData || {}), [myData]);
  const clues = useMemo(() => {
    const map = new Map();
    [...(myData?.privateClues || []), ...(myData?.reservedLeads || [])].forEach((card) => {
      if (card?.id) map.set(card.id, card);
    });
    return [...map.values()];
  }, [myData?.privateClues, myData?.reservedLeads]);

  useEffect(() => {
    if (!open) setSelected([]);
  }, [open]);

  if (!open) return null;

  const toggle = (id) => {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 2) return [current[1], id];
      return [...current, id];
    });
  };

  const selectedPair = selected.length === 2 ? pairs.find((item) => item.key === pairKey(selected[0], selected[1])) : null;

  return (
    <div className="modal-layer">
      <button type="button" className="modal-scrim modal-dismiss" onClick={onClose} aria-label="대조 닫기" />
      <div className="panel modal-panel max-w-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between border-b border-white/10 px-4 py-4">
          <div>
            <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">기록 대조</div>
            <div className="mt-1 text-lg font-black text-white">단서 두 장 선택</div>
          </div>
          <button type="button" onClick={onClose} className="tap-feedback rounded-2xl border border-white/10 bg-slate-900/55 p-2 text-slate-200">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-4 py-4">
          <div className="grid gap-4">
            {selectedPair ? (
              <div className="rounded-[20px] border border-emerald-300/18 bg-emerald-500/10 px-4 py-4 text-sm font-bold text-emerald-50 break-words">
                공통 키워드: {selectedPair.sharedThreads.join(' · ')}
              </div>
            ) : (
              <div className="rounded-[20px] border border-white/10 bg-slate-950/44 px-4 py-4 text-sm font-bold text-slate-300">
                같은 키워드가 있는 두 장을 고른다.
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {clues.map((card) => {
                const active = selected.includes(card.id);
                const selectable = selected.length < 2 || active;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => selectable && toggle(card.id)}
                    className="tap-feedback text-left"
                  >
                    <CardFace card={card} className={active ? 'ring-2 ring-amber-300/60' : ''} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid shrink-0 gap-2 border-t border-white/10 px-4 py-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => selectedPair && onConfirm?.({ aId: selectedPair.a.id, bId: selectedPair.b.id })}
            disabled={!selectedPair}
            className="tap-feedback min-h-12 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-50 disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-500"
          >
            <span className="inline-flex items-center gap-2 whitespace-normal"><Crosshair size={15} /> 대조</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="tap-feedback min-h-12 rounded-2xl border border-white/10 bg-slate-950/54 px-4 py-3 text-sm font-black text-slate-100"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
