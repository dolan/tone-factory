<script lang="ts">
  import { isPlaying, audioInitialized, loopEnabled } from '../../stores/playback';
  import { audioEngine } from '../../lib/audio';

  async function handlePlay() {
    if (!$audioInitialized) {
      await audioEngine.initialize();
    }
    audioEngine.play();
  }

  function handleStop() {
    audioEngine.stop();
  }

  function toggleLoop() {
    loopEnabled.update(v => !v);
    audioEngine.setLoop(!$loopEnabled);
  }
</script>

<div class="transport">
  <button
    class="play-btn"
    onclick={$isPlaying ? handleStop : handlePlay}
    title={$isPlaying ? 'Stop' : 'Play'}
  >
    {#if $isPlaying}
      <!-- Stop icon: rounded square -->
      <svg viewBox="0 0 24 24" width="40" height="40">
        <rect x="6" y="6" width="12" height="12" rx="2" ry="2" fill="currentColor"/>
      </svg>
    {:else}
      <!-- Play icon: triangle with slight offset for optical centering -->
      <svg viewBox="0 0 24 24" width="40" height="40">
        <path d="M8 5.14v13.72c0 .67.75 1.05 1.28.65l9.24-6.86c.45-.33.45-1.01 0-1.34L9.28 4.49C8.75 4.09 8 4.47 8 5.14z" fill="currentColor"/>
      </svg>
    {/if}
  </button>

  <button
    class="loop-btn"
    class:active={$loopEnabled}
    onclick={toggleLoop}
    title={$loopEnabled ? 'Disable Loop' : 'Enable Loop'}
  >
    {#if $loopEnabled}
      <!-- Loop active: filled arrows -->
      <svg viewBox="0 0 24 24" width="36" height="36">
        <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7z" fill="currentColor"/>
        <path d="M17 17H7v-3l-4 4 4 4v-3h12v-6h-2v4z" fill="currentColor"/>
      </svg>
    {:else}
      <!-- Loop inactive: outline arrows -->
      <svg viewBox="0 0 24 24" width="36" height="36">
        <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7z" fill="currentColor" opacity="0.5"/>
        <path d="M17 17H7v-3l-4 4 4 4v-3h12v-6h-2v4z" fill="currentColor" opacity="0.5"/>
      </svg>
    {/if}
  </button>
</div>

<style>
  .transport {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .play-btn {
    background: var(--accent);
    color: white;
  }

  .play-btn:hover {
    background: var(--accent-hover);
  }

  .loop-btn {
    width: 52px;
    height: 52px;
    transition: color 0.15s, transform 0.15s;
  }

  .loop-btn.active {
    color: var(--accent);
  }

  .loop-btn:hover {
    transform: scale(1.1);
  }

  .loop-btn.active:hover {
    color: var(--accent-hover);
  }
</style>
