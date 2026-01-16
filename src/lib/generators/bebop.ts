import { BaseGenerator, type GeneratorResult, generateNoteId } from './base';
import type { Note, GeneratorConfig } from '../theory/types';
import { isChordTone, noteToMidi, midiToNote } from '../theory/scales';
import { RHYTHM_PATTERNS, generateRhythmDurations } from '../theory/rhythm';

// Approach pattern types for bebop vocabulary
type ApproachType =
  | 'chromatic-above'      // Half step from above
  | 'chromatic-below'      // Half step from below
  | 'enclosure-above-first' // Above, below, target
  | 'enclosure-below-first' // Below, above, target
  | 'double-chromatic'     // Two chromatic notes from above
  | 'scale-step'           // Diatonic step from above or below
  | 'direct';              // No approach, direct to target

interface BebopConfig extends GeneratorConfig {
  approachFrequency: number;  // 0-1, how often to use approach patterns
  enclosureFrequency: number; // 0-1, preference for enclosures vs single chromatic
}

export class BebopGenerator extends BaseGenerator {
  private bebopConfig: BebopConfig;
  private chordTones: string[];

  constructor(config: GeneratorConfig) {
    super(config);
    this.bebopConfig = {
      ...config,
      approachFrequency: 0.7,    // Most notes get approaches
      enclosureFrequency: 0.4    // Mix of enclosures and chromatic approaches
    };

    // Extract chord tones from scale for targeting
    this.chordTones = this.scaleNotes.filter(note =>
      isChordTone(note, config.key, config.scale)
    );

    // Ensure we have chord tones
    if (this.chordTones.length === 0) {
      // Fallback: use 1st, 3rd, 5th scale degrees
      this.chordTones = [
        this.scaleNotes[0],
        this.scaleNotes[Math.min(2, this.scaleNotes.length - 1)],
        this.scaleNotes[Math.min(4, this.scaleNotes.length - 1)]
      ].filter(Boolean);
    }
  }

  generate(): GeneratorResult {
    const notes: Note[] = [];
    const totalBeats = this.bebopConfig.lengthBars * 4;

    // Plan target notes for strong beats (beats 1 and 3 of each bar)
    const targets = this.planTargets(totalBeats);

    // Fill in between targets with approach patterns
    let currentBeat = 0;

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const nextTarget = targets[i + 1];
      const beatsUntilTarget = target.beat - currentBeat;
      const beatsAfterTarget = nextTarget
        ? nextTarget.beat - target.beat
        : totalBeats - target.beat;

      // Generate approach pattern to this target
      if (beatsUntilTarget > 0 && i > 0) {
        const approachNotes = this.generateApproach(
          target.pitch,
          currentBeat,
          beatsUntilTarget
        );
        notes.push(...approachNotes);
      }

      // Add the target note itself
      const targetDuration = Math.min(
        beatsAfterTarget > 1 ? 1 : beatsAfterTarget * 0.8,
        0.5  // Bebop lines keep moving
      );

      let targetNote = this.createNote(
        target.pitch,
        target.beat,
        targetDuration,
        0.85  // Targets are accented
      );
      targetNote = this.applyVelocity(targetNote, target.beat);
      notes.push(targetNote);

      currentBeat = target.beat + targetDuration;

      // Fill time after target with bebop line material
      const fillBeats = nextTarget
        ? nextTarget.beat - currentBeat - 0.5  // Leave room for next approach
        : totalBeats - currentBeat;

      if (fillBeats > 0.25) {
        const fillNotes = this.generateBebopLine(
          target.pitch,
          currentBeat,
          fillBeats,
          nextTarget?.pitch
        );
        notes.push(...fillNotes);
        if (fillNotes.length > 0) {
          const lastFill = fillNotes[fillNotes.length - 1];
          currentBeat = (lastFill.time / this.beatsToSeconds(1)) +
            (lastFill.duration / this.beatsToSeconds(1));
        }
      }
    }

    return {
      notes,
      algorithm: 'bebop'
    };
  }

  // Plan chord tone targets for strong beats
  private planTargets(totalBeats: number): { beat: number; pitch: string }[] {
    const targets: { beat: number; pitch: string }[] = [];

    // Target strong beats: 1 and 3 of each bar (beats 0, 2, 4, 6, etc.)
    for (let beat = 0; beat < totalBeats; beat += 2) {
      // Pick a chord tone, preferring smooth voice leading
      let pitch: string;

      if (targets.length === 0) {
        // First target: pick from middle of range
        const midIndex = Math.floor(this.chordTones.length / 2);
        pitch = this.chordTones[midIndex];
      } else {
        // Subsequent targets: move by step or small leap for voice leading
        const prevPitch = targets[targets.length - 1].pitch;
        pitch = this.getNextTarget(prevPitch);
      }

      targets.push({ beat, pitch });
    }

    return targets;
  }

  // Get next target note with good voice leading
  private getNextTarget(prevPitch: string): string {
    const prevMidi = noteToMidi(prevPitch);

    // Find chord tones within a reasonable interval (step to fifth)
    const candidates = this.chordTones.filter(ct => {
      const midi = noteToMidi(ct);
      const interval = Math.abs(midi - prevMidi);
      return interval >= 1 && interval <= 7; // m2 to P5
    });

    if (candidates.length === 0) {
      // Fallback to any chord tone
      return this.chordTones[Math.floor(Math.random() * this.chordTones.length)];
    }

    // Prefer stepwise motion (intervals of 1-3 semitones)
    const stepwise = candidates.filter(ct => {
      const interval = Math.abs(noteToMidi(ct) - prevMidi);
      return interval <= 3;
    });

    if (stepwise.length > 0 && Math.random() < 0.7) {
      return stepwise[Math.floor(Math.random() * stepwise.length)];
    }

    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // Generate approach notes to a target
  private generateApproach(
    targetPitch: string,
    startBeat: number,
    availableBeats: number
  ): Note[] {
    const notes: Note[] = [];
    const targetMidi = noteToMidi(targetPitch);

    // Skip approach sometimes for variety
    if (Math.random() > this.bebopConfig.approachFrequency) {
      return notes;
    }

    // Choose approach type based on available time
    const approachType = this.selectApproachType(availableBeats);
    const approachPitches = this.getApproachPitches(targetMidi, approachType);

    if (approachPitches.length === 0) return notes;

    // Calculate timing for approach notes
    const noteDuration = Math.min(0.5, availableBeats / approachPitches.length);
    let currentBeat = startBeat + (availableBeats - (noteDuration * approachPitches.length));

    // Swing feel for bebop
    const useSwing = this.bebopConfig.rhythmFeel === 'swing';

    for (let i = 0; i < approachPitches.length; i++) {
      const pitch = approachPitches[i];
      let duration = noteDuration;

      // Apply swing: long-short pattern
      if (useSwing && i % 2 === 0 && i < approachPitches.length - 1) {
        duration = noteDuration * 1.3;
      } else if (useSwing && i % 2 === 1) {
        duration = noteDuration * 0.7;
      }

      let note = this.createNote(pitch, currentBeat, duration * 0.9);
      note.velocity = 0.6 + (i / approachPitches.length) * 0.2; // Crescendo into target
      notes.push(note);

      currentBeat += duration;
    }

    return notes;
  }

  // Select approach type based on available time
  private selectApproachType(availableBeats: number): ApproachType {
    if (availableBeats < 0.5) {
      return 'direct';
    }

    if (availableBeats >= 1.5 && Math.random() < this.bebopConfig.enclosureFrequency) {
      // Enclosure needs at least 3 notes
      return Math.random() < 0.5 ? 'enclosure-above-first' : 'enclosure-below-first';
    }

    if (availableBeats >= 1 && Math.random() < 0.3) {
      return 'double-chromatic';
    }

    // Single chromatic approach
    return Math.random() < 0.5 ? 'chromatic-above' : 'chromatic-below';
  }

  // Get the pitches for an approach pattern
  private getApproachPitches(targetMidi: number, approachType: ApproachType): string[] {
    switch (approachType) {
      case 'chromatic-above':
        return [midiToNote(targetMidi + 1)];

      case 'chromatic-below':
        return [midiToNote(targetMidi - 1)];

      case 'enclosure-above-first':
        // Scale tone above, chromatic below, target
        return [
          this.getScaleToneAbove(targetMidi),
          midiToNote(targetMidi - 1)
        ];

      case 'enclosure-below-first':
        // Scale tone below, chromatic above, target
        return [
          this.getScaleToneBelow(targetMidi),
          midiToNote(targetMidi + 1)
        ];

      case 'double-chromatic':
        // Two chromatic notes from above
        return [
          midiToNote(targetMidi + 2),
          midiToNote(targetMidi + 1)
        ];

      case 'scale-step':
        const direction = Math.random() < 0.5 ? 1 : -1;
        return direction > 0
          ? [this.getScaleToneAbove(targetMidi)]
          : [this.getScaleToneBelow(targetMidi)];

      case 'direct':
      default:
        return [];
    }
  }

  // Get the scale tone above a given MIDI note
  private getScaleToneAbove(midi: number): string {
    const pitch = midiToNote(midi);
    const index = this.scaleNotes.findIndex(n => noteToMidi(n) >= midi);

    if (index >= 0 && index < this.scaleNotes.length - 1) {
      const nextNote = this.scaleNotes[index + 1];
      if (noteToMidi(nextNote) > midi) {
        return nextNote;
      }
    }

    // Fallback: whole step above
    return midiToNote(midi + 2);
  }

  // Get the scale tone below a given MIDI note
  private getScaleToneBelow(midi: number): string {
    const pitch = midiToNote(midi);
    const index = this.scaleNotes.findIndex(n => noteToMidi(n) >= midi);

    if (index > 0) {
      return this.scaleNotes[index - 1];
    }

    // Fallback: whole step below
    return midiToNote(midi - 2);
  }

  // Generate bebop line material between targets
  private generateBebopLine(
    startPitch: string,
    startBeat: number,
    availableBeats: number,
    nextTargetPitch?: string
  ): Note[] {
    const notes: Note[] = [];

    if (availableBeats < 0.25) return notes;

    // Use eighth notes for bebop line
    const noteDuration = 0.5;
    const noteCount = Math.floor(availableBeats / noteDuration);

    if (noteCount === 0) return notes;

    let currentBeat = startBeat;
    let currentMidi = noteToMidi(startPitch);
    const targetMidi = nextTargetPitch ? noteToMidi(nextTargetPitch) : currentMidi;

    // Determine overall direction towards next target
    const overallDirection = targetMidi > currentMidi ? 1 :
                            targetMidi < currentMidi ? -1 :
                            (Math.random() < 0.5 ? 1 : -1);

    for (let i = 0; i < noteCount; i++) {
      // Move mostly in scale, occasionally chromatic
      let nextMidi: number;

      if (Math.random() < 0.15) {
        // Chromatic passing tone
        nextMidi = currentMidi + overallDirection;
      } else {
        // Scale step
        if (overallDirection > 0) {
          const above = this.getScaleToneAbove(currentMidi);
          nextMidi = noteToMidi(above);
        } else {
          const below = this.getScaleToneBelow(currentMidi);
          nextMidi = noteToMidi(below);
        }
      }

      // Add some direction changes for interest
      if (Math.random() < 0.2 && i > 0 && i < noteCount - 1) {
        nextMidi = currentMidi + (overallDirection * -1 * (Math.random() < 0.5 ? 1 : 2));
      }

      const pitch = midiToNote(nextMidi);

      // Apply swing
      let duration = noteDuration;
      if (this.bebopConfig.rhythmFeel === 'swing') {
        duration = i % 2 === 0 ? noteDuration * 1.3 : noteDuration * 0.7;
      }

      let note = this.createNote(pitch, currentBeat, duration * 0.85);
      note = this.applyVelocity(note, currentBeat);
      notes.push(note);

      currentBeat += duration;
      currentMidi = nextMidi;

      if (currentBeat >= startBeat + availableBeats - 0.1) break;
    }

    return notes;
  }
}
