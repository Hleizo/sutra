/**
 * API service for Virtual Mirror Backend
 */

const API_BASE_URL = 'http://127.0.0.1:8000/api'

// Types matching backend schemas
export interface PoseLandmark {
  x: number
  y: number
  z: number
  visibility: number
}

export interface PoseFrame {
  frame_number: number
  timestamp: number
  landmarks: PoseLandmark[]
}

export interface SessionCreate {
  task_type: string
}

export interface SessionScores {
  stability_score: number
  balance_score: number
  symmetry_score: number
  rom_score: number
  risk_score: number
}

export interface SessionResponse {
  id: number
  task_type: string
  status: string
  created_at: string
  updated_at: string
  duration_seconds: number | null
  stability_score: number | null
  balance_score: number | null
  symmetry_score: number | null
  rom_score: number | null
  risk_score: number | null
  risk_level: string | null
  scores?: SessionScores
}

export interface ProcessPoseDataRequest {
  pose_data: PoseFrame[]
  duration: number
}

export interface ProcessPoseDataResponse {
  message: string
  session_id: number
  frames_processed: number
  duration: number
  stability_score: number
  balance_score: number
  risk_score: number
  risk_level: string
}

/**
 * Create a new assessment session
 */
export async function createSession(taskType: string = 'one_leg_stance'): Promise<SessionResponse> {
  const response = await fetch(`${API_BASE_URL}/sessions/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ task_type: taskType }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create session: ${error}`)
  }

  return response.json()
}

/**
 * Process pose data for a session
 */
export async function processPoseData(
  sessionId: number,
  poseData: PoseFrame[],
  duration: number
): Promise<ProcessPoseDataResponse> {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pose_data: poseData,
      duration: duration,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to process pose data: ${error}`)
  }

  return response.json()
}

/**
 * Get session results with risk assessment
 */
export async function getSessionResults(sessionId: number): Promise<SessionResponse> {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/results`, {
    method: 'GET',
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get session results: ${error}`)
  }

  return response.json()
}

/**
 * Get all sessions
 */
export async function getAllSessions(): Promise<SessionResponse[]> {
  const response = await fetch(`${API_BASE_URL}/sessions/`, {
    method: 'GET',
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get sessions: ${error}`)
  }

  return response.json()
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to delete session: ${error}`)
  }
}

/**
 * Get PDF report URL for a session
 */
export function getReportUrl(sessionId: number, regenerate: boolean = false): string {
  const params = regenerate ? '?regenerate=true' : ''
  return `${API_BASE_URL}/sessions/${sessionId}/report.pdf${params}`
}

/**
 * Download PDF report for a session
 */
export async function downloadReport(sessionId: number, regenerate: boolean = false): Promise<Blob> {
  const url = getReportUrl(sessionId, regenerate)
  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to download report: ${error}`)
  }

  return response.blob()
}

/**
 * Check if backend API is available
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch('http://127.0.0.1:8000/', {
      method: 'GET',
    })
    return response.ok
  } catch (error) {
    return false
  }
}
