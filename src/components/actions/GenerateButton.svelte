<script lang="ts">
  import { key, scale, tempo, lengthBars, algorithm, rhythmFeel, octaveRange } from '../../stores/settings';
  import { sequence } from '../../stores/sequence';
  import { audioInitialized } from '../../stores/playback';
  import { generateLick } from '../../lib/generators';
  import { audioEngine } from '../../lib/audio';
  import { beatsToSeconds } from '../../lib/theory/rhythm';

  async function handleGenerate() {
    // Initialize audio if needed
    if (!$audioInitialized) {
      await audioEngine.initialize();
    }

    // Generate new lick
    const newSequence = generateLick($algorithm, {
      key: $key,
      scale: $scale,
      tempo: $tempo,
      lengthBars: $lengthBars,
      octaveRange: $octaveRange,
      rhythmFeel: $rhythmFeel
    });

    sequence.set(newSequence);

    // Load into audio engine
    const durationSeconds = beatsToSeconds($lengthBars * 4, $tempo);
    audioEngine.setTempo($tempo);
    audioEngine.loadSequence(newSequence.notes, durationSeconds);
  }
</script>

<button class="generate-btn" onclick={handleGenerate}>
  Generate Lick
</button>

<style>
  .generate-btn {
    background: var(--accent);
    color: white;
    font-weight: 600;
    padding: 10px 24px;
    font-size: 14px;
    border-radius: 8px;
    transition: all 0.15s ease;
  }

  .generate-btn:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
  }
</style>
