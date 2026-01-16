import type { RhythmPattern, NoteDuration, DURATION_VALUES } from './types';

// Predefined rhythm patterns
export const RHYTHM_PATTERNS: Record<string, RhythmPattern> = {
  'straight-eighths': {
    name: 'Straight Eighths',
    feel: 'straight',
    durations: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
  },
  'straight-quarters': {
    name: 'Straight Quarters',
    feel: 'straight',
    durations: [1, 1, 1, 1]
  },
  'straight-sixteenths': {
    name: 'Straight Sixteenths',
    feel: 'straight',
    durations: [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25]
  },
  'swing-eighths': {
    name: 'Swing Eighths',
    feel: 'swing',
    durations: [0.67, 0.33, 0.67, 0.33, 0.67, 0.33, 0.67, 0.33]
  },
  'syncopated-1': {
    name: 'Syncopated 1',
    feel: 'syncopated',
    durations: [0.75, 0.25, 0.5, 0.5, 0.75, 0.25, 0.5, 0.5]
  },
  'syncopated-2': {
    name: 'Syncopated 2',
    feel: 'syncopated',
    durations: [0.5, 0.25, 0.25, 0.5, 0.5, 0.5, 0.25, 0.25]
  },
  'mixed-1': {
    name: 'Mixed 1',
    feel: 'straight',
    durations: [1, 0.5, 0.5, 0.5, 0.5, 1]
  }
};

// Generate rhythm durations for a given number of beats
export function generateRhythmDurations(
  totalBeats: number,
  pattern: RhythmPattern,
  variation: number = 0  // 0-1, how much to vary from base pattern
): number[] {
  const durations: number[] = [];
  let currentBeat = 0;
  let patternIndex = 0;

  while (currentBeat < totalBeats) {
    let duration = pattern.durations[patternIndex % pattern.durations.length];

    // Apply variation
    if (variation > 0 && Math.random() < variation) {
      // Randomly adjust duration
      const adjustments = [0.5, 0.75, 1, 1.5, 2];
      duration *= adjustments[Math.floor(Math.random() * adjustments.length)];
    }

    // Don't exceed total beats
    if (currentBeat + duration > totalBeats) {
      duration = totalBeats - currentBeat;
    }

    durations.push(duration);
    currentBeat += duration;
    patternIndex++;
  }

  return durations;
}

// Apply swing to a set of timing events
export function applySwing(
  times: number[],
  swingAmount: number = 0.33  // 0 = straight, 0.33 = typical swing
): number[] {
  return times.map((time, i) => {
    // Swing affects off-beats (odd eighth notes)
    const beatPosition = time % 1;
    if (Math.abs(beatPosition - 0.5) < 0.01) {
      // This is an off-beat, apply swing
      return Math.floor(time) + 0.5 + (swingAmount * 0.5);
    }
    return time;
  });
}

// Convert beat duration to seconds given tempo
export function beatsToSeconds(beats: number, tempo: number): number {
  return (beats / tempo) * 60;
}

// Convert seconds to beats given tempo
export function secondsToBeats(seconds: number, tempo: number): number {
  return (seconds * tempo) / 60;
}

// Quantize a time value to the nearest grid position
export function quantizeToGrid(
  time: number,
  gridSize: number  // In beats, e.g., 0.25 for sixteenth notes
): number {
  return Math.round(time / gridSize) * gridSize;
}

// Generate random rest positions
export function generateRests(
  noteCount: number,
  restProbability: number  // 0-1
): boolean[] {
  return Array(noteCount).fill(false).map(() => Math.random() < restProbability);
}
