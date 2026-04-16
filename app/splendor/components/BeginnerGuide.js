'use client';

import React from 'react';
import { BookOpen, Search, ShieldAlert, X } from 'lucide-react';
import { CASE_BRIEFING, GUIDE_STEPS } from '../shared/caseData';

export default function BeginnerGuide({ open = true, onClose, mode = 'overlay', className = '' }) {
  const inner = (
    <div className={`panel motion-panel-in overflow-hidden ${className}`.trim()}>
      <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
        <div>
          <div className="text-xs font-black tracking-[0.18em] text-slate-400">사건 브리핑</div>
          <div className="mt-1 text-xl font-black text-white">입 다문 밤을 열어젖히는 법</div>
        </div>
        {mode !== 'lobby' ? (
          <button
            type="button"
            onClick={onClose}
            className="tap-feedback rounded-2xl border border-white/10 bg-slate-900/52 p-2 text-slate-200"
            aria-label="가이드 닫기"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>

      <div className="space-y-4 px-5 py-5">
        <div className="rounded-3xl border border-amber-300/16 bg-amber-500/10 px-4 py-4">
          <div className="flex items-center gap-2 text-sm font-black text-amber-100">
            <ShieldAlert size={16} />
            사건 개요
          </div>
          <div className="mt-3 space-y-2 text-sm font-bold leading-6 text-amber-50/90">
            {CASE_BRIEFING.map((line) => <p key={line}>{line}</p>)}
          </div>
        </div>

        <div className="grid gap-3">
          {GUIDE_STEPS.map((step, index) => (
            <div key={step.title} className="panel-soft px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-black text-white">
                {index === 0 ? <BookOpen size={16} className="text-sky-200" /> : <Search size={16} className="text-emerald-200" />}
                {step.title}
              </div>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-300">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (mode === 'lobby') return inner;
  if (!open) return null;

  return (
    <div className="modal-layer">
      <button type="button" className="modal-scrim modal-dismiss" onClick={onClose} aria-label="가이드 닫기" />
      <div className="modal-panel modal-panel-compact max-w-xl" onClick={(event) => event.stopPropagation()}>
        {inner}
      </div>
    </div>
  );
}
