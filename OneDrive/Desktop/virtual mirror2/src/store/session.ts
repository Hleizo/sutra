import { create } from 'zustand';

export type TaskName = 'raise_hand' | 'one_leg' | 'walk' | 'jump';

export type TaskMetric = {
  task: TaskName;
  metrics: Record<string, number | string>;
  flags?: string[];
};

export type SessionSummary = {
  sessionId: string;
  childAgeYears?: number;
  startedAt: string;
  endedAt?: string;
  overallRisk?: 'normal' | 'monitor' | 'high';
  tasks: TaskMetric[];
};

interface SessionStore {
  current: SessionSummary | null;
  setCurrent: (summary: SessionSummary) => void;
  getCurrent: () => SessionSummary | null;
  clear: () => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  current: null,
  setCurrent: (summary) => set({ current: summary }),
  getCurrent: () => get().current,
  clear: () => set({ current: null }),
}));
