'use client';

import React from 'react';
import { Pin, PinOff, X } from 'lucide-react';
import CardFace from '../components/CardFace';

export default function DiscardModal({ open, myData, actionUsed, onClose, onToggleLead }) {
  if (!open) return null;
  const privateClues = Array.isArray(myData?.privateClues) ? myData.privateClues : [];
  const pinnedIds = new Set((myData?.reservedLeads || []).map((card) => card.id));
  const full = (myData?.reservedLeads || []).length >= 3;

  return (
    <div className="modal-layer">
      <button type="button" className="modal-scrim modal-dismiss" onClick={onClose} aria-label="정리 닫기" />
      <div className="panel modal-panel max-w-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-white/10 px-4 py-4">
          <div>
            <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">리드 정리</div>
            <div className="mt-1 text-lg font-black text-white">내 단서</div>
          </div>
          <button type="button" onClick={onClose} className="tap-feedback rounded-2xl border border-white/10 bg-slate-900/55 p-2 text-slate-200">
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-3 px-4 py-4">
          {privateClues.length ? privateClues.map((card) => {
            const pinned = pinnedIds.has(card.id);
            return (
              <div key={card.id} className="rounded-[28px] border border-white/10 bg-slate-950/42 p-3">
                <div className="grid gap-3 sm:grid-cols-[140px_1fr_auto] sm:items-center">
                  <CardFace card={card} size="mini" />
                  <div>
                    <div className="text-sm font-black text-white">{card.title}</div>
                    <div className="mt-2 text-sm font-bold leading-6 text-slate-300">{card.summary}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(card.threads || []).map((thread) => (
                        <span key={thread} className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-black text-slate-200">{thread}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => !actionUsed && !(full && !pinned) && onToggleLead?.(card.id)}
                    disabled={actionUsed || (full && !pinned)}
                    className="tap-feedback min-h-12 rounded-2xl border border-amber-300/25 bg-amber-500/12 px-4 py-3 text-sm font-black text-amber-50 disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-500"
                  >
                    <span className="inline-flex items-center gap-2">{pinned ? <PinOff size={15} /> : <Pin size={15} />} {pinned ? '해제' : '고정'}</span>
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/30 px-4 py-8 text-center text-sm font-black text-slate-400">
              아직 단서가 없다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
