'use client';

import React from 'react';
import { LockKeyhole, Search, X } from 'lucide-react';
import CardFace from './CardFace';
import { GEM_LABEL } from '../shared/constants';
import { formatResourceList, getClueAcquireDisplay, summarizeNotebookEffect } from '../shared/utils';

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

  const sourceType = card.sourceType || 'board';
  const canPin = isMyTurn && !lockUsed && !pendingForMe && sourceType === 'board';
  const canSecure = isMyTurn && !lockUsed && !pendingForMe;
  const purchase = getClueAcquireDisplay(card, myData || {});
  const effectLines = card.effectLines?.length ? card.effectLines : summarizeNotebookEffect(card.effect);

  return (
    <div className="modal-layer">
      <button type="button" className="modal-scrim modal-dismiss" onClick={onClose} aria-label="단서 닫기" />
      <div className="panel modal-panel modal-panel-card max-w-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-xs font-black tracking-[0.16em] text-slate-400">단서 상세</div>
            <div className="mt-1 text-lg font-black text-white">{card.title}</div>
          </div>
          <button type="button" onClick={onClose} className="tap-feedback rounded-2xl border border-white/10 bg-slate-900/52 p-2 text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 px-5 py-5 sm:grid-cols-[148px_minmax(0,1fr)]">
          <CardFace card={card} compact sourceLabel={sourceType === 'reserved' ? '비공개 리드' : '공개 단서'} />
          <div className="min-w-0 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-900/42 px-4 py-3 text-sm font-bold leading-6 text-slate-200">
              {card.detail}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="panel-soft px-4 py-3">
                <div className="text-xs font-black tracking-[0.16em] text-slate-400">확보 비용</div>
                <div className="mt-2 text-sm font-black text-white">{formatResourceList(card.cost) || '비용 없음'}</div>
              </div>
              <div className="panel-soft px-4 py-3">
                <div className="text-xs font-black tracking-[0.16em] text-slate-400">확보 가능 여부</div>
                <div className="mt-2 text-sm font-black text-white">{purchase.canAfford ? '지금 바로 가능' : `부족: ${purchase.missingText}`}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-300/18 bg-amber-500/10 px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-black text-amber-100">
                <Search size={16} /> 수첩 정리 효과
              </div>
              <div className="mt-3 space-y-2 text-sm font-bold text-amber-50/90">
                {effectLines?.length ? effectLines.map((line) => <p key={line}>{line}</p>) : <p>이번 카드에는 직접적인 제거 정보가 없다.</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/42 px-4 py-4">
              <div className="text-sm font-black text-white">얻게 되는 통찰</div>
              <div className="mt-2 text-sm font-bold text-slate-300">이 단서를 확보하면 {GEM_LABEL[card.insight || card.bonus]} 조사 특성이 늘어난다. 이후 더 무거운 단서와 증언을 여는 발판이 된다.</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-white/10 px-5 py-4 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => canSecure && onSecure?.(card, sourceType === 'reserved')}
            disabled={!canSecure}
            className="tap-feedback motion-cta min-h-12 rounded-2xl border border-emerald-300/25 bg-emerald-500/16 px-4 py-3 text-sm font-black text-emerald-50 disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
          >
            단서 확보
          </button>
          <button
            type="button"
            onClick={() => canPin && onPin?.(card)}
            disabled={!canPin}
            className="tap-feedback motion-cta min-h-12 rounded-2xl border border-amber-300/25 bg-amber-500/16 px-4 py-3 text-sm font-black text-amber-50 disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
          >
            <span className="inline-flex items-center gap-2"><LockKeyhole size={15} /> 비공개 리드로 고정</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="tap-feedback min-h-12 rounded-2xl border border-white/10 bg-slate-900/58 px-4 py-3 text-sm font-black text-slate-200"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
