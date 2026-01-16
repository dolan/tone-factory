// Core note representation
export interface Note {
  id: string;
  pitch: string;      // e.g., "C4", "F#5"
  midi: number;       // MIDI note number (0-127)
  time: number;       // Start time in seconds
  duration: number;   // Duration in seconds
  velocity: number;   // 0-1 normalized
}

// Scale definition
export interface ScaleDefinition {
  name: string;
  intervals: number[];  // Semitones from root
  chordTones: number[]; // 1-indexed scale degrees that are chord tones
}

// Rhythm pattern
export interface RhythmPattern {
  name: string;
  feel: 'straight' | 'swing' | 'syncopated';
  durations: number[];  // Beat durations for the pattern
}

export type NoteDuration = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';

// Duration values in beats (quarter note = 1)
export const DURATION_VALUES: Record<NoteDuration, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25
};

// Generated sequence
export interface Sequence {
  notes: Note[];
  key: string;
  scale: string;
  tempo: number;
  lengthBars: number;
  algorithm: AlgorithmType;
}

export type AlgorithmType = 'scale-run' | 'arpeggio' | 'motif';

// Generator configuration
export interface GeneratorConfig {
  key: string;
  scale: string;
  tempo: number;
  lengthBars: number;
  octaveRange: [number, number];
  rhythmFeel: 'straight' | 'swing' | 'syncopated';
}

// All 12 keys
export const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export type Key = typeof KEYS[number];
