import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { countLineProfile, makeDeckPlaceholders } from '../shared/utils';

function sanitizeRoomData(raw) {
  if (!raw) return null;
  return {
    ...raw,
    decks: {
      1: makeDeckPlaceholders(Array.isArray(raw?.decks?.[1]) ? raw.decks[1].length : raw?.decks?.[1]),
      2: makeDeckPlaceholders(Array.isArray(raw?.decks?.[2]) ? raw.decks[2].length : raw?.decks?.[2]),
      3: makeDeckPlaceholders(Array.isArray(raw?.decks?.[3]) ? raw.decks[3].length : raw?.decks?.[3]),
    },
    witnessStrip: Array.isArray(raw?.witnessStrip) ? raw.witnessStrip : (Array.isArray(raw?.nobles) ? raw.nobles : []),
    nobles: Array.isArray(raw?.witnessStrip) ? raw.witnessStrip : (Array.isArray(raw?.nobles) ? raw.nobles : []),
  };
}

function sanitizePlayer(id, data = {}) {
  return {
    id,
    ...data,
    clueCount: Number(data?.clueCount || 0),
    reservedCount: Number(data?.reservedCount || 0),
    witnessCount: Number(data?.witnessCount || 0),
    caseProgress: Number(data?.caseProgress || 0),
    breakthroughs: Number(data?.breakthroughs || 0),
    turnsTaken: Number(data?.turnsTaken || 0),
    accusationLocked: !!data?.accusationLocked,
    privateClues: [],
    reservedLeads: [],
    notebook: { eliminatedSuspects: [], eliminatedMotives: [], eliminatedMethods: [], notes: [] },
    accusationHistory: [],
    crosscheckPairs: [],
    interrogatedWitnessIds: [],
    lineProfile: countLineProfile([]),
  };
}

function emptyPrivate() {
  return {
    privateClues: [],
    reservedLeads: [],
    notebook: { eliminatedSuspects: [], eliminatedMotives: [], eliminatedMethods: [], notes: [] },
    accusationHistory: [],
    crosscheckPairs: [],
    interrogatedWitnessIds: [],
  };
}

export function useRoomSync({ db, roomCode, userId }) {
  const [roomData, setRoomData] = useState(null);
  const [publicPlayers, setPublicPlayers] = useState([]);
  const [myPrivate, setMyPrivate] = useState(emptyPrivate());

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
      snapshot.forEach((entry) => next.push(sanitizePlayer(entry.id, entry.data())));
      setPublicPlayers(next);
    });

    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [db, roomCode]);

  useEffect(() => {
    if (!db || !roomCode || roomCode.length !== 4 || !userId) {
      setMyPrivate(emptyPrivate());
      return undefined;
    }

    const ref = doc(db, 'rooms', roomCode, 'playersPrivate', userId);
    return onSnapshot(ref, (snapshot) => {
      if (!snapshot.exists()) {
        setMyPrivate(emptyPrivate());
        return;
      }
      const data = snapshot.data() || {};
      setMyPrivate({
        privateClues: Array.isArray(data?.privateClues) ? data.privateClues : [],
        reservedLeads: Array.isArray(data?.reservedLeads) ? data.reservedLeads : [],
        notebook: data?.notebook || { eliminatedSuspects: [], eliminatedMotives: [], eliminatedMethods: [], notes: [] },
        accusationHistory: Array.isArray(data?.accusationHistory) ? data.accusationHistory : [],
        crosscheckPairs: Array.isArray(data?.crosscheckPairs) ? data.crosscheckPairs : [],
        interrogatedWitnessIds: Array.isArray(data?.interrogatedWitnessIds) ? data.interrogatedWitnessIds : [],
      });
    });
  }, [db, roomCode, userId]);

  const players = useMemo(() => {
    const order = Array.isArray(roomData?.turnOrder) && roomData.turnOrder.length
      ? roomData.turnOrder
      : Array.isArray(roomData?.lobbyPlayerIds) ? roomData.lobbyPlayerIds : [];
    const indexMap = new Map(order.map((id, index) => [id, index]));

    const merged = publicPlayers.map((player) => {
      if (player.id !== userId) return player;
      return {
        ...player,
        ...myPrivate,
        reservedCount: myPrivate.reservedLeads.length,
        clueCount: myPrivate.privateClues.length,
        lineProfile: countLineProfile(myPrivate.privateClues),
      };
    });

    if (!order.length) return merged;
    return [...merged].sort((a, b) => (indexMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (indexMap.get(b.id) ?? Number.MAX_SAFE_INTEGER));
  }, [myPrivate, publicPlayers, roomData?.lobbyPlayerIds, roomData?.turnOrder, userId]);

  return { roomData, players, myPrivate };
}
