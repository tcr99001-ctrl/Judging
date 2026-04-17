'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { Bot, CheckCircle2, Copy, Link2, Play, Plus, X } from 'lucide-react';
import AssetImage from './AssetImage';
import { UI_ASSET } from '../shared/assets';
import { createCaseSeed, createSeededRandom, seededShuffle } from '../shared/caseData';
import { BOT_NAME, CASE_TITLE, ROOM_MAX_PLAYERS } from '../shared/constants';
import { buildCaseSetup, createPrivatePlayerPayload, createPublicPlayerPayload } from '../shared/setup';
import { getDisplayName, isPlayerStaleFromPresence, toMillis } from '../shared/utils';

function randomRoomCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function createBotId() {
  return `BOT_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function buildLobbyOrder(roomData, players) {
  const ids = Array.isArray(roomData?.lobbyPlayerIds) && roomData.lobbyPlayerIds.length
    ? roomData.lobbyPlayerIds
    : players.map((player) => player.id);
  const order = new Map(ids.map((id, index) => [id, index]));
  return [...players].sort((a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER));
}

export default function Lobby({
  db,
  user,
  roomCode,
  setRoomCode,
  playerName,
  setPlayerName,
  roomData,
  players,
  isInviteMode,
  setIsInviteMode,
}) {
  const [notice, setNotice] = useState(null);
  const [copyStatus, setCopyStatus] = useState(null);
  const copyTimerRef = useRef(null);

  const isHost = roomData?.hostId === user?.uid;
  const isJoined = !!user?.uid && players.some((player) => player.id === user.uid);
  const lobbyPlayers = useMemo(() => buildLobbyOrder(roomData, players), [roomData, players]);
  const roomPresenceAt = useMemo(() => toMillis(roomData?.presenceAt || roomData?.updatedAt || 0), [roomData?.presenceAt, roomData?.updatedAt]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 1600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => () => {
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
  }, []);

  const pushNotice = (tone, text) => setNotice({ tone, text });

  const requireUser = () => {
    if (user?.uid) return true;
    pushNotice('error', '잠시 후 다시 눌러라.');
    return false;
  };

  const copyInviteLink = async () => {
    if (typeof window === 'undefined' || !roomCode) return;
    try {
      const baseUrl = window.location.href.split('?')[0];
      await navigator.clipboard.writeText(`${baseUrl}?room=${roomCode}`);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      setCopyStatus('copied');
      pushNotice('success', '복사됨');
      copyTimerRef.current = window.setTimeout(() => setCopyStatus(null), 1200);
    } catch {
      pushNotice('error', '복사 실패');
    }
  };

  const handleCreate = async () => {
    if (!requireUser()) return;
    const nickname = playerName.trim();
    if (!nickname) return pushNotice('error', '이름을 적어라.');

    try {
      let createdCode = null;
      for (let attempt = 0; attempt < 20 && !createdCode; attempt += 1) {
        const code = randomRoomCode();
        const roomRef = doc(db, 'rooms', code);
        const roomPrivateRef = doc(db, 'rooms', code, 'meta', 'private');
        const playerRef = doc(db, 'rooms', code, 'players', user.uid);
        const playerPrivateRef = doc(db, 'rooms', code, 'playersPrivate', user.uid);
        const seed = createCaseSeed();
        const caseSetup = buildCaseSetup({ seed });

        let collided = false;
        await runTransaction(db, async (tx) => {
          const roomSnap = await tx.get(roomRef);
          if (roomSnap.exists()) {
            collided = true;
            return;
          }
          tx.set(roomRef, {
            hostId: user.uid,
            status: 'lobby',
            schemaVersion: 5,
            caseSeed: seed,
            lobbyPlayerIds: [user.uid],
            caseTitle: caseSetup.public.caseTitle,
            caseBrief: caseSetup.public.caseBrief,
            accusationThreshold: caseSetup.public.accusationThreshold,
            board: caseSetup.public.board,
            decks: caseSetup.public.decks,
            witnessStrip: caseSetup.public.witnessStrip,
            nobles: caseSetup.public.nobles,
            turnOrder: [],
            turnIndex: 0,
            turnNumber: 1,
            actionLock: null,
            pending: null,
            finalRound: null,
            winnerId: null,
            reveal: null,
            logSeq: 1,
            log: [{ seq: 1, ts: Date.now(), type: 'LOBBY_CREATE', actorId: user.uid, message: `${nickname}이 방을 만들었다.` }],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            presenceAt: serverTimestamp(),
          });
          tx.set(roomPrivateRef, caseSetup.private);
          tx.set(playerRef, { ...createPublicPlayerPayload(nickname, false), online: true, lastSeenAt: serverTimestamp() });
          tx.set(playerPrivateRef, createPrivatePlayerPayload());
        });

        if (!collided) createdCode = code;
      }
      if (!createdCode) throw new Error('다시 눌러라.');
      setRoomCode(createdCode);
      setIsInviteMode(false);
      pushNotice('success', createdCode);
    } catch (error) {
      pushNotice('error', error?.message || '실패');
    }
  };

  const handleJoin = async () => {
    if (!requireUser()) return;
    const nickname = playerName.trim();
    const code = roomCode.trim().toUpperCase();
    if (!nickname) return pushNotice('error', '이름을 적어라.');
    if (code.length !== 4) return pushNotice('error', '코드 4자리');

    try {
      const roomRef = doc(db, 'rooms', code);
      const playerRef = doc(db, 'rooms', code, 'players', user.uid);
      const playerPrivateRef = doc(db, 'rooms', code, 'playersPrivate', user.uid);

      await runTransaction(db, async (tx) => {
        const roomSnap = await tx.get(roomRef);
        if (!roomSnap.exists()) throw new Error('방이 없다.');
        const room = roomSnap.data();
        if (room.status !== 'lobby') throw new Error('이미 시작됐다.');

        const lobbyIds = Array.isArray(room.lobbyPlayerIds) ? [...room.lobbyPlayerIds] : [];
        if (!lobbyIds.includes(user.uid) && lobbyIds.length >= ROOM_MAX_PLAYERS) throw new Error('가득 찼다.');
        if (!lobbyIds.includes(user.uid)) lobbyIds.push(user.uid);

        tx.set(roomRef, { lobbyPlayerIds: lobbyIds, updatedAt: serverTimestamp(), presenceAt: serverTimestamp() }, { merge: true });
        tx.set(playerRef, { ...createPublicPlayerPayload(nickname, false), name: nickname, online: true, lastSeenAt: serverTimestamp() }, { merge: true });
        tx.set(playerPrivateRef, createPrivatePlayerPayload(), { merge: true });
      });

      setRoomCode(code);
      setIsInviteMode(false);
      pushNotice('success', code);
    } catch (error) {
      pushNotice('error', error?.message || '실패');
    }
  };

  const handleAddBot = async () => {
    if (!isHost) return;
    if (lobbyPlayers.length >= ROOM_MAX_PLAYERS) return pushNotice('error', '가득 찼다.');
    const botId = createBotId();
    const botIndex = lobbyPlayers.filter((player) => player.isBot).length + 1;
    const botName = botIndex > 1 ? `${BOT_NAME} ${botIndex}` : BOT_NAME;

    try {
      const roomRef = doc(db, 'rooms', roomCode);
      const playerRef = doc(db, 'rooms', roomCode, 'players', botId);
      const playerPrivateRef = doc(db, 'rooms', roomCode, 'playersPrivate', botId);
      await runTransaction(db, async (tx) => {
        const roomSnap = await tx.get(roomRef);
        if (!roomSnap.exists()) throw new Error('방이 없다.');
        const room = roomSnap.data();
        if (room.status !== 'lobby') throw new Error('이미 시작됐다.');
        const lobbyIds = Array.isArray(room.lobbyPlayerIds) ? [...room.lobbyPlayerIds] : [];
        if (lobbyIds.length >= ROOM_MAX_PLAYERS) throw new Error('가득 찼다.');
        lobbyIds.push(botId);
        tx.set(roomRef, { lobbyPlayerIds: lobbyIds, updatedAt: serverTimestamp(), presenceAt: serverTimestamp() }, { merge: true });
        tx.set(playerRef, { ...createPublicPlayerPayload(botName, true), name: botName, isBot: true, online: true, lastSeenAt: serverTimestamp() });
        tx.set(playerPrivateRef, createPrivatePlayerPayload());
      });
      pushNotice('success', '봇 추가');
    } catch (error) {
      pushNotice('error', error?.message || '실패');
    }
  };

  const handleRemoveBot = async (botId) => {
    if (!isHost || !botId) return;
    try {
      const roomRef = doc(db, 'rooms', roomCode);
      const playerRef = doc(db, 'rooms', roomCode, 'players', botId);
      const playerPrivateRef = doc(db, 'rooms', roomCode, 'playersPrivate', botId);
      await runTransaction(db, async (tx) => {
        const roomSnap = await tx.get(roomRef);
        if (!roomSnap.exists()) throw new Error('방이 없다.');
        const room = roomSnap.data();
        const lobbyIds = Array.isArray(room.lobbyPlayerIds) ? room.lobbyPlayerIds.filter((id) => id !== botId) : [];
        tx.set(roomRef, { lobbyPlayerIds: lobbyIds, updatedAt: serverTimestamp(), presenceAt: serverTimestamp() }, { merge: true });
        tx.delete(playerRef);
        tx.delete(playerPrivateRef);
      });
      pushNotice('success', '봇 제거');
    } catch (error) {
      pushNotice('error', error?.message || '실패');
    }
  };

  const handleStart = async () => {
    if (!isHost) return;
    try {
      const roomRef = doc(db, 'rooms', roomCode);
      const roomPrivateRef = doc(db, 'rooms', roomCode, 'meta', 'private');
      await runTransaction(db, async (tx) => {
        const roomSnap = await tx.get(roomRef);
        if (!roomSnap.exists()) throw new Error('방이 없다.');
        const room = roomSnap.data();
        if (room.status !== 'lobby') throw new Error('이미 시작됐다.');

        const roomPresence = toMillis(room.presenceAt || room.updatedAt || 0);
        const candidateIds = Array.isArray(room.lobbyPlayerIds) ? room.lobbyPlayerIds : [];
        const live = [];
        const playerDocs = new Map();

        for (const playerId of candidateIds) {
          const playerSnap = await tx.get(doc(db, 'rooms', roomCode, 'players', playerId));
          if (!playerSnap.exists()) continue;
          const player = { id: playerId, ...playerSnap.data() };
          const stale = !player.isBot && isPlayerStaleFromPresence({ player, roomPresenceAt: roomPresence });
          if (stale) continue;
          live.push(playerId);
          playerDocs.set(playerId, player);
        }

        if (!live.length) throw new Error('참가자가 없다.');

        const seed = createCaseSeed();
        const caseSetup = buildCaseSetup({ seed });
        const random = createSeededRandom(`${seed}:turnOrder`);
        const turnOrder = seededShuffle(live, random);
        const firstPlayerId = turnOrder[0];

        for (const playerId of live) {
          const player = playerDocs.get(playerId);
          tx.set(doc(db, 'rooms', roomCode, 'players', playerId), {
            ...createPublicPlayerPayload(player?.name || getDisplayName(player), !!player?.isBot),
            name: player?.name || getDisplayName(player),
            isBot: !!player?.isBot,
            online: !!player?.isBot ? true : player?.online !== false,
            lastSeenAt: serverTimestamp(),
          }, { merge: false });
          tx.set(doc(db, 'rooms', roomCode, 'playersPrivate', playerId), createPrivatePlayerPayload(), { merge: false });
        }

        tx.set(roomRef, {
          status: 'playing',
          caseSeed: seed,
          lobbyPlayerIds: live,
          caseTitle: caseSetup.public.caseTitle,
          caseBrief: caseSetup.public.caseBrief,
          accusationThreshold: caseSetup.public.accusationThreshold,
          board: caseSetup.public.board,
          decks: caseSetup.public.decks,
          witnessStrip: caseSetup.public.witnessStrip,
          nobles: caseSetup.public.nobles,
          turnOrder,
          turnIndex: 0,
          turnNumber: 1,
          actionLock: { turnIndex: 0, playerId: firstPlayerId, used: false },
          pending: null,
          finalRound: null,
          winnerId: null,
          reveal: null,
          finalReports: null,
          logSeq: 1,
          log: [{ seq: 1, ts: Date.now(), type: 'GAME_START', actorId: user.uid, message: `${getDisplayName(playerDocs.get(firstPlayerId))}부터 시작한다.` }],
          updatedAt: serverTimestamp(),
          presenceAt: serverTimestamp(),
        }, { merge: true });
        tx.set(roomPrivateRef, caseSetup.private, { merge: false });
      });
      pushNotice('success', '시작');
    } catch (error) {
      pushNotice('error', error?.message || '실패');
    }
  };

  return (
    <div className="app-shell game-surface">
      <div className="mx-auto min-h-screen w-full max-w-[480px] px-3 py-4">
        <section className="panel p-4">
          <div className="border-b border-white/10 pb-5">
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-[20px] border border-[#675243]/40 bg-[#18130f] p-2.5">
                <AssetImage src={UI_ASSET.caseSeal} className="h-11 w-11" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-black tracking-[0.22em] text-[#c7ae84]">사건 파일</div>
                <h1 className="mt-2 break-words text-2xl font-black text-[#f7efe3]">{CASE_TITLE}</h1>
                <p className="mt-2 text-sm font-bold leading-6 text-[#dfcfba]">전시장 안에서 살인이 났다. 왕관도 사라졌다.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 pt-4">
            <label className="panel-soft px-4 py-3">
              <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">이름</div>
              <input
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value.slice(0, 14))}
                placeholder="이름"
                className="mt-2 w-full bg-transparent text-base font-black text-white outline-none placeholder:text-slate-500"
              />
            </label>

            <label className="panel-soft px-4 py-3">
              <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">방 코드</div>
              <input
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
                placeholder="ABCD"
                className="mt-2 w-full bg-transparent text-base font-black uppercase tracking-[0.22em] text-white outline-none placeholder:text-slate-500"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={handleCreate} className="tap-feedback min-h-12 rounded-2xl border border-[#7c8f73]/25 bg-[#7c8f73]/12 px-4 py-3 text-sm font-black text-[#eef5e6]">
                <span className="inline-flex items-center gap-2 whitespace-normal"><Plus size={16} /> 방 만들기</span>
              </button>
              <button type="button" onClick={handleJoin} className="tap-feedback min-h-12 rounded-2xl border border-[#6b8196]/25 bg-[#223142]/18 px-4 py-3 text-sm font-black text-[#e3edf7]">
                <span className="inline-flex items-center gap-2 whitespace-normal"><Link2 size={16} /> 입장</span>
              </button>
            </div>

            {isInviteMode ? (
              <div className="rounded-2xl border border-[#6b8196]/20 bg-[#223142]/18 px-4 py-3 text-sm font-black text-[#e3edf7]">초대 링크로 들어옴</div>
            ) : null}

            {roomData?.status === 'lobby' ? (
              <div className="rounded-3xl border border-white/10 bg-black/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-black text-[#f7efe3]">대기 {lobbyPlayers.length}/{ROOM_MAX_PLAYERS}</div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={copyInviteLink} disabled={!roomCode} className={`tap-feedback min-h-11 rounded-2xl border px-3 py-2 text-sm font-black ${copyStatus === 'copied' ? 'border-[#7c8f73]/25 bg-[#7c8f73]/12 text-[#eef5e6]' : 'border-white/10 bg-black/10 text-[#f2e7d3]'}`}>
                      <span className="inline-flex items-center gap-2 whitespace-normal"><Copy size={14} /> {copyStatus === 'copied' ? '복사됨' : '초대 링크'}</span>
                    </button>
                    {isHost ? (
                      <button type="button" onClick={handleAddBot} className="tap-feedback min-h-11 rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm font-black text-[#f2e7d3]">
                        <span className="inline-flex items-center gap-2 whitespace-normal"><Bot size={14} /> 봇 추가</span>
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 grid gap-2">
                  {lobbyPlayers.length ? lobbyPlayers.map((player) => {
                    const stale = !player.isBot && isPlayerStaleFromPresence({ player, roomPresenceAt });
                    return (
                      <div key={player.id} className="panel-soft flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-[#f7efe3]">{getDisplayName(player)}</div>
                          <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-black text-[#cdbda8]">
                            {player.id === roomData?.hostId ? <span className="rounded-full border border-[#8a6b42]/25 bg-[#8a6b42]/12 px-2 py-0.5 text-[#f4e9d4]">주최</span> : null}
                            {player.isBot ? <span className="rounded-full border border-[#6b8196]/25 bg-[#223142]/18 px-2 py-0.5 text-[#e3edf7]">봇</span> : null}
                            {!player.isBot ? <span className={`rounded-full border px-2 py-0.5 ${stale ? 'border-[#8a4636]/25 bg-[#8a4636]/14 text-[#f5d7d0]' : 'border-[#7c8f73]/25 bg-[#7c8f73]/12 text-[#eef5e6]'}`}>{stale ? '자리 비움' : '대기 중'}</span> : null}
                          </div>
                        </div>
                        {isHost && player.isBot ? (
                          <button type="button" onClick={() => handleRemoveBot(player.id)} className="tap-feedback rounded-2xl border border-white/10 bg-black/10 p-2 text-[#d5c7b4]" aria-label="제거">
                            <X size={15} />
                          </button>
                        ) : null}
                      </div>
                    );
                  }) : (
                    <div className="panel-soft px-4 py-4 text-sm font-black text-slate-400">참가자가 없다.</div>
                  )}
                </div>

                {isHost && isJoined ? (
                  <button type="button" onClick={handleStart} className="tap-feedback mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#8a6b42]/30 bg-[#8a6b42]/14 px-4 py-3 text-sm font-black text-[#f4e9d4]">
                    <Play size={16} /> 수사 시작
                  </button>
                ) : null}
              </div>
            ) : null}

            {notice ? (
              <div className={`${notice.tone === 'success' ? 'border-[#7c8f73]/25 bg-[#7c8f73]/12 text-[#eef5e6]' : 'border-[#8a4636]/25 bg-[#8a4636]/14 text-[#f5d7d0]'} rounded-2xl border px-4 py-3 text-sm font-black`}>
                <span className="inline-flex items-center gap-2 break-words">{notice.tone === 'success' ? <CheckCircle2 size={15} /> : <X size={15} />}{notice.text}</span>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
