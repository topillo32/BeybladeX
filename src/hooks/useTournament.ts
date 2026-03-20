"use client";
import { useEffect, useState } from "react";
import { doc, collection, onSnapshot, query, orderBy, where } from "firebase/firestore";
import { db } from "@/services/firebase";
import type { Tournament, TournamentGroup, Match, Player } from "@/types";

export const useTournament = (id: string) => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    return onSnapshot(doc(db, "tournaments", id), (d) => {
      setTournament(d.exists() ? ({ id: d.id, ...d.data() } as Tournament) : null);
      setLoading(false);
    });
  }, [id]);

  return { tournament, loading };
};

export const useTournaments = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "tournaments"), orderBy("createdAt", "desc")),
      (snap) => {
        setTournaments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament)));
        setLoading(false);
      }
    );
  }, []);

  return { tournaments, loading };
};

export const useGroups = (tournamentId: string) => {
  const [groups, setGroups] = useState<TournamentGroup[]>([]);

  useEffect(() => {
    if (!tournamentId) return;
    return onSnapshot(
      query(collection(db, "tournaments", tournamentId, "groups"), orderBy("createdAt", "asc")),
      (snap) => setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TournamentGroup)))
    );
  }, [tournamentId]);

  return { groups };
};

export const useMatches = (tournamentId: string, phase?: string) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;
    const q = phase
      ? query(collection(db, "tournaments", tournamentId, "matches"), where("phase", "==", phase), orderBy("createdAt", "asc"))
      : query(collection(db, "tournaments", tournamentId, "matches"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      setMatches(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Match)));
      setLoading(false);
    });
  }, [tournamentId, phase]);

  return { matches, loading };
};

export const usePlayers = (tournamentId?: string) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = tournamentId
      ? query(collection(db, "players"), where("tournamentIds", "array-contains", tournamentId))
      : query(collection(db, "players"), orderBy("createdAt", "desc"));
    return onSnapshot(q,
      (snap) => {
        setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Player)));
        setLoading(false);
      },
      (err) => {
        console.error("usePlayers error:", err.code, err.message);
        setLoading(false);
      }
    );
  }, [tournamentId]);

  return { players, loading };
};

/** All players NOT yet enrolled (approved or pending) in a tournament — for the enroll panel */
export const useUnenrolledPlayers = (tournamentId: string) => {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!tournamentId) return;
    return onSnapshot(
      query(collection(db, "players"), orderBy("createdAt", "desc")),
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Player));
        setPlayers(
          all.filter(
            (p) =>
              !(p.tournamentIds ?? []).includes(tournamentId) &&
              !(p.pendingTournamentIds ?? []).includes(tournamentId)
          )
        );
      }
    );
  }, [tournamentId]);

  return { players };
};

/** Players with pending enrollment in a tournament */
export const usePendingPlayers = (tournamentId: string) => {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!tournamentId) return;
    return onSnapshot(
      query(collection(db, "players"), where("pendingTournamentIds", "array-contains", tournamentId)),
      (snap) => setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Player)))
    );
  }, [tournamentId]);

  return { players };
};
