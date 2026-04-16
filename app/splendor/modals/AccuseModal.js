'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Gavel, X } from 'lucide-react';
import { MOTIVES, METHODS, SUSPECTS } from '../shared/caseData';
import { buildNotebookSnapshot, canAccuse } from '../shared/utils';

function ChoicePill({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'tap-feedback rounded-2xl border px-3 py-3 text-left text-sm font-black transition',
        active ? 'border-rose-300/28 bg-rose-500/12 text-rose-50' : 'border-white/10 bg-slate-900/44 text-slate-200',
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
          <ChoicePill key={item.id} label={item.name || item.label} active={activeId === item.id} onClick={() => onPick(item.id)} />
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
      <button type="button" className="modal-scrim modal-dismiss" onClick={onClose} aria-label="최종 고발 닫기" />
      <div className="panel modal-panel max-w-4xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">최종 고발</div>
            <div className="mt-1 text-lg font-black text-white">최종 고발</div>
            <div className="mt-2 text-sm font-bold leading-6 text-slate-300">범인, 동기, 수법을 모두 지목한다. 맞히면 즉시 사건이 끝나고, 틀리면 다시는 고발할 수 없다.</div>
          </div>
          <button type="button" onClick={onClose} className="tap-feedback rounded-2xl border border-white/10 bg-slate-900/55 p-2 text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_1.05fr]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-amber-300/20 bg-amber-500/10 px-4 py-4 text-sm font-bold leading-6 text-amber-50">
              남긴 후보가 적을수록 맞힐 확률은 올라간다. 그래도 마지막엔 감이 아니라 정리된 모순으로 눌러야 한다.
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-900/46 px-3 py-3">
                <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">남은 용의자</div>
                <div className="mt-2 text-sm font-black text-white">{snapshot.remainingSuspects.length}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/46 px-3 py-3">
                <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">남은 동기</div>
                <div className="mt-2 text-sm font-black text-white">{snapshot.remainingMotives.length}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/46 px-3 py-3">
                <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">남은 수법</div>
                <div className="mt-2 text-sm font-black text-white">{snapshot.remainingMethods.length}</div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/46 px-4 py-4 text-sm font-bold leading-6 text-slate-300">
              {Array.isArray(myData?.notebook?.notes) && myData.notebook.notes.length
                ? myData.notebook.notes.slice(-3).reverse().map((note) => <p key={note}>{note}</p>)
                : '아직 수첩에 적힌 정리 메모가 적다. 단서나 증언을 조금 더 모아도 된다.'}
            </div>
          </div>

          <div className="space-y-4">
            <Group title="범인" items={SUSPECTS.map((item) => ({ ...item, label: item.name }))} activeId={culpritId} onPick={setCulpritId} />
            <Group title="동기" items={MOTIVES} activeId={motiveId} onPick={setMotiveId} />
            <Group title="수법" items={METHODS} activeId={methodId} onPick={setMethodId} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-white/10 px-5 py-4 sm:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/44 px-4 py-3 text-sm font-bold text-slate-300">
            <AlertTriangle size={16} className="text-amber-200" />
            최종 고발은 한 번뿐이다. 이 선택은 되돌릴 수 없다.
          </div>
          <button
            type="button"
            onClick={() => submitEnabled && onSubmit?.({ culpritId, motiveId, methodId })}
            disabled={!submitEnabled}
            className="tap-feedback motion-cta min-h-12 rounded-2xl border border-rose-300/28 bg-rose-500/14 px-5 py-3 text-sm font-black text-rose-50 disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
          >
            <span className="inline-flex items-center gap-2"><Gavel size={15} /> 이 조합으로 고발</span>
          </button>
        </div>
      </div>
    </div>
  );
}
