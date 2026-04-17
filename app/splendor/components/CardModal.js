'use client';

import React from 'react';
import { FilePlus2, PinOff, Search, X } from 'lucide-react';
import CardFace from './CardFace';

export default function CardModal({
  open,
  card,
  source,
  canTake,
  canToggleLead,
  onTake,
  onToggleLead,
  onClose,
}) {
  if (!open || !card) return null;

  const actionLabel = source === 'reserved' ? '고정 해제' : '리드 고정';

  return (
    <div className="modal-layer">
      <button type="button" className="modal-scrim modal-dismiss" onClick={onClose} aria-label="단서 닫기" />
      <div className="panel modal-panel max-w-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-white/10 px-4 py-4">
          <div>
            <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">단서 정보</div>
            <div className="mt-1 break-words text-lg font-black text-white">{card.title}</div>
          </div>
          <button type="button" onClick={onClose} className="tap-feedback rounded-2xl border border-white/10 bg-slate-900/55 p-2 text-slate-200">
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-4 px-4 py-4">
          <div className="mx-auto w-full max-w-[320px]">
            <CardFace card={card} />
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/44 px-4 py-4 text-sm font-bold leading-6 text-slate-200 break-words">
            {card.detail}
          </div>

          {(card.threads || []).length ? (
            <div className="rounded-3xl border border-white/10 bg-slate-950/44 px-4 py-4">
              <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">키워드</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {card.threads.map((thread) => (
                  <span key={thread} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-black text-white">
                    {thread}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {card.directiveLines?.length ? (
            <div className="rounded-3xl border border-white/10 bg-slate-950/44 px-4 py-4">
              <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">대조 시 반영</div>
              <div className="mt-3 grid gap-2 text-sm font-bold text-slate-200">
                {card.directiveLines.map((line) => (
                  <div key={line} className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2 break-words">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-2 border-t border-white/10 px-4 py-4 sm:grid-cols-2">
          {source === 'board' ? (
            <button
              type="button"
              onClick={() => canTake && onTake?.(card.id)}
              disabled={!canTake}
              className="tap-feedback min-h-12 rounded-2xl border border-emerald-300/25 bg-emerald-500/12 px-4 py-3 text-sm font-black text-emerald-50 disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-500"
            >
              <span className="inline-flex items-center gap-2 whitespace-normal"><Search size={15} /> 단서 확보</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => canToggleLead && onToggleLead?.(card.id)}
              disabled={!canToggleLead}
              className="tap-feedback min-h-12 rounded-2xl border border-amber-300/25 bg-amber-500/12 px-4 py-3 text-sm font-black text-amber-50 disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-500"
            >
              <span className="inline-flex items-center gap-2 whitespace-normal">{source === 'reserved' ? <PinOff size={15} /> : <FilePlus2 size={15} />}{actionLabel}</span>
            </button>
          )}

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
