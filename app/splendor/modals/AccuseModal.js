'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Gavel, X } from 'lucide-react';
import { MOTIVES, METHODS, SUSPECTS } from '../shared/caseData';
import { buildNotebookSnapshot, canAccuse } from '../shared/utils';

function ChoiceButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'tap-feedback rounded-2xl border px-3 py-3 text-left text-sm font-black',
        active ? 'border-rose-300/25 bg-rose-500/12 text-rose-50' : 'border-white/10 bg-slate-900/46 text-slate-200',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function Group({ title, items, activeId, onPick }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/44 px-4 py-4">
      <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">{title}</div>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <ChoiceButton
            key={item.id}
            label={item.name || item.label}
            active={activeId === item.id}
            onClick={() => onPick(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default function AccuseModal({ open, myData, onClose, onSubmit }) {
  const snapshot = useMemo(() => buildNotebookSnapshot(myData?.notebook || {}), [myData?.notebook]);
  const accuseable = canAccuse(myData || {});
  const [culpritId, setCulpritId] = useState('');
  const [motiveId, setMotiveId] = useState('');
  const [methodId, setMethodId] = useState('');

  useEffect(() => {
    if (!open) return;
    setCulpritId((current) => current || snapshot.remainingSuspects[0] || '');
    setMotiveId((current) => current || snapshot.remainingMotives[0] || '');
    setMethodId((current) => current || snapshot.remainingMethods[0] || '');
  }, [open, snapshot.remainingMethods, snapshot.remainingMotives, snapshot.remainingSuspects]);

  if (!open) return null;

  const submitEnabled = accuseable && culpritId && motiveId && methodId;

  return (
    <div className="modal-layer">
      <button type="button" className="modal-scrim modal-dismiss" onClick={onClose} aria-label="고발 닫기" />
      <div className="panel modal-panel max-w-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-white/10 px-4 py-4">
          <div>
            <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">최종 고발</div>
            <div className="mt-1 text-lg font-black text-white">범인, 동기, 수법</div>
          </div>
          <button type="button" onClick={onClose} className="tap-feedback rounded-2xl border border-white/10 bg-slate-900/55 p-2 text-slate-200">
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-4 px-4 py-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/10 bg-slate-900/46 px-3 py-3 text-center">
              <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">용의자</div>
              <div className="mt-2 text-sm font-black text-white">{snapshot.remainingSuspects.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/46 px-3 py-3 text-center">
              <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">동기</div>
              <div className="mt-2 text-sm font-black text-white">{snapshot.remainingMotives.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/46 px-3 py-3 text-center">
              <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">수법</div>
              <div className="mt-2 text-sm font-black text-white">{snapshot.remainingMethods.length}</div>
            </div>
          </div>

          <Group title="범인" items={SUSPECTS.map((item) => ({ ...item, label: item.name }))} activeId={culpritId} onPick={setCulpritId} />
          <Group title="동기" items={MOTIVES} activeId={motiveId} onPick={setMotiveId} />
          <Group title="수법" items={METHODS} activeId={methodId} onPick={setMethodId} />

          {Array.isArray(snapshot.notes) && snapshot.notes.length ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/46 px-4 py-4 text-sm font-bold leading-6 text-slate-200">
              {snapshot.notes.slice(-3).reverse().map((note) => <div key={note}>{note}</div>)}
            </div>
          ) : null}
        </div>

        <div className="grid gap-2 border-t border-white/10 px-4 py-4 sm:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/46 px-4 py-3 text-sm font-bold text-slate-300">
            <AlertTriangle size={15} className="text-amber-200" /> 한 번 던지면 되돌릴 수 없다.
          </div>
          <button
            type="button"
            onClick={() => submitEnabled && onSubmit?.({ culpritId, motiveId, methodId })}
            disabled={!submitEnabled}
            className="tap-feedback min-h-12 rounded-2xl border border-rose-300/25 bg-rose-500/12 px-5 py-3 text-sm font-black text-rose-50 disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-500"
          >
            <span className="inline-flex items-center gap-2"><Gavel size={15} /> 고발</span>
          </button>
        </div>
      </div>
    </div>
  );
}
