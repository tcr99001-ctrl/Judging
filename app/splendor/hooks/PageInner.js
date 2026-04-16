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
import { useRoomLogFX } from './useRoomLogFX';
import { useRoomSync } from './useRoomSync';
import { useSplendorActions } from './useSplendorActions';
import AccuseModal from '../modals/AccuseModal';
import DiscardModal from '../modals/DiscardModal';
import GemModal from '../modals/GemModal';
import NobleModal from '../modals/NobleModal';
import OpponentModal from '../modals/OpponentModal';
import { CASE_TAGLINE, STALE_PLAYER_MS } from '../shared/constants';
import { getDisplayName, isPlayerStaleFromPresence, toMillis } from '../shared/utils';

export default function PageInner() {
  const fx = useFX();
  const { user, ready } = useAuthAnon(auth);

  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isInviteMode, setIsInviteMode] = useState(false);
  const [activeCard, setActiveCard] = useState(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [copyStatus, setCopyStatus] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [opponent, setOpponent] = useState(null);
  const [showAccuse, setShowAccuse] = useState(false);
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
    }, 1700);
    toastTimersRef.current.set(id, timer);
  }, []);

  useEffect(() => () => {
    toastTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    toastTimersRef.current.clear();
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
  }, []);

  const { roomData, players } = useRoomSync({ db, roomCode, userId: user?.uid });

  const isParticipant = useMemo(() => !!user?.uid && players.some((player) => player.id === user.uid), [players, user?.uid]);
  const myData = useMemo(() => players.find((player) => player.id === user?.uid) || null, [players, user?.uid]);
  const currentId = roomData?.turnOrder?.[roomData?.turnIndex] || null;
  const currentPlayer = players.find((player) => player.id === currentId) || null;
  const isMyTurn = !!user?.uid && currentId === user.uid && (roomData?.status === 'playing' || roomData?.status === 'final_round');
  const pending = roomData?.pending || null;
  const pendingForMe = !!pending && pending.playerId === user?.uid;
  const lockUsed = !!roomData?.actionLock?.used && roomData?.actionLock?.playerId === user?.uid && roomData?.actionLock?.turnIndex === roomData?.turnIndex;

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
    if (!roomData) {
      setActiveCard(null);
      setShowLeadModal(false);
      setSelectedLeads([]);
      setGuideOpen(false);
      setOpponent(null);
      setShowAccuse(false);
      return;
    }
    if (roomData.status === 'lobby') {
      setActiveCard(null);
      setShowLeadModal(false);
      setSelectedLeads([]);
      setOpponent(null);
      setShowAccuse(false);
    }
  }, [roomData]);

  useEffect(() => {
    if (!activeCard?.id) return;
    const ids = new Set([
      ...[1, 2, 3].flatMap((tier) => (roomData?.board?.[tier] || []).map((card) => card?.id).filter(Boolean)),
      ...((myData?.reservedLeads || myData?.reserved || []).map((card) => card?.id).filter(Boolean)),
    ]);
    if (!ids.has(activeCard.id)) setActiveCard(null);
  }, [activeCard?.id, myData?.reserved, myData?.reservedLeads, roomData?.board]);

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

  useRoomLogFX({ roomCode, roomData, players, userId: user?.uid, fx });

  const actions = useSplendorActions({
    db,
    roomCode,
    roomData,
    userId: user?.uid,
    fx,
    myData,
    setActiveCard,
  });

  const withMove = useCallback(async (job, successText = '') => {
    try {
      await job();
      if (successText) pushToast(successText, 'success');
    } catch (error) {
      pushToast(error?.message || '행동을 처리하지 못했다.', 'error');
    }
  }, [pushToast]);

  const handleCopyInvite = useCallback(async () => {
    if (typeof window === 'undefined' || !roomCode) return;
    try {
      const base = window.location.href.split('?')[0];
      await navigator.clipboard.writeText(`${base}?room=${roomCode}`);
      setCopyStatus('copied');
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopyStatus(null), 1300);
      pushToast('초대 링크를 복사했다.', 'success');
    } catch {
      setCopyStatus('error');
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopyStatus(null), 1300);
      pushToast('초대 링크 복사가 미끄러졌다.', 'error');
    }
  }, [pushToast, roomCode]);

  const handleConfirmLeads = useCallback(async (selected) => {
    await withMove(() => actions.confirmCollectLeads(selected), '조사 자원을 챙겼다.');
    setSelectedLeads([]);
    setShowLeadModal(false);
  }, [actions, withMove]);

  const handleSecureCard = useCallback(async (card, fromReserved = false) => {
    await withMove(() => actions.onSecureClue(card, fromReserved), '단서를 확보했다.');
    setActiveCard(null);
  }, [actions, withMove]);

  const handlePinCard = useCallback(async (card) => {
    await withMove(() => actions.onPinLead(card), '리드를 비공개로 고정했다.');
    setActiveCard(null);
  }, [actions, withMove]);

  const handlePinTopLead = useCallback(async (tier) => {
    await withMove(() => actions.onPinTopLead(tier), '덱 맨 위 리드를 가려 뒀다.');
  }, [actions, withMove]);

  const handleDiscard = useCallback(async (color) => {
    await withMove(() => actions.onDiscardExcess(color), `${color === 'gold' ? '특권' : ''} 자원 하나를 정리했다.`);
  }, [actions, withMove]);

  const handleChooseWitness = useCallback(async (witnessId) => {
    await withMove(() => actions.onChooseWitness(witnessId), '증언 하나를 붙잡았다.');
  }, [actions, withMove]);

  const handleAccuse = useCallback(async ({ culpritId, motiveId, methodId }) => {
    await withMove(() => actions.onAccuse({ culpritId, motiveId, methodId }), '최종 고발을 던졌다.');
    setShowAccuse(false);
  }, [actions, withMove]);

  const handleEndTurn = useCallback(async () => {
    await withMove(() => actions.onEndTurn(), '턴을 정리했다.');
  }, [actions, withMove]);

  const handleForceStaleSkip = useCallback(async () => {
    if (!currentId) return;
    await withMove(() => actions.onForceStaleSkip(currentId), '오래 비운 차례를 정리했다.');
  }, [actions, currentId, withMove]);

  const pendingWitnesses = useMemo(() => {
    if (pending?.type !== 'witness' || !Array.isArray(pending?.options)) return [];
    const options = new Set(pending.options);
    return (roomData?.witnessStrip || roomData?.nobles || []).filter((entry) => options.has(entry.id));
  }, [pending, roomData?.nobles, roomData?.witnessStrip]);

  const roomClosed = !roomCode || roomCode.length !== 4 || !roomData;

  if (!ready) {
    return (
      <div className="app-shell game-surface flex items-center justify-center px-4">
        <div className="panel px-5 py-5 text-center text-sm font-black text-slate-200">사건 파일을 불러오는 중이다.</div>
      </div>
    );
  }

  if (roomClosed || roomData?.status === 'lobby') {
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

  if (roomData?.status === 'ended') {
    return (
      <>
        <GameOverScreen
          roomData={roomData}
          players={players}
          roomCode={roomCode}
          onCopyInvite={handleCopyInvite}
          onGoLobby={() => {
            setRoomCode('');
            setIsInviteMode(false);
          }}
        />
        <ToastStack items={toasts} />
      </>
    );
  }

  return (
    <div className="app-shell game-surface safe-bottom">
      <GameHeader
        roomCode={roomCode}
        roomData={roomData}
        players={players}
        userId={user?.uid}
        copyStatus={copyStatus}
        onCopyInvite={handleCopyInvite}
        onOpenOpponent={setOpponent}
        isGuideOpen={guideOpen}
        onToggleGuide={() => setGuideOpen((current) => !current)}
        canForceStaleSkip={canForceStaleSkip}
        onForceStaleSkip={handleForceStaleSkip}
        staleTargetName={currentPlayer ? getDisplayName(currentPlayer) : ''}
      />

      <main className="mx-auto flex h-full w-full max-w-[460px] flex-col overflow-y-auto px-3 pb-[440px] pt-3">
        <div className="rounded-3xl border border-white/10 bg-slate-900/36 px-4 py-4 text-sm font-bold leading-6 text-slate-200">
          {CASE_TAGLINE}
        </div>

        <div className="mt-3">
          <NobleStrip
            witnessStrip={roomData?.witnessStrip || roomData?.nobles || []}
            myInsights={myData?.insights || myData?.bonuses || {}}
            pendingOptions={pending?.type === 'witness' ? pending.options || [] : []}
          />
        </div>

        <div className="mt-3">
          <MarketGrid
            board={roomData?.board || { 1: [], 2: [], 3: [] }}
            decks={roomData?.decks || { 1: [], 2: [], 3: [] }}
            isMyTurn={isMyTurn}
            lockUsed={lockUsed}
            pendingForMe={pendingForMe}
            onOpenCard={setActiveCard}
            onPinTopLead={handlePinTopLead}
          />
        </div>

        <div className="mt-3">
          <ReservedStrip
            reserved={myData?.reservedLeads || myData?.reserved || []}
            reservedCount={myData?.reservedCount || (myData?.reservedLeads || myData?.reserved || []).length || 0}
            onOpenCard={setActiveCard}
            playerId={user?.uid || 'ME'}
          />
        </div>
      </main>

      <Dashboard
        myData={myData}
        roomData={roomData}
        isMyTurn={isMyTurn}
        lockUsed={lockUsed}
        pendingForMe={pendingForMe}
        onOpenLeadModal={() => {
          setSelectedLeads([]);
          setShowLeadModal(true);
        }}
        onOpenAccuse={() => setShowAccuse(true)}
        onEndTurn={handleEndTurn}
      />

      <BeginnerGuide open={guideOpen} onClose={() => setGuideOpen(false)} />

      <CardModal
        open={!!activeCard}
        card={activeCard}
        myData={myData}
        isMyTurn={isMyTurn}
        lockUsed={lockUsed}
        pendingForMe={pendingForMe}
        onClose={() => setActiveCard(null)}
        onSecure={handleSecureCard}
        onPin={handlePinCard}
      />

      <GemModal
        open={showLeadModal}
        bank={roomData?.bank || {}}
        selected={selectedLeads}
        setSelected={setSelectedLeads}
        onClose={() => {
          setShowLeadModal(false);
          setSelectedLeads([]);
        }}
        onConfirm={handleConfirmLeads}
      />

      <DiscardModal
        open={pendingForMe && pending?.type === 'discard'}
        pending={pendingForMe && pending?.type === 'discard' ? pending : null}
        resources={myData?.resources || myData?.gems || {}}
        onDiscard={handleDiscard}
      />

      <NobleModal
        open={pendingForMe && pending?.type === 'witness'}
        witnesses={pendingWitnesses}
        onChoose={handleChooseWitness}
      />

      <OpponentModal open={!!opponent} player={opponent} onClose={() => setOpponent(null)} />

      <AccuseModal open={showAccuse} myData={myData} onClose={() => setShowAccuse(false)} onSubmit={handleAccuse} />

      <ToastStack items={toasts} />
    </div>
  );
}
