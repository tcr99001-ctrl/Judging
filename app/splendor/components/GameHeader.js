'use client';

import React, { memo, useMemo } from 'react';
import {
  AlertTriangle,
  BookOpenText,
  Crown,
  Gavel,
  Link2,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { ACCUSATION_THRESHOLD, CASE_TITLE } from '../shared/constants';
import { getDisplayName, getTotalResources, resolveCaseProgress } from '../shared/utils';

function HeaderPill({ tone = 'default', children }) {
  const toneClass = {
    default: 'border-white/10 bg-slate-900/52 text-slate-300',
    amber: 'border-amber-300/24 bg-amber-500/12 text-amber-50',
    sky: 'border-sky-300/24 bg-sky-500/12 text-sky-50',
    rose: 'border-rose-300/24 bg-rose-500/12 text-rose-50',
    emerald: 'border-emerald-300/24 bg-emerald-500/12 text-emerald-50',
  }[tone] || 'border-white/10 bg-slate-900/52 text-slate-300';

  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black ${toneClass}`}>{children}</span>;
}

function InvestigatorChip({ player, isCurrent, isMe, onOpenOpponent }) {
  const progress = resolveCaseProgress(player);
  return (
    <button
      type="button"
      onClick={() => onOpenOpponent?.(player)}
      className={[
        'tap-feedback relative min-h-[72px] min-w-[112px] rounded-3xl border px-3 py-3 text-left',
        isCurrent ? 'border-amber-300/35 bg-amber-500/12' : 'border-white/10 bg-slate-900/45',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-white">
            {getDisplayName(player)}
            {isMe ? <span className="ml-1 text-amber-200">나</span> : null}
          </div>
          <div className="mt-1 text-[11px] font-bold text-slate-400">{player.isBot ? '자동기록관' : '수사관'}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-2 py-1 text-xs font-black text-white">
          {progress}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-black text-slate-300">
        <div className="rounded-2xl border border-white/8 bg-white/5 px-2 py-1 text-center">자원 {getTotalResources(player.resources || player.gems)}</div>
        <div className="rounded-2xl border border-white/8 bg-white/5 px-2 py-1 text-center">단서 {(player.clues || player.cards || []).length}</div>
        <div className="rounded-2xl border border-white/8 bg-white/5 px-2 py-1 text-center">증언 {(player.witnesses || player.nobles || []).length}</div>
      </div>

      {player.accusationLocked ? (
        <span className="absolute right-2 top-2 rounded-full border border-rose-300/25 bg-rose-500/12 px-2 py-1 text-[10px] font-black text-rose-100">
          고발 봉인
        </span>
      ) : null}
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
  const latestLog = Array.isArray(roomData?.log) && roomData.log.length ? roomData.log[roomData.log.length - 1] : null;
  const isMyTurn = !!currentId && currentId === userId;

  const orderedPlayers = useMemo(() => {
    const order = Array.isArray(roomData?.turnOrder) && roomData.turnOrder.length
      ? roomData.turnOrder
      : (Array.isArray(roomData?.lobbyPlayerIds) ? roomData.lobbyPlayerIds : players.map((player) => player.id));
    const byId = new Map(players.map((player) => [player.id, player]));
    return order.map((id) => byId.get(id)).filter(Boolean);
  }, [players, roomData?.lobbyPlayerIds, roomData?.turnOrder]);

  return (
    <header className="safe-top relative z-20 border-b border-white/8 bg-slate-950/12 backdrop-blur-sm">
      <div className="mx-auto max-w-[460px] px-3 pb-3 pt-3">
        <div className="flex items-center gap-2">
          <div className="panel-soft min-w-0 flex-1 px-4 py-3">
            <div className="text-[11px] font-black tracking-[0.22em] text-amber-200/80">사건 파일</div>
            <div className="mt-1 truncate text-lg font-black text-white">{roomData?.caseTitle || CASE_TITLE}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-black text-slate-200">
              <span className="inline-flex items-center gap-2">
                <Search size={15} className="text-sky-200" />
                {currentPlayer ? (isMyTurn ? '내 차례다. 바로 움직여.' : `${getDisplayName(currentPlayer)} 차례다.`) : '차례를 정리 중이다.'}
              </span>
              {roomData?.status === 'final_round' ? <HeaderPill tone="rose">마지막 라운드</HeaderPill> : null}
            </div>
          </div>

          <button
            type="button"
            onClick={onCopyInvite}
            className={[
              'tap-feedback motion-cta inline-flex min-h-[58px] shrink-0 flex-col items-center justify-center rounded-3xl border border-white/10 bg-slate-900/58 px-4 py-2 text-xs font-black text-slate-100',
              copyStatus === 'copied' ? 'ring-1 ring-emerald-300/40' : '',
            ].join(' ')}
          >
            <span className="inline-flex items-center gap-1"><Link2 size={14} /> {copyStatus === 'copied' ? '복사됨' : '초대'}</span>
            <span className="mt-1 tracking-[0.18em]">{roomCode || '----'}</span>
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleGuide}
            className={[
              'tap-feedback inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black',
              isGuideOpen ? 'border-sky-300/24 bg-sky-500/12 text-sky-50' : 'border-white/10 bg-slate-900/52 text-slate-300',
            ].join(' ')}
          >
            <BookOpenText size={14} /> 사건 브리핑
          </button>
          <HeaderPill tone="sky">턴 {roomData?.turnNumber || 1}</HeaderPill>
          <HeaderPill tone="amber">고발선 {roomData?.accusationThreshold || ACCUSATION_THRESHOLD}</HeaderPill>
          <HeaderPill tone="default">참가자 {orderedPlayers.length}</HeaderPill>
          {roomData?.winnerId ? <HeaderPill tone="emerald">해결 완료</HeaderPill> : null}
        </div>

        <div className="mt-2 rounded-2xl border border-white/10 bg-slate-900/48 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-2xl border border-white/10 bg-slate-950/58 p-2 text-slate-200">
              {latestLog?.type === 'ACCUSE' || roomData?.status === 'ended' ? <Gavel size={15} /> : latestLog?.type === 'GAME_START' ? <ShieldCheck size={15} /> : <Users size={15} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">최근 기록</div>
              <div className="mt-1 text-sm font-bold leading-6 text-slate-100">{latestLog?.message || '아직 아무도 첫 질문을 던지지 않았다.'}</div>
            </div>
          </div>
        </div>

        <div className="mt-3 scroll-strip-x">
          <div className="flex min-w-max gap-2 pb-1">
            {orderedPlayers.map((player) => (
              <InvestigatorChip
                key={player.id}
                player={player}
                isCurrent={player.id === currentId}
                isMe={player.id === userId}
                onOpenOpponent={onOpenOpponent}
              />
            ))}
          </div>
        </div>

        {canForceStaleSkip ? (
          <button
            type="button"
            onClick={onForceStaleSkip}
            className="tap-feedback mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-300/24 bg-rose-500/12 px-4 py-3 text-sm font-black text-rose-50"
          >
            <AlertTriangle size={16} />
            {staleTargetName ? `${staleTargetName}의 오래 비운 턴 정리` : '오래 비운 턴 정리'}
          </button>
        ) : null}
      </div>
    </header>
  );
}

const GameHeader = memo(GameHeaderImpl);
export default GameHeader;
