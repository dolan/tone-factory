import { writable, derived } from 'svelte/store';
import type { Sequence, Note } from '../lib/theory/types';

// The generated sequence
export const sequence = writable<Sequence | null>(null);

// Just the notes array for convenience
export const notes = derived(
  sequence,
  ($sequence) => $sequence?.notes ?? []
);

// Sequence duration in seconds
export const sequenceDuration = derived(
  sequence,
  ($sequence) => {
    if (!$sequence || $sequence.notes.length === 0) return 0;
    const lastNote = $sequence.notes.reduce((latest, note) =>
      note.time + note.duration > latest.time + latest.duration ? note : latest
    );
    return lastNote.time + lastNote.duration;
  }
);

// Update a single note in the sequence
export function updateNote(noteId: string, updates: Partial<Note>) {
  sequence.update(seq => {
    if (!seq) return seq;
    return {
      ...seq,
      notes: seq.notes.map(n =>
        n.id === noteId ? { ...n, ...updates } : n
      )
    };
  });
}

// Delete a note from the sequence
export function deleteNote(noteId: string) {
  sequence.update(seq => {
    if (!seq) return seq;
    return {
      ...seq,
      notes: seq.notes.filter(n => n.id !== noteId)
    };
  });
}

// Add a new note to the sequence
export function addNote(note: Note) {
  sequence.update(seq => {
    if (!seq) return seq;
    return {
      ...seq,
      notes: [...seq.notes, note]
    };
  });
}
