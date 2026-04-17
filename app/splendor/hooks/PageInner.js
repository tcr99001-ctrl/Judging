'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useBotLoop } from '../bot/useBotLoop';
import BeginnerGuide from '../components/BeginnerGuide';
import CardModal from '../components/CardModal';
import Dashboard from '../components/Dashboard';
import GameHeader from '../components/GameHeader';
import GameOverScreen from '../components/GameOverScreen';
import Lobby from '../components/Lobby';
import MarketGrid from '../components/MarketGrid';
import NobleStrip from '../components/NobleStrip';
import ReservedStrip from '../components/ReservedStrip';
import ToastStack from '../components/ToastStack';
import { txMove } from '../engine/txMove';
import { useFX } from '../fx/FXProvider';
import { useAuthAnon } from './useAuthAnon';
import { useInviteRoomParam } from './useInviteRoomParam';
import { useRoomSync } from './useRoomSync';
import { useSplendorActions } from './useSplendorActions';
import AccuseModal from '../modals/AccuseModal';
import DiscardModal from '../modals/DiscardModal';
import GemModal from '../modals/GemModal';
import NobleModal from '../modals/NobleModal';
import OpponentModal from '../modals/OpponentModal';
import { STALE_PLAYER_MS } from '../shared/constants';
import { getDisplayName, isPlayerStaleFromPresence, toMillis } from '../shared/utils';

export default function PageInner() {
  const fx = useFX();
  const { user, ready } = useAuthAnon(auth);

  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isInviteMode, setIsInviteMode] = useState(false);
  const [activeCard, setActiveCard] = useState(null);
  const [activeSource, setActiveSource] = useState('board');
  const [guideOpen, setGuideOpen] = useState(false);
  const [crosscheckOpen, setCrosscheckOpen] = useState(false);
  const [leadManagerOpen, setLeadManagerOpen] = useState(false);
  const [witnessModal, setWitnessModal] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [showAccuse, setShowAccuse] = useState(false);
  const [copyStatus, setCopyStatus] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastTimersRef = useRef(new Map());
  const copyTimerRef = useRef(null);

  useInviteRoomParam({ setRoomCode, setIsInviteMode });

  const pushToast = useCallback((text, tone = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((current) => [...current.slice(-2), { id, text, tone }]);
    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
      toastTimersRef.current.delete(id);
    }, 1450);
    toastTimersRef.current.set(id, timer);
  }, []);

  useEffect(() => () => {
    toastTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    toastTimersRef.current.clear();
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
  }, []);

  const { roomData, players } = useRoomSync({ db, roomCode, userId: user?.uid });
  const myData = useMemo(() => players.find((player) => player.id === user?.uid) || null, [players, user?.uid]);
  const isParticipant = useMemo(() => !!user?.uid && players.some((player) => player.id === user.uid), [players, user?.uid]);
  const currentId = roomData?.turnOrder?.[roomData?.turnIndex] || null;
  const currentPlayer = players.find((player) => player.id === currentId) || null;
  const isMyTurn = !!user?.uid && currentId === user.uid && (roomData?.status === 'playing' || roomData?.status === 'final_round');
  const actionUsed = !!roomData?.actionLock?.used && roomData?.actionLock?.playerId === user?.uid && roomData?.actionLock?.turnIndex === roomData?.turnIndex;

  useEffect(() => {
    if (!db || !roomCode || roomCode.length !== 4 || !user?.uid || !isParticipant) return undefined;

    const playerRef = doc(db, 'rooms', roomCode, 'players', user.uid);
    const roomRef = doc(db, 'rooms', roomCode);

    const pingPresence = () => {
      updateDoc(playerRef, { online: true, lastSeenAt: serverTimestamp() }).catch(() => {});
      updateDoc(roomRef, { presenceAt: serverTimestamp() }).catch(() => {});
    };

    const markOffline = () => {
      updateDoc(playerRef, { online: false, lastSeenAt: serverTimestamp() }).catch(() => {});
      updateDoc(roomRef, { presenceAt: serverTimestamp() }).catch(() => {});
    };

    pingPresence();
    const timer = window.setInterval(pingPresence, 22000);
    window.addEventListener('beforeunload', markOffline);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('beforeunload', markOffline);
      markOffline();
    };
  }, [db, isParticipant, roomCode, user?.uid]);

  useEffect(() => {
    if (!roomData || roomData.status === 'lobby') {
      setActiveCard(null);
      setCrosscheckOpen(false);
      setLeadManagerOpen(false);
      setWitnessModal(null);
      setOpponent(null);
      setShowAccuse(false);
    }
  }, [roomData]);

  useEffect(() => {
    if (!actionUsed) return;
    setCrosscheckOpen(false);
    setLeadManagerOpen(false);
  }, [actionUsed]);

  const currentPlayerStale = useMemo(() => {
    if (!roomData || !currentPlayer || currentPlayer.isBot) return false;
    const roomPresenceAt = toMillis(roomData.presenceAt || roomData.updatedAt || 0);
    return isPlayerStaleFromPresence({ player: currentPlayer, roomPresenceAt, staleMs: STALE_PLAYER_MS });
  }, [currentPlayer, roomData]);

  const canForceStaleSkip = useMemo(() => {
    if (!roomData || !user?.uid || !isParticipant) return false;
    if (!currentId || currentId === user.uid) return false;
    if (!(roomData.status === 'playing' || roomData.status === 'final_round')) return false;
    return currentPlayerStale;
  }, [currentId, currentPlayerStale, isParticipant, roomData, user?.uid]);

  useBotLoop({
    enabled: !!roomData && !!user?.uid && isParticipant && roomData.hostId === user.uid && players.some((player) => player.isBot) && (roomData.status === 'playing' || roomData.status === 'final_round'),
    db,
    roomCode,
    roomData,
    players,
    hostId: roomData?.hostId === user?.uid ? user?.uid : null,
    txMove,
  });

  const actions = useSplendorActions({
    db,
    roomCode,
    roomData,
    userId: user?.uid,
    myData,
    fx,
  });

  const withMove = useCallback(async (job, successText = '') => {
    try {
      await job();
      if (successText) pushToast(successText, 'success');
    } catch (error) {
      pushToast(error?.message || '실패', 'error');
    }
  }, [pushToast]);

  const handleCopyInvite = useCallback(async () => {
    if (typeof window === 'undefined' || !roomCode) return;
    try {
      const base = window.location.href.split('?')[0];
      await navigator.clipboard.writeText(`${base}?room=${roomCode}`);
      setCopyStatus('copied');
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopyStatus(null), 1200);
      pushToast('복사됨', 'success');
    } catch {
      pushToast('복사 실패', 'error');
    }
  }, [pushToast, roomCode]);

  const openCard = useCallback((card, source = 'board') => {
    setActiveCard(card);
    setActiveSource(source);
  }, []);

  const handleTake = useCallback(async (cardId) => {
    await withMove(() => actions.onTakeClue(cardId), '단서 확보');
    setActiveCard(null);
  }, [actions, withMove]);

  const handleToggleLead = useCallback(async (clueId) => {
    await withMove(() => actions.onFileLead(clueId), '리드 정리');
    setActiveCard(null);
  }, [actions, withMove]);

  const handleCrosscheck = useCallback(async ({ aId, bId }) => {
    await withMove(() => actions.onCrosscheck({ aId, bId }), '대조 완료');
    setCrosscheckOpen(false);
  }, [actions, withMove]);

  const handleInterrogate = useCallback(async (witnessId) => {
    await withMove(() => actions.onInterrogate(witnessId), '추궁 완료');
    setWitnessModal(null);
  }, [actions, withMove]);

  const handleAccuse = useCallback(async ({ culpritId, motiveId, methodId }) => {
    await withMove(() => actions.onAccuse({ culpritId, motiveId, methodId }), '고발');
    setShowAccuse(false);
  }, [actions, withMove]);

  const handleEndTurn = useCallback(async () => {
    await withMove(() => actions.onEndTurn(), '턴 종료');
  }, [actions, withMove]);

  const handleForceStaleSkip = useCallback(async () => {
    if (!currentId) return;
    await withMove(() => actions.onForceStaleSkip(currentId), '넘김');
  }, [actions, currentId, withMove]);

  if (!ready) {
    return (
      <div className="app-shell game-surface px-4 py-6">
        <div className="mx-auto w-full max-w-[480px]">
          <div className="panel px-5 py-5 text-center text-sm font-black text-slate-200">불러오는 중</div>
        </div>
      </div>
    );
  }

  if (!roomCode || roomCode.length !== 4 || !roomData || roomData.status === 'lobby') {
    return (
      <Lobby
        db={db}
        user={user}
        roomCode={roomCode}
        setRoomCode={setRoomCode}
        playerName={playerName}
        setPlayerName={setPlayerName}
        roomData={roomData}
        players={players}
        isInviteMode={isInviteMode}
        setIsInviteMode={setIsInviteMode}
      />
    );
  }

  if (roomData.status === 'ended') {
    return <GameOverScreen roomData={roomData} players={players} myId={user?.uid} />;
  }

  return (
    <div className="app-shell game-surface">
      <div className="mx-auto min-h-screen w-full max-w-[480px] px-3 pb-[calc(1.5rem+var(--safe-bottom))] pt-3">
        <div className="grid gap-4">
          <GameHeader
            roomData={roomData}
            roomCode={roomCode}
            players={players}
            myId={user?.uid}
            currentPlayer={currentPlayer}
            copyStatus={copyStatus}
            onCopyInvite={handleCopyInvite}
            onToggleGuide={() => setGuideOpen(true)}
            onOpenPlayer={setOpponent}
          />

          <MarketGrid roomData={roomData} onOpenCard={openCard} />

          <NobleStrip
            witnesses={roomData?.witnessStrip || []}
            myData={myData || {}}
            onOpenWitness={setWitnessModal}
          />

          <ReservedStrip
            leads={myData?.reservedLeads || []}
            onOpenCard={openCard}
          />

              <Dashboard
            myData={myData || {}}
            roomData={roomData}
            isMyTurn={isMyTurn}
            actionUsed={actionUsed}
            canForceStaleSkip={canForceStaleSkip}
            onOpenLeadManager={() => setLeadManagerOpen(true)}
            onOpenCrosscheck={() => setCrosscheckOpen(true)}
            onOpenAccuse={() => setShowAccuse(true)}
            onEndTurn={handleEndTurn}
            onForceStaleSkip={handleForceStaleSkip}
          />
        </div>
      </div>

      <CardModal
        open={!!activeCard}
        card={activeCard}
        source={activeSource}
        canTake={activeSource === 'board' && isMyTurn && !actionUsed}
        canToggleLead={activeSource === 'reserved' && isMyTurn && !actionUsed}
        onTake={handleTake}
        onToggleLead={handleToggleLead}
        onClose={() => setActiveCard(null)}
      />

      <BeginnerGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
      <GemModal open={crosscheckOpen} myData={myData} onClose={() => setCrosscheckOpen(false)} onConfirm={handleCrosscheck} />
      <DiscardModal open={leadManagerOpen} myData={myData} actionUsed={actionUsed} onClose={() => setLeadManagerOpen(false)} onToggleLead={handleToggleLead} />
      <NobleModal open={!!witnessModal} witness={witnessModal} myData={myData || {}} onClose={() => setWitnessModal(null)} onConfirm={handleInterrogate} />
      <OpponentModal open={!!opponent} player={opponent} onClose={() => setOpponent(null)} />
      <AccuseModal open={showAccuse} myData={myData || {}} roomData={roomData} onClose={() => setShowAccuse(false)} onSubmit={handleAccuse} />
      <ToastStack items={toasts} />
    </div>
  );
}
