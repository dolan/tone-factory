<script lang="ts">
  import { rhythmFeel } from '../../stores/settings';

  const feels: { id: 'straight' | 'swing' | 'syncopated'; name: string }[] = [
    { id: 'straight', name: 'Straight' },
    { id: 'swing', name: 'Swing' },
    { id: 'syncopated', name: 'Syncopated' }
  ];
</script>

<div class="control">
  <label for="rhythm-select">Feel</label>
  <select id="rhythm-select" bind:value={$rhythmFeel}>
    {#each feels as f}
      <option value={f.id}>{f.name}</option>
    {/each}
  </select>
</div>

<style>
  .control {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  select {
    min-width: 100px;
  }
</style>
