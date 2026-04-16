'use client';

import React, { memo, useMemo } from 'react';
import { AlertTriangle, BookOpenText, Copy, Gavel, Shield, Users } from 'lucide-react';
import { ACCUSATION_THRESHOLD, CASE_TITLE } from '../shared/constants';
import { getDisplayName } from '../shared/utils';

function Pill({ children, tone = 'default' }) {
  const toneClass = {
    default: 'border-white/10 bg-slate-900/50 text-slate-200',
    amber: 'border-amber-300/25 bg-amber-500/12 text-amber-50',
    rose: 'border-rose-300/25 bg-rose-500/12 text-rose-50',
    emerald: 'border-emerald-300/25 bg-emerald-500/12 text-emerald-50',
    sky: 'border-sky-300/25 bg-sky-500/12 text-sky-50',
  }[tone] || 'border-white/10 bg-slate-900/50 text-slate-200';

  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black ${toneClass}`}>{children}</span>;
}

function PlayerChip({ player, active, me, onOpenOpponent }) {
  return (
    <button
      type="button"
      onClick={() => onOpenOpponent?.(player)}
      className={[
        'tap-feedback min-w-[88px] rounded-2xl border px-3 py-2 text-left',
        active ? 'border-amber-300/30 bg-amber-500/12' : 'border-white/10 bg-slate-900/45',
      ].join(' ')}
    >
      <div className="truncate text-sm font-black text-white">
        {getDisplayName(player)}
        {me ? <span className="ml-1 text-amber-200">나</span> : null}
      </div>
      <div className="mt-1 text-[11px] font-bold text-slate-400">{player.isBot ? '기록관' : '수사관'}</div>
    </button>
  );
}

function GameHeaderImpl({
  roomCode,
  roomData,
  players,
  userId,
  copyStatus,
  onCopyInvite,
  onOpenOpponent,
  isGuideOpen,
  onToggleGuide,
  canForceStaleSkip,
  onForceStaleSkip,
  staleTargetName,
}) {
  const currentId = roomData?.turnOrder?.[roomData?.turnIndex] || null;
  const currentPlayer = players.find((player) => player.id === currentId) || null;
  const logs = Array.isArray(roomData?.log) ? roomData.log.slice(-3).reverse() : [];

  const orderedPlayers = useMemo(() => {
    const order = Array.isArray(roomData?.turnOrder) && roomData.turnOrder.length
      ? roomData.turnOrder
      : Array.isArray(roomData?.lobbyPlayerIds)
        ? roomData.lobbyPlayerIds
        : players.map((player) => player.id);
    const byId = new Map(players.map((player) => [player.id, player]));
    return order.map((id) => byId.get(id)).filter(Boolean);
  }, [players, roomData?.lobbyPlayerIds, roomData?.turnOrder]);

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-white/8 bg-slate-950/72 backdrop-blur-md">
      <div className="mx-auto max-w-[480px] px-3 pb-3 pt-2">
        <div className="panel-soft px-3 py-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-black text-white">{roomData?.caseTitle || CASE_TITLE}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Pill tone="sky">턴 {roomData?.turnNumber || 1}</Pill>
                <Pill tone={roomData?.status === 'final_round' ? 'rose' : 'default'}>
                  {currentPlayer ? `${getDisplayName(currentPlayer)} 차례` : '차례 정리'}
                </Pill>
                <Pill tone="amber">고발선 {roomData?.accusationThreshold || ACCUSATION_THRESHOLD}</Pill>
                {roomData?.status === 'final_round' ? <Pill tone="rose">마지막 라운드</Pill> : null}
                {roomData?.winnerId ? <Pill tone="emerald">사건 종결</Pill> : null}
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={onToggleGuide}
                className={[
                  'tap-feedback flex h-11 w-11 items-center justify-center rounded-2xl border',
                  isGuideOpen ? 'border-sky-300/25 bg-sky-500/12 text-sky-50' : 'border-white/10 bg-slate-900/50 text-slate-200',
                ].join(' ')}
                aria-label="규칙"
              >
                <BookOpenText size={16} />
              </button>
              <button
                type="button"
                onClick={onCopyInvite}
                className={[
                  'tap-feedback rounded-2xl border px-3 py-2 text-sm font-black',
                  copyStatus === 'copied'
                    ? 'border-emerald-300/30 bg-emerald-500/12 text-emerald-50'
                    : 'border-white/10 bg-slate-900/50 text-slate-100',
                ].join(' ')}
              >
                <span className="inline-flex items-center gap-2"><Copy size={14} /> {roomCode || '----'}</span>
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            {logs.length ? logs.map((entry) => (
              <div key={entry.seq || `${entry.ts}_${entry.message}`} className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2 text-sm font-bold text-slate-200">
                {entry.message}
              </div>
            )) : (
              <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2 text-sm font-bold text-slate-400">
                아직 기록이 없다.
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 scroll-strip-x">
          <div className="flex min-w-max gap-2 pb-1">
            {orderedPlayers.map((player) => (
              <PlayerChip
                key={player.id}
                player={player}
                active={player.id === currentId}
                me={player.id === userId}
                onOpenOpponent={onOpenOpponent}
              />
            ))}
          </div>
        </div>

        {canForceStaleSkip ? (
          <button
            type="button"
            onClick={onForceStaleSkip}
            className="tap-feedback mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-300/25 bg-rose-500/12 px-4 py-3 text-sm font-black text-rose-50"
          >
            <AlertTriangle size={16} />
            {staleTargetName ? `${staleTargetName} 정리` : '오래 빈 턴 정리'}
          </button>
        ) : null}
      </div>
    </header>
  );
}

const GameHeader = memo(GameHeaderImpl);
export default GameHeader;
