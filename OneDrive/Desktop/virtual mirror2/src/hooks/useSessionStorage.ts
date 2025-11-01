/**
 * Custom React hook for session storage operations
 */

import { useState, useEffect, useCallback } from 'react';
import sessionStorage, { type StoredSession, type SessionMetrics, type AnalysisResults } from '../services/sessionStorage';

export function useSessionStorage() {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load all sessions
  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allSessions = await sessionStorage.getAllSessions({
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });
      setSessions(allSessions);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save a new session
  const saveSession = useCallback(async (
    metrics: SessionMetrics,
    options: {
      patientName?: string;
      patientAge?: number;
      duration: number;
      dataPoints: number;
      analysisResults?: AnalysisResults;
      notes?: string;
    }
  ): Promise<string> => {
    setError(null);
    try {
      const sessionId = await sessionStorage.saveSession(metrics, options);
      await loadSessions(); // Refresh the list
      return sessionId;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [loadSessions]);

  // Get a single session
  const getSession = useCallback(async (sessionId: string): Promise<StoredSession | null> => {
    setError(null);
    try {
      return await sessionStorage.getSession(sessionId);
    } catch (err) {
      setError(err as Error);
      return null;
    }
  }, []);

  // Update a session
  const updateSession = useCallback(async (
    sessionId: string,
    updates: Partial<Omit<StoredSession, 'id' | 'date' | 'timestamp'>>
  ): Promise<void> => {
    setError(null);
    try {
      await sessionStorage.updateSession(sessionId, updates);
      await loadSessions(); // Refresh the list
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [loadSessions]);

  // Delete a session
  const deleteSession = useCallback(async (sessionId: string): Promise<void> => {
    setError(null);
    try {
      await sessionStorage.deleteSession(sessionId);
      await loadSessions(); // Refresh the list
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [loadSessions]);

  // Delete multiple sessions
  const deleteSessions = useCallback(async (sessionIds: string[]): Promise<void> => {
    setError(null);
    try {
      await sessionStorage.deleteSessions(sessionIds);
      await loadSessions(); // Refresh the list
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [loadSessions]);

  // Clear all sessions
  const clearAllSessions = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      await sessionStorage.clearAllSessions();
      setSessions([]);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  // Search sessions
  const searchSessions = useCallback(async (query: string): Promise<StoredSession[]> => {
    setError(null);
    try {
      return await sessionStorage.searchSessions(query);
    } catch (err) {
      setError(err as Error);
      return [];
    }
  }, []);

  // Get statistics
  const getStatistics = useCallback(async () => {
    setError(null);
    try {
      return await sessionStorage.getStatistics();
    } catch (err) {
      setError(err as Error);
      return null;
    }
  }, []);

  // Export sessions
  const exportSessions = useCallback(async (): Promise<string> => {
    setError(null);
    try {
      return await sessionStorage.exportSessions();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  // Import sessions
  const importSessions = useCallback(async (jsonData: string): Promise<number> => {
    setError(null);
    try {
      const imported = await sessionStorage.importSessions(jsonData);
      await loadSessions(); // Refresh the list
      return imported;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [loadSessions]);

  return {
    sessions,
    loading,
    error,
    loadSessions,
    saveSession,
    getSession,
    updateSession,
    deleteSession,
    deleteSessions,
    clearAllSessions,
    searchSessions,
    getStatistics,
    exportSessions,
    importSessions
  };
}

// Hook for a single session
export function useSession(sessionId: string | null) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      return;
    }

    const loadSession = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await sessionStorage.getSession(sessionId);
        setSession(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  return { session, loading, error };
}

// Hook for session statistics
export function useSessionStatistics() {
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadStatistics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stats = await sessionStorage.getStatistics();
      setStatistics(stats);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  return { statistics, loading, error, refresh: loadStatistics };
}
