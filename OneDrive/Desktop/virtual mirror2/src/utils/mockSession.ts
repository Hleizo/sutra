import type { SessionSummary, TaskMetric } from '../store/session';

export function makeMockSession(): SessionSummary {
  const now = new Date();
  const startTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago

  const tasks: TaskMetric[] = [
    {
      task: 'raise_hand',
      metrics: {
        rightShoulderFlexion: 125,
        leftShoulderFlexion: 122,
        symmetry: 97.6,
        holdTime: 3.2,
      },
      flags: [],
    },
    {
      task: 'one_leg',
      metrics: {
        balanceTime: 8.5,
        swayIndex: 0.12,
        maxSway: 2.3,
        recoveryCount: 1,
      },
      flags: ['Slight instability detected'],
    },
    {
      task: 'walk',
      metrics: {
        stepCount: 12,
        gaitSymmetry: 94.2,
        cadence: 110,
        averageStepLength: 0.45,
      },
      flags: [],
    },
    {
      task: 'jump',
      metrics: {
        jumpHeight: 15.3,
        landingStability: 88,
        attempts: 3,
        symmetricLanding: 92,
      },
      flags: [],
    },
  ];

  // Calculate overall risk based on metrics
  const balanceTime = tasks.find((t) => t.task === 'one_leg')?.metrics.balanceTime as number;
  const symmetry = tasks.find((t) => t.task === 'raise_hand')?.metrics.symmetry as number;

  let overallRisk: 'normal' | 'monitor' | 'high' = 'normal';
  if (balanceTime < 5 || symmetry < 85) {
    overallRisk = 'high';
  } else if (balanceTime < 7 || symmetry < 92) {
    overallRisk = 'monitor';
  }

  return {
    sessionId: `SESSION-${Date.now()}`,
    childAgeYears: 8,
    startedAt: startTime.toISOString(),
    endedAt: now.toISOString(),
    overallRisk,
    tasks,
  };
}
