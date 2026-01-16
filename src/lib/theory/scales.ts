import { Scale, Note as TonalNote } from 'tonal';
import type { ScaleDefinition } from './types';

// Scale definitions with intervals in semitones
export const SCALE_DEFINITIONS: Record<string, ScaleDefinition> = {
  'major': {
    name: 'Major',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    chordTones: [1, 3, 5, 7]
  },
  'minor': {
    name: 'Natural Minor',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    chordTones: [1, 3, 5, 7]
  },
  'pentatonic-major': {
    name: 'Major Pentatonic',
    intervals: [0, 2, 4, 7, 9],
    chordTones: [1, 3, 5]
  },
  'pentatonic-minor': {
    name: 'Minor Pentatonic',
    intervals: [0, 3, 5, 7, 10],
    chordTones: [1, 3, 5]
  },
  'blues': {
    name: 'Blues',
    intervals: [0, 3, 5, 6, 7, 10],
    chordTones: [1, 4, 5]
  },
  'dorian': {
    name: 'Dorian',
    intervals: [0, 2, 3, 5, 7, 9, 10],
    chordTones: [1, 3, 5, 7]
  },
  'mixolydian': {
    name: 'Mixolydian',
    intervals: [0, 2, 4, 5, 7, 9, 10],
    chordTones: [1, 3, 5, 7]
  },
  'phrygian': {
    name: 'Phrygian',
    intervals: [0, 1, 3, 5, 7, 8, 10],
    chordTones: [1, 3, 5, 7]
  },
  'lydian': {
    name: 'Lydian',
    intervals: [0, 2, 4, 6, 7, 9, 11],
    chordTones: [1, 3, 5, 7]
  }
};

// Convert note name to MIDI number
export function noteToMidi(note: string): number {
  const midi = TonalNote.midi(note);
  return midi ?? 60; // Default to middle C
}

// Convert MIDI number to note name
export function midiToNote(midi: number): string {
  return TonalNote.fromMidi(midi) ?? 'C4';
}

// Get the root note MIDI value for a key at a given octave
export function getRootMidi(key: string, octave: number): number {
  return noteToMidi(`${key}${octave}`);
}

// Get all notes in a scale within an octave range
export function getScaleNotes(
  key: string,
  scaleName: string,
  octaveRange: [number, number]
): string[] {
  const definition = SCALE_DEFINITIONS[scaleName];
  if (!definition) return [];

  const notes: string[] = [];
  const [minOctave, maxOctave] = octaveRange;

  for (let octave = minOctave; octave <= maxOctave; octave++) {
    const rootMidi = getRootMidi(key, octave);
    for (const interval of definition.intervals) {
      const midi = rootMidi + interval;
      // Only include if within reasonable MIDI range
      if (midi >= 0 && midi <= 127) {
        notes.push(midiToNote(midi));
      }
    }
  }

  return notes;
}

// Get scale degree (1-indexed) of a note within a scale
export function getScaleDegree(
  note: string,
  key: string,
  scaleName: string
): number | null {
  const definition = SCALE_DEFINITIONS[scaleName];
  if (!definition) return null;

  const noteMidi = noteToMidi(note);
  const keyMidi = noteToMidi(`${key}0`);
  const interval = ((noteMidi - keyMidi) % 12 + 12) % 12;

  const degreeIndex = definition.intervals.indexOf(interval);
  return degreeIndex >= 0 ? degreeIndex + 1 : null;
}

// Check if a note is a chord tone in the scale
export function isChordTone(
  note: string,
  key: string,
  scaleName: string
): boolean {
  const degree = getScaleDegree(note, key, scaleName);
  if (!degree) return false;

  const definition = SCALE_DEFINITIONS[scaleName];
  return definition?.chordTones.includes(degree) ?? false;
}

// Get note at a specific scale degree
export function getNoteAtDegree(
  key: string,
  scaleName: string,
  degree: number,  // 1-indexed
  octave: number
): string | null {
  const definition = SCALE_DEFINITIONS[scaleName];
  if (!definition) return null;

  // Normalize degree to 1-based within scale length
  const scaleLength = definition.intervals.length;
  const normalizedDegree = ((degree - 1) % scaleLength + scaleLength) % scaleLength;
  const octaveOffset = Math.floor((degree - 1) / scaleLength);

  const rootMidi = getRootMidi(key, octave + octaveOffset);
  const midi = rootMidi + definition.intervals[normalizedDegree];

  return midiToNote(midi);
}

// Get neighboring notes in the scale
export function getNeighboringNotes(
  note: string,
  key: string,
  scaleName: string,
  octaveRange: [number, number]
): { below: string | null; above: string | null } {
  const scaleNotes = getScaleNotes(key, scaleName, octaveRange);
  const index = scaleNotes.indexOf(note);

  if (index === -1) {
    // Note not in scale, find closest
    const noteMidi = noteToMidi(note);
    let closestIndex = 0;
    let closestDist = Infinity;

    for (let i = 0; i < scaleNotes.length; i++) {
      const dist = Math.abs(noteToMidi(scaleNotes[i]) - noteMidi);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = i;
      }
    }

    return {
      below: closestIndex > 0 ? scaleNotes[closestIndex - 1] : null,
      above: closestIndex < scaleNotes.length - 1 ? scaleNotes[closestIndex + 1] : null
    };
  }

  return {
    below: index > 0 ? scaleNotes[index - 1] : null,
    above: index < scaleNotes.length - 1 ? scaleNotes[index + 1] : null
  };
}
