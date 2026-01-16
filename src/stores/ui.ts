import { writable } from 'svelte/store';

// Flag to temporarily disable auto-scroll after note changes
// Used during selection regeneration to prevent jarring view jumps
export const suppressAutoScroll = writable<boolean>(false);

// Temporarily suppress auto-scroll, then re-enable after a delay
export function suppressAutoScrollBriefly(durationMs: number = 500) {
  suppressAutoScroll.set(true);
  setTimeout(() => {
    suppressAutoScroll.set(false);
  }, durationMs);
}
