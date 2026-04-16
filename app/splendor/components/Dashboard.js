'use client';

import React, { memo, useMemo } from 'react';
import { Archive, BookMarked, Gavel, Search, Send } from 'lucide-react';
import GemAsset from './GemAsset';
import { GEM_LABEL, RESOURCE_DESC } from '../shared/constants';
import { MOTIVES, METHODS, SUSPECTS } from '../shared/caseData';
import { buildNotebookSnapshot, canAccuse, getTotalResources, resolveCaseProgress } from '../shared/utils';

function ResourcePill({ color, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/58 px-2 py-2 text-center">
      <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5">
        <GemAsset color={color} className="h-5 w-5" />
      </div>
      <div className="mt-1 text-sm font-black text-white">{value}</div>
      <div className="mt-0.5 text-[10px] font-bold text-slate-400">{GEM_LABEL[color]}</div>
    </div>
  );
}

function SnapshotLine({ label, items = [] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/48 px-3 py-3">
      <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-black text-white">남은 후보 {items.length}</div>
      <div className="mt-2 text-xs font-bold leading-5 text-slate-300">{items.length ? items.join(', ') : '더는 남지 않았다.'}</div>
    </div>
  );
}

function DashboardImpl({
  myData,
  roomData,
  isMyTurn,
  lockUsed,
  pendingForMe,
  onOpenLeadModal,
  onOpenAccuse,
  onEndTurn,
}) {
  const notebook = myData?.notebook || { eliminatedSuspects: [], eliminatedMotives: [], eliminatedMethods: [], notes: [] };
  const snapshot = useMemo(() => buildNotebookSnapshot(notebook), [notebook]);
  const canAct = isMyTurn && !lockUsed && !pendingForMe;
  const accuseOpen = canAct && canAccuse(myData);
  const progress = resolveCaseProgress(myData || {});
  const clues = myData?.clues || myData?.cards || [];
  const witnesses = myData?.witnesses || myData?.nobles || [];
  const reservedCount = myData?.reservedLeads?.length || myData?.reserved?.length || myData?.reservedCount || 0;
  const latestNotes = Array.isArray(notebook?.notes) ? notebook.notes.slice(-2).reverse() : [];

  const remainingSuspects = snapshot.remainingSuspects.map((id) => SUSPECTS.find((entry) => entry.id === id)?.name || id);
  const remainingMotives = snapshot.remainingMotives.map((id) => MOTIVES.find((entry) => entry.id === id)?.label || id);
  const remainingMethods = snapshot.remainingMethods.map((id) => METHODS.find((entry) => entry.id === id)?.label || id);

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[460px] px-3 pb-3">
      <div className="panel motion-soft-in overflow-hidden border-white/12 bg-slate-950/88 backdrop-blur">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">수사 보드</div>
              <div className="mt-1 text-lg font-black text-white">내 수사판</div>
            </div>
            <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-right">
              <div className="text-[11px] font-black tracking-[0.16em] text-amber-100/80">사건 진척</div>
              <div className="mt-1 text-xl font-black text-amber-50">{progress}</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-black">
            <div className="rounded-2xl border border-white/10 bg-slate-900/48 px-3 py-2 text-slate-100">단서 {clues.length}</div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/48 px-3 py-2 text-slate-100">증언 {witnesses.length}</div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/48 px-3 py-2 text-slate-100">비공개 리드 {reservedCount}</div>
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="grid grid-cols-6 gap-2">
            {Object.entries(myData?.resources || myData?.gems || {}).map(([color, value]) => (
              <ResourcePill key={color} color={color} value={value} />
            ))}
          </div>
          <div className="mt-2 text-xs font-bold leading-5 text-slate-400">
            총 자원 {getTotalResources(myData?.resources || myData?.gems || {})} · 주요 색 하나가 늘면 관련 단서와 증언이 열린다.
          </div>
        </div>

        <div className="grid gap-3 px-4 pb-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <SnapshotLine label="용의자" items={remainingSuspects} />
            <SnapshotLine label="동기" items={remainingMotives} />
            <SnapshotLine label="수법" items={remainingMethods} />
          </div>

          {latestNotes.length ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/48 px-3 py-3">
              <div className="flex items-center gap-2 text-sm font-black text-white"><BookMarked size={15} /> 최근 메모</div>
              <div className="mt-2 space-y-2 text-xs font-bold leading-5 text-slate-300">
                {latestNotes.map((note) => <p key={note}>{note}</p>)}
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/10 bg-slate-900/48 px-3 py-3 text-xs font-bold leading-5 text-slate-300">
            {isMyTurn
              ? (pendingForMe
                ? '정리 단계가 열려 있다. 화면 위의 선택부터 끝내야 다음 턴으로 넘어간다.'
                : (lockUsed ? '메인 액션은 끝났다. 턴 정리만 하면 된다.' : '지금은 메인 액션을 한 번 고를 차례다.'))
              : '아직 다른 수사관이 움직이는 중이다.'}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onOpenLeadModal}
              disabled={!canAct}
              className="tap-feedback motion-cta min-h-12 rounded-2xl border border-sky-300/25 bg-sky-500/14 px-3 py-3 text-sm font-black text-sky-50 disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
            >
              <span className="inline-flex items-center gap-2"><Search size={15} /> 자원 확보</span>
            </button>
            <button
              type="button"
              onClick={onOpenAccuse}
              disabled={!accuseOpen}
              className="tap-feedback motion-cta min-h-12 rounded-2xl border border-rose-300/25 bg-rose-500/14 px-3 py-3 text-sm font-black text-rose-50 disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
            >
              <span className="inline-flex items-center gap-2"><Gavel size={15} /> 최종 고발</span>
            </button>
            <button
              type="button"
              onClick={onEndTurn}
              disabled={!isMyTurn || !!pendingForMe}
              className="tap-feedback motion-cta min-h-12 rounded-2xl border border-amber-300/25 bg-amber-500/14 px-3 py-3 text-sm font-black text-amber-50 disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
            >
              <span className="inline-flex items-center gap-2"><Send size={15} /> 턴 정리</span>
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/42 px-3 py-3 text-[11px] font-bold text-slate-400">
            <div className="flex items-center gap-2 text-slate-200"><Archive size={14} /> 조사 영역 요약</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {Object.keys(RESOURCE_DESC).map((color) => (
                <div key={color} className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2">
                  <div className="text-xs font-black text-white">{GEM_LABEL[color]}</div>
                  <div className="mt-1 text-[11px] font-bold leading-5 text-slate-400">{RESOURCE_DESC[color]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Dashboard = memo(DashboardImpl);
export default Dashboard;
