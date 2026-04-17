'use client';

import React from 'react';
import { X } from 'lucide-react';
import { CASE_BRIEFING, GUIDE_STEPS } from '../shared/caseData';

export default function BeginnerGuide({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="modal-layer">
      <button type="button" className="modal-scrim modal-dismiss" onClick={onClose} aria-label="안내 닫기" />
      <div className="panel modal-panel max-w-lg" onClick={(event) => event.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between border-b border-white/10 px-4 py-4">
          <div>
            <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">안내</div>
            <div className="mt-1 break-words text-lg font-black text-white">사건 개요</div>
          </div>
          <button type="button" onClick={onClose} className="tap-feedback rounded-2xl border border-white/10 bg-slate-900/55 p-2 text-slate-200">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-4 py-4">
          <div className="rounded-[20px] border border-white/10 bg-slate-950/44 px-4 py-4 text-sm font-bold leading-6 text-slate-200">
            {CASE_BRIEFING.join(' ')}
          </div>

          <div className="mt-4 grid gap-3">
            {GUIDE_STEPS.map((step) => (
              <div key={step.title} className="rounded-[20px] border border-white/10 bg-slate-950/44 px-4 py-4">
                <div className="text-sm font-black text-white">{step.title}</div>
                <div className="mt-2 break-words text-sm font-bold leading-6 text-slate-300">{step.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
