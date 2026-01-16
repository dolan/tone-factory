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
    gap: 6px;
    flex-wrap: wrap;
    justify-content: center;
  }

  button {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    padding: 8px 14px;
    font-size: 13px;
    border-radius: 6px;
    border: 1px solid transparent;
    transition: all 0.15s ease;
  }

  button:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.1);
  }

  button.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }
</style>
