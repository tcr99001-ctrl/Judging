'use client';

import React, { useMemo } from 'react';
import { AlertTriangle, BookMarked, Crosshair, Gavel, Pin, SkipForward } from 'lucide-react';
import GemAsset from './GemAsset';
import { COLORS, GEM_LABEL } from '../shared/constants';
import { buildNotebookSnapshot, canAccuse } from '../shared/utils';

function StatCard({ label, value }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-slate-950/50 px-3 py-3">
      <div className="text-[10px] font-black tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-black text-white">{value}</div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, disabled, onClick, tone = 'default' }) {
  const toneClass = tone === 'danger'
    ? 'border-rose-300/20 bg-rose-500/10 text-rose-50'
    : tone === 'primary'
      ? 'border-amber-300/20 bg-amber-500/10 text-amber-50'
      : 'border-white/10 bg-slate-950/54 text-slate-100';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`tap-feedback min-h-12 rounded-2xl border px-4 py-3 text-sm font-black leading-5 disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-500 ${toneClass}`}
    >
      <span className="inline-flex items-center gap-2 whitespace-normal break-words"><Icon size={15} /> {label}</span>
    </button>
  );
}

export default function Dashboard({
  myData,
  roomData,
  isMyTurn,
  actionUsed,
  canForceStaleSkip,
  onOpenLeadManager,
  onOpenCrosscheck,
  onOpenAccuse,
  onEndTurn,
  onForceStaleSkip,
}) {
  const snapshot = useMemo(() => buildNotebookSnapshot(myData?.notebook || {}), [myData?.notebook]);
  const accuseReady = canAccuse(myData || {}, roomData || {});

  return (
    <section className="panel p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">내 기록</div>
          <div className="mt-1 text-base font-black text-white">수첩과 행동</div>
        </div>
        <div className="rounded-full border border-white/10 bg-slate-950/46 px-2.5 py-1 text-[11px] font-black text-slate-200">
          진척 {myData?.caseProgress || 0}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="단서" value={myData?.clueCount || 0} />
        <StatCard label="리드" value={myData?.reservedLeads?.length || 0} />
        <StatCard label="대조" value={myData?.crosscheckPairs?.length || 0} />
        <StatCard label="추궁" value={myData?.witnessCount || 0} />
      </div>

      <div className="mt-3 rounded-[20px] border border-white/10 bg-slate-950/48 px-3 py-3">
        <div className="mb-2 text-[11px] font-black tracking-[0.16em] text-slate-400">남은 후보</div>
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="용의자" value={snapshot.remainingSuspects.length} />
          <StatCard label="동기" value={snapshot.remainingMotives.length} />
          <StatCard label="수법" value={snapshot.remainingMethods.length} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {COLORS.map((color) => (
            <div key={color} className="rounded-[18px] border border-white/8 bg-white/5 px-2 py-2 text-center">
              <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/60">
                <GemAsset color={color} className="h-4 w-4" />
              </div>
              <div className="mt-1 text-[10px] font-black text-slate-200">{GEM_LABEL[color]}</div>
              <div className="mt-0.5 text-xs font-black text-white">{myData?.lineProfile?.[color] || 0}</div>
            </div>
          ))}
        </div>
      </div>

      {snapshot.notes?.length ? (
        <div className="mt-3 rounded-[20px] border border-white/10 bg-slate-950/48 px-3 py-3 text-sm font-bold leading-6 text-slate-200">
          <div className="mb-2 text-[11px] font-black tracking-[0.16em] text-slate-400">최근 메모</div>
          <div className="grid max-h-28 gap-2 overflow-y-auto pr-1">
            {snapshot.notes.slice(-3).reverse().map((note) => (
              <div key={note} className="break-words rounded-[18px] border border-white/8 bg-white/5 px-3 py-2">{note}</div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ActionButton icon={Pin} label="리드 정리" disabled={!isMyTurn || actionUsed} onClick={onOpenLeadManager} />
        <ActionButton icon={Crosshair} label="기록 대조" disabled={!isMyTurn || actionUsed} onClick={onOpenCrosscheck} />
        <ActionButton icon={Gavel} label="고발" disabled={!isMyTurn || actionUsed || !accuseReady} onClick={onOpenAccuse} tone="danger" />
        <ActionButton icon={BookMarked} label="턴 종료" disabled={!isMyTurn} onClick={onEndTurn} tone="primary" />
      </div>

      {canForceStaleSkip ? (
        <button
          type="button"
          onClick={onForceStaleSkip}
          className="tap-feedback mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm font-black text-rose-50"
        >
          <SkipForward size={15} /> 차례 넘기기
        </button>
      ) : null}

      {!isMyTurn ? (
        <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/48 px-4 py-3 text-sm font-bold text-slate-300">
          <AlertTriangle size={15} className="text-amber-200" /> 지금은 상대 차례다.
        </div>
      ) : actionUsed ? (
        <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/48 px-4 py-3 text-sm font-bold text-slate-300">
          <AlertTriangle size={15} className="text-amber-200" /> 행동을 마쳤다. 턴을 넘기면 된다.
        </div>
      ) : null}
    </section>
  );
}
