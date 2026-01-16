import { Midi } from '@tonejs/midi';
import type { Sequence } from '../theory/types';

export function exportToMidi(sequence: Sequence): void {
  const midi = new Midi();

  // Set tempo
  midi.header.setTempo(sequence.tempo);

  // Set time signature (4/4)
  midi.header.timeSignatures.push({
    ticks: 0,
    timeSignature: [4, 4]
  });

  // Create track
  const track = midi.addTrack();
  track.name = `${sequence.key} ${sequence.scale} Lick - ${sequence.algorithm}`;

  // Add notes
  for (const note of sequence.notes) {
    track.addNote({
      midi: note.midi,
      time: note.time,
      duration: note.duration,
      velocity: note.velocity
    });
  }

  // Generate and download
  const midiArray = midi.toArray();
  const blob = new Blob([midiArray], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);

  // Create filename
  const filename = `${sequence.key}-${sequence.scale}-${sequence.algorithm}-${Date.now()}.mid`;

  // Trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Cleanup
  URL.revokeObjectURL(url);
}

export function sequenceToMidiData(sequence: Sequence): Uint8Array {
  const midi = new Midi();

  midi.header.setTempo(sequence.tempo);
  midi.header.timeSignatures.push({
    ticks: 0,
    timeSignature: [4, 4]
  });

  const track = midi.addTrack();
  track.name = `${sequence.key} ${sequence.scale} Lick`;

  for (const note of sequence.notes) {
    track.addNote({
      midi: note.midi,
      time: note.time,
      duration: note.duration,
      velocity: note.velocity
    });
  }

  return midi.toArray();
}
