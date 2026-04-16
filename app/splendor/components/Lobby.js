'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Copy,
  Link2,
  Play,
  Plus,
  RefreshCw,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import BeginnerGuide from './BeginnerGuide';
import { BOT_NAME, CASE_TAGLINE, ROOM_MAX_PLAYERS } from '../shared/constants';
import { createCaseSeed, createSeededRandom, seededShuffle } from '../shared/caseData';
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

  const isJoined = useMemo(() => !!user?.uid && players.some((player) => player.id === user.uid), [players, user?.uid]);
  const isHost = roomData?.hostId === user?.uid;
  const lobbyPlayers = useMemo(() => buildLobbyOrder(roomData, players), [roomData, players]);
  const botCount = lobbyPlayers.filter((player) => player.isBot).length;
  const roomPresenceAt = useMemo(() => toMillis(roomData?.presenceAt || roomData?.updatedAt || 0), [roomData?.presenceAt, roomData?.updatedAt]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => () => {
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
  }, []);

  const pushNotice = (tone, text) => setNotice({ tone, text });

  const copyInviteLink = async () => {
    if (typeof window === 'undefined' || !roomCode) return;
    try {
      const baseUrl = window.location.href.split('?')[0];
      const inviteUrl = `${baseUrl}?room=${roomCode}`;
      await navigator.clipboard.writeText(inviteUrl);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      setCopyStatus('copied');
      pushNotice('success', '초대 링크를 복사했다.');
      copyTimerRef.current = window.setTimeout(() => setCopyStatus(null), 1600);
    } catch {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      setCopyStatus('error');
      pushNotice('error', '링크 복사가 미끄러졌어.');
      copyTimerRef.current = window.setTimeout(() => setCopyStatus(null), 1600);
    }
  };

  const requireUser = () => {
    if (user?.uid) return true;
    pushNotice('error', '익명 로그인 준비가 아직 덜 됐어. 잠깐만 다시 눌러 줘.');
    return false;
  };

  const handleCreate = async () => {
    if (!requireUser()) return;
    const nickname = playerName.trim();
    if (!nickname) {
      pushNotice('error', '수사관 이름부터 적어 줘.');
      return;
    }

    try {
      let createdCode = null;
      for (let attempt = 0; attempt < 20 && !createdCode; attempt += 1) {
        const code = randomRoomCode();
        const roomRef = doc(db, 'rooms', code);
        const roomPrivateRef = doc(db, 'rooms', code, 'meta', 'private');
        const playerRef = doc(db, 'rooms', code, 'players', user.uid);
        const playerPrivateRef = doc(db, 'rooms', code, 'playersPrivate', user.uid);
        const seed = createCaseSeed();
        const caseSetup = buildCaseSetup({ seed, playerCount: 1 });

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
            schemaVersion: 4,
            caseSeed: seed,
            lobbyPlayerIds: [user.uid],
            caseTitle: caseSetup.public.caseTitle,
            caseBrief: caseSetup.public.caseBrief,
            accusationThreshold: caseSetup.public.accusationThreshold,
            board: caseSetup.public.board,
            decks: caseSetup.public.decks,
            witnessStrip: caseSetup.public.witnessStrip,
            nobles: caseSetup.public.nobles,
            bank: caseSetup.public.bank,
            turnOrder: [],
            turnIndex: 0,
            turnNumber: 1,
            actionLock: null,
            pending: null,
            finalRound: null,
            winnerId: null,
            reveal: null,
            logSeq: 1,
            log: [
              {
                seq: 1,
                ts: Date.now(),
                type: 'LOBBY_CREATE',
                actorId: user.uid,
                message: `${nickname}이 사건 방을 열었다.`,
              },
            ],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            presenceAt: serverTimestamp(),
          });
          tx.set(roomPrivateRef, caseSetup.private);
          tx.set(playerRef, {
            ...createPublicPlayerPayload(nickname, false),
            online: true,
            lastSeenAt: serverTimestamp(),
          });
          tx.set(playerPrivateRef, createPrivatePlayerPayload());
        });

        if (!collided) createdCode = code;
      }

      if (!createdCode) throw new Error('방 코드를 연속으로 확보하지 못했어. 다시 한 번만.');
      setRoomCode(createdCode);
      setIsInviteMode(false);
      pushNotice('success', `${createdCode} 방을 열었다.`);
    } catch (error) {
      pushNotice('error', error?.message || '방을 열다가 손이 꼬였어.');
    }
  };

  const handleJoin = async () => {
    if (!requireUser()) return;
    const nickname = playerName.trim();
    const code = roomCode.trim().toUpperCase();
    if (!nickname) {
      pushNotice('error', '수사관 이름부터 적어 줘.');
      return;
    }
    if (code.length !== 4) {
      pushNotice('error', '방 코드는 네 글자야.');
      return;
    }

    try {
      const roomRef = doc(db, 'rooms', code);
      const playerRef = doc(db, 'rooms', code, 'players', user.uid);
      const playerPrivateRef = doc(db, 'rooms', code, 'playersPrivate', user.uid);
      await runTransaction(db, async (tx) => {
        const roomSnap = await tx.get(roomRef);
        if (!roomSnap.exists()) throw new Error('그 코드의 사건 방은 없어.');
        const room = roomSnap.data();
        if (room.status !== 'lobby') throw new Error('이미 수사가 시작돼서 지금은 못 들어가.');

        const lobbyIds = Array.isArray(room.lobbyPlayerIds) ? [...room.lobbyPlayerIds] : [];
        const alreadyJoined = lobbyIds.includes(user.uid);
        if (!alreadyJoined && lobbyIds.length >= ROOM_MAX_PLAYERS) {
          throw new Error('방이 이미 가득 찼어.');
        }

        if (!alreadyJoined) lobbyIds.push(user.uid);
        tx.set(roomRef, {
          lobbyPlayerIds: lobbyIds,
          updatedAt: serverTimestamp(),
          presenceAt: serverTimestamp(),
        }, { merge: true });
        tx.set(playerRef, {
          ...createPublicPlayerPayload(nickname, false),
          name: nickname,
          online: true,
          lastSeenAt: serverTimestamp(),
        }, { merge: true });
        tx.set(playerPrivateRef, createPrivatePlayerPayload(), { merge: true });
      });

      setRoomCode(code);
      setIsInviteMode(false);
      pushNotice('success', `${code} 사건 방에 합류했다.`);
    } catch (error) {
      pushNotice('error', error?.message || '방에 합류하지 못했어.');
    }
  };

  const handleAddBot = async () => {
    if (!isHost) return;
    if (lobbyPlayers.length >= ROOM_MAX_PLAYERS) {
      pushNotice('error', '더는 인원을 넣을 자리가 없어.');
      return;
    }

    const botId = createBotId();
    const botName = botCount > 0 ? `${BOT_NAME} ${botCount + 1}` : BOT_NAME;

    try {
      const roomRef = doc(db, 'rooms', roomCode);
      const playerRef = doc(db, 'rooms', roomCode, 'players', botId);
      const playerPrivateRef = doc(db, 'rooms', roomCode, 'playersPrivate', botId);

      await runTransaction(db, async (tx) => {
        const roomSnap = await tx.get(roomRef);
        if (!roomSnap.exists()) throw new Error('사건 방이 사라졌어.');
        const room = roomSnap.data();
        if (room.status !== 'lobby') throw new Error('수사가 시작된 뒤엔 봇을 못 부른다.');
        const lobbyIds = Array.isArray(room.lobbyPlayerIds) ? [...room.lobbyPlayerIds] : [];
        if (lobbyIds.length >= ROOM_MAX_PLAYERS) throw new Error('방이 가득 찼어.');
        lobbyIds.push(botId);
        tx.set(roomRef, {
          lobbyPlayerIds: lobbyIds,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        tx.set(playerRef, {
          ...createPublicPlayerPayload(botName, true),
          online: true,
          lastSeenAt: serverTimestamp(),
        });
        tx.set(playerPrivateRef, createPrivatePlayerPayload());
      });
      pushNotice('success', `${botName}을 불러 세웠다.`);
    } catch (error) {
      pushNotice('error', error?.message || '봇을 부르지 못했어.');
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
        if (!roomSnap.exists()) throw new Error('사건 방이 사라졌어.');
        const room = roomSnap.data();
        const lobbyIds = Array.isArray(room.lobbyPlayerIds) ? room.lobbyPlayerIds.filter((id) => id !== botId) : [];
        tx.set(roomRef, { lobbyPlayerIds: lobbyIds, updatedAt: serverTimestamp() }, { merge: true });
        tx.delete(playerRef);
        tx.delete(playerPrivateRef);
      });
      pushNotice('success', '봇 한 명을 대기열에서 뺐다.');
    } catch (error) {
      pushNotice('error', error?.message || '봇을 정리하지 못했어.');
    }
  };

  const handleStart = async () => {
    if (!isHost) return;
    try {
      const roomRef = doc(db, 'rooms', roomCode);
      const roomPrivateRef = doc(db, 'rooms', roomCode, 'meta', 'private');

      await runTransaction(db, async (tx) => {
        const roomSnap = await tx.get(roomRef);
        if (!roomSnap.exists()) throw new Error('사건 방이 사라졌어.');
        const room = roomSnap.data();
        if (room.status !== 'lobby') throw new Error('이미 수사가 시작됐어.');

        const roomPresenceAt = toMillis(room.presenceAt || room.updatedAt || 0);
        const candidateIds = Array.isArray(room.lobbyPlayerIds) ? room.lobbyPlayerIds : [];
        const live = [];
        const playerDocs = new Map();
        for (const playerId of candidateIds) {
          const playerSnap = await tx.get(doc(db, 'rooms', roomCode, 'players', playerId));
          if (!playerSnap.exists()) continue;
          const player = { id: playerId, ...playerSnap.data() };
          const stale = !player.isBot && isPlayerStaleFromPresence({ player, roomPresenceAt });
          if (stale) continue;
          live.push(playerId);
          playerDocs.set(playerId, player);
        }

        if (!live.length) throw new Error('출발할 수사관이 한 명도 없어.');

        const seed = createCaseSeed();
        const caseSetup = buildCaseSetup({ seed, playerCount: live.length });
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
          bank: caseSetup.public.bank,
          turnOrder,
          turnIndex: 0,
          turnNumber: 1,
          actionLock: { turnIndex: 0, playerId: firstPlayerId, used: false },
          pending: null,
          finalRound: null,
          winnerId: null,
          reveal: null,
          logSeq: 1,
          log: [
            {
              seq: 1,
              ts: Date.now(),
              type: 'GAME_START',
              actorId: user.uid,
              message: `${getDisplayName(playerDocs.get(firstPlayerId))}부터 현장을 뒤진다.`,
            },
          ],
          updatedAt: serverTimestamp(),
          presenceAt: serverTimestamp(),
        }, { merge: true });
        tx.set(roomPrivateRef, caseSetup.private, { merge: false });
      });

      pushNotice('success', '봉인이 열렸다. 수사를 시작한다.');
    } catch (error) {
      pushNotice('error', error?.message || '수사를 시작하지 못했어.');
    }
  };

  const headline = roomData?.status === 'lobby' && isJoined ? '대기 중인 수사관' : '사건 방 입장';

  return (
    <div className="app-shell game-surface safe-top safe-bottom">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden px-4 pb-4 pt-3">
        <div className="panel motion-panel-in mx-auto w-full max-w-3xl overflow-hidden">
          <div className="border-b border-white/10 px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-black tracking-[0.24em] text-amber-200/80">사건 파일</div>
                <h1 className="mt-2 text-2xl font-black text-white">가면 경매장의 마지막 증언</h1>
                <p className="mt-2 text-sm font-bold text-slate-300">{CASE_TAGLINE}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2 text-right">
                <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">방 코드</div>
                <div className="mt-1 text-xl font-black text-white">{roomCode || '----'}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 px-5 py-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="text-xs font-black tracking-[0.18em] text-slate-400">{headline}</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="panel-soft px-4 py-3">
                  <div className="text-xs font-black tracking-[0.16em] text-slate-400">수사관 이름</div>
                  <input
                    value={playerName}
                    onChange={(event) => setPlayerName(event.target.value.slice(0, 14))}
                    placeholder="예: 강하린"
                    className="mt-2 w-full bg-transparent text-base font-black text-white outline-none placeholder:text-slate-500"
                  />
                </label>
                <label className="panel-soft px-4 py-3">
                  <div className="text-xs font-black tracking-[0.16em] text-slate-400">방 코드</div>
                  <input
                    value={roomCode}
                    onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
                    placeholder="ABCD"
                    className="mt-2 w-full bg-transparent text-base font-black uppercase tracking-[0.24em] text-white outline-none placeholder:text-slate-500"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleCreate}
                  className="tap-feedback motion-cta min-h-12 rounded-2xl border border-emerald-300/25 bg-emerald-500/18 px-4 py-3 text-sm font-black text-emerald-50"
                >
                  <span className="inline-flex items-center gap-2"><Plus size={16} /> 새 사건 방 열기</span>
                </button>
                <button
                  type="button"
                  onClick={handleJoin}
                  className="tap-feedback motion-cta min-h-12 rounded-2xl border border-sky-300/25 bg-sky-500/18 px-4 py-3 text-sm font-black text-sky-50"
                >
                  <span className="inline-flex items-center gap-2"><Link2 size={16} /> 방 참여</span>
                </button>
              </div>

              {roomData?.status === 'lobby' ? (
                <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/36 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-black tracking-[0.16em] text-slate-400">대기열</div>
                      <div className="mt-1 text-lg font-black text-white">{lobbyPlayers.length}/{ROOM_MAX_PLAYERS}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={copyInviteLink}
                        disabled={!roomCode}
                        className="tap-feedback rounded-2xl border border-white/10 bg-slate-900/58 px-3 py-2 text-sm font-black text-slate-100 disabled:text-slate-500"
                      >
                        <span className="inline-flex items-center gap-2"><Copy size={15} /> {copyStatus === 'copied' ? '복사 완료' : '초대 링크'}</span>
                      </button>
                      {isHost ? (
                        <button
                          type="button"
                          onClick={handleAddBot}
                          className="tap-feedback rounded-2xl border border-white/10 bg-slate-900/58 px-3 py-2 text-sm font-black text-slate-100"
                        >
                          <span className="inline-flex items-center gap-2"><Bot size={15} /> 봇 추가</span>
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {lobbyPlayers.length ? lobbyPlayers.map((player) => {
                      const stale = !player.isBot && isPlayerStaleFromPresence({ player, roomPresenceAt });
                      return (
                        <div key={player.id} className="panel-soft flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-white">{getDisplayName(player)}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
                              {player.id === roomData?.hostId ? <span className="rounded-full border border-amber-300/25 bg-amber-500/12 px-2 py-1 text-amber-100">주최</span> : null}
                              {player.isBot ? <span className="rounded-full border border-sky-300/25 bg-sky-500/12 px-2 py-1 text-sky-100">자동기록관</span> : null}
                              {!player.isBot ? (
                                <span className={`rounded-full border px-2 py-1 ${stale ? 'border-rose-300/25 bg-rose-500/12 text-rose-100' : 'border-emerald-300/25 bg-emerald-500/12 text-emerald-100'}`}>
                                  {stale ? '응답 없음' : '준비 중'}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          {isHost && player.isBot ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveBot(player.id)}
                              className="tap-feedback rounded-2xl border border-white/10 bg-slate-900/60 p-2 text-slate-300"
                              aria-label={`${player.name} 제거`}
                            >
                              <X size={16} />
                            </button>
                          ) : null}
                        </div>
                      );
                    }) : (
                      <div className="panel-soft px-4 py-5 text-sm font-bold text-slate-400">아직 대기열이 비어 있다. 수사관 이름을 적고 방을 열거나 합류해 줘.</div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm font-bold text-slate-300">
                      혼자 시작해도 되지만, 자동기록관을 하나쯤 세워 두면 수사가 훨씬 살아난다.
                    </div>
                    {isHost && isJoined ? (
                      <button
                        type="button"
                        onClick={handleStart}
                        className="tap-feedback motion-cta min-h-12 rounded-2xl border border-amber-300/30 bg-amber-500/18 px-5 py-3 text-sm font-black text-amber-50"
                      >
                        <span className="inline-flex items-center gap-2"><Play size={16} /> 수사 시작</span>
                      </button>
                    ) : (
                      <div className="text-xs font-bold text-slate-500">주최 수사관만 사건을 열 수 있어.</div>
                    )}
                  </div>
                </div>
              ) : null}

              {notice ? (
                <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-black ${notice.tone === 'success' ? 'border-emerald-300/30 bg-emerald-500/15 text-emerald-50' : 'border-rose-300/30 bg-rose-500/15 text-rose-50'}`}>
                  <span className="inline-flex items-center gap-2">
                    {notice.tone === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    {notice.text}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="panel-soft px-4 py-4">
                <div className="text-xs font-black tracking-[0.18em] text-slate-400">사건 개요</div>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-200">
                  왕실 보석 전시와 비밀 경매가 겹친 밤, 전시 책임자가 쓰러졌고 왕관 보석이 사라졌다. 남은 건 가면, 거짓말, 그리고 어딘가 맞지 않는 기록뿐이다.
                </p>
                <div className="mt-4 grid gap-2 text-sm font-bold text-slate-300">
                  <div className="flex items-start gap-2"><ShieldAlert size={16} className="mt-0.5 text-amber-200" /> 범인 1명, 동기 1개, 수법 1개를 끝내 특정해야 한다.</div>
                  <div className="flex items-start gap-2"><Users size={16} className="mt-0.5 text-sky-200" /> 1~4인. 혼자여도 시작 가능, 자동기록관 추가 가능.</div>
                  <div className="flex items-start gap-2"><RefreshCw size={16} className="mt-0.5 text-emerald-200" /> 기존 방 구조와 익명 로그인, 초대 링크, 봇 루프를 그대로 쓴다.</div>
                </div>
              </div>

              <BeginnerGuide mode="lobby" />

              {isInviteMode ? (
                <div className="rounded-3xl border border-sky-300/18 bg-sky-500/10 px-4 py-3 text-sm font-bold text-sky-50">
                  초대 링크를 따라 들어왔네. 방 코드가 자동으로 채워져 있으니 이름만 적고 바로 합류하면 된다.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
