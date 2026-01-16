<script lang="ts">
  import { algorithm } from '../../stores/settings';
  import type { AlgorithmType } from '../../lib/theory/types';

  const algorithms: { id: AlgorithmType; name: string; description: string }[] = [
    { id: 'scale-run', name: 'Scale Run', description: 'Ascending/descending patterns' },
    { id: 'arpeggio', name: 'Arpeggio', description: 'Chord-tone melodies' },
    { id: 'motif', name: 'Motif', description: 'Developed musical idea' },
    { id: 'bebop', name: 'Bebop', description: 'Enclosures and chromatic approaches' },
    { id: 'call-response', name: 'Call/Response', description: 'Musical conversation patterns' },
    { id: 'sequence', name: 'Sequence', description: 'Pattern transposed through scale' },
    { id: 'blues', name: 'Blues', description: 'Blue notes, bends, and turnarounds' }
  ];
</script>

<div class="control">
  <label>Algorithm</label>
  <div class="algorithm-buttons">
    {#each algorithms as alg}
      <button
        class:active={$algorithm === alg.id}
        onclick={() => algorithm.set(alg.id)}
        title={alg.description}
      >
        {alg.name}
      </button>
    {/each}
  </div>
</div>

<style>
  .control {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .algorithm-buttons {
    display: flex;
    gap: 4px;
  }

  button {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    padding: 6px 12px;
    font-size: 13px;
  }

  button:hover {
    background: var(--bg-secondary);
  }

  button.active {
    background: var(--accent);
    color: white;
  }
</style>
