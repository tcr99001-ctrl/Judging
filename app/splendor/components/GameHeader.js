'use client';

import React from 'react';
import { BookOpenText, Copy, ShieldAlert } from 'lucide-react';
import AssetImage from './AssetImage';
import { UI_ASSET } from '../shared/assets';
import { getDisplayName } from '../shared/utils';

function PlayerChip({ player, active, me, onClick }) {
  const content = (
    <>
      <div className="flex items-center gap-2">
        <span className="truncate text-sm font-black">{me ? '나' : getDisplayName(player)}</span>
        {player.accusationLocked ? <ShieldAlert size={14} className="text-[#d59684]" /> : null}
      </div>
      <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-black text-[#d0c0ab]">
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">단서 {player.clueCount || 0}</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">추궁 {player.witnessCount || 0}</span>
      </div>
    </>
  );

  const className = [
    'rounded-2xl border px-3 py-2 text-left',
    active ? 'border-[#866a54] bg-[#45362d] text-[#f6ebd8]' : 'border-[#5a473c] bg-[#211b17] text-[#f2e7d3]',
  ].join(' ');

  if (!onClick) return <div className={className}>{content}</div>;
  return <button type="button" onClick={onClick} className={`tap-feedback ${className}`}>{content}</button>;
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
    <header className="panel p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="shrink-0 rounded-[20px] border border-[#675243]/40 bg-[#18130f] p-2.5">
            <AssetImage src={UI_ASSET.caseSeal} className="h-10 w-10" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-black tracking-[0.22em] text-[#c7ae84]">사건 파일</div>
            <div className="mt-1 break-words text-lg font-black text-[#f7efe3]">{roomData?.caseTitle}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-black text-[#d3c4b1]">
              <span className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1">턴 {roomData?.turnNumber || 1}</span>
              <span className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1">현재 {getDisplayName(currentPlayer)}</span>
              <span className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1">고발선 {threshold}</span>
              <span className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1">방 {roomCode || '----'}</span>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          <button
            type="button"
            onClick={onCopyInvite}
            className={[
              'tap-feedback min-h-11 rounded-2xl border px-3 py-2 text-sm font-black',
              copyStatus === 'copied'
                ? 'border-[#7c8f73]/35 bg-[#7c8f73]/14 text-[#eef5e6]'
                : 'border-white/10 bg-black/10 text-[#f0e4d0]',
            ].join(' ')}
          >
            <span className="inline-flex items-center gap-2 whitespace-normal"><Copy size={14} /> {copyStatus === 'copied' ? '복사됨' : '초대 링크'}</span>
          </button>
          <button
            type="button"
            onClick={onToggleGuide}
            className="tap-feedback min-h-11 rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm font-black text-[#f0e4d0]"
          >
            <span className="inline-flex items-center gap-2 whitespace-normal"><BookOpenText size={14} /> 규칙</span>
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
            onClick={player.id === myId ? null : () => onOpenPlayer?.(player)}
          />
        ))}
      </div>

      <div className="mt-3 rounded-3xl border border-white/10 bg-black/10 px-3 py-3">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-black tracking-[0.18em] text-[#baa691]">
          <AssetImage src={UI_ASSET.logPin} className="h-4 w-4" /> 최근
        </div>
        <div className="grid max-h-32 gap-1.5 overflow-y-auto pr-1 text-sm font-bold text-[#ecdfca]">
          {logs.length ? logs.map((entry) => (
            <div key={entry.seq} className="break-words rounded-2xl border border-white/8 bg-black/10 px-3 py-2">
              {entry.message}
            </div>
          )) : <div className="text-[#8f7b6b]">기록 없음</div>}
        </div>
      </div>
    </header>
  );
}
