'use client';

import React from 'react';
import { BookOpenText, X } from 'lucide-react';
import { CASE_BRIEFING, GUIDE_STEPS } from '../shared/caseData';

export default function BeginnerGuide({ open = true, onClose, mode = 'overlay', className = '' }) {
  const content = (
    <div className={`panel overflow-hidden ${className}`.trim()}>
      <div className="flex items-start justify-between border-b border-white/10 px-4 py-4">
        <div>
          <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">규칙</div>
          <div className="mt-1 text-lg font-black text-white">사건 브리핑</div>
        </div>
        {mode !== 'inline' ? (
          <button
            type="button"
            onClick={onClose}
            className="tap-feedback rounded-2xl border border-white/10 bg-slate-900/52 p-2 text-slate-200"
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 px-4 py-4">
        <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 px-4 py-3 text-sm font-bold leading-6 text-amber-50">
          {CASE_BRIEFING.join(' ')}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {GUIDE_STEPS.map((step) => (
            <div key={step.title} className="rounded-2xl border border-white/10 bg-slate-900/46 px-3 py-3">
              <div className="text-sm font-black text-white">{step.title}</div>
              <div className="mt-1 text-sm font-bold text-slate-300">{step.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (mode === 'inline') return content;
  if (!open) return null;

  return (
    <div className="modal-layer">
      <button type="button" className="modal-scrim modal-dismiss" onClick={onClose} aria-label="규칙 닫기" />
      <div className="modal-panel modal-panel-compact max-w-xl" onClick={(event) => event.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}
