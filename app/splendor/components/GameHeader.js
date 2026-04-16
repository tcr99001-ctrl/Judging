'use client';

import React from 'react';
import { BookOpenText, Copy, Eye, ShieldAlert } from 'lucide-react';
import { getDisplayName } from '../shared/utils';

function PlayerChip({ player, active, me, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'tap-feedback rounded-2xl border px-3 py-2 text-left',
        active ? 'border-amber-300/30 bg-amber-500/14 text-amber-50' : 'border-white/10 bg-slate-950/50 text-slate-100',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <span className="truncate text-sm font-black">{me ? '나' : getDisplayName(player)}</span>
        {player.accusationLocked ? <ShieldAlert size={14} className="text-rose-200" /> : null}
      </div>
      <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-black text-slate-300">
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">단서 {player.clueCount || 0}</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">추궁 {player.witnessCount || 0}</span>
      </div>
    </button>
  );
}

export default function GameHeader({
  roomData,
  roomCode,
  players,
  myId,
  currentPlayer,
  copyStatus,
  onCopyInvite,
  onToggleGuide,
  onOpenPlayer,
}) {
  const logs = Array.isArray(roomData?.log) ? roomData.log.slice(-3).reverse() : [];
  const threshold = Number(roomData?.accusationThreshold || 0);

  return (
    <header className="panel p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-black tracking-[0.22em] text-amber-200/80">사건 파일</div>
          <div className="mt-1 truncate text-lg font-black text-white">{roomData?.caseTitle}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-black text-slate-300">
            <span className="rounded-full border border-white/10 bg-slate-950/46 px-2.5 py-1">턴 {roomData?.turnNumber || 1}</span>
            <span className="rounded-full border border-white/10 bg-slate-950/46 px-2.5 py-1">현재 {getDisplayName(currentPlayer)}</span>
            <span className="rounded-full border border-white/10 bg-slate-950/46 px-2.5 py-1">고발선 {threshold}</span>
            <span className="rounded-full border border-white/10 bg-slate-950/46 px-2.5 py-1">방 {roomCode || '----'}</span>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onCopyInvite}
            className={[
              'tap-feedback rounded-2xl border px-3 py-2 text-sm font-black',
              copyStatus === 'copied'
                ? 'border-emerald-300/30 bg-emerald-500/14 text-emerald-50'
                : 'border-white/10 bg-slate-950/50 text-slate-100',
            ].join(' ')}
          >
            <span className="inline-flex items-center gap-2"><Copy size={14} /> {copyStatus === 'copied' ? '복사됨' : '복사'}</span>
          </button>
          <button
            type="button"
            onClick={onToggleGuide}
            className="tap-feedback rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm font-black text-slate-100"
          >
            <span className="inline-flex items-center gap-2"><BookOpenText size={14} /> 규칙</span>
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {players.map((player) => (
          <PlayerChip
            key={player.id}
            player={player}
            active={player.id === currentPlayer?.id}
            me={player.id === myId}
            onClick={player.id === myId ? undefined : () => onOpenPlayer?.(player)}
          />
        ))}
      </div>

      <div className="mt-3 rounded-3xl border border-white/10 bg-slate-950/40 px-3 py-3">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-black tracking-[0.18em] text-slate-400">
          <Eye size={14} /> 최근 기록
        </div>
        <div className="grid gap-1.5 text-sm font-bold text-slate-200">
          {logs.length ? logs.map((entry) => (
            <div key={entry.seq} className="line-clamp-2 rounded-2xl border border-white/8 bg-white/5 px-3 py-2">
              {entry.message}
            </div>
          )) : <div className="text-slate-500">기록 없음</div>}
        </div>
      </div>
    </header>
  );
}
