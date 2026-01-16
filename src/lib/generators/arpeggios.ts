import { BaseGenerator, type GeneratorResult } from './base';
import type { Note, GeneratorConfig } from '../theory/types';
import { isChordTone, getScaleNotes, noteToMidi } from '../theory/scales';
import { RHYTHM_PATTERNS, generateRhythmDurations } from '../theory/rhythm';

interface ArpeggioConfig extends GeneratorConfig {
  includePassingTones: boolean;
  passingToneFrequency: number;  // 0-1
  arpeggioPattern: number[];  // Index offsets within chord tones
}

export class ArpeggioGenerator extends BaseGenerator {
  private arpConfig: ArpeggioConfig;
  private chordTones: string[];

  constructor(config: GeneratorConfig) {
    super(config);
    this.arpConfig = {
      ...config,
      includePassingTones: true,
      passingToneFrequency: 0.25,
      arpeggioPattern: [0, 1, 2, 1]  // Root, third, fifth, third
    };

    // Extract chord tones from scale
    this.chordTones = this.scaleNotes.filter(note =>
      isChordTone(note, config.key, config.scale)
    );
  }

  generate(): GeneratorResult {
    const notes: Note[] = [];
    const totalBeats = this.arpConfig.lengthBars * 4;

    // Get rhythm pattern
    const patternName = this.getPatternForFeel();
    const pattern = RHYTHM_PATTERNS[patternName];
    const durations = generateRhythmDurations(totalBeats, pattern, 0.15);

    let currentBeat = 0;
    let patternIndex = 0;
    let currentOctaveOffset = 0;

    for (const duration of durations) {
      // Determine which chord tone to use
      const chordToneIndex = this.arpConfig.arpeggioPattern[
        patternIndex % this.arpConfig.arpeggioPattern.length
      ];

      // Get base chord tone with octave offset
      const baseIndex = (chordToneIndex + currentOctaveOffset) % this.chordTones.length;
      let pitch = this.chordTones[Math.max(0, Math.min(baseIndex, this.chordTones.length - 1))];

      // Maybe add a passing tone before the chord tone
      if (this.arpConfig.includePassingTones &&
          Math.random() < this.arpConfig.passingToneFrequency &&
          duration >= 0.5) {
        // Insert passing tone
        const passingPitch = this.getPassingTone(pitch);
        if (passingPitch) {
          const passingDuration = duration * 0.4;
          let passingNote = this.createNote(passingPitch, currentBeat, passingDuration * 0.9);
          passingNote = this.applyVelocity(passingNote, currentBeat);
          passingNote.velocity *= 0.7;  // Passing tones are quieter
          notes.push(passingNote);

          currentBeat += passingDuration;

          // Main chord tone gets remaining time
          let mainNote = this.createNote(pitch, currentBeat, (duration - passingDuration) * 0.9);
          mainNote = this.applyVelocity(mainNote, currentBeat);
          notes.push(mainNote);

          currentBeat += duration - passingDuration;
          patternIndex++;
          continue;
        }
      }

      // Regular chord tone
      let note = this.createNote(pitch, currentBeat, duration * 0.9);
      note = this.applyVelocity(note, currentBeat);
      notes.push(note);

      currentBeat += duration;
      patternIndex++;

      // Every pattern cycle, maybe shift octave
      if (patternIndex % this.arpConfig.arpeggioPattern.length === 0) {
        if (Math.random() < 0.3) {
          currentOctaveOffset = (currentOctaveOffset + (Math.random() < 0.5 ? 1 : -1)) % 3;
          currentOctaveOffset = Math.max(-1, Math.min(1, currentOctaveOffset));
        }
      }
    }

    return {
      notes,
      algorithm: 'arpeggio'
    };
  }

  private getPatternForFeel(): string {
    switch (this.arpConfig.rhythmFeel) {
      case 'swing':
        return 'swing-eighths';
      case 'syncopated':
        return 'syncopated-1';
      default:
        return Math.random() < 0.5 ? 'straight-eighths' : 'straight-quarters';
    }
  }

  private getPassingTone(targetPitch: string): string | null {
    const targetMidi = noteToMidi(targetPitch);
    const targetIndex = this.scaleNotes.findIndex(n => noteToMidi(n) === targetMidi);

    if (targetIndex === -1) return null;

    // Get note one scale step above or below
    const direction = Math.random() < 0.5 ? -1 : 1;
    const passingIndex = targetIndex + direction;

    if (passingIndex >= 0 && passingIndex < this.scaleNotes.length) {
      const passingNote = this.scaleNotes[passingIndex];
      // Only use it if it's not also a chord tone
      if (!isChordTone(passingNote, this.arpConfig.key, this.arpConfig.scale)) {
        return passingNote;
      }
    }

    return null;
  }
}
