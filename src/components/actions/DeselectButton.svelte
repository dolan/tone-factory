<script lang="ts">
  import { hasSelection, clearSelection } from '../../stores/selection';

  $: disabled = !$hasSelection;
</script>

<button
  class="deselect-btn"
  onclick={clearSelection}
  {disabled}
  title={disabled ? "No selection to clear" : "Clear selection (Esc)"}
>
  <svg viewBox="0 0 24 24" width="18" height="18">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
  </svg>
  Deselect
</button>

<style>
  .deselect-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--bg-tertiary);
    color: var(--text-primary);
    padding: 10px 14px;
    font-size: 14px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: all 0.15s ease;
  }

  .deselect-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .deselect-btn:disabled {
    opacity: 0.35;
  }

  .deselect-btn svg {
    flex-shrink: 0;
  }
</style>
