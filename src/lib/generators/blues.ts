import { BaseGenerator, type GeneratorResult, generateNoteId } from './base';
import type { Note, GeneratorConfig } from '../theory/types';
import { noteToMidi, midiToNote, getRootMidi } from '../theory/scales';
import { RHYTHM_PATTERNS, generateRhythmDurations } from '../theory/rhythm';

// Blues scale degrees relative to root (in semitones)
// Minor pentatonic (0, 3, 5, 7, 10) + blue note (6)
const BLUES_SCALE_INTERVALS = [0, 3, 5, 6, 7, 10];

// Which intervals are "blue notes" that want bending
const BLUE_NOTE_INTERVALS = [3, 6, 10]; // b3, b5, b7

interface BluesConfig extends GeneratorConfig {
  bendFrequency: number;      // How often to add bends (0-1)
  turnaround: boolean;        // Include turnaround ending
  boxPosition: number;        // Which blues box (0-2)
  shuffleFeel: boolean;       // Use shuffle rhythm
}

export class BluesGenerator extends BaseGenerator {
  private bluesConfig: BluesConfig;
  private bluesNotes: string[];       // Blues scale notes
  private blueNoteSet: Set<number>;   // MIDI values of blue notes

  constructor(config: GeneratorConfig) {
    super(config);
    this.bluesConfig = {
      ...config,
      bendFrequency: 0.3,
      turnaround: config.lengthBars >= 4,
      boxPosition: Math.floor(Math.random() * 3),
      shuffleFeel: config.rhythmFeel === 'swing' || Math.random() < 0.5
    };

    // Build blues scale for this key
    this.bluesNotes = this.buildBluesScale();
    this.blueNoteSet = this.buildBlueNoteSet();
  }

  generate(): GeneratorResult {
    const notes: Note[] = [];
    const totalBeats = this.bluesConfig.lengthBars * 4;

    // Structure: phrases with question/answer feel
    const phraseBeats = 4; // One bar phrases
    let currentBeat = 0;
    let phraseType: 'question' | 'answer' = 'question';

    while (currentBeat < totalBeats) {
      // Check if we should do turnaround
      const remainingBeats = totalBeats - currentBeat;
      if (this.bluesConfig.turnaround && remainingBeats <= 4) {
        const turnaroundNotes = this.generateTurnaround(currentBeat, remainingBeats);
        notes.push(...turnaroundNotes);
        break;
      }

      // Generate phrase
      const phraseLength = Math.min(phraseBeats, remainingBeats);
      const phraseNotes = this.generateBluesPhrase(currentBeat, phraseLength, phraseType);
      notes.push(...phraseNotes);

      currentBeat += phraseLength;
      phraseType = phraseType === 'question' ? 'answer' : 'question';
    }

    return {
      notes,
      algorithm: 'blues'
    };
  }

  // Build blues scale notes for the key
  private buildBluesScale(): string[] {
    const notes: string[] = [];
    const [minOct, maxOct] = this.bluesConfig.octaveRange;

    for (let octave = minOct; octave <= maxOct; octave++) {
      const rootMidi = getRootMidi(this.bluesConfig.key, octave);
      for (const interval of BLUES_SCALE_INTERVALS) {
        const midi = rootMidi + interval;
        if (midi >= 36 && midi <= 96) {
          notes.push(midiToNote(midi));
        }
      }
    }

    return notes;
  }

  // Build set of blue note MIDI values for quick lookup
  private buildBlueNoteSet(): Set<number> {
    const blueNotes = new Set<number>();
    const [minOct, maxOct] = this.bluesConfig.octaveRange;

    for (let octave = minOct; octave <= maxOct; octave++) {
      const rootMidi = getRootMidi(this.bluesConfig.key, octave);
      for (const interval of BLUE_NOTE_INTERVALS) {
        blueNotes.add(rootMidi + interval);
      }
    }

    return blueNotes;
  }

  // Generate a blues phrase
  private generateBluesPhrase(
    startBeat: number,
    lengthBeats: number,
    phraseType: 'question' | 'answer'
  ): Note[] {
    const notes: Note[] = [];

    // Use shuffle/swing rhythm
    const pattern = this.bluesConfig.shuffleFeel
      ? RHYTHM_PATTERNS['swing-eighths']
      : RHYTHM_PATTERNS['straight-eighths'];
    const durations = generateRhythmDurations(lengthBeats, pattern, 0.15);

    let currentBeat = startBeat;
    let prevIndex = Math.floor(this.bluesNotes.length / 2);

    // Start in appropriate box position
    prevIndex = this.getBoxStartIndex(this.bluesConfig.boxPosition, prevIndex);

    for (let i = 0; i < durations.length; i++) {
      const duration = durations[i];
      const isLast = i === durations.length - 1;
      const beatInPhrase = currentBeat - startBeat;

      // Occasional rest for breathing
      if (Math.random() < 0.1 && i > 0 && i < durations.length - 1) {
        currentBeat += duration;
        continue;
      }

      // Pitch selection
      let pitch: string;
      if (isLast && phraseType === 'answer') {
        // Answer phrase ends on root
        pitch = this.getRootNote(prevIndex);
      } else if (isLast && phraseType === 'question') {
        // Question phrase ends on blue note or 5th
        pitch = this.getQuestionEndNote(prevIndex);
      } else {
        // Regular note selection
        pitch = this.getNextBluesNote(prevIndex, beatInPhrase);
      }

      const pitchIndex = this.bluesNotes.indexOf(pitch);
      if (pitchIndex >= 0) prevIndex = pitchIndex;

      // Check if this is a blue note and might get a bend
      const midi = noteToMidi(pitch);
      const isBlueNote = this.blueNoteSet.has(midi);

      if (isBlueNote && Math.random() < this.bluesConfig.bendFrequency && duration >= 0.5) {
        // Add bend (grace note from below)
        const bendNotes = this.createBend(pitch, currentBeat, duration);
        notes.push(...bendNotes);
      } else {
        // Regular note
        let note = this.createNote(pitch, currentBeat, duration * 0.9);
        note = this.applyBluesVelocity(note, beatInPhrase, isBlueNote);
        notes.push(note);
      }

      currentBeat += duration;
    }

    return notes;
  }

  // Create a bend effect using a grace note
  private createBend(targetPitch: string, startBeat: number, totalDuration: number): Note[] {
    const notes: Note[] = [];
    const targetMidi = noteToMidi(targetPitch);

    // Grace note from a half step below
    const bendFromMidi = targetMidi - 1;
    const bendFromPitch = midiToNote(bendFromMidi);

    // Very short grace note
    const graceDuration = 0.1;
    const mainDuration = totalDuration - graceDuration;

    // Grace note (bend start)
    let graceNote = this.createNote(bendFromPitch, startBeat, graceDuration);
    graceNote.velocity = 0.6;
    notes.push(graceNote);

    // Main note (bend target)
    let mainNote = this.createNote(targetPitch, startBeat + graceDuration, mainDuration * 0.9);
    mainNote.velocity = 0.85; // Bends are expressive
    notes.push(mainNote);

    return notes;
  }

  // Generate blues turnaround
  private generateTurnaround(startBeat: number, lengthBeats: number): Note[] {
    const notes: Note[] = [];

    // Classic turnaround: descending chromatic line
    // 6 -> b6 -> 5 -> root (or variations)
    const rootMidi = getRootMidi(this.bluesConfig.key, 4);
    const turnaroundMidis = [
      rootMidi + 9,   // 6th
      rootMidi + 8,   // b6
      rootMidi + 7,   // 5th
      rootMidi        // root
    ];

    const noteDuration = lengthBeats / turnaroundMidis.length;
    let currentBeat = startBeat;

    for (let i = 0; i < turnaroundMidis.length; i++) {
      const midi = turnaroundMidis[i];
      const pitch = midiToNote(midi);

      // Apply shuffle timing
      let duration = noteDuration;
      if (this.bluesConfig.shuffleFeel) {
        duration = i % 2 === 0 ? noteDuration * 1.33 : noteDuration * 0.67;
      }

      let note = this.createNote(pitch, currentBeat, duration * 0.9);
      // Turnaround builds tension then resolves
      note.velocity = i < turnaroundMidis.length - 1 ? 0.7 : 0.9;

      notes.push(note);
      currentBeat += duration;
    }

    return notes;
  }

  // Get starting index for a blues box position
  private getBoxStartIndex(box: number, defaultIndex: number): number {
    // Different "boxes" represent different positions on the instrument
    const boxOffsets = [0, 2, 4]; // Root position, 3rd position, 5th position
    const offset = boxOffsets[box] || 0;

    // Find a good starting note in this box
    const targetIndex = Math.floor(this.bluesNotes.length * (0.3 + box * 0.2));
    return Math.max(0, Math.min(this.bluesNotes.length - 1, targetIndex));
  }

  // Get next note with blues sensibility
  private getNextBluesNote(currentIndex: number, beatInPhrase: number): string {
    // Blues often uses repeated notes and small movements
    if (Math.random() < 0.2) {
      // Repeat same note
      return this.bluesNotes[currentIndex];
    }

    // Mostly stepwise motion within the pentatonic
    const step = Math.random() < 0.7 ? 1 : 2;
    const direction = Math.random() < 0.5 ? 1 : -1;

    let newIndex = currentIndex + (step * direction);
    newIndex = Math.max(0, Math.min(this.bluesNotes.length - 1, newIndex));

    return this.bluesNotes[newIndex];
  }

  // Get root note near current position
  private getRootNote(nearIndex: number): string {
    const rootPitch = this.bluesConfig.key;

    // Find closest root
    let closestRoot: string | null = null;
    let closestDist = Infinity;

    for (let i = 0; i < this.bluesNotes.length; i++) {
      const note = this.bluesNotes[i];
      if (note.replace(/\d+/, '').replace('#', 'sharp').replace('b', 'flat')
          === rootPitch.replace('#', 'sharp').replace('b', 'flat') ||
          note.startsWith(rootPitch)) {
        const dist = Math.abs(i - nearIndex);
        if (dist < closestDist) {
          closestDist = dist;
          closestRoot = note;
        }
      }
    }

    return closestRoot || this.bluesNotes[0];
  }

  // Get a note for ending question phrases
  private getQuestionEndNote(nearIndex: number): string {
    // Good question endings: 5th or b7
    const targetIntervals = [7, 10]; // 5th, b7
    const rootMidi = getRootMidi(this.bluesConfig.key, 4);

    for (const interval of targetIntervals) {
      const targetMidi = rootMidi + interval;
      const targetPitch = midiToNote(targetMidi);

      // Find closest in our scale
      const idx = this.bluesNotes.indexOf(targetPitch);
      if (idx >= 0 && Math.abs(idx - nearIndex) < 5) {
        return targetPitch;
      }
    }

    // Fallback: just pick something that's not the root
    const nonRoot = this.bluesNotes.filter(n => !n.startsWith(this.bluesConfig.key));
    if (nonRoot.length > 0) {
      const idx = Math.floor(Math.random() * nonRoot.length);
      return nonRoot[idx];
    }

    return this.bluesNotes[nearIndex];
  }

  // Apply blues-appropriate velocity
  private applyBluesVelocity(note: Note, beatPosition: number, isBlueNote: boolean): Note {
    let velocity = 0.7;

    // Downbeats get accent
    if (beatPosition % 1 === 0) {
      velocity += 0.15;
    }

    // Blue notes get slight emphasis
    if (isBlueNote) {
      velocity += 0.05;
    }

    // Slight randomization for human feel
    velocity += (Math.random() * 0.1) - 0.05;

    return {
      ...note,
      velocity: Math.min(1, Math.max(0.4, velocity))
    };
  }
}
