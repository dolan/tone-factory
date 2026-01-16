import { BaseGenerator, type GeneratorResult, generateNoteId } from './base';
import type { Note, GeneratorConfig } from '../theory/types';
import { noteToMidi, midiToNote } from '../theory/scales';
import { RHYTHM_PATTERNS, generateRhythmDurations } from '../theory/rhythm';

type DevelopmentTechnique =
  | 'transpose-up'
  | 'transpose-down'
  | 'invert'
  | 'retrograde'
  | 'augment'
  | 'diminish';

interface MotifConfig extends GeneratorConfig {
  motifLength: number;
  techniques: DevelopmentTechnique[];
}

export class MotifGenerator extends BaseGenerator {
  private motifConfig: MotifConfig;

  constructor(config: GeneratorConfig) {
    super(config);
    this.motifConfig = {
      ...config,
      motifLength: 4,
      techniques: ['transpose-up', 'transpose-down', 'invert', 'retrograde']
    };
  }

  generate(): GeneratorResult {
    const totalBeats = this.motifConfig.lengthBars * 4;

    // Generate initial motif
    const motif = this.generateInitialMotif();
    const motifDuration = motif.reduce((sum, n) => sum + n.duration, 0);
    const motifBeats = motifDuration / this.beatsToSeconds(1);

    // Build the full sequence by developing the motif
    const allNotes: Note[] = [...motif];
    let currentBeat = motifBeats;
    let techniqueIndex = 0;

    while (currentBeat < totalBeats - motifBeats) {
      // Pick a development technique
      const technique = this.motifConfig.techniques[
        techniqueIndex % this.motifConfig.techniques.length
      ];
      techniqueIndex++;

      // Apply the technique to get a new variation
      const variation = this.applyTechnique(motif, technique, currentBeat);

      // Add variation to sequence
      allNotes.push(...variation);

      const variationBeats = variation.reduce((sum, n) => sum + n.duration, 0) / this.beatsToSeconds(1);
      currentBeat += variationBeats;
    }

    return {
      notes: allNotes,
      algorithm: 'motif'
    };
  }

  private generateInitialMotif(): Note[] {
    const notes: Note[] = [];

    // Get rhythm for motif
    const patternName = this.getPatternForFeel();
    const pattern = RHYTHM_PATTERNS[patternName];
    const durations = generateRhythmDurations(
      this.motifConfig.motifLength,
      pattern,
      0.1
    ).slice(0, this.motifConfig.motifLength);

    let currentBeat = 0;

    // Start on a chord tone
    let currentIndex = this.findStartingIndex();

    for (let i = 0; i < durations.length; i++) {
      const duration = durations[i];
      const pitch = this.getScaleNoteAt(currentIndex);

      let note = this.createNote(pitch, currentBeat, duration * 0.85);
      note = this.applyVelocity(note, currentBeat);
      notes.push(note);

      // Move by small intervals (stepwise or small leaps)
      const movement = this.getMotifMovement();
      currentIndex = Math.max(0, Math.min(this.scaleNotes.length - 1, currentIndex + movement));

      currentBeat += duration;
    }

    return notes;
  }

  private findStartingIndex(): number {
    // Start in the middle of the scale range
    return Math.floor(this.scaleNotes.length / 2);
  }

  private getMotifMovement(): number {
    // Favor stepwise motion with occasional leaps
    const movements = [-2, -1, -1, 0, 1, 1, 2, 3];
    return movements[Math.floor(Math.random() * movements.length)];
  }

  private applyTechnique(
    motif: Note[],
    technique: DevelopmentTechnique,
    startBeat: number
  ): Note[] {
    switch (technique) {
      case 'transpose-up':
        return this.transpose(motif, 2, startBeat);  // Up a scale step
      case 'transpose-down':
        return this.transpose(motif, -2, startBeat);  // Down a scale step
      case 'invert':
        return this.invert(motif, startBeat);
      case 'retrograde':
        return this.retrograde(motif, startBeat);
      case 'augment':
        return this.augment(motif, startBeat);
      case 'diminish':
        return this.diminish(motif, startBeat);
      default:
        return this.transpose(motif, 0, startBeat);
    }
  }

  private transpose(motif: Note[], scaleSteps: number, startBeat: number): Note[] {
    let currentTime = this.beatsToSeconds(startBeat);

    return motif.map(note => {
      const currentIndex = this.scaleNotes.indexOf(note.pitch);
      let newIndex = currentIndex + scaleSteps;

      // Keep within scale bounds
      newIndex = Math.max(0, Math.min(this.scaleNotes.length - 1, newIndex));
      const newPitch = this.scaleNotes[newIndex];

      const newNote: Note = {
        id: generateNoteId(),
        pitch: newPitch,
        midi: noteToMidi(newPitch),
        time: currentTime,
        duration: note.duration,
        velocity: note.velocity
      };

      currentTime += note.duration / 0.85 * 0.85;  // Maintain original spacing
      return newNote;
    });
  }

  private invert(motif: Note[], startBeat: number): Note[] {
    if (motif.length === 0) return [];

    const pivotMidi = noteToMidi(motif[0].pitch);
    let currentTime = this.beatsToSeconds(startBeat);

    return motif.map((note, i) => {
      const originalMidi = noteToMidi(note.pitch);
      const interval = originalMidi - pivotMidi;
      const invertedMidi = pivotMidi - interval;

      // Find closest note in scale
      const invertedPitch = this.findClosestScaleNote(invertedMidi);

      const newNote: Note = {
        id: generateNoteId(),
        pitch: invertedPitch,
        midi: noteToMidi(invertedPitch),
        time: currentTime,
        duration: note.duration,
        velocity: note.velocity
      };

      currentTime += note.duration / 0.85 * 0.85;
      return newNote;
    });
  }

  private retrograde(motif: Note[], startBeat: number): Note[] {
    const reversed = [...motif].reverse();
    let currentTime = this.beatsToSeconds(startBeat);

    return reversed.map(note => {
      const newNote: Note = {
        id: generateNoteId(),
        pitch: note.pitch,
        midi: note.midi,
        time: currentTime,
        duration: note.duration,
        velocity: note.velocity
      };

      currentTime += note.duration / 0.85 * 0.85;
      return newNote;
    });
  }

  private augment(motif: Note[], startBeat: number): Note[] {
    let currentTime = this.beatsToSeconds(startBeat);

    return motif.map(note => {
      const newDuration = note.duration * 1.5;  // 50% longer

      const newNote: Note = {
        id: generateNoteId(),
        pitch: note.pitch,
        midi: note.midi,
        time: currentTime,
        duration: newDuration,
        velocity: note.velocity
      };

      currentTime += newDuration / 0.85 * 0.85;
      return newNote;
    });
  }

  private diminish(motif: Note[], startBeat: number): Note[] {
    let currentTime = this.beatsToSeconds(startBeat);

    return motif.map(note => {
      const newDuration = note.duration * 0.75;  // 25% shorter

      const newNote: Note = {
        id: generateNoteId(),
        pitch: note.pitch,
        midi: note.midi,
        time: currentTime,
        duration: newDuration,
        velocity: note.velocity
      };

      currentTime += newDuration / 0.85 * 0.85;
      return newNote;
    });
  }

  private findClosestScaleNote(targetMidi: number): string {
    let closest = this.scaleNotes[0];
    let closestDist = Infinity;

    for (const note of this.scaleNotes) {
      const dist = Math.abs(noteToMidi(note) - targetMidi);
      if (dist < closestDist) {
        closestDist = dist;
        closest = note;
      }
    }

    return closest;
  }

  private getPatternForFeel(): string {
    switch (this.motifConfig.rhythmFeel) {
      case 'swing':
        return 'swing-eighths';
      case 'syncopated':
        return 'syncopated-2';
      default:
        return 'mixed-1';
    }
  }
}
