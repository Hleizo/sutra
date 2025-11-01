/**
 * Kinematics Utilities
 * Biomechanical calculations for movement analysis
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D extends Point2D {
  z: number;
}

export interface ROMResult {
  min: number;
  max: number;
  range: number;
  mean: number;
  standardDeviation: number;
}

export interface SymmetryResult {
  percentageDifference: number;
  isSymmetrical: boolean;
  asymmetryLevel: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface BalanceResult {
  balanceIndex: number;
  stabilityScore: number;
  balanceLevel: 'excellent' | 'good' | 'fair' | 'poor';
  swayMagnitude: number;
}

/**
 * Calculate the angle (in degrees) between three points
 * Point B is the vertex of the angle
 * 
 * @param A - First point (start of first line segment)
 * @param B - Second point (vertex/joint)
 * @param C - Third point (end of second line segment)
 * @returns Angle in degrees (0-180)
 * 
 * @example
 * const shoulder = { x: 0.5, y: 0.3 };
 * const elbow = { x: 0.6, y: 0.5 };
 * const wrist = { x: 0.7, y: 0.4 };
 * const elbowAngle = calculateAngle(shoulder, elbow, wrist);
 */
export function calculateAngle(
  A: Point2D | Point3D,
  B: Point2D | Point3D,
  C: Point2D | Point3D
): number {
  // Calculate vectors BA and BC
  const BA = {
    x: A.x - B.x,
    y: A.y - B.y,
    z: 'z' in A && 'z' in B ? A.z - B.z : 0,
  };

  const BC = {
    x: C.x - B.x,
    y: C.y - B.y,
    z: 'z' in C && 'z' in B ? C.z - B.z : 0,
  };

  // Calculate dot product
  const dotProduct = BA.x * BC.x + BA.y * BC.y + BA.z * BC.z;

  // Calculate magnitudes
  const magnitudeBA = Math.sqrt(BA.x ** 2 + BA.y ** 2 + BA.z ** 2);
  const magnitudeBC = Math.sqrt(BC.x ** 2 + BC.y ** 2 + BC.z ** 2);

  // Avoid division by zero
  if (magnitudeBA === 0 || magnitudeBC === 0) {
    return 0;
  }

  // Calculate angle using dot product formula
  const cosAngle = dotProduct / (magnitudeBA * magnitudeBC);

  // Clamp cosAngle to [-1, 1] to avoid NaN from acos
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));

  // Convert to degrees
  const angleRadians = Math.acos(clampedCos);
  const angleDegrees = (angleRadians * 180) / Math.PI;

  return angleDegrees;
}

/**
 * Calculate Range of Motion (ROM) from a series of angle measurements
 * 
 * @param angleSeries - Array of angle measurements in degrees
 * @returns ROM statistics including min, max, range, mean, and standard deviation
 * 
 * @example
 * const kneeAngles = [120, 135, 140, 145, 150, 155, 160, 165, 170];
 * const rom = calculateROM(kneeAngles);
 * console.log(`Range of motion: ${rom.range}°`);
 */
export function calculateROM(angleSeries: number[]): ROMResult {
  if (angleSeries.length === 0) {
    return {
      min: 0,
      max: 0,
      range: 0,
      mean: 0,
      standardDeviation: 0,
    };
  }

  // Find minimum and maximum angles
  const min = Math.min(...angleSeries);
  const max = Math.max(...angleSeries);
  const range = max - min;

  // Calculate mean
  const sum = angleSeries.reduce((acc, angle) => acc + angle, 0);
  const mean = sum / angleSeries.length;

  // Calculate standard deviation
  const squaredDifferences = angleSeries.map((angle) => (angle - mean) ** 2);
  const variance = squaredDifferences.reduce((acc, val) => acc + val, 0) / angleSeries.length;
  const standardDeviation = Math.sqrt(variance);

  return {
    min,
    max,
    range,
    mean,
    standardDeviation,
  };
}

/**
 * Calculate symmetry between left and right body measurements
 * Returns percentage difference and symmetry classification
 * 
 * @param leftValue - Measurement from left side (e.g., left knee angle)
 * @param rightValue - Measurement from right side (e.g., right knee angle)
 * @returns Symmetry analysis including percentage difference and classification
 * 
 * @example
 * const leftKneeAngle = 140;
 * const rightKneeAngle = 145;
 * const symmetry = calculateSymmetry(leftKneeAngle, rightKneeAngle);
 * console.log(`Asymmetry: ${symmetry.percentageDifference.toFixed(2)}%`);
 */
export function calculateSymmetry(
  leftValue: number,
  rightValue: number
): SymmetryResult {
  // Handle edge cases
  if (leftValue === 0 && rightValue === 0) {
    return {
      percentageDifference: 0,
      isSymmetrical: true,
      asymmetryLevel: 'excellent',
    };
  }

  // Calculate absolute difference
  const difference = Math.abs(leftValue - rightValue);

  // Calculate average to use as reference
  const average = (leftValue + rightValue) / 2;

  // Avoid division by zero
  if (average === 0) {
    return {
      percentageDifference: 100,
      isSymmetrical: false,
      asymmetryLevel: 'poor',
    };
  }

  // Calculate percentage difference
  const percentageDifference = (difference / average) * 100;

  // Determine symmetry level
  let isSymmetrical = false;
  let asymmetryLevel: 'excellent' | 'good' | 'fair' | 'poor';

  if (percentageDifference <= 5) {
    isSymmetrical = true;
    asymmetryLevel = 'excellent';
  } else if (percentageDifference <= 10) {
    asymmetryLevel = 'good';
  } else if (percentageDifference <= 20) {
    asymmetryLevel = 'fair';
  } else {
    asymmetryLevel = 'poor';
  }

  return {
    percentageDifference,
    isSymmetrical,
    asymmetryLevel,
  };
}

/**
 * Calculate balance index based on center of mass sway
 * Analyzes movement in X and Y directions to determine stability
 * 
 * @param swayX - Array of X-axis sway measurements (normalized coordinates)
 * @param swayY - Array of Y-axis sway measurements (normalized coordinates)
 * @returns Balance analysis including balance index, stability score, and classification
 * 
 * @example
 * const swayX = [0.5, 0.51, 0.49, 0.52, 0.48, 0.5];
 * const swayY = [0.5, 0.51, 0.5, 0.49, 0.52, 0.5];
 * const balance = calculateBalance(swayX, swayY);
 * console.log(`Balance level: ${balance.balanceLevel}`);
 */
export function calculateBalance(
  swayX: number[],
  swayY: number[]
): BalanceResult {
  if (swayX.length === 0 || swayY.length === 0 || swayX.length !== swayY.length) {
    return {
      balanceIndex: 0,
      stabilityScore: 0,
      balanceLevel: 'poor',
      swayMagnitude: 0,
    };
  }

  // Calculate mean positions
  const meanX = swayX.reduce((acc, val) => acc + val, 0) / swayX.length;
  const meanY = swayY.reduce((acc, val) => acc + val, 0) / swayY.length;

  // Calculate standard deviations (sway variability)
  const varianceX = swayX.reduce((acc, val) => acc + (val - meanX) ** 2, 0) / swayX.length;
  const varianceY = swayY.reduce((acc, val) => acc + (val - meanY) ** 2, 0) / swayY.length;
  const stdX = Math.sqrt(varianceX);
  const stdY = Math.sqrt(varianceY);

  // Calculate total sway magnitude (root mean square of deviations)
  let totalSwaySquared = 0;
  for (let i = 0; i < swayX.length; i++) {
    const dx = swayX[i] - meanX;
    const dy = swayY[i] - meanY;
    totalSwaySquared += dx ** 2 + dy ** 2;
  }
  const swayMagnitude = Math.sqrt(totalSwaySquared / swayX.length);

  // Calculate sway path length (total distance traveled)
  let pathLength = 0;
  for (let i = 1; i < swayX.length; i++) {
    const dx = swayX[i] - swayX[i - 1];
    const dy = swayY[i] - swayY[i - 1];
    pathLength += Math.sqrt(dx ** 2 + dy ** 2);
  }

  // Calculate sway area (ellipse area using 95% confidence interval)
  const swayArea = Math.PI * 2.45 * stdX * 2.45 * stdY;

  // Calculate balance index (lower is better)
  // Combines sway magnitude, path length, and area
  const balanceIndex = (swayMagnitude * 100 + pathLength * 10 + swayArea * 1000);

  // Calculate stability score (0-100, higher is better)
  // Inverse relationship with balance index
  const maxBalanceIndex = 50; // Threshold for poor balance
  const stabilityScore = Math.max(0, Math.min(100, 100 - (balanceIndex / maxBalanceIndex) * 100));

  // Determine balance level
  let balanceLevel: 'excellent' | 'good' | 'fair' | 'poor';

  if (stabilityScore >= 80) {
    balanceLevel = 'excellent';
  } else if (stabilityScore >= 60) {
    balanceLevel = 'good';
  } else if (stabilityScore >= 40) {
    balanceLevel = 'fair';
  } else {
    balanceLevel = 'poor';
  }

  return {
    balanceIndex,
    stabilityScore: Math.round(stabilityScore * 10) / 10,
    balanceLevel,
    swayMagnitude: Math.round(swayMagnitude * 1000) / 1000,
  };
}

/**
 * Helper function to calculate distance between two points
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Euclidean distance
 */
export function calculateDistance(p1: Point2D | Point3D, p2: Point2D | Point3D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = ('z' in p1 && 'z' in p2) ? (p2.z - p1.z) : 0;
  
  return Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);
}

/**
 * Calculate velocity between two points over time
 * @param p1 - First point
 * @param p2 - Second point
 * @param deltaTime - Time difference in seconds
 * @returns Velocity in units per second
 */
export function calculateVelocity(
  p1: Point2D | Point3D,
  p2: Point2D | Point3D,
  deltaTime: number
): number {
  if (deltaTime === 0) return 0;
  
  const distance = calculateDistance(p1, p2);
  return distance / deltaTime;
}

/**
 * Smooth angle series using moving average
 * @param angleSeries - Array of angle measurements
 * @param windowSize - Size of the moving average window
 * @returns Smoothed angle series
 */
export function smoothAngleSeries(angleSeries: number[], windowSize: number = 5): number[] {
  if (angleSeries.length < windowSize) {
    return angleSeries;
  }

  const smoothed: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < angleSeries.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(angleSeries.length, i + halfWindow + 1);
    const window = angleSeries.slice(start, end);
    const average = window.reduce((acc, val) => acc + val, 0) / window.length;
    smoothed.push(average);
  }

  return smoothed;
}

/**
 * Helper function compatible with CoachOverlay - calculates angle from three points
 */
export function angleFrom(
  A: { x: number; y: number },
  B: { x: number; y: number },
  C: { x: number; y: number }
): number {
  return calculateAngle(A, B, C);
}

/**
 * Calculate right shoulder flexion angle from MediaPipe pose landmarks
 * MediaPipe landmarks: 11=left shoulder, 12=right shoulder, 13=left elbow, 14=right elbow, 23=left hip, 24=right hip
 */
export function getRightShoulderFlexion(landmarks: any[]): number {
  if (!landmarks || landmarks.length < 25) return 0;

  const rightShoulder = landmarks[12];
  const rightElbow = landmarks[14];
  const rightHip = landmarks[24];

  if (!rightShoulder || !rightElbow || !rightHip) return 0;

  // Calculate angle: hip -> shoulder -> elbow
  return calculateAngle(rightHip, rightShoulder, rightElbow);
}

/**
 * Calculate left shoulder flexion angle
 */
export function getLeftShoulderFlexion(landmarks: any[]): number {
  if (!landmarks || landmarks.length < 25) return 0;

  const leftShoulder = landmarks[11];
  const leftElbow = landmarks[13];
  const leftHip = landmarks[23];

  if (!leftShoulder || !leftElbow || !leftHip) return 0;

  return calculateAngle(leftHip, leftShoulder, leftElbow);
}

/**
 * Calculate basic sway index from pose center movement
 * Returns normalized sway value (higher = more sway)
 */
export function calculateSway(
  landmarks: any[],
  previousLandmarks: any[] | null
): number {
  if (!landmarks || !previousLandmarks || landmarks.length < 25) return 0;

  // Use hip midpoint as center
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const prevLeftHip = previousLandmarks[23];
  const prevRightHip = previousLandmarks[24];

  if (!leftHip || !rightHip || !prevLeftHip || !prevRightHip) return 0;

  const currentCenter = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
  };

  const prevCenter = {
    x: (prevLeftHip.x + prevRightHip.x) / 2,
    y: (prevLeftHip.y + prevRightHip.y) / 2,
  };

  const dx = currentCenter.x - prevCenter.x;
  const dy = currentCenter.y - prevCenter.y;

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if right foot is lifted (one-leg balance detection)
 */
export function isRightFootLifted(landmarks: any[]): boolean {
  if (!landmarks || landmarks.length < 32) return false;

  const rightAnkle = landmarks[28];
  const leftAnkle = landmarks[27];

  if (!rightAnkle || !leftAnkle) return false;

  // Right foot is lifted if ankle is significantly higher than left ankle
  const heightDiff = leftAnkle.y - rightAnkle.y;
  return heightDiff > 0.05; // Threshold for normalized coordinates
}

/**
 * Check if left foot is lifted
 */
export function isLeftFootLifted(landmarks: any[]): boolean {
  if (!landmarks || landmarks.length < 32) return false;

  const rightAnkle = landmarks[28];
  const leftAnkle = landmarks[27];

  if (!rightAnkle || !leftAnkle) return false;

  const heightDiff = rightAnkle.y - leftAnkle.y;
  return heightDiff > 0.05;
}
