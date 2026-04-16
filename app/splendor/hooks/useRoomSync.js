import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import {
  hasRealCardPayload,
  makeDeckPlaceholders,
  normalizeBonuses,
  normalizeResources,
} from '../shared/utils';

function sanitizeRoomData(raw) {
  if (!raw) return null;
  return {
    ...raw,
    decks: {
      1: makeDeckPlaceholders(Array.isArray(raw?.decks?.[1]) ? raw.decks[1].length : raw?.decks?.[1]),
      2: makeDeckPlaceholders(Array.isArray(raw?.decks?.[2]) ? raw.decks[2].length : raw?.decks?.[2]),
      3: makeDeckPlaceholders(Array.isArray(raw?.decks?.[3]) ? raw.decks[3].length : raw?.decks?.[3]),
    },
  };
}

function sanitizePlayer(id, data = {}) {
  const clues = Array.isArray(data?.clues) ? data.clues : (Array.isArray(data?.cards) ? data.cards : []);
  return {
    id,
    ...data,
    resources: normalizeResources(data?.resources || data?.gems),
    gems: normalizeResources(data?.resources || data?.gems),
    clues,
    cards: clues,
    insights: normalizeBonuses(data?.insights || data?.bonuses, clues),
    bonuses: normalizeBonuses(data?.insights || data?.bonuses, clues),
    reservedCount: Number.isFinite(data?.reservedCount)
      ? data.reservedCount
      : Array.isArray(data?.reserved) ? data.reserved.length : 0,
    reserved: hasRealCardPayload(data?.reserved) ? data.reserved : [],
    reservedLeads: [],
    witnesses: Array.isArray(data?.witnesses) ? data.witnesses : (Array.isArray(data?.nobles) ? data.nobles : []),
    nobles: Array.isArray(data?.witnesses) ? data.witnesses : (Array.isArray(data?.nobles) ? data.nobles : []),
  };
}

export function useRoomSync({ db, roomCode, userId }) {
  const [roomData, setRoomData] = useState(null);
  const [publicPlayers, setPublicPlayers] = useState([]);
  const [myPrivate, setMyPrivate] = useState({
    reservedLeads: [],
    reserved: [],
    notebook: { eliminatedSuspects: [], eliminatedMotives: [], eliminatedMethods: [], notes: [] },
    accusationHistory: [],
  });

  useEffect(() => {
    if (!db || !roomCode || roomCode.length !== 4) {
      setRoomData(null);
      setPublicPlayers([]);
      return undefined;
    }

    const unsubRoom = onSnapshot(doc(db, 'rooms', roomCode), (snapshot) => {
      if (!snapshot.exists()) {
        setRoomData(null);
        setPublicPlayers([]);
        return;
      }
      setRoomData(sanitizeRoomData(snapshot.data()));
    });

    const unsubPlayers = onSnapshot(collection(db, 'rooms', roomCode, 'players'), (snapshot) => {
      const next = [];
      snapshot.forEach((entry) => {
        next.push(sanitizePlayer(entry.id, entry.data()));
      });
      setPublicPlayers(next);
    });

    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [db, roomCode]);

  useEffect(() => {
    if (!db || !roomCode || roomCode.length !== 4 || !userId) {
      setMyPrivate({
        reservedLeads: [],
        reserved: [],
        notebook: { eliminatedSuspects: [], eliminatedMotives: [], eliminatedMethods: [], notes: [] },
        accusationHistory: [],
      });
      return undefined;
    }

    const ref = doc(db, 'rooms', roomCode, 'playersPrivate', userId);
    return onSnapshot(ref, (snapshot) => {
      if (!snapshot.exists()) {
        setMyPrivate({
          reservedLeads: [],
          reserved: [],
          notebook: { eliminatedSuspects: [], eliminatedMotives: [], eliminatedMethods: [], notes: [] },
          accusationHistory: [],
        });
        return;
      }
      const data = snapshot.data() || {};
      const reservedLeads = Array.isArray(data?.reservedLeads)
        ? data.reservedLeads
        : Array.isArray(data?.reserved) ? data.reserved : [];
      setMyPrivate({
        ...data,
        reservedLeads,
        reserved: reservedLeads,
        notebook: data?.notebook || { eliminatedSuspects: [], eliminatedMotives: [], eliminatedMethods: [], notes: [] },
        accusationHistory: Array.isArray(data?.accusationHistory) ? data.accusationHistory : [],
      });
    });
  }, [db, roomCode, userId]);

  const players = useMemo(() => {
    const preferredOrder = Array.isArray(roomData?.turnOrder) && roomData.turnOrder.length
      ? roomData.turnOrder
      : Array.isArray(roomData?.lobbyPlayerIds) ? roomData.lobbyPlayerIds : [];
    const indexMap = new Map(preferredOrder.map((id, index) => [id, index]));

    const merged = publicPlayers.map((player) => {
      if (player.id !== userId) return player;
      return {
        ...player,
        reservedLeads: myPrivate.reservedLeads,
        reserved: myPrivate.reservedLeads,
        notebook: myPrivate.notebook,
        accusationHistory: myPrivate.accusationHistory,
        reservedCount: myPrivate.reservedLeads.length,
      };
    });

    if (!preferredOrder.length) return merged;
    return [...merged].sort((a, b) => (indexMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (indexMap.get(b.id) ?? Number.MAX_SAFE_INTEGER));
  }, [myPrivate, publicPlayers, roomData?.lobbyPlayerIds, roomData?.turnOrder, userId]);

  return { roomData, players, myPrivate };
}
