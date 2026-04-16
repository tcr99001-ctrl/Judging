'use client';

import React from 'react';
import { Archive, Search, X } from 'lucide-react';
import CardFace from './CardFace';
import { getClueAcquireDisplay, summarizeNotebookEffect } from '../shared/utils';

export default function CardModal({
  open,
  card,
  myData,
  isMyTurn,
  lockUsed,
  pendingForMe,
  onClose,
  onSecure,
  onPin,
}) {
  if (!open || !card) return null;

  const fromReserved = card.sourceType === 'reserved';
  const canSecure = isMyTurn && !lockUsed && !pendingForMe;
  const canPin = isMyTurn && !lockUsed && !pendingForMe && !fromReserved;
  const acquire = getClueAcquireDisplay(card, myData || {});
  const effectLines = card.effectLines?.length ? card.effectLines : summarizeNotebookEffect(card.effect);

  return (
    <div className="modal-layer">
      <button type="button" className="modal-scrim modal-dismiss" onClick={onClose} aria-label="단서 닫기" />
      <div className="panel modal-panel max-w-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-white/10 px-4 py-4">
          <div>
            <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">단서</div>
            <div className="mt-1 text-lg font-black text-white">{card.title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tap-feedback rounded-2xl border border-white/10 bg-slate-900/55 p-2 text-slate-200"
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-4 px-4 py-4">
          <div className="mx-auto w-[220px] max-w-full">
            <CardFace card={card} compact sourceLabel={fromReserved ? '비공개 리드' : '공개 보드'} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-900/46 px-4 py-3">
              <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">확보 상태</div>
              <div className="mt-2 text-sm font-bold text-white">{acquire.canAfford ? '지금 확보 가능' : '자원 부족'}</div>
              {!acquire.canAfford ? <div className="mt-1 text-sm font-bold text-rose-200">부족: {acquire.missingText}</div> : null}
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/46 px-4 py-3">
              <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">얻는 정보</div>
              <div className="mt-2 text-sm font-bold text-white">{effectLines?.[0] || '새로운 정리 없음'}</div>
            </div>
          </div>

          {card.detail ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/46 px-4 py-4 text-sm font-bold leading-6 text-slate-200">
              {card.detail}
            </div>
          ) : null}

          {effectLines?.length > 1 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/46 px-4 py-4 text-sm font-bold leading-6 text-slate-200">
              {effectLines.slice(1).map((line) => <div key={line}>{line}</div>)}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-2 border-t border-white/10 px-4 py-4 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => canPin && onPin?.(card)}
            disabled={!canPin}
            className="tap-feedback min-h-12 rounded-2xl border border-white/10 bg-slate-900/55 px-4 py-3 text-sm font-black text-slate-100 disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-500"
          >
            <span className="inline-flex items-center gap-2"><Archive size={15} /> 리드</span>
          </button>
          <button
            type="button"
            onClick={() => canSecure && onSecure?.(card, fromReserved)}
            disabled={!canSecure || !acquire.canAfford}
            className="tap-feedback min-h-12 rounded-2xl border border-amber-300/25 bg-amber-500/12 px-4 py-3 text-sm font-black text-amber-50 disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-500"
          >
            <span className="inline-flex items-center gap-2"><Search size={15} /> 확보</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="tap-feedback min-h-12 rounded-2xl border border-white/10 bg-slate-900/55 px-4 py-3 text-sm font-black text-slate-100"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
