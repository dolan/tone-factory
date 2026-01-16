<script lang="ts">
  import { sequence } from '../../stores/sequence';
  import { exportToMidi } from '../../lib/midi';

  function handleExport() {
    if ($sequence) {
      exportToMidi($sequence);
    }
  }

  $: disabled = !$sequence || $sequence.notes.length === 0;
</script>

<button class="export-btn" onclick={handleExport} {disabled}>
  Export MIDI
</button>

<style>
  .export-btn {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    padding: 10px 20px;
    font-size: 14px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: all 0.15s ease;
  }

  .export-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .export-btn:disabled {
    opacity: 0.35;
  }
</style>
