/**
 * Session Storage Service using IndexedDB
 * Stores movement assessment sessions for later review
 */

export interface SessionMetrics {
  // Pose data
  poseData?: any[];
  
  // Task-specific metrics
  raiseHandMetrics?: {
    leftShoulderMax: number;
    rightShoulderMax: number;
    leftSuccess: boolean;
    rightSuccess: boolean;
    overallSuccess: boolean;
  };
  
  balanceMetrics?: {
    maxBalanceTime: number;
    stabilityScore: number;
    balanceLevel: string;
    fallCount: number;
    success: boolean;
  };
  
  walkMetrics?: {
    stepCount: number;
    gaitSymmetry: number;
    cadence: number;
    symmetryLevel: string;
    success: boolean;
  };
  
  jumpMetrics?: {
    jumpCount: number;
    maxJumpHeight: number;
    landingControl: number;
    landingSymmetry: number;
    success: boolean;
  };
  
  // ROM and symmetry data
  romData?: Record<string, {
    min: number;
    max: number;
    range: number;
    mean: number;
    stdDev: number;
  }>;
  
  symmetryData?: Record<string, {
    left_avg: number;
    right_avg: number;
    difference: number;
    percentage: number;
  }>;
}

export interface AnalysisResults {
  risk_level: string;
  classification: string;
  confidence: number;
  flags: string[];
  recommendations: string[];
  detailed_metrics?: any;
}

export interface StoredSession {
  id: string;
  patientName?: string;
  patientAge?: number;
  date: string; // ISO string
  timestamp: number; // Unix timestamp for sorting
  duration: number; // seconds
  dataPoints: number;
  metrics: SessionMetrics;
  analysisResults?: AnalysisResults;
  notes?: string;
  videoThumbnail?: string; // Base64 encoded thumbnail
}

class SessionStorageService {
  private dbName = 'VirtualMirrorDB';
  private dbVersion = 1;
  private storeName = 'sessions';
  private db: IDBDatabase | null = null;

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
          
          // Create indexes for efficient querying
          objectStore.createIndex('date', 'date', { unique: false });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('patientName', 'patientName', { unique: false });
          objectStore.createIndex('patientAge', 'patientAge', { unique: false });
          objectStore.createIndex('risk_level', 'analysisResults.risk_level', { unique: false });
          
          console.log('Object store created with indexes');
        }
      };
    });
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `session_${timestamp}_${random}`;
  }

  /**
   * Save a new session to IndexedDB
   */
  async saveSession(
    metrics: SessionMetrics,
    options: {
      patientName?: string;
      patientAge?: number;
      duration: number;
      dataPoints: number;
      analysisResults?: AnalysisResults;
      notes?: string;
      videoThumbnail?: string;
    }
  ): Promise<string> {
    await this.ensureInitialized();

    const session: StoredSession = {
      id: this.generateSessionId(),
      patientName: options.patientName,
      patientAge: options.patientAge,
      date: new Date().toISOString(),
      timestamp: Date.now(),
      duration: options.duration,
      dataPoints: options.dataPoints,
      metrics,
      analysisResults: options.analysisResults,
      notes: options.notes,
      videoThumbnail: options.videoThumbnail
    };

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.add(session);

      request.onsuccess = () => {
        console.log('Session saved successfully:', session.id);
        resolve(session.id);
      };

      request.onerror = () => {
        console.error('Failed to save session:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Update an existing session
   */
  async updateSession(
    sessionId: string,
    updates: Partial<Omit<StoredSession, 'id' | 'date' | 'timestamp'>>
  ): Promise<void> {
    await this.ensureInitialized();

    const existingSession = await this.getSession(sessionId);
    if (!existingSession) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const updatedSession: StoredSession = {
      ...existingSession,
      ...updates
    };

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.put(updatedSession);

      request.onsuccess = () => {
        console.log('Session updated successfully:', sessionId);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to update session:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get a single session by ID
   */
  async getSession(sessionId: string): Promise<StoredSession | null> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.get(sessionId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('Failed to get session:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all sessions, optionally filtered
   */
  async getAllSessions(options?: {
    limit?: number;
    offset?: number;
    sortBy?: 'date' | 'timestamp';
    sortOrder?: 'asc' | 'desc';
    filterByPatientName?: string;
    filterByAge?: number;
    filterByRiskLevel?: string;
  }): Promise<StoredSession[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      
      // Use index if sorting by indexed field
      const source = options?.sortBy === 'timestamp' 
        ? objectStore.index('timestamp')
        : objectStore.index('date');
      
      const direction = options?.sortOrder === 'asc' ? 'next' : 'prev';
      const request = source.openCursor(null, direction);
      
      const sessions: StoredSession[] = [];
      let skipped = 0;
      const offset = options?.offset || 0;
      const limit = options?.limit || Infinity;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor && sessions.length < limit) {
          const session = cursor.value as StoredSession;
          
          // Apply filters
          let include = true;
          
          if (options?.filterByPatientName && 
              session.patientName?.toLowerCase() !== options.filterByPatientName.toLowerCase()) {
            include = false;
          }
          
          if (options?.filterByAge && session.patientAge !== options.filterByAge) {
            include = false;
          }
          
          if (options?.filterByRiskLevel && 
              session.analysisResults?.risk_level !== options.filterByRiskLevel) {
            include = false;
          }
          
          if (include) {
            if (skipped < offset) {
              skipped++;
            } else {
              sessions.push(session);
            }
          }
          
          cursor.continue();
        } else {
          resolve(sessions);
        }
      };

      request.onerror = () => {
        console.error('Failed to get sessions:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete a session by ID
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.delete(sessionId);

      request.onsuccess = () => {
        console.log('Session deleted successfully:', sessionId);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to delete session:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete multiple sessions
   */
  async deleteSessions(sessionIds: string[]): Promise<void> {
    await this.ensureInitialized();

    const promises = sessionIds.map(id => this.deleteSession(id));
    await Promise.all(promises);
  }

  /**
   * Clear all sessions
   */
  async clearAllSessions(): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.clear();

      request.onsuccess = () => {
        console.log('All sessions cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to clear sessions:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get session count
   */
  async getSessionCount(): Promise<number> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.count();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Failed to count sessions:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Export sessions to JSON
   */
  async exportSessions(): Promise<string> {
    const sessions = await this.getAllSessions();
    return JSON.stringify(sessions, null, 2);
  }

  /**
   * Import sessions from JSON
   */
  async importSessions(jsonData: string): Promise<number> {
    const sessions: StoredSession[] = JSON.parse(jsonData);
    let imported = 0;

    for (const session of sessions) {
      try {
        await this.saveSession(session.metrics, {
          patientName: session.patientName,
          patientAge: session.patientAge,
          duration: session.duration,
          dataPoints: session.dataPoints,
          analysisResults: session.analysisResults,
          notes: session.notes,
          videoThumbnail: session.videoThumbnail
        });
        imported++;
      } catch (error) {
        console.error('Failed to import session:', error);
      }
    }

    return imported;
  }

  /**
   * Get statistics about stored sessions
   */
  async getStatistics(): Promise<{
    totalSessions: number;
    totalDataPoints: number;
    averageDuration: number;
    riskLevelDistribution: Record<string, number>;
    ageDistribution: Record<string, number>;
    sessionsThisWeek: number;
    sessionsThisMonth: number;
  }> {
    const sessions = await this.getAllSessions();
    
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    
    const stats = {
      totalSessions: sessions.length,
      totalDataPoints: 0,
      averageDuration: 0,
      riskLevelDistribution: {} as Record<string, number>,
      ageDistribution: {} as Record<string, number>,
      sessionsThisWeek: 0,
      sessionsThisMonth: 0
    };

    let totalDuration = 0;

    sessions.forEach(session => {
      // Data points
      stats.totalDataPoints += session.dataPoints;
      
      // Duration
      totalDuration += session.duration;
      
      // Risk level
      const risk = session.analysisResults?.risk_level || 'unknown';
      stats.riskLevelDistribution[risk] = (stats.riskLevelDistribution[risk] || 0) + 1;
      
      // Age groups
      if (session.patientAge) {
        const ageGroup = `${Math.floor(session.patientAge / 5) * 5}-${Math.floor(session.patientAge / 5) * 5 + 4}`;
        stats.ageDistribution[ageGroup] = (stats.ageDistribution[ageGroup] || 0) + 1;
      }
      
      // Time-based
      const sessionAge = now - session.timestamp;
      if (sessionAge <= oneWeek) {
        stats.sessionsThisWeek++;
      }
      if (sessionAge <= oneMonth) {
        stats.sessionsThisMonth++;
      }
    });

    stats.averageDuration = sessions.length > 0 ? totalDuration / sessions.length : 0;

    return stats;
  }

  /**
   * Search sessions by keywords
   */
  async searchSessions(query: string): Promise<StoredSession[]> {
    const allSessions = await this.getAllSessions();
    const lowerQuery = query.toLowerCase();

    return allSessions.filter(session => {
      const searchFields = [
        session.id,
        session.patientName || '',
        session.notes || '',
        session.analysisResults?.classification || '',
        session.analysisResults?.risk_level || '',
        ...(session.analysisResults?.recommendations || [])
      ].map(field => field.toString().toLowerCase());

      return searchFields.some(field => field.includes(lowerQuery));
    });
  }
}

// Create singleton instance
const sessionStorage = new SessionStorageService();

// Auto-initialize on module load
sessionStorage.init().catch(console.error);

export default sessionStorage;
