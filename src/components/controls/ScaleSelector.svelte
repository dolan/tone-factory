<script lang="ts">
  import { scale } from '../../stores/settings';
  import { SCALE_DEFINITIONS } from '../../lib/theory/scales';

  const scales = Object.entries(SCALE_DEFINITIONS).map(([id, def]) => ({
    id,
    name: def.name
  }));
</script>

<div class="control">
  <label for="scale-select">Scale</label>
  <select id="scale-select" bind:value={$scale}>
    {#each scales as s}
      <option value={s.id}>{s.name}</option>
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
    min-width: 140px;
  }
</style>
