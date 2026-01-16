<script lang="ts">
  import { lengthBars } from '../../stores/settings';
</script>

<div class="control">
  <label for="length-slider">Length: {$lengthBars} bars</label>
  <input
    id="length-slider"
    type="range"
    min="1"
    max="8"
    step="1"
    bind:value={$lengthBars}
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
