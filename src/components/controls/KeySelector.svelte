<script lang="ts">
  import { key } from '../../stores/settings';
  import { KEYS } from '../../lib/theory/types';
</script>

<div class="control">
  <label for="key-select">Key</label>
  <select id="key-select" bind:value={$key}>
    {#each KEYS as k}
      <option value={k}>{k}</option>
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
    min-width: 70px;
  }
</style>
