import { writable } from 'svelte/store';

export const isPlaying = writable<boolean>(false);
export const currentTime = writable<number>(0);  // Current playback time in seconds
export const loopEnabled = writable<boolean>(true);
export const audioInitialized = writable<boolean>(false);
