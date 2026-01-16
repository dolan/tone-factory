import * as Tone from 'tone';
import type { Note, Sequence } from '../theory/types';
import { isPlaying, currentTime, audioInitialized } from '../../stores/playback';
import { beatsToSeconds } from '../theory/rhythm';

class AudioEngine {
  private synth: Tone.PolySynth | null = null;
  private part: Tone.Part | null = null;
  private initialized = false;
  private animationFrame: number | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await Tone.start();

    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'triangle'
      },
      envelope: {
        attack: 0.02,
        decay: 0.1,
        sustain: 0.3,
        release: 0.4
      }
    }).toDestination();

    // Reduce volume a bit
    this.synth.volume.value = -6;

    this.initialized = true;
    audioInitialized.set(true);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  loadSequence(notes: Note[], loopDuration: number): void {
    if (!this.initialized || !this.synth) return;

    // Clear existing part
    if (this.part) {
      this.part.dispose();
      this.part = null;
    }

    if (notes.length === 0) return;

    // Create events for Tone.Part
    const events = notes.map(note => ({
      time: note.time,
      pitch: note.pitch,
      duration: note.duration,
      velocity: note.velocity
    }));

    this.part = new Tone.Part((time, event) => {
      this.synth?.triggerAttackRelease(
        event.pitch,
        event.duration,
        time,
        event.velocity
      );
    }, events);

    this.part.start(0);

    // Set up loop
    Tone.getTransport().loop = true;
    Tone.getTransport().loopEnd = loopDuration;
  }

  setTempo(bpm: number): void {
    Tone.getTransport().bpm.value = bpm;
  }

  play(): void {
    if (!this.initialized) return;

    Tone.getTransport().start('+0.05');
    isPlaying.set(true);
    this.startTimeUpdate();
  }

  stop(): void {
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
    isPlaying.set(false);
    currentTime.set(0);
    this.stopTimeUpdate();
  }

  pause(): void {
    Tone.getTransport().pause();
    isPlaying.set(false);
    this.stopTimeUpdate();
  }

  setLoop(enabled: boolean): void {
    Tone.getTransport().loop = enabled;
  }

  setLoopEnd(seconds: number): void {
    Tone.getTransport().loopEnd = seconds;
  }

  getCurrentTime(): number {
    return Tone.getTransport().seconds;
  }

  private startTimeUpdate(): void {
    const update = () => {
      currentTime.set(Tone.getTransport().seconds);
      this.animationFrame = requestAnimationFrame(update);
    };
    this.animationFrame = requestAnimationFrame(update);
  }

  private stopTimeUpdate(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  dispose(): void {
    this.stop();
    if (this.part) {
      this.part.dispose();
      this.part = null;
    }
    if (this.synth) {
      this.synth.dispose();
      this.synth = null;
    }
    this.initialized = false;
    audioInitialized.set(false);
  }
}

// Singleton instance
export const audioEngine = new AudioEngine();
