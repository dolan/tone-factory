<script lang="ts">
  import { key, scale, tempo, algorithm, rhythmFeel, octaveRange } from '../../stores/settings';
  import { sequence, notes } from '../../stores/sequence';
  import { hasSelection, normalizedSelection, clearSelection } from '../../stores/selection';
  import { audioInitialized } from '../../stores/playback';
  import { suppressAutoScrollBriefly } from '../../stores/ui';
  import { generateLick } from '../../lib/generators';
  import { audioEngine } from '../../lib/audio';
  import { beatsToSeconds, secondsToBeats } from '../../lib/theory/rhythm';
  import type { Note } from '../../lib/theory/types';

  async function handleRegenerate() {
    if (!$hasSelection || !$normalizedSelection || !$sequence) return;

    // Suppress auto-scroll to prevent jarring view jumps during regeneration
    suppressAutoScrollBriefly(300);

    // Initialize audio if needed
    if (!$audioInitialized) {
      await audioEngine.initialize();
    }

    // Selection is in BEATS, convert to seconds for time comparison
    const selStartBeat = $normalizedSelection.start;
    const selEndBeat = $normalizedSelection.end;
    const selStartTime = beatsToSeconds(selStartBeat, $tempo);
    const selEndTime = beatsToSeconds(selEndBeat, $tempo);
    const selLengthBeats = selEndBeat - selStartBeat;
    const selLengthBars = selLengthBeats / 4;

    // Keep notes that are COMPLETELY outside the selection
    // Note starts after selection ends OR note ends before selection starts
    const notesOutside = $notes.filter(n => {
      const noteEndTime = n.time + n.duration;
      const isBeforeSelection = noteEndTime <= selStartTime;
      const isAfterSelection = n.time >= selEndTime;
      return isBeforeSelection || isAfterSelection;
    });

    // Generate new notes ONLY for the selection duration
    const newLick = generateLick($algorithm, {
      key: $key,
      scale: $scale,
      tempo: $tempo,
      lengthBars: Math.max(0.25, selLengthBars), // Minimum 1 beat
      octaveRange: $octaveRange,
      rhythmFeel: $rhythmFeel
    });

    // Offset the new notes to start at selection start time
    // AND filter out any notes that would extend past the selection
    const offsetNotes: Note[] = newLick.notes
      .map(n => ({
        ...n,
        id: n.id + '-regen-' + Date.now(),
        time: n.time + selStartTime
      }))
      .filter(n => n.time < selEndTime);

    // Merge: notes outside selection + new notes inside selection
    const mergedNotes = [...notesOutside, ...offsetNotes].sort((a, b) => a.time - b.time);

    // Update sequence with merged notes
    sequence.set({
      ...$sequence,
      notes: mergedNotes
    });

    // Reload into audio engine with the ORIGINAL sequence length (not selection length!)
    const totalDuration = beatsToSeconds($sequence.lengthBars * 4, $tempo);
    audioEngine.loadSequence(mergedNotes, totalDuration);

    // Clear selection after regenerating
    clearSelection();
  }

  $: disabled = !$hasSelection;
</script>

<button
  class="regen-btn"
  onclick={handleRegenerate}
  {disabled}
  title={disabled ? "Shift+drag on ruler to select a region" : "Regenerate notes in selection"}
>
  Regenerate Selection
</button>

<style>
  .regen-btn {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    padding: 10px 16px;
    font-size: 14px;
    border: 1px solid transparent;
    transition: all 0.2s;
  }

  .regen-btn:hover:not(:disabled) {
    background: #e94560;
    color: white;
    border-color: #e94560;
  }

  .regen-btn:disabled {
    opacity: 0.4;
  }
</style>
