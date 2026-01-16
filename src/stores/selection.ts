import { writable, derived } from 'svelte/store';

// Selection range in beats (null means no selection)
export const selectionStart = writable<number | null>(null);
export const selectionEnd = writable<number | null>(null);

// Derived: whether there's an active selection
export const hasSelection = derived(
  [selectionStart, selectionEnd],
  ([$start, $end]) => $start !== null && $end !== null && $start !== $end
);

// Derived: normalized selection (start always < end)
export const normalizedSelection = derived(
  [selectionStart, selectionEnd],
  ([$start, $end]) => {
    if ($start === null || $end === null) return null;
    return {
      start: Math.min($start, $end),
      end: Math.max($start, $end)
    };
  }
);

// Clear selection
export function clearSelection() {
  selectionStart.set(null);
  selectionEnd.set(null);
}

// Set selection
export function setSelection(start: number, end: number) {
  selectionStart.set(Math.min(start, end));
  selectionEnd.set(Math.max(start, end));
}
