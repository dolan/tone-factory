<script lang="ts">
  import { tempo } from '../../stores/settings';
</script>

<div class="control">
  <label for="tempo-slider">Tempo: {$tempo} BPM</label>
  <input
    id="tempo-slider"
    type="range"
    min="40"
    max="200"
    step="1"
    bind:value={$tempo}
  />
</div>

<style>
  .control {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  input[type="range"] {
    width: 120px;
    cursor: pointer;
  }
</style>
