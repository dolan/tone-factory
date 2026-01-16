import { BaseGenerator, type GeneratorResult, generateNoteId } from './base';
import type { Note, GeneratorConfig } from '../theory/types';
import { noteToMidi, midiToNote } from '../theory/scales';
import { RHYTHM_PATTERNS, generateRhythmDurations } from '../theory/rhythm';

// Pattern shapes for the initial motif
type PatternShape = 'ascending' | 'descending' | 'turn' | 'mordent' | 'arch';

// Sequence direction
type SequenceDirection = 'ascending' | 'descending' | 'arch';

// Transposition interval in scale steps
type TranspositionInterval = 1 | 2 | 3; // Steps, thirds, fourths

interface SequenceConfig extends GeneratorConfig {
  patternLength: number;        // Notes in the pattern (2-4)
  patternShape: PatternShape;   // Shape of the initial pattern
  sequenceDirection: SequenceDirection;
  transpositionInterval: TranspositionInterval;
  repetitions: number;          // How many times to repeat the pattern
}

// Internal representation of a pattern as intervals from starting note
interface PatternInterval {
  scaleDegreeOffset: number;  // Offset from pattern root in scale degrees
  durationBeats: number;
  velocity: number;
}

export class SequenceGenerator extends BaseGenerator {
  private seqConfig: SequenceConfig;

  constructor(config: GeneratorConfig) {
    super(config);

    // Randomly select pattern characteristics
    const shapes: PatternShape[] = ['ascending', 'descending', 'turn', 'mordent', 'arch'];
    const directions: SequenceDirection[] = ['ascending', 'descending', 'arch'];
    const intervals: TranspositionInterval[] = [1, 2, 3];

    this.seqConfig = {
      ...config,
      patternLength: 3 + Math.floor(Math.random() * 2), // 3-4 notes
      patternShape: shapes[Math.floor(Math.random() * shapes.length)],
      sequenceDirection: directions[Math.floor(Math.random() * directions.length)],
      transpositionInterval: intervals[Math.floor(Math.random() * intervals.length)],
      repetitions: 4 // Will adjust based on length
    };

    // Adjust repetitions based on total length
    const patternBeats = this.seqConfig.patternLength * 0.5; // ~eighth notes
    const totalBeats = config.lengthBars * 4;
    this.seqConfig.repetitions = Math.floor(totalBeats / patternBeats);
  }

  generate(): GeneratorResult {
    const notes: Note[] = [];
    const totalBeats = this.seqConfig.lengthBars * 4;

    // Generate the initial pattern
    const pattern = this.generatePattern();
    const patternDuration = pattern.reduce((sum, p) => sum + p.durationBeats, 0);

    // Calculate how many repetitions fit
    const maxReps = Math.floor(totalBeats / patternDuration);
    const repetitions = Math.min(this.seqConfig.repetitions, maxReps);

    // Determine starting position in scale (middle-ish)
    let startIndex = Math.floor(this.scaleNotes.length / 3);

    // Track sequence direction state for arch patterns
    let currentDirection = this.seqConfig.sequenceDirection === 'descending' ? -1 : 1;
    let archPeak = Math.floor(repetitions / 2);

    let currentBeat = 0;

    for (let rep = 0; rep < repetitions; rep++) {
      // Calculate transposition for this repetition
      const transposition = this.calculateTransposition(rep, currentDirection, archPeak);

      // Generate notes for this pattern repetition
      const repNotes = this.instantiatePattern(
        pattern,
        startIndex + transposition,
        currentBeat
      );
      notes.push(...repNotes);

      currentBeat += patternDuration;

      // Update direction for arch pattern
      if (this.seqConfig.sequenceDirection === 'arch' && rep === archPeak) {
        currentDirection = -1;
      }
    }

    return {
      notes,
      algorithm: 'sequence'
    };
  }

  // Generate the pattern as abstract intervals
  private generatePattern(): PatternInterval[] {
    const pattern: PatternInterval[] = [];
    const length = this.seqConfig.patternLength;

    // Base duration for pattern notes
    const baseDuration = this.seqConfig.rhythmFeel === 'swing' ? 0.5 : 0.5;

    switch (this.seqConfig.patternShape) {
      case 'ascending':
        // Simple ascending run: 0, 1, 2, 3...
        for (let i = 0; i < length; i++) {
          pattern.push({
            scaleDegreeOffset: i,
            durationBeats: baseDuration,
            velocity: 0.7 + (i === 0 ? 0.1 : 0) // Accent first note
          });
        }
        break;

      case 'descending':
        // Simple descending run: 0, -1, -2, -3...
        for (let i = 0; i < length; i++) {
          pattern.push({
            scaleDegreeOffset: -i,
            durationBeats: baseDuration,
            velocity: 0.7 + (i === 0 ? 0.1 : 0)
          });
        }
        break;

      case 'turn':
        // Turn figure: up, down, down, up (0, 1, -1, 0) or similar
        const turnOffsets = length === 3 ? [0, 1, -1] : [0, 1, -1, 0];
        for (let i = 0; i < length; i++) {
          pattern.push({
            scaleDegreeOffset: turnOffsets[i] || 0,
            durationBeats: baseDuration,
            velocity: 0.7 + (i === 0 ? 0.1 : 0)
          });
        }
        break;

      case 'mordent':
        // Mordent-like: main note, upper neighbor, main note
        const mordentOffsets = length === 3 ? [0, 1, 0] : [0, 1, 0, -1];
        for (let i = 0; i < length; i++) {
          pattern.push({
            scaleDegreeOffset: mordentOffsets[i] || 0,
            durationBeats: i === 0 ? baseDuration * 1.5 : baseDuration * 0.75,
            velocity: 0.7 + (i === 0 ? 0.1 : -0.1)
          });
        }
        break;

      case 'arch':
        // Arch: up then down
        const archOffsets = length === 3 ? [0, 1, 0] : [0, 1, 2, 1];
        for (let i = 0; i < length; i++) {
          pattern.push({
            scaleDegreeOffset: archOffsets[i] || 0,
            durationBeats: baseDuration,
            velocity: 0.7 + (archOffsets[i] === Math.max(...archOffsets) ? 0.1 : 0)
          });
        }
        break;
    }

    // Apply swing if needed
    if (this.seqConfig.rhythmFeel === 'swing') {
      for (let i = 0; i < pattern.length; i++) {
        if (i % 2 === 0) {
          pattern[i].durationBeats *= 1.33;
        } else {
          pattern[i].durationBeats *= 0.67;
        }
      }
    }

    return pattern;
  }

  // Calculate transposition amount for a repetition
  private calculateTransposition(
    rep: number,
    direction: number,
    archPeak: number
  ): number {
    const interval = this.seqConfig.transpositionInterval;

    switch (this.seqConfig.sequenceDirection) {
      case 'ascending':
        return rep * interval;

      case 'descending':
        return -rep * interval;

      case 'arch':
        if (rep <= archPeak) {
          return rep * interval;
        } else {
          // Descending side of arch
          return (archPeak * interval) - ((rep - archPeak) * interval);
        }

      default:
        return rep * interval;
    }
  }

  // Convert abstract pattern to actual notes
  private instantiatePattern(
    pattern: PatternInterval[],
    startScaleIndex: number,
    startBeat: number
  ): Note[] {
    const notes: Note[] = [];
    let currentBeat = startBeat;

    for (const p of pattern) {
      // Calculate actual scale index
      let scaleIndex = startScaleIndex + p.scaleDegreeOffset;

      // Wrap around scale if needed (allows sequences to continue beyond range)
      while (scaleIndex < 0) {
        scaleIndex += this.scaleNotes.length;
      }
      while (scaleIndex >= this.scaleNotes.length) {
        scaleIndex -= this.scaleNotes.length;
      }

      // Ensure within bounds
      scaleIndex = Math.max(0, Math.min(this.scaleNotes.length - 1, scaleIndex));

      const pitch = this.scaleNotes[scaleIndex];

      let note = this.createNote(pitch, currentBeat, p.durationBeats * 0.9);
      note.velocity = p.velocity;
      note = this.applyVelocity(note, currentBeat);

      notes.push(note);
      currentBeat += p.durationBeats;
    }

    return notes;
  }
}
