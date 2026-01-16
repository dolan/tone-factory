<script lang="ts">
  import './app.css';

  import KeySelector from './components/controls/KeySelector.svelte';
  import ScaleSelector from './components/controls/ScaleSelector.svelte';
  import TempoSlider from './components/controls/TempoSlider.svelte';
  import LengthSlider from './components/controls/LengthSlider.svelte';
  import AlgorithmSelector from './components/controls/AlgorithmSelector.svelte';
  import RhythmSelector from './components/controls/RhythmSelector.svelte';
  import TransportBar from './components/transport/TransportBar.svelte';
  import GenerateButton from './components/actions/GenerateButton.svelte';
  import ExportButton from './components/actions/ExportButton.svelte';
  import RegenerateSelectionButton from './components/actions/RegenerateSelectionButton.svelte';
  import DeselectButton from './components/actions/DeselectButton.svelte';
  import PianoRoll from './components/pianoroll/PianoRoll.svelte';

  import { sequence } from './stores/sequence';
  import { key, scale, algorithm } from './stores/settings';
  import { hasSelection } from './stores/selection';
</script>

<div class="app">
  <header>
    <h1>Tone Factory</h1>
    <p class="subtitle">Musical Lick Generator</p>
  </header>

  <main>
    <section class="controls-section">
      <div class="control-group">
        <KeySelector />
        <ScaleSelector />
        <RhythmSelector />
      </div>

      <div class="control-group">
        <TempoSlider />
        <LengthSlider />
      </div>

      <div class="control-group algorithm-group">
        <AlgorithmSelector />
      </div>

      <div class="actions">
        <GenerateButton />
        <RegenerateSelectionButton />
        <DeselectButton />
        <TransportBar />
        <ExportButton />
      </div>
    </section>

    <section class="editor-section">
      {#if $sequence}
        <div class="sequence-info">
          <span class="info-badge">{$key} {$scale}</span>
          <span class="info-badge">{$sequence.notes.length} notes</span>
          <span class="info-badge">{$algorithm}</span>
        </div>
      {/if}

      <PianoRoll />

      <div class="instructions">
        <p>
          <strong>Click</strong> grid to create note &bull;
          <strong>Drag</strong> note to move &bull;
          <strong>Drag edge</strong> to resize &bull;
          <strong>Delete</strong> to remove &bull;
          <strong>Shift+drag</strong> or <strong>drag ruler</strong> to select region &bull;
          <strong>Esc</strong> to clear selection
        </p>
      </div>
    </section>
  </main>

  <footer>
    <p>Generate a lick, tweak it, then export to MIDI for your DAW.</p>
  </footer>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

  header {
    text-align: center;
    margin-bottom: 24px;
  }

  h1 {
    font-size: 28px;
    font-weight: 700;
    color: var(--accent);
    margin-bottom: 4px;
  }

  .subtitle {
    color: var(--text-secondary);
    font-size: 14px;
  }

  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .controls-section {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    align-items: flex-end;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 8px;
  }

  .control-group {
    display: flex;
    gap: 16px;
    align-items: flex-end;
  }

  .algorithm-group {
    flex: 1;
  }

  .actions {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-left: auto;
  }

  .editor-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
  }

  .sequence-info {
    display: flex;
    gap: 8px;
  }

  .info-badge {
    background: var(--bg-tertiary);
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .instructions {
    color: var(--text-secondary);
    font-size: 12px;
    text-align: center;
  }

  .instructions strong {
    color: var(--text-primary);
  }

  footer {
    margin-top: 24px;
    text-align: center;
    color: var(--text-secondary);
    font-size: 13px;
  }
</style>
