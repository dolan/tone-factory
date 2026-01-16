import { writable, derived } from 'svelte/store';
import type { AlgorithmType } from '../lib/theory/types';
import { getScaleNotes } from '../lib/theory/scales';

// Core settings
export const key = writable<string>('C');
export const scale = writable<string>('pentatonic-minor');
export const tempo = writable<number>(120);
export const lengthBars = writable<number>(4);
export const algorithm = writable<AlgorithmType>('scale-run');
export const rhythmFeel = writable<'straight' | 'swing' | 'syncopated'>('straight');
export const octaveRange = writable<[number, number]>([3, 5]);

// Derived store: all notes in the current scale
export const scaleNotes = derived(
  [key, scale, octaveRange],
  ([$key, $scale, $octaveRange]) => getScaleNotes($key, $scale, $octaveRange)
);
