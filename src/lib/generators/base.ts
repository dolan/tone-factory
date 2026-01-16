import type { Note, GeneratorConfig, AlgorithmType } from '../theory/types';
import { getScaleNotes, noteToMidi, isChordTone } from '../theory/scales';
import { beatsToSeconds } from '../theory/rhythm';

export interface GeneratorResult {
  notes: Note[];
  algorithm: AlgorithmType;
}

let noteIdCounter = 0;

export function generateNoteId(): string {
  return `note-${Date.now()}-${noteIdCounter++}`;
}

export abstract class BaseGenerator {
  protected config: GeneratorConfig;
  protected scaleNotes: string[];

  constructor(config: GeneratorConfig) {
    this.config = config;
    this.scaleNotes = getScaleNotes(config.key, config.scale, config.octaveRange);
  }

  abstract generate(): GeneratorResult;

  // Get a random note from the scale, optionally preferring chord tones
  protected getRandomScaleNote(preferChordTones: boolean = false): string {
    if (preferChordTones && Math.random() < 0.7) {
      // Filter to chord tones
      const chordTones = this.scaleNotes.filter(note =>
        isChordTone(note, this.config.key, this.config.scale)
      );
      if (chordTones.length > 0) {
        return chordTones[Math.floor(Math.random() * chordTones.length)];
      }
    }
    return this.scaleNotes[Math.floor(Math.random() * this.scaleNotes.length)];
  }

  // Get note at a specific index in the scale
  protected getScaleNoteAt(index: number): string {
    const clampedIndex = Math.max(0, Math.min(index, this.scaleNotes.length - 1));
    return this.scaleNotes[clampedIndex];
  }

  // Find index of a note in the scale notes array
  protected findNoteIndex(note: string): number {
    return this.scaleNotes.indexOf(note);
  }

  // Convert beat time to seconds
  protected beatsToSeconds(beats: number): number {
    return beatsToSeconds(beats, this.config.tempo);
  }

  // Create a note object
  protected createNote(
    pitch: string,
    timeBeats: number,
    durationBeats: number,
    velocity: number = 0.7
  ): Note {
    return {
      id: generateNoteId(),
      pitch,
      midi: noteToMidi(pitch),
      time: this.beatsToSeconds(timeBeats),
      duration: this.beatsToSeconds(durationBeats),
      velocity
    };
  }

  // Apply velocity variation based on beat position and chord tone status
  protected applyVelocity(note: Note, beatPosition: number): Note {
    const isChord = isChordTone(note.pitch, this.config.key, this.config.scale);
    const baseVelocity = isChord ? 0.8 : 0.65;

    // Accent downbeats
    const isDownbeat = beatPosition % 1 === 0;
    const accentBoost = isDownbeat ? 0.1 : 0;

    // Small random variation
    const randomVariation = (Math.random() * 0.1) - 0.05;

    return {
      ...note,
      velocity: Math.min(1, Math.max(0.3, baseVelocity + accentBoost + randomVariation))
    };
  }
}
