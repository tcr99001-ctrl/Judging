'use client';

import React, { memo } from 'react';
import { AlertTriangle, Archive, Gavel, Search, Send } from 'lucide-react';
import GemAsset from './GemAsset';
import { useFX } from '../fx/FXProvider';
import { ALL, GEM_LABEL } from '../shared/constants';
import { canAccuse, getDisplayName, getTotalResources, resolveCaseProgress } from '../shared/utils';

function ResourcePill({ color, value, anchorRef }) {
  return (
    <div ref={anchorRef} className="rounded-2xl border border-white/10 bg-slate-950/55 px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        <GemAsset color={color} className="h-4.5 w-4.5" />
        <span className="text-[11px] font-black text-slate-300">{GEM_LABEL[color]}</span>
      </div>
      <div className="mt-1 text-sm font-black text-white">{value}</div>
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
  const fx = useFX();
  const resources = myData?.resources || myData?.gems || {};
  const reservedCount = myData?.reservedCount || (myData?.reservedLeads || myData?.reserved || []).length || 0;
  const accuseReady = canAccuse(myData || {});
  const currentId = roomData?.turnOrder?.[roomData?.turnIndex] || null;
  const currentPlayer = currentId ? roomData?.turnOrder?.includes(currentId) : false;

  let statusText = '대기 중';
  if (pendingForMe && roomData?.pending?.type === 'discard') statusText = '자원 정리';
  else if (pendingForMe && roomData?.pending?.type === 'witness') statusText = '추궁 선택';
  else if (isMyTurn && lockUsed) statusText = '턴 종료 대기';
  else if (isMyTurn) statusText = '내 차례';
  else statusText = '상대 차례';

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(var(--safe-bottom)+12px)]">
      <div className="mx-auto max-w-[480px]">
        <div className="panel pointer-events-auto overflow-hidden border-white/12 bg-slate-950/80 backdrop-blur-md">
          <div className="grid gap-3 px-3 py-3">
            <div className="flex items-center gap-2">
              <div ref={fx?.anchorRef?.(`hud:${myData?.id || 'ME'}`)} className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="truncate text-sm font-black text-white">{getDisplayName(myData)}</div>
                <div className="mt-1 text-[11px] font-bold text-slate-400">{statusText}</div>
              </div>
              <div ref={fx?.anchorRef?.(`hudScore:${myData?.id || 'ME'}`)} className="rounded-2xl border border-amber-300/25 bg-amber-500/12 px-3 py-2 text-center">
                <div className="text-[11px] font-black tracking-[0.16em] text-amber-100">진척</div>
                <div className="mt-1 text-lg font-black text-white">{resolveCaseProgress(myData || {})}</div>
              </div>
            </div>

            <div ref={fx?.anchorRef?.('bank:center')} className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {ALL.map((color) => (
                <ResourcePill key={color} color={color} value={resources?.[color] || 0} anchorRef={fx?.anchorRef?.(`bank:${color}`)} />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] font-black text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-center">단서 {(myData?.clues || myData?.cards || []).length}</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-center">리드 {reservedCount}</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-center">추궁 {(myData?.witnesses || myData?.nobles || []).length}</div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={onOpenLeadModal}
                disabled={!isMyTurn || lockUsed || !!pendingForMe}
                className="tap-feedback min-h-12 rounded-2xl border border-sky-300/25 bg-sky-500/12 px-3 py-3 text-sm font-black text-sky-50 disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-500"
              >
                <span className="inline-flex items-center gap-2"><Search size={15} /> 자원</span>
              </button>
              <button
                type="button"
                onClick={onOpenAccuse}
                disabled={!accuseReady || !!pendingForMe}
                className="tap-feedback min-h-12 rounded-2xl border border-rose-300/25 bg-rose-500/12 px-3 py-3 text-sm font-black text-rose-50 disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-500"
              >
                <span className="inline-flex items-center gap-2"><Gavel size={15} /> 고발</span>
              </button>
              <button
                type="button"
                onClick={onEndTurn}
                disabled={!isMyTurn || !!pendingForMe}
                className="tap-feedback min-h-12 rounded-2xl border border-amber-300/25 bg-amber-500/12 px-3 py-3 text-sm font-black text-amber-50 disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-500"
              >
                <span className="inline-flex items-center gap-2"><Send size={15} /> 턴 종료</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Dashboard = memo(DashboardImpl);
export default Dashboard;
