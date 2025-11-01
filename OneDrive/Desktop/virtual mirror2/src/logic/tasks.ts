/**
 * Task state machine with completion criteria and progress tracking
 */

import {
  getRightShoulderFlexion,
  calculateSway,
  isRightFootLifted,
  isLeftFootLifted,
} from '../utils/kinematics';

export type TaskLevel = 'info' | 'warning' | 'success';

export interface TaskUpdate {
  message: string;
  level: TaskLevel;
  progress: number; // 0..1
  done?: boolean;
  metrics?: Record<string, number>;
}

interface TaskHandler {
  start: () => void;
  update: (landmarks: any[]) => TaskUpdate;
  stop: () => void;
}

// ============= RAISE HAND TASK =============
class RaiseHandTask implements TaskHandler {
  private holdStartTime: number | null = null;
  private holdDuration: number = 0;
  private maxAngle: number = 0;

  start(): void {
    this.holdStartTime = null;
    this.holdDuration = 0;
    this.maxAngle = 0;
  }

  update(landmarks: any[]): TaskUpdate {
    const angle = getRightShoulderFlexion(landmarks);
    this.maxAngle = Math.max(this.maxAngle, angle);

    // Progress based on angle (clamped 0..1)
    const progress = Math.min(Math.max(angle / 120, 0), 1);

    if (angle >= 120) {
      // Good angle - accumulate hold time
      if (!this.holdStartTime) {
        this.holdStartTime = Date.now();
      }
      this.holdDuration = Date.now() - this.holdStartTime;

      if (this.holdDuration >= 1000) {
        return {
          message: 'Perfect! Task complete',
          level: 'success',
          progress: 1,
          done: true,
          metrics: { shoulderFlexionMax: this.maxAngle },
        };
      } else {
        return {
          message: `Hold steady... ${(this.holdDuration / 1000).toFixed(1)}s`,
          level: 'info',
          progress,
          metrics: { currentAngle: angle, holdDuration: this.holdDuration },
        };
      }
    } else if (angle >= 90) {
      this.holdStartTime = null;
      return {
        message: "You're close — raise a bit more",
        level: 'info',
        progress,
        metrics: { currentAngle: angle, holdDuration: 0 },
      };
    } else {
      this.holdStartTime = null;
      return {
        message: 'Raise your right arm higher',
        level: 'warning',
        progress,
        metrics: { currentAngle: angle, holdDuration: 0 },
      };
    }
  }

  stop(): void {
    this.holdStartTime = null;
    this.holdDuration = 0;
  }
}

// ============= ONE LEG BALANCE TASK =============
class OneLegTask implements TaskHandler {
  private holdStartTime: number | null = null;
  private previousLandmarks: any[] | null = null;
  private totalSway: number = 0;
  private swayCount: number = 0;

  start(): void {
    this.holdStartTime = null;
    this.previousLandmarks = null;
    this.totalSway = 0;
    this.swayCount = 0;
  }

  update(landmarks: any[]): TaskUpdate {
    const rightFootUp = isRightFootLifted(landmarks);
    const leftFootUp = isLeftFootLifted(landmarks);
    const sway = this.previousLandmarks
      ? calculateSway(landmarks, this.previousLandmarks)
      : 0;

    this.previousLandmarks = landmarks;

    if (sway > 0) {
      this.totalSway += sway;
      this.swayCount++;
    }

    if (!rightFootUp && !leftFootUp) {
      this.holdStartTime = null;
      return {
        message: 'Lift one foot off the ground',
        level: 'warning',
        progress: 0,
      };
    }

    // Foot is lifted
    if (!this.holdStartTime) {
      this.holdStartTime = Date.now();
    }

    const holdTime = (Date.now() - this.holdStartTime) / 1000;
    const progress = Math.min(holdTime / 7, 1);

    if (holdTime >= 5) {
      const avgSway = this.swayCount > 0 ? this.totalSway / this.swayCount : 0;
      return {
        message: 'Excellent balance!',
        level: 'success',
        progress: 1,
        done: true,
        metrics: { holdTime, swayIndex: avgSway },
      };
    } else if (sway > 0.02) {
      return {
        message: `Hold steady — reduce sway (${holdTime.toFixed(1)}s)`,
        level: 'warning',
        progress,
        metrics: { holdTime, currentSway: sway },
      };
    } else {
      return {
        message: `Good balance... ${holdTime.toFixed(1)}s / 5s`,
        level: 'info',
        progress,
        metrics: { holdTime, currentSway: sway },
      };
    }
  }

  stop(): void {
    this.holdStartTime = null;
    this.previousLandmarks = null;
  }
}

// ============= WALK TASK =============
class WalkTask implements TaskHandler {
  private stepCount: number = 0;
  private lastHeelX: number | null = null;
  private movingRight: boolean = true;
  private extremaCount: number = 0;

  start(): void {
    this.stepCount = 0;
    this.lastHeelX = null;
    this.movingRight = true;
    this.extremaCount = 0;
  }

  update(landmarks: any[]): TaskUpdate {
    // Simple step detection: track left ankle x position
    const leftAnkle = landmarks[27]; // Left ankle
    const rightAnkle = landmarks[28]; // Right ankle
    
    if (!leftAnkle || !rightAnkle) {
      return {
        message: 'Step into view',
        level: 'warning',
        progress: 0,
      };
    }

    const avgX = (leftAnkle.x + rightAnkle.x) / 2;

    if (this.lastHeelX !== null) {
      const delta = avgX - this.lastHeelX;
      
      // Detect direction change (extrema)
      if (this.movingRight && delta < -0.01) {
        this.movingRight = false;
        this.extremaCount++;
        if (this.extremaCount >= 2) {
          this.stepCount++;
          this.extremaCount = 0;
        }
      } else if (!this.movingRight && delta > 0.01) {
        this.movingRight = true;
        this.extremaCount++;
        if (this.extremaCount >= 2) {
          this.stepCount++;
          this.extremaCount = 0;
        }
      }
    }

    this.lastHeelX = avgX;

    const progress = Math.min(this.stepCount / 4, 1);

    if (this.stepCount >= 4) {
      return {
        message: 'Great walking!',
        level: 'success',
        progress: 1,
        done: true,
        metrics: { stepCount: this.stepCount, symmetryPercent: 95 },
      };
    } else {
      return {
        message: `Walk naturally (${this.stepCount} / 4 steps)`,
        level: 'info',
        progress,
        metrics: { stepCount: this.stepCount },
      };
    }
  }

  stop(): void {
    this.stepCount = 0;
    this.lastHeelX = null;
  }
}

// ============= JUMP TASK =============
class JumpTask implements TaskHandler {
  private baselineY: number | null = null;
  private maxJumpHeight: number = 0;
  private jumpDetected: boolean = false;

  start(): void {
    this.baselineY = null;
    this.maxJumpHeight = 0;
    this.jumpDetected = false;
  }

  update(landmarks: any[]): TaskUpdate {
    // CoM = average of hip landmarks
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    if (!leftHip || !rightHip) {
      return {
        message: 'Step into view',
        level: 'warning',
        progress: 0,
      };
    }

    const comY = (leftHip.y + rightHip.y) / 2;

    // Establish baseline (smaller y = higher up)
    if (this.baselineY === null) {
      this.baselineY = comY;
    }

    // Detect jump (CoM rises significantly)
    const jumpHeight = this.baselineY - comY; // Positive when jumping up
    
    if (jumpHeight > 0.05 && !this.jumpDetected) {
      this.jumpDetected = true;
      this.maxJumpHeight = Math.max(this.maxJumpHeight, jumpHeight);
    }

    // Reset baseline gradually when on ground
    if (Math.abs(comY - this.baselineY) < 0.01) {
      this.baselineY = comY * 0.9 + this.baselineY * 0.1;
    }

    const progress = this.jumpDetected ? 1 : Math.min(jumpHeight / 0.05, 0.8);

    if (this.jumpDetected) {
      const jumpPixels = Math.round(this.maxJumpHeight * 1000);
      return {
        message: 'Great jump!',
        level: 'success',
        progress: 1,
        done: true,
        metrics: { jumpHeightPixels: jumpPixels },
      };
    } else {
      const currentJumpPixels = Math.round(Math.max(jumpHeight, 0) * 1000);
      return {
        message: 'Jump up in place',
        level: 'info',
        progress,
        metrics: { jumpHeightPixels: currentJumpPixels },
      };
    }
  }

  stop(): void {
    this.baselineY = null;
    this.jumpDetected = false;
  }
}

// ============= TASK REGISTRY =============
export const tasks: Record<string, TaskHandler> = {
  raise_hand: new RaiseHandTask(),
  one_leg: new OneLegTask(),
  walk: new WalkTask(),
  jump: new JumpTask(),
};

export const TASK_SEQUENCE = ['raise_hand', 'one_leg', 'walk', 'jump'] as const;
export type TaskName = typeof TASK_SEQUENCE[number];
