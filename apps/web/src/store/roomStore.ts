import { create } from 'zustand';
import type {
  Room,
  InterviewSession,
  EvaluationReveal,
  RoomResults,
  AwardCategory,
} from '@peerprep/shared-types';

interface RoomStore {
  room: Room | null;
  session: InterviewSession | null;
  latestReveal: EvaluationReveal | null;
  results: RoomResults | null;
  phase: 'lobby' | 'interview' | 'awards' | 'results';
  notifications: { id: string; type: 'info' | 'warning' | 'success'; message: string }[];
  myVotes: Record<AwardCategory, string | null>;

  setRoom: (room: Room) => void;
  setSession: (session: InterviewSession) => void;
  updateVoteCount: (userId: string, count: number) => void;
  setReveal: (reveal: EvaluationReveal) => void;
  setResults: (results: RoomResults) => void;
  setPhase: (phase: RoomStore['phase']) => void;
  addNotification: (type: 'info' | 'warning' | 'success', message: string) => void;
  removeNotification: (id: string) => void;
  setAwardVote: (category: AwardCategory, userId: string) => void;
  reset: () => void;
}

const defaultVotes: Record<AwardCategory, string | null> = {
  best_technical: null,
  best_communicator: null,
  best_critical_thinker: null,
  best_interviewer: null,
};

export const useRoomStore = create<RoomStore>((set, get) => ({
  room: null,
  session: null,
  latestReveal: null,
  results: null,
  phase: 'lobby',
  notifications: [],
  myVotes: { ...defaultVotes },

  setRoom: (room) => set({ room }),
  setSession: (session) => set({ session }),
  updateVoteCount: (userId, count) => {
    const session = get().session;
    if (!session) return;
    set({ session: { ...session, votes: { ...session.votes, [userId]: count.toString() } } });
  },
  setReveal: (reveal) => set({ latestReveal: reveal }),
  setResults: (results) => set({ results, phase: 'results' }),
  setPhase: (phase) => set({ phase }),
  addNotification: (type, message) => {
    const id = crypto.randomUUID();
    set((s) => ({
      notifications: [...s.notifications, { id, type, message }],
    }));
    setTimeout(() => get().removeNotification(id), 4000);
  },
  removeNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
  setAwardVote: (category, userId) =>
    set((s) => ({ myVotes: { ...s.myVotes, [category]: userId } })),
  reset: () =>
    set({ room: null, session: null, latestReveal: null, results: null, phase: 'lobby', notifications: [], myVotes: { ...defaultVotes } }),
}));
