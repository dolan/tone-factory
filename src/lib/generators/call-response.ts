import { BaseGenerator, type GeneratorResult, generateNoteId } from './base';
import type { Note, GeneratorConfig } from '../theory/types';
import { noteToMidi, midiToNote, isChordTone } from '../theory/scales';
import { RHYTHM_PATTERNS, generateRhythmDurations } from '../theory/rhythm';

// Response types for the call-response pattern
type ResponseType = 'echo' | 'answer' | 'mirror' | 'rhythmic';

interface CallResponseConfig extends GeneratorConfig {
  callLengthBars: number;      // Length of call phrase
  silenceBeats: number;        // Rest between call and response
  responseTypes: ResponseType[]; // Available response types to cycle through
}

export class CallResponseGenerator extends BaseGenerator {
  private crConfig: CallResponseConfig;
  private chordTones: string[];
  private rootNote: string;

  constructor(config: GeneratorConfig) {
    super(config);
    this.crConfig = {
      ...config,
      callLengthBars: 1,           // 1 bar calls
      silenceBeats: 0.5,           // Half beat rest
      responseTypes: ['echo', 'answer', 'mirror', 'rhythmic']
    };

    // Extract chord tones
    this.chordTones = this.scaleNotes.filter(note =>
      isChordTone(note, config.key, config.scale)
    );

    // Find root note in middle octave
    this.rootNote = this.findRootNote();
  }

  generate(): GeneratorResult {
    const notes: Note[] = [];
    const totalBeats = this.crConfig.lengthBars * 4;
    const callBeats = this.crConfig.callLengthBars * 4;
    const responseBeats = callBeats;
    const cycleBeats = callBeats + this.crConfig.silenceBeats + responseBeats + this.crConfig.silenceBeats;

    let currentBeat = 0;
    let responseTypeIndex = 0;

    while (currentBeat < totalBeats - callBeats) {
      // Generate call phrase
      const callNotes = this.generateCall(currentBeat, callBeats);
      notes.push(...callNotes);
      currentBeat += callBeats + this.crConfig.silenceBeats;

      // Check if we have room for response
      if (currentBeat >= totalBeats - 1) break;

      // Choose response type
      const responseType = this.crConfig.responseTypes[
        responseTypeIndex % this.crConfig.responseTypes.length
      ];
      responseTypeIndex++;

      // Generate response
      const remainingBeats = Math.min(responseBeats, totalBeats - currentBeat);
      const responseNotes = this.generateResponse(
        callNotes,
        responseType,
        currentBeat,
        remainingBeats
      );
      notes.push(...responseNotes);

      currentBeat += remainingBeats + this.crConfig.silenceBeats;
    }

    return {
      notes,
      algorithm: 'call-response'
    };
  }

  // Find the root note in a comfortable middle register
  private findRootNote(): string {
    const rootPitch = this.crConfig.key;
    // Look for root in octave 4
    const candidates = this.scaleNotes.filter(n => n.startsWith(rootPitch));
    return candidates.find(n => n.includes('4')) ||
           candidates.find(n => n.includes('3')) ||
           candidates[Math.floor(candidates.length / 2)] ||
           this.scaleNotes[Math.floor(this.scaleNotes.length / 2)];
  }

  // Generate a call phrase - ends on non-tonic for "question" feel
  private generateCall(startBeat: number, lengthBeats: number): Note[] {
    const notes: Note[] = [];

    // Get rhythm pattern
    const patternName = this.getPatternForFeel();
    const pattern = RHYTHM_PATTERNS[patternName];
    const durations = generateRhythmDurations(lengthBeats, pattern, 0.1);

    let currentBeat = startBeat;
    let prevIndex = Math.floor(this.scaleNotes.length / 2); // Start in middle

    for (let i = 0; i < durations.length; i++) {
      const duration = durations[i];
      const isLast = i === durations.length - 1;

      // Pitch selection
      let pitch: string;
      if (isLast) {
        // End on a non-tonic note for "question" feel
        // Pick 2nd, 5th, or 7th scale degree
        pitch = this.getNonTonicNote(prevIndex);
      } else {
        // Move by steps with occasional leaps
        pitch = this.getNextMelodicNote(prevIndex);
      }

      const pitchIndex = this.findNoteIndex(pitch);
      if (pitchIndex >= 0) prevIndex = pitchIndex;

      let note = this.createNote(pitch, currentBeat, duration * 0.9);
      note = this.applyVelocity(note, currentBeat - startBeat);

      // Calls are generally stronger/louder
      note.velocity = Math.min(1, note.velocity * 1.1);

      notes.push(note);
      currentBeat += duration;
    }

    return notes;
  }

  // Get a non-tonic note for ending calls
  private getNonTonicNote(nearIndex: number): string {
    // Prefer notes that aren't the root
    const nonRootNotes = this.scaleNotes.filter((n, i) => {
      const isRoot = n.startsWith(this.crConfig.key);
      const distance = Math.abs(i - nearIndex);
      return !isRoot && distance < 5; // Stay near current position
    });

    if (nonRootNotes.length > 0) {
      // Prefer the 2nd or 5th scale degree
      const preferredDegrees = [2, 5, 7]; // 0-indexed: 1, 4, 6
      for (const degree of preferredDegrees) {
        const note = this.scaleNotes[nearIndex + degree - 3];
        if (note && nonRootNotes.includes(note)) {
          return note;
        }
      }
      return nonRootNotes[Math.floor(Math.random() * nonRootNotes.length)];
    }

    return this.scaleNotes[Math.max(0, nearIndex - 1)];
  }

  // Generate response based on call and response type
  private generateResponse(
    callNotes: Note[],
    responseType: ResponseType,
    startBeat: number,
    lengthBeats: number
  ): Note[] {
    switch (responseType) {
      case 'echo':
        return this.generateEchoResponse(callNotes, startBeat);
      case 'answer':
        return this.generateAnswerResponse(callNotes, startBeat, lengthBeats);
      case 'mirror':
        return this.generateMirrorResponse(callNotes, startBeat);
      case 'rhythmic':
        return this.generateRhythmicResponse(callNotes, startBeat);
      default:
        return this.generateAnswerResponse(callNotes, startBeat, lengthBeats);
    }
  }

  // Echo: Same pitches, different octave
  private generateEchoResponse(callNotes: Note[], startBeat: number): Note[] {
    const notes: Note[] = [];
    const octaveShift = Math.random() < 0.5 ? 12 : -12; // Up or down an octave

    let currentBeat = startBeat;

    for (const callNote of callNotes) {
      const originalMidi = noteToMidi(callNote.pitch);
      let newMidi = originalMidi + octaveShift;

      // Keep within reasonable range
      if (newMidi < 36) newMidi = originalMidi + 12;
      if (newMidi > 96) newMidi = originalMidi - 12;

      const pitch = midiToNote(newMidi);
      const duration = callNote.duration;
      const durationBeats = duration / this.beatsToSeconds(1);

      let note = this.createNote(pitch, currentBeat, durationBeats * 0.9);
      note.velocity = callNote.velocity * 0.9; // Echo is slightly softer

      notes.push(note);
      currentBeat += durationBeats;
    }

    return notes;
  }

  // Answer: New melody that resolves to tonic
  private generateAnswerResponse(
    callNotes: Note[],
    startBeat: number,
    lengthBeats: number
  ): Note[] {
    const notes: Note[] = [];

    // Use similar rhythm to call
    const durations = callNotes.map(n => n.duration / this.beatsToSeconds(1));

    // Start from a different note than call ended
    const callEndMidi = noteToMidi(callNotes[callNotes.length - 1].pitch);
    let currentIndex = this.scaleNotes.findIndex(n =>
      Math.abs(noteToMidi(n) - callEndMidi) <= 2 && noteToMidi(n) !== callEndMidi
    );
    if (currentIndex < 0) currentIndex = Math.floor(this.scaleNotes.length / 2);

    let currentBeat = startBeat;

    for (let i = 0; i < durations.length && currentBeat < startBeat + lengthBeats; i++) {
      const duration = durations[i];
      const isLast = i === durations.length - 1;

      let pitch: string;
      if (isLast) {
        // End on tonic for resolution
        pitch = this.rootNote;
      } else {
        // Move melodically toward tonic
        pitch = this.moveTowardTonic(currentIndex, durations.length - i - 1);
        const newIndex = this.findNoteIndex(pitch);
        if (newIndex >= 0) currentIndex = newIndex;
      }

      let note = this.createNote(pitch, currentBeat, duration * 0.9);
      note = this.applyVelocity(note, currentBeat - startBeat);

      // Final note is stronger
      if (isLast) note.velocity = Math.min(1, note.velocity * 1.2);

      notes.push(note);
      currentBeat += duration;
    }

    return notes;
  }

  // Mirror: Inverted contour of the call
  private generateMirrorResponse(callNotes: Note[], startBeat: number): Note[] {
    const notes: Note[] = [];

    if (callNotes.length === 0) return notes;

    // Use first note of call as pivot point
    const pivotMidi = noteToMidi(callNotes[0].pitch);
    let currentBeat = startBeat;

    for (const callNote of callNotes) {
      const originalMidi = noteToMidi(callNote.pitch);
      const interval = originalMidi - pivotMidi;
      let mirroredMidi = pivotMidi - interval; // Invert the interval

      // Keep within scale if possible
      const closestScaleNote = this.findClosestScaleNote(mirroredMidi);
      const pitch = closestScaleNote;

      const durationBeats = callNote.duration / this.beatsToSeconds(1);

      let note = this.createNote(pitch, currentBeat, durationBeats * 0.9);
      note.velocity = callNote.velocity;

      notes.push(note);
      currentBeat += durationBeats;
    }

    return notes;
  }

  // Rhythmic variation: Same pitches, different rhythm
  private generateRhythmicResponse(callNotes: Note[], startBeat: number): Note[] {
    const notes: Note[] = [];

    // Get total duration of call
    const totalDuration = callNotes.reduce((sum, n) =>
      sum + n.duration / this.beatsToSeconds(1), 0
    );

    // Generate new rhythm pattern
    const pattern = RHYTHM_PATTERNS[this.getAlternatePattern()];
    const newDurations = generateRhythmDurations(totalDuration, pattern, 0.2);

    // Distribute call pitches across new rhythm
    let pitchIndex = 0;
    let currentBeat = startBeat;

    for (const duration of newDurations) {
      // Cycle through call pitches
      const callNote = callNotes[pitchIndex % callNotes.length];
      pitchIndex++;

      let note = this.createNote(callNote.pitch, currentBeat, duration * 0.9);
      note = this.applyVelocity(note, currentBeat - startBeat);

      notes.push(note);
      currentBeat += duration;
    }

    return notes;
  }

  // Helper: Get next melodic note with good voice leading
  private getNextMelodicNote(currentIndex: number): string {
    // Mostly stepwise motion
    if (Math.random() < 0.7) {
      const direction = Math.random() < 0.5 ? 1 : -1;
      const newIndex = Math.max(0, Math.min(this.scaleNotes.length - 1, currentIndex + direction));
      return this.scaleNotes[newIndex];
    }

    // Occasional leap (third or fourth)
    const leap = Math.random() < 0.5 ? 2 : 3;
    const direction = Math.random() < 0.5 ? 1 : -1;
    const newIndex = Math.max(0, Math.min(this.scaleNotes.length - 1, currentIndex + (direction * leap)));
    return this.scaleNotes[newIndex];
  }

  // Helper: Move gradually toward tonic
  private moveTowardTonic(currentIndex: number, stepsRemaining: number): string {
    const rootIndex = this.findNoteIndex(this.rootNote);
    if (rootIndex < 0 || stepsRemaining <= 1) {
      return this.getNextMelodicNote(currentIndex);
    }

    // Move toward root
    const direction = rootIndex > currentIndex ? 1 : -1;
    const step = Math.random() < 0.6 ? 1 : 2;
    const newIndex = Math.max(0, Math.min(this.scaleNotes.length - 1, currentIndex + (direction * step)));
    return this.scaleNotes[newIndex];
  }

  // Helper: Find closest note in scale to a MIDI value
  private findClosestScaleNote(targetMidi: number): string {
    let closest = this.scaleNotes[0];
    let closestDist = Infinity;

    for (const note of this.scaleNotes) {
      const midi = noteToMidi(note);
      const dist = Math.abs(midi - targetMidi);
      if (dist < closestDist) {
        closestDist = dist;
        closest = note;
      }
    }

    return closest;
  }

  // Helper: Get rhythm pattern based on feel
  private getPatternForFeel(): string {
    switch (this.crConfig.rhythmFeel) {
      case 'swing':
        return 'swing-eighths';
      case 'syncopated':
        return Math.random() < 0.5 ? 'syncopated-1' : 'syncopated-2';
      default:
        return Math.random() < 0.5 ? 'straight-eighths' : 'mixed-1';
    }
  }

  // Helper: Get alternate rhythm pattern for variation
  private getAlternatePattern(): string {
    const patterns = ['straight-quarters', 'syncopated-1', 'mixed-1'];
    return patterns[Math.floor(Math.random() * patterns.length)];
  }
}
