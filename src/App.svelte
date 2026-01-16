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
    <p class="tagline">Generate Music using Theory, Not AI</p>
  </header>

  <main>
    <!-- Settings Panel -->
    <section class="panel settings-panel">
      <h2 class="panel-title">Settings</h2>
      <div class="panel-content">
        <div class="control-row">
          <KeySelector />
          <ScaleSelector />
          <RhythmSelector />
        </div>
        <div class="control-row">
          <TempoSlider />
          <LengthSlider />
        </div>
      </div>
    </section>

    <!-- Algorithm Panel -->
    <section class="panel algorithm-panel">
      <h2 class="panel-title">Algorithm</h2>
      <div class="panel-content">
        <AlgorithmSelector />
      </div>
    </section>

    <!-- Actions Panel -->
    <section class="panel actions-panel">
      <div class="actions-row">
        <div class="action-group primary-actions">
          <GenerateButton />
          <RegenerateSelectionButton />
          <DeselectButton />
        </div>
        <div class="action-group transport-actions">
          <TransportBar />
        </div>
        <div class="action-group export-actions">
          <ExportButton />
        </div>
      </div>
    </section>

    <!-- Editor Panel -->
    <section class="panel editor-panel">
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
    max-width: 1000px;
    margin: 0 auto;
    padding: 24px 32px;
  }

  header {
    text-align: center;
    margin-bottom: 32px;
  }

  h1 {
    font-size: 32px;
    font-weight: 700;
    color: var(--accent);
    margin-bottom: 6px;
    letter-spacing: -0.5px;
  }

  .subtitle {
    color: var(--text-secondary);
    font-size: 15px;
  }

  .tagline {
    color: var(--text-secondary);
    font-size: 12px;
    margin-top: 6px;
    opacity: 0.7;
    letter-spacing: 0.5px;
  }

  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* Panel base styles */
  .panel {
    background: var(--bg-secondary);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .panel-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 12px 20px 0;
    margin-bottom: 12px;
  }

  .panel-content {
    padding: 0 20px 16px;
  }

  /* Settings Panel */
  .settings-panel .panel-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .control-row {
    display: flex;
    gap: 24px;
    align-items: flex-end;
    justify-content: center;
    flex-wrap: wrap;
  }

  /* Algorithm Panel */
  .algorithm-panel .panel-content {
    display: flex;
    justify-content: center;
  }

  /* Actions Panel */
  .actions-panel {
    background: transparent;
    border: none;
    padding: 8px 0;
  }

  .actions-row {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
  }

  .action-group {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .primary-actions {
    padding-right: 8px;
    border-right: 1px solid var(--grid-line);
  }

  .transport-actions {
    padding: 0 8px;
  }

  .export-actions {
    padding-left: 8px;
    border-left: 1px solid var(--grid-line);
  }

  /* Editor Panel */
  .editor-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
    padding: 16px;
  }

  .sequence-info {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .info-badge {
    background: var(--bg-tertiary);
    padding: 5px 12px;
    border-radius: 16px;
    font-size: 12px;
    color: var(--text-secondary);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .instructions {
    color: var(--text-secondary);
    font-size: 12px;
    text-align: center;
    padding-top: 4px;
  }

  .instructions strong {
    color: var(--text-primary);
  }

  footer {
    margin-top: 24px;
    text-align: center;
    color: var(--text-secondary);
    font-size: 13px;
    opacity: 0.7;
  }
</style>
