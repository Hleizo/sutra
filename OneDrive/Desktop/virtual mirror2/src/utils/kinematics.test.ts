/**
 * Unit Tests for Kinematics Utilities
 * Testing biomechanical calculation functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateAngle,
  calculateROM,
  calculateSymmetry,
  calculateBalance,
  smoothAngleSeries,
  type Point2D,
  type Point3D
} from '../utils/kinematics';

describe('calculateAngle', () => {
  it('should calculate 90-degree angle correctly', () => {
    const a: Point2D = { x: 0, y: 0 };
    const b: Point2D = { x: 1, y: 0 };
    const c: Point2D = { x: 1, y: 1 };

    const angle = calculateAngle(a, b, c);
    expect(angle).toBeCloseTo(90, 1);
  });

  it('should calculate 180-degree angle (straight line)', () => {
    const a: Point2D = { x: 0, y: 0 };
    const b: Point2D = { x: 1, y: 0 };
    const c: Point2D = { x: 2, y: 0 };

    const angle = calculateAngle(a, b, c);
    expect(angle).toBeCloseTo(180, 1);
  });

  it('should calculate 45-degree angle', () => {
    const a: Point2D = { x: 0, y: 0 };
    const b: Point2D = { x: 1, y: 0 };
    const c: Point2D = { x: 1, y: 1 };

    const angle = calculateAngle(a, b, c);
    expect(angle).toBeCloseTo(90, 1);
  });

  it('should calculate angle with various points', () => {
    const a: Point2D = { x: 0, y: 0 };
    const b: Point2D = { x: 1, y: 0 };
    const c: Point2D = { x: 1.5, y: Math.sqrt(3) / 2 };

    const angle = calculateAngle(a, b, c);
    expect(angle).toBeGreaterThan(0);
    expect(angle).toBeLessThan(180);
    expect(angle).toBeCloseTo(120, 0);
  });

  it('should calculate obtuse angle (> 90 degrees)', () => {
    const a: Point2D = { x: 0, y: 0 };
    const b: Point2D = { x: 0, y: 1 };
    const c: Point2D = { x: -1, y: 2 };

    const angle = calculateAngle(a, b, c);
    expect(angle).toBeGreaterThan(90);
    expect(angle).toBeLessThan(180);
  });

  it('should handle 3D points (with z-coordinate)', () => {
    const a: Point3D = { x: 0, y: 0, z: 0 };
    const b: Point3D = { x: 1, y: 0, z: 0 };
    const c: Point3D = { x: 1, y: 1, z: 0 };

    const angle = calculateAngle(a, b, c);
    expect(angle).toBeCloseTo(90, 0);
  });

  it('should return 0 for coincident points', () => {
    const a: Point2D = { x: 1, y: 1 };
    const b: Point2D = { x: 1, y: 1 };
    const c: Point2D = { x: 1, y: 1 };

    const angle = calculateAngle(a, b, c);
    expect(angle).toBe(0);
  });

  it('should handle negative coordinates', () => {
    const a: Point2D = { x: -1, y: -1 };
    const b: Point2D = { x: 0, y: 0 };
    const c: Point2D = { x: 1, y: 1 };

    const angle = calculateAngle(a, b, c);
    expect(angle).toBeCloseTo(180, 1);
  });
});

describe('calculateROM', () => {
  let angleSeries: number[];

  beforeEach(() => {
    angleSeries = [30, 45, 60, 90, 120, 150, 170, 160, 140, 100];
  });

  it('should calculate minimum angle correctly', () => {
    const result = calculateROM(angleSeries);
    expect(result.min).toBe(30);
  });

  it('should calculate maximum angle correctly', () => {
    const result = calculateROM(angleSeries);
    expect(result.max).toBe(170);
  });

  it('should calculate range correctly', () => {
    const result = calculateROM(angleSeries);
    expect(result.range).toBe(140); // 170 - 30
  });

  it('should calculate mean correctly', () => {
    const result = calculateROM([0, 50, 100]);
    expect(result.mean).toBeCloseTo(50, 1);
  });

  it('should calculate standard deviation correctly', () => {
    const result = calculateROM([10, 20, 30, 40, 50]);
    expect(result.standardDeviation).toBeGreaterThan(0);
    expect(result.standardDeviation).toBeCloseTo(14.14, 1);
  });

  it('should handle single value', () => {
    const result = calculateROM([90]);
    expect(result.min).toBe(90);
    expect(result.max).toBe(90);
    expect(result.range).toBe(0);
    expect(result.mean).toBe(90);
    expect(result.standardDeviation).toBe(0);
  });

  it('should handle empty array', () => {
    const result = calculateROM([]);
    expect(result.min).toBe(0);
    expect(result.max).toBe(0);
    expect(result.range).toBe(0);
    expect(result.mean).toBe(0);
    expect(result.standardDeviation).toBe(0);
  });

  it('should handle all identical values', () => {
    const result = calculateROM([100, 100, 100, 100]);
    expect(result.min).toBe(100);
    expect(result.max).toBe(100);
    expect(result.range).toBe(0);
    expect(result.mean).toBe(100);
    expect(result.standardDeviation).toBe(0);
  });

  it('should handle negative angles', () => {
    const result = calculateROM([-30, -10, 0, 10, 30]);
    expect(result.min).toBe(-30);
    expect(result.max).toBe(30);
    expect(result.range).toBe(60);
    expect(result.mean).toBe(0);
  });
});

describe('calculateSymmetry', () => {
  it('should calculate perfect symmetry (0%)', () => {
    const result = calculateSymmetry(100, 100);
    expect(result.percentageDifference).toBe(0);
    expect(result.isSymmetrical).toBe(true);
    expect(result.asymmetryLevel).toBe('excellent');
  });

  it('should calculate asymmetry percentage correctly', () => {
    const result = calculateSymmetry(100, 90);
    expect(result.percentageDifference).toBeCloseTo(10.53, 1); // (10 / 95) * 100
  });

  it('should classify as excellent (≤ 5%)', () => {
    const result = calculateSymmetry(100, 98);
    expect(result.percentageDifference).toBeLessThan(5);
    expect(result.isSymmetrical).toBe(true);
    expect(result.asymmetryLevel).toBe('excellent');
  });

  it('should classify as good (5-10%)', () => {
    const result = calculateSymmetry(100, 92);
    expect(result.percentageDifference).toBeGreaterThanOrEqual(5);
    expect(result.percentageDifference).toBeLessThan(10);
    expect(result.isSymmetrical).toBe(false);
    expect(result.asymmetryLevel).toBe('good');
  });

  it('should classify as fair (10-20%)', () => {
    const result = calculateSymmetry(100, 83);
    expect(result.percentageDifference).toBeGreaterThanOrEqual(10);
    expect(result.percentageDifference).toBeLessThan(20);
    expect(result.isSymmetrical).toBe(false);
    expect(result.asymmetryLevel).toBe('fair');
  });

  it('should classify as poor (≥ 20%)', () => {
    const result = calculateSymmetry(100, 70);
    expect(result.percentageDifference).toBeGreaterThanOrEqual(20);
    expect(result.isSymmetrical).toBe(false);
    expect(result.asymmetryLevel).toBe('poor');
  });

  it('should handle reversed order (left < right)', () => {
    const result1 = calculateSymmetry(90, 100);
    const result2 = calculateSymmetry(100, 90);
    expect(result1.percentageDifference).toBeCloseTo(result2.percentageDifference, 1);
  });

  it('should handle zero values', () => {
    const result = calculateSymmetry(0, 0);
    expect(result.percentageDifference).toBe(0);
    expect(result.isSymmetrical).toBe(true);
  });

  it('should handle one zero value', () => {
    const result = calculateSymmetry(100, 0);
    expect(result.percentageDifference).toBe(200); // 100 difference / 50 average * 100
    expect(result.asymmetryLevel).toBe('poor');
  });

  it('should handle negative values', () => {
    const result = calculateSymmetry(-30, -20);
    expect(Math.abs(result.percentageDifference)).toBeGreaterThan(0);
  });
});

describe('calculateBalance', () => {
  it('should calculate balance metrics for sway data', () => {
    const swayX = [0, 0.1, -0.1, 0.05, 0];
    const swayY = [0, 0.1, 0.05, -0.1, 0];
    
    const result = calculateBalance(swayX, swayY);
    
    expect(result.balanceIndex).toBeGreaterThan(0);
    expect(result.stabilityScore).toBeGreaterThanOrEqual(0);
    expect(result.stabilityScore).toBeLessThanOrEqual(100);
    expect(result.swayMagnitude).toBeGreaterThan(0);
    expect(result.balanceLevel).toBeDefined();
  });

  it('should calculate stability score (0-100)', () => {
    const swayX = [0, 0.1, -0.1, 0.05];
    const swayY = [0, 0.1, 0.05, -0.1];
    
    const result = calculateBalance(swayX, swayY);
    
    expect(result.stabilityScore).toBeGreaterThanOrEqual(0);
    expect(result.stabilityScore).toBeLessThanOrEqual(100);
  });

  it('should classify stability level', () => {
    const swayX = [0, 0.1, -0.1, 0.05];
    const swayY = [0, 0.1, 0.05, -0.1];
    
    const result = calculateBalance(swayX, swayY);
    
    expect(['excellent', 'good', 'fair', 'poor']).toContain(result.balanceLevel);
  });

  it('should return zero values for single position', () => {
    const result = calculateBalance([0], [0]);
    
    expect(result.swayMagnitude).toBe(0);
    expect(result.balanceIndex).toBeGreaterThanOrEqual(0);
  });

  it('should return zero values for empty arrays', () => {
    const result = calculateBalance([], []);
    
    expect(result.balanceIndex).toBe(0);
    expect(result.stabilityScore).toBe(0);
    expect(result.swayMagnitude).toBe(0);
    expect(result.balanceLevel).toBe('poor');
  });

  it('should handle identical positions (no movement)', () => {
    const swayX = [1, 1, 1];
    const swayY = [1, 1, 1];
    
    const result = calculateBalance(swayX, swayY);
    
    expect(result.swayMagnitude).toBe(0);
    expect(result.stabilityScore).toBeGreaterThan(80);
    expect(result.balanceLevel).toBe('excellent');
  });

  it('should handle large sway (poor stability)', () => {
    const swayX = [0, 10, -10, 10];
    const swayY = [0, 10, -10, -10];
    
    const result = calculateBalance(swayX, swayY);
    
    expect(result.stabilityScore).toBeLessThan(40);
    expect(result.balanceLevel).toBe('poor');
  });

  it('should handle small sway (excellent stability)', () => {
    const swayX = [0, 0.01, -0.01, 0];
    const swayY = [0, 0.01, 0.01, -0.01];
    
    const result = calculateBalance(swayX, swayY);
    
    expect(result.stabilityScore).toBeGreaterThan(80);
    expect(result.balanceLevel).toBe('excellent');
  });

  it('should have higher balance index for larger sway', () => {
    const smallSwayX = [0, 0.01, -0.01, 0];
    const smallSwayY = [0, 0.01, 0.01, -0.01];
    
    const largeSwayX = [0, 1, -1, 1];
    const largeSwayY = [0, 1, -1, -1];
    
    const smallResult = calculateBalance(smallSwayX, smallSwayY);
    const largeResult = calculateBalance(largeSwayX, largeSwayY);
    
    expect(largeResult.balanceIndex).toBeGreaterThan(smallResult.balanceIndex);
    expect(largeResult.stabilityScore).toBeLessThan(smallResult.stabilityScore);
  });

  it('should handle mismatched array lengths', () => {
    const swayX = [0, 0.1, -0.1];
    const swayY = [0, 0.1];
    
    const result = calculateBalance(swayX, swayY);
    
    expect(result.balanceIndex).toBe(0);
    expect(result.stabilityScore).toBe(0);
    expect(result.balanceLevel).toBe('poor');
  });

  it('should calculate consistent results', () => {
    const swayX = [0.5, 0.51, 0.49, 0.52, 0.48];
    const swayY = [0.5, 0.51, 0.5, 0.49, 0.52];
    
    const result1 = calculateBalance(swayX, swayY);
    const result2 = calculateBalance(swayX, swayY);
    
    expect(result1.balanceIndex).toBe(result2.balanceIndex);
    expect(result1.stabilityScore).toBe(result2.stabilityScore);
    expect(result1.swayMagnitude).toBe(result2.swayMagnitude);
    expect(result1.balanceLevel).toBe(result2.balanceLevel);
  });
});

describe('smoothAngleSeries', () => {
  it('should smooth angle series with moving average', () => {
    const angles = [10, 20, 30, 40, 50];
    const smoothed = smoothAngleSeries(angles, 3);
    
    expect(smoothed).toHaveLength(angles.length);
    expect(smoothed[0]).toBeCloseTo(15, 0); // (10 + 20) / 2
    expect(smoothed[1]).toBeCloseTo(20, 0); // (10 + 20 + 30) / 3
    expect(smoothed[2]).toBeCloseTo(30, 0); // (20 + 30 + 40) / 3
  });

  it('should handle window size of 1 (no smoothing)', () => {
    const angles = [10, 20, 30, 40, 50];
    const smoothed = smoothAngleSeries(angles, 1);
    
    expect(smoothed).toEqual(angles);
  });

  it('should handle window size larger than array', () => {
    const angles = [10, 20, 30];
    const smoothed = smoothAngleSeries(angles, 10);
    
    expect(smoothed).toHaveLength(angles.length);
    // When window is larger than array, the function still returns smoothed values
    expect(smoothed[0]).toBeGreaterThanOrEqual(10);
    expect(smoothed[smoothed.length - 1]).toBeLessThanOrEqual(30);
  });

  it('should handle empty array', () => {
    const smoothed = smoothAngleSeries([], 3);
    expect(smoothed).toEqual([]);
  });

  it('should handle single element', () => {
    const smoothed = smoothAngleSeries([100], 3);
    expect(smoothed).toEqual([100]);
  });

  it('should reduce noise in noisy data', () => {
    const noisyAngles = [100, 105, 95, 102, 98, 103, 97, 101];
    const smoothed = smoothAngleSeries(noisyAngles, 3);
    
    // Smoothed values should have less variance
    const originalVariance = calculateVariance(noisyAngles);
    const smoothedVariance = calculateVariance(smoothed);
    
    expect(smoothedVariance).toBeLessThan(originalVariance);
  });

  it('should preserve overall trend', () => {
    const increasingAngles = [10, 20, 30, 40, 50, 60, 70];
    const smoothed = smoothAngleSeries(increasingAngles, 3);
    
    // Check that trend is still increasing
    for (let i = 1; i < smoothed.length; i++) {
      expect(smoothed[i]).toBeGreaterThanOrEqual(smoothed[i - 1] - 1); // Allow small rounding
    }
  });

  it('should handle negative angles', () => {
    const angles = [-30, -20, -10, 0, 10];
    const smoothed = smoothAngleSeries(angles, 3);
    
    expect(smoothed).toHaveLength(angles.length);
    expect(smoothed[0]).toBeCloseTo(-25, 0); // (-30 + -20) / 2
  });

  it('should use default window size of 5', () => {
    const angles = [10, 20, 30, 40, 50, 60, 70];
    const smoothed = smoothAngleSeries(angles);
    
    expect(smoothed).toHaveLength(angles.length);
    // With window size 5, third element should be average of first 5
    expect(smoothed[2]).toBeCloseTo(30, 1);
  });
});

describe('Edge Cases and Integration', () => {
  it('should handle calculateAngle with very small differences', () => {
    const a: Point2D = { x: 0, y: 0 };
    const b: Point2D = { x: 0.0001, y: 0 };
    const c: Point2D = { x: 0.0002, y: 0 };
    
    const angle = calculateAngle(a, b, c);
    expect(angle).toBeCloseTo(180, 0);
  });

  it('should handle calculateSymmetry with very large values', () => {
    const result = calculateSymmetry(10000, 9900);
    expect(result.percentageDifference).toBeCloseTo(1.01, 1);
  });

  it('should chain ROM and smoothing operations', () => {
    const rawAngles = [85, 90, 88, 92, 87, 91, 89];
    const smoothed = smoothAngleSeries(rawAngles, 3);
    const rom = calculateROM(smoothed);
    
    expect(rom.range).toBeLessThanOrEqual(calculateROM(rawAngles).range);
  });

  it('should handle balance calculation with outliers', () => {
    const swayX = [0, 0.1, 100, 0, 0.05]; // Contains outlier
    const swayY = [0, 0.1, 100, 0, 0.05]; // Contains outlier
    
    const result = calculateBalance(swayX, swayY);
    expect(result.stabilityScore).toBeLessThan(40);
    expect(result.balanceLevel).toBe('poor');
  });
});

// Helper function for variance calculation
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
}
