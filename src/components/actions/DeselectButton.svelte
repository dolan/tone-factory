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
    padding: 8px 12px;
    font-size: 13px;
    border: 1px solid transparent;
    transition: all 0.2s;
  }

  .deselect-btn:hover:not(:disabled) {
    background: var(--bg-secondary);
    border-color: var(--text-secondary);
  }

  .deselect-btn:disabled {
    opacity: 0.4;
  }

  .deselect-btn svg {
    flex-shrink: 0;
  }
</style>
