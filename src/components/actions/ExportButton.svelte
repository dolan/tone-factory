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
  }

  .export-btn:hover:not(:disabled) {
    background: var(--bg-secondary);
  }
</style>
