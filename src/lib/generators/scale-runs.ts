import { BaseGenerator, type GeneratorResult } from './base';
import type { Note, GeneratorConfig } from '../theory/types';
import { RHYTHM_PATTERNS, generateRhythmDurations } from '../theory/rhythm';

interface ScaleRunConfig extends GeneratorConfig {
  direction: 'ascending' | 'descending' | 'mixed';
  runLength: number;  // Notes per run segment
  restProbability: number;
}

export class ScaleRunGenerator extends BaseGenerator {
  private runConfig: ScaleRunConfig;

  constructor(config: GeneratorConfig) {
    super(config);
    this.runConfig = {
      ...config,
      direction: 'mixed',
      runLength: 4,
      restProbability: 0.1
    };
  }

  generate(): GeneratorResult {
    const notes: Note[] = [];
    const totalBeats = this.runConfig.lengthBars * 4; // Assuming 4/4 time

    // Get rhythm pattern based on feel
    const patternName = this.getPatternForFeel();
    const pattern = RHYTHM_PATTERNS[patternName];
    const durations = generateRhythmDurations(totalBeats, pattern, 0.2);

    let currentBeat = 0;
    let currentIndex = this.getStartingIndex();
    let currentDirection = this.getInitialDirection();
    let notesInRun = 0;

    for (const duration of durations) {
      // Maybe insert a rest
      if (Math.random() < this.runConfig.restProbability) {
        currentBeat += duration;
        notesInRun = 0;  // Reset run on rest
        continue;
      }

      // Create the note
      const pitch = this.getScaleNoteAt(currentIndex);
      let note = this.createNote(pitch, currentBeat, duration * 0.9);
      note = this.applyVelocity(note, currentBeat);
      notes.push(note);

      // Move to next note in scale
      currentIndex += currentDirection;
      notesInRun++;

      // Handle direction changes
      if (notesInRun >= this.runConfig.runLength) {
        if (this.runConfig.direction === 'mixed') {
          currentDirection *= -1;  // Reverse direction
        }
        notesInRun = 0;
      }

      // Keep within scale bounds
      if (currentIndex >= this.scaleNotes.length - 1) {
        currentDirection = -1;
        currentIndex = this.scaleNotes.length - 1;
      } else if (currentIndex <= 0) {
        currentDirection = 1;
        currentIndex = 0;
      }

      currentBeat += duration;
    }

    return {
      notes,
      algorithm: 'scale-run'
    };
  }

  private getPatternForFeel(): string {
    switch (this.runConfig.rhythmFeel) {
      case 'swing':
        return 'swing-eighths';
      case 'syncopated':
        return Math.random() < 0.5 ? 'syncopated-1' : 'syncopated-2';
      default:
        return Math.random() < 0.7 ? 'straight-eighths' : 'straight-sixteenths';
    }
  }

  private getStartingIndex(): number {
    // Start somewhere in the middle third of the scale
    const third = Math.floor(this.scaleNotes.length / 3);
    return third + Math.floor(Math.random() * third);
  }

  private getInitialDirection(): 1 | -1 {
    switch (this.runConfig.direction) {
      case 'ascending':
        return 1;
      case 'descending':
        return -1;
      default:
        return Math.random() < 0.5 ? 1 : -1;
    }
  }
}
