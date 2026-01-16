<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { notes, sequence, updateNote, deleteNote, addNote } from '../../stores/sequence';
  import { currentTime, isPlaying } from '../../stores/playback';
  import { tempo, lengthBars, key, scale } from '../../stores/settings';
  import { selectionStart, selectionEnd, normalizedSelection, clearSelection } from '../../stores/selection';
  import { suppressAutoScroll } from '../../stores/ui';
  import { noteToMidi, midiToNote, getScaleNotes } from '../../lib/theory/scales';
  import { beatsToSeconds, secondsToBeats } from '../../lib/theory/rhythm';
  import { generateNoteId } from '../../lib/generators/base';
  import type { Note } from '../../lib/theory/types';

  let canvas: HTMLCanvasElement;
  let rulerCanvas: HTMLCanvasElement;
  let container: HTMLDivElement;
  let scrollContainer: HTMLDivElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let rulerCtx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let needsRedraw = true;

  // Piano roll dimensions
  const PIANO_WIDTH = 60;
  const NOTE_HEIGHT = 16;
  const BEAT_WIDTH = 80;
  const RULER_HEIGHT = 24;

  // Dynamic MIDI range - will auto-fit to notes
  let minMidi = 36;  // C2
  let maxMidi = 96;  // C7
  const PADDING_NOTES = 4;

  // Interaction state
  let selectedNoteId: string | null = null;
  let dragging = false;
  let dragType: 'move' | 'resize' | 'select' | null = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragNoteOriginal: Note | null = null;

  $: totalBeats = $lengthBars * 4;
  $: totalWidth = PIANO_WIDTH + totalBeats * BEAT_WIDTH;
  $: noteRange = maxMidi - minMidi + 1;
  $: totalHeight = noteRange * NOTE_HEIGHT;  // Ruler is now separate
  $: scaleNotes = getScaleNotes($key, $scale, [2, 6]);

  // Auto-fit view when notes change
  $: if ($notes.length > 0) {
    fitToNotes($notes);
  }

  // Track if this is the first generation (for auto-scroll behavior)
  let hasHadNotes = false;

  function fitToNotes(noteList: Note[]) {
    if (noteList.length === 0) {
      minMidi = 48;
      maxMidi = 72;
      hasHadNotes = false;
      needsRedraw = true;
      return;
    }

    const midiValues = noteList.map(n => n.midi);
    const minNote = Math.min(...midiValues);
    const maxNote = Math.max(...midiValues);

    const newMin = Math.max(21, minNote - PADDING_NOTES);
    const newMax = Math.min(108, maxNote + PADDING_NOTES);

    // Check if range actually needs to change
    const rangeChanged = newMin !== minMidi || newMax !== maxMidi;

    const range = newMax - newMin;
    if (range < 24) {
      const center = Math.floor((newMin + newMax) / 2);
      minMidi = Math.max(21, center - 12);
      maxMidi = Math.min(108, center + 12);
    } else {
      minMidi = newMin;
      maxMidi = newMax;
    }

    needsRedraw = true;
    scheduleRedraw();

    // Only auto-scroll on first generation OR if range changed significantly
    // Skip if suppressAutoScroll is set (during selection regeneration)
    const isFirstGeneration = !hasHadNotes;
    hasHadNotes = true;

    tick().then(() => {
      if (!scrollContainer || noteList.length === 0) return;

      // Skip auto-scroll if suppressed (e.g., during selection regeneration)
      if ($suppressAutoScroll) return;

      // Only auto-center on first generation
      if (isFirstGeneration) {
        const avgMidi = midiValues.reduce((a, b) => a + b, 0) / midiValues.length;
        const targetY = midiToY(avgMidi) - scrollContainer.clientHeight / 2;
        scrollContainer.scrollTo({
          top: Math.max(0, targetY),
          behavior: 'smooth'
        });
      } else if (rangeChanged) {
        // If range changed but not first generation, use smooth scroll
        // to gently adjust if needed (keep current view if possible)
        const currentCenter = scrollContainer.scrollTop + scrollContainer.clientHeight / 2;
        // Only scroll if current view is significantly off
        const avgMidi = midiValues.reduce((a, b) => a + b, 0) / midiValues.length;
        const targetY = midiToY(avgMidi) - scrollContainer.clientHeight / 2;
        const diff = Math.abs(currentCenter - targetY);

        // Only smooth scroll if view needs significant adjustment
        if (diff > scrollContainer.clientHeight) {
          scrollContainer.scrollTo({
            top: Math.max(0, targetY),
            behavior: 'smooth'
          });
        }
      }
    });
  }

  function scheduleRedraw() {
    needsRedraw = true;
    if (!animationFrame) {
      animationFrame = requestAnimationFrame(renderLoop);
    }
  }

  function renderLoop() {
    if (needsRedraw || $isPlaying) {
      draw();
      needsRedraw = false;
    }

    if ($isPlaying) {
      animationFrame = requestAnimationFrame(renderLoop);
    } else {
      animationFrame = null;
    }
  }

  onMount(() => {
    if (canvas) {
      ctx = canvas.getContext('2d');
    }
    if (rulerCanvas) {
      rulerCtx = rulerCanvas.getContext('2d');
    }
    resizeCanvas();
    scheduleRedraw();
  });

  onDestroy(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  });

  // Redraw on relevant state changes
  $: {
    $notes;
    $lengthBars;
    $normalizedSelection;
    scheduleRedraw();
  }

  $: if ($isPlaying && !animationFrame) {
    animationFrame = requestAnimationFrame(renderLoop);
  }

  function resizeCanvas() {
    if (!canvas || !rulerCanvas) return;
    const newWidth = totalWidth;
    const newHeight = totalHeight;

    if (canvas.width !== newWidth || canvas.height !== newHeight) {
      canvas.width = newWidth;
      canvas.height = newHeight;
      needsRedraw = true;
    }

    if (rulerCanvas.width !== newWidth || rulerCanvas.height !== RULER_HEIGHT) {
      rulerCanvas.width = newWidth;
      rulerCanvas.height = RULER_HEIGHT;
      needsRedraw = true;
    }
  }

  function draw() {
    if (!ctx || !canvas) return;

    resizeCanvas();

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawSelection();
    drawGrid();
    drawRuler();
    drawPiano();
    drawNotes();
    drawPlayhead();
    drawSelectionHandles();
  }

  function drawRuler() {
    if (!rulerCtx) return;

    // Clear ruler
    rulerCtx.fillStyle = '#1a1a2e';
    rulerCtx.fillRect(0, 0, rulerCanvas.width, RULER_HEIGHT);

    // Ruler background
    rulerCtx.fillStyle = '#252538';
    rulerCtx.fillRect(PIANO_WIDTH, 0, totalWidth - PIANO_WIDTH, RULER_HEIGHT);

    // Draw selection highlight on ruler first (so it's behind everything)
    if ($normalizedSelection) {
      const startX = beatToX($normalizedSelection.start);
      const endX = beatToX($normalizedSelection.end);
      const width = endX - startX;
      rulerCtx.fillStyle = 'rgba(233, 69, 96, 0.4)';
      rulerCtx.fillRect(startX, 0, width, RULER_HEIGHT);
    }

    // Draw beat markers
    for (let beat = 0; beat <= totalBeats; beat++) {
      const x = beatToX(beat);
      const isBarLine = beat % 4 === 0;
      const isHalfBar = beat % 2 === 0;

      // Tick marks
      rulerCtx.strokeStyle = isBarLine ? '#888' : '#555';
      rulerCtx.lineWidth = 1;
      rulerCtx.beginPath();
      rulerCtx.moveTo(x, isBarLine ? 4 : (isHalfBar ? 10 : 14));
      rulerCtx.lineTo(x, RULER_HEIGHT);
      rulerCtx.stroke();

      // Bar numbers
      if (isBarLine) {
        rulerCtx.fillStyle = '#aaa';
        rulerCtx.font = 'bold 11px sans-serif';
        rulerCtx.fillText(`${beat / 4 + 1}`, x + 4, 16);
      }
    }

    // Draw selection handles on ruler
    if ($normalizedSelection) {
      const startX = beatToX($normalizedSelection.start);
      const endX = beatToX($normalizedSelection.end);

      // Start handle
      rulerCtx.fillStyle = '#e94560';
      rulerCtx.beginPath();
      rulerCtx.moveTo(startX, 0);
      rulerCtx.lineTo(startX + 8, 0);
      rulerCtx.lineTo(startX, RULER_HEIGHT);
      rulerCtx.closePath();
      rulerCtx.fill();

      // End handle
      rulerCtx.beginPath();
      rulerCtx.moveTo(endX, 0);
      rulerCtx.lineTo(endX - 8, 0);
      rulerCtx.lineTo(endX, RULER_HEIGHT);
      rulerCtx.closePath();
      rulerCtx.fill();
    }

    // Draw playhead on ruler
    if ($sequence) {
      const x = timeToX($currentTime);
      if (x >= PIANO_WIDTH && x <= totalWidth) {
        rulerCtx.strokeStyle = '#4ade80';
        rulerCtx.lineWidth = 2;
        rulerCtx.beginPath();
        rulerCtx.moveTo(x, 0);
        rulerCtx.lineTo(x, RULER_HEIGHT);
        rulerCtx.stroke();
      }
    }

    // Ruler border
    rulerCtx.strokeStyle = '#4a4a5e';
    rulerCtx.lineWidth = 1;
    rulerCtx.beginPath();
    rulerCtx.moveTo(PIANO_WIDTH, RULER_HEIGHT - 1);
    rulerCtx.lineTo(totalWidth, RULER_HEIGHT - 1);
    rulerCtx.stroke();

    // Label area
    rulerCtx.fillStyle = '#1e1e2e';
    rulerCtx.fillRect(0, 0, PIANO_WIDTH, RULER_HEIGHT);
    rulerCtx.fillStyle = '#888';
    rulerCtx.font = '9px sans-serif';
    rulerCtx.fillText('Drag ruler', 4, 10);
    rulerCtx.fillText('to select', 4, 20);
  }

  function drawSelection() {
    if (!ctx || !$normalizedSelection) return;

    const startX = beatToX($normalizedSelection.start);
    const endX = beatToX($normalizedSelection.end);
    const width = endX - startX;

    // Selection highlight on grid (ruler is separate now)
    ctx.fillStyle = 'rgba(233, 69, 96, 0.15)';
    ctx.fillRect(startX, 0, width, totalHeight);
  }

  function drawSelectionHandles() {
    if (!ctx || !$normalizedSelection) return;

    const startX = beatToX($normalizedSelection.start);
    const endX = beatToX($normalizedSelection.end);

    // Vertical lines on grid (handles are drawn on ruler canvas)
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX, totalHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(endX, 0);
    ctx.lineTo(endX, totalHeight);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  function drawGrid() {
    if (!ctx) return;

    for (let midi = minMidi; midi <= maxMidi; midi++) {
      const y = midiToY(midi);
      const isBlackKey = [1, 3, 6, 8, 10].includes(midi % 12);

      ctx.fillStyle = isBlackKey ? '#151525' : '#1e1e32';
      ctx.fillRect(PIANO_WIDTH, y, totalWidth - PIANO_WIDTH, NOTE_HEIGHT);

      ctx.strokeStyle = '#2a2a3e';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(PIANO_WIDTH, y + NOTE_HEIGHT);
      ctx.lineTo(totalWidth, y + NOTE_HEIGHT);
      ctx.stroke();
    }

    for (let beat = 0; beat <= totalBeats; beat++) {
      const x = beatToX(beat);
      const isBarLine = beat % 4 === 0;

      ctx.strokeStyle = isBarLine ? '#4a4a5e' : '#2a2a3e';
      ctx.lineWidth = isBarLine ? 1.5 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, totalHeight);
      ctx.stroke();
    }
  }

  function drawPiano() {
    if (!ctx) return;

    for (let midi = minMidi; midi <= maxMidi; midi++) {
      const y = midiToY(midi);
      const isBlackKey = [1, 3, 6, 8, 10].includes(midi % 12);
      const isC = midi % 12 === 0;

      ctx.fillStyle = isBlackKey ? '#2a2a3a' : '#d8d8d8';
      ctx.fillRect(0, y, PIANO_WIDTH - 2, NOTE_HEIGHT - 1);

      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, y, PIANO_WIDTH - 2, NOTE_HEIGHT - 1);

      const noteName = midiToNote(midi);
      ctx.fillStyle = isBlackKey ? '#888' : '#333';
      ctx.font = isC ? 'bold 10px sans-serif' : '9px sans-serif';
      ctx.fillText(noteName, 4, y + NOTE_HEIGHT - 4);
    }

    ctx.strokeStyle = '#4a4a5e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PIANO_WIDTH, 0);
    ctx.lineTo(PIANO_WIDTH, totalHeight);
    ctx.stroke();
  }

  function drawNotes() {
    if (!ctx) return;

    for (const note of $notes) {
      const x = timeToX(note.time);
      const y = midiToY(note.midi);
      const width = Math.max(8, durationToWidth(note.duration) - 2);

      const isSelected = note.id === selectedNoteId;

      // Check if note is in selection region
      const inSelection = $normalizedSelection &&
        note.time >= beatsToSeconds($normalizedSelection.start, $tempo) &&
        note.time < beatsToSeconds($normalizedSelection.end, $tempo);

      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x + 2, y + 2, width, NOTE_HEIGHT - 4);

      const hue = isSelected ? 30 : (inSelection ? 340 : 210);
      const lightness = 50 + (note.velocity * 20);
      ctx.fillStyle = `hsl(${hue}, 80%, ${lightness}%)`;
      ctx.fillRect(x, y + 1, width, NOTE_HEIGHT - 3);

      ctx.strokeStyle = isSelected ? '#ffcc80' : (inSelection ? '#ff80a0' : '#80b0ff');
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(x, y + 1, width, NOTE_HEIGHT - 3);

      if (width > 30) {
        ctx.fillStyle = isSelected ? '#333' : '#fff';
        ctx.font = '9px sans-serif';
        ctx.fillText(note.pitch, x + 4, y + NOTE_HEIGHT - 5);
      }
    }
  }

  function drawPlayhead() {
    if (!ctx) return;

    const x = timeToX($currentTime);

    ctx.strokeStyle = 'rgba(100, 200, 100, 0.3)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, totalHeight);
    ctx.stroke();

    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, totalHeight);
    ctx.stroke();
  }

  // Coordinate conversions (ruler is now separate)
  function midiToY(midi: number): number {
    return (maxMidi - midi) * NOTE_HEIGHT;
  }

  function yToMidi(y: number): number {
    return Math.round(maxMidi - y / NOTE_HEIGHT);
  }

  function beatToX(beat: number): number {
    return PIANO_WIDTH + beat * BEAT_WIDTH;
  }

  function xToBeat(x: number): number {
    return (x - PIANO_WIDTH) / BEAT_WIDTH;
  }

  function timeToX(time: number): number {
    const beat = secondsToBeats(time, $tempo);
    return beatToX(beat);
  }

  function xToTime(x: number): number {
    const beat = xToBeat(x);
    return beatsToSeconds(beat, $tempo);
  }

  function durationToWidth(duration: number): number {
    const beats = secondsToBeats(duration, $tempo);
    return beats * BEAT_WIDTH;
  }

  function getCanvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function getRulerCoords(e: MouseEvent): { x: number } {
    const rect = rulerCanvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left
    };
  }

  // Ruler mouse handlers
  function handleRulerMouseDown(e: MouseEvent) {
    const { x } = getRulerCoords(e);
    if (x < PIANO_WIDTH) return;

    e.preventDefault();
    dragging = true;
    dragType = 'select';
    dragStartX = x;

    const actualX = x + scrollContainer.scrollLeft;
    const beat = Math.max(0, Math.round(xToBeat(actualX) * 4) / 4);
    selectionStart.set(beat);
    selectionEnd.set(beat);
    scheduleRedraw();
  }

  function handleRulerMouseMove(e: MouseEvent) {
    if (!dragging || dragType !== 'select') return;

    const { x } = getRulerCoords(e);
    const actualX = x + scrollContainer.scrollLeft;
    const beat = Math.max(0, Math.min(totalBeats, Math.round(xToBeat(actualX) * 4) / 4));
    selectionEnd.set(beat);
    scheduleRedraw();
  }

  function handleRulerMouseUp() {
    if (dragType === 'select') {
      dragging = false;
      dragType = null;
    }
  }

  // Sync horizontal scroll between ruler and grid
  function handleScroll() {
    if (rulerCanvas && scrollContainer) {
      rulerCanvas.style.transform = `translateX(-${scrollContainer.scrollLeft}px)`;
    }
  }

  function handleMouseDown(e: MouseEvent) {
    const { x, y } = getCanvasCoords(e);

    // Check if clicking on piano keys area (left side with note labels)
    if (x < PIANO_WIDTH) return;

    // Shift+click = selection mode on grid
    if (e.shiftKey) {
      e.preventDefault();
      dragging = true;
      dragType = 'select';
      dragStartX = x;
      // Also account for horizontal scroll when calculating beat
      const actualCanvasX = x + scrollContainer.scrollLeft;
      const beat = Math.max(0, Math.round(xToBeat(actualCanvasX) * 4) / 4);
      selectionStart.set(beat);
      selectionEnd.set(beat);
      scheduleRedraw();
      return;
    }

    // Check if clicking on existing note
    const clickedNote = findNoteAt(x, y);

    if (clickedNote) {
      selectedNoteId = clickedNote.id;
      dragging = true;
      dragStartX = x;
      dragStartY = y;
      dragNoteOriginal = { ...clickedNote };

      const noteX = timeToX(clickedNote.time);
      const noteWidth = durationToWidth(clickedNote.duration);
      if (x > noteX + noteWidth - 15) {
        dragType = 'resize';
      } else {
        dragType = 'move';
      }
    } else {
      // Create new note
      selectedNoteId = null;
      clearSelection();
      const beat = xToBeat(x);
      const quantizedBeat = Math.floor(beat * 4) / 4;
      const midi = yToMidi(y);

      const pitch = findClosestScalePitch(midi);
      if (pitch) {
        const newNote: Note = {
          id: generateNoteId(),
          pitch,
          midi: noteToMidi(pitch),
          time: beatsToSeconds(quantizedBeat, $tempo),
          duration: beatsToSeconds(0.5, $tempo),
          velocity: 0.7
        };
        addNote(newNote);
        selectedNoteId = newNote.id;
      }
    }

    scheduleRedraw();
  }

  function handleMouseMove(e: MouseEvent) {
    if (!dragging) return;

    const { x, y } = getCanvasCoords(e);

    if (dragType === 'select') {
      const actualCanvasX = x + scrollContainer.scrollLeft;
      const beat = Math.max(0, Math.min(totalBeats, Math.round(xToBeat(actualCanvasX) * 4) / 4));
      selectionEnd.set(beat);
      scheduleRedraw();
      return;
    }

    if (!dragNoteOriginal || !selectedNoteId) return;

    const deltaX = x - dragStartX;
    const deltaY = y - dragStartY;

    if (dragType === 'move') {
      const deltaBeat = deltaX / BEAT_WIDTH;
      const quantizedDeltaBeat = Math.round(deltaBeat * 4) / 4;
      const newTime = Math.max(0, dragNoteOriginal.time + beatsToSeconds(quantizedDeltaBeat, $tempo));

      const deltaMidi = -Math.round(deltaY / NOTE_HEIGHT);
      const newMidi = dragNoteOriginal.midi + deltaMidi;

      const newPitch = findClosestScalePitch(newMidi);
      if (newPitch) {
        updateNote(selectedNoteId, {
          time: newTime,
          pitch: newPitch,
          midi: noteToMidi(newPitch)
        });
      }
    } else if (dragType === 'resize') {
      const deltaBeat = deltaX / BEAT_WIDTH;
      const quantizedDeltaBeat = Math.round(deltaBeat * 4) / 4;
      const newDuration = Math.max(
        beatsToSeconds(0.25, $tempo),
        dragNoteOriginal.duration + beatsToSeconds(quantizedDeltaBeat, $tempo)
      );

      updateNote(selectedNoteId, { duration: newDuration });
    }

    scheduleRedraw();
  }

  function handleMouseUp() {
    dragging = false;
    dragType = null;
    dragNoteOriginal = null;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedNoteId) {
        e.preventDefault();
        deleteNote(selectedNoteId);
        selectedNoteId = null;
        scheduleRedraw();
      }
    } else if (e.key === 'Escape') {
      clearSelection();
      selectedNoteId = null;
      scheduleRedraw();
    }
  }

  function findNoteAt(x: number, y: number): Note | null {
    for (let i = $notes.length - 1; i >= 0; i--) {
      const note = $notes[i];
      const noteX = timeToX(note.time);
      const noteY = midiToY(note.midi);
      const noteWidth = durationToWidth(note.duration);

      if (x >= noteX && x <= noteX + noteWidth &&
          y >= noteY && y <= noteY + NOTE_HEIGHT) {
        return note;
      }
    }
    return null;
  }

  function findClosestScalePitch(midi: number): string | null {
    if (scaleNotes.length === 0) return midiToNote(midi);

    let closest = scaleNotes[0];
    let closestDist = Infinity;

    for (const note of scaleNotes) {
      const noteMidi = noteToMidi(note);
      const dist = Math.abs(noteMidi - midi);
      if (dist < closestDist) {
        closestDist = dist;
        closest = note;
      }
    }

    return closest;
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="piano-roll-container" bind:this={container}>
  <!-- Ruler (fixed at top, syncs horizontal scroll) -->
  <div class="ruler-wrapper">
    <canvas
      bind:this={rulerCanvas}
      class="ruler-canvas"
      onmousedown={handleRulerMouseDown}
      onmousemove={handleRulerMouseMove}
      onmouseup={handleRulerMouseUp}
      onmouseleave={handleRulerMouseUp}
    ></canvas>
  </div>

  <!-- Scrollable piano roll -->
  <div class="scroll-container" bind:this={scrollContainer} onscroll={handleScroll}>
    <canvas
      bind:this={canvas}
      onmousedown={handleMouseDown}
      onmousemove={handleMouseMove}
      onmouseup={handleMouseUp}
      onmouseleave={handleMouseUp}
    ></canvas>
  </div>
</div>

<style>
  .piano-roll-container {
    border: 1px solid var(--grid-line);
    border-radius: 8px;
    background: var(--bg-secondary);
    display: flex;
    flex-direction: column;
    max-height: 424px;
    min-height: 324px;
  }

  .ruler-wrapper {
    height: 24px;
    overflow: hidden;
    flex-shrink: 0;
    background: #252538;
    border-bottom: 1px solid var(--grid-line);
  }

  .ruler-canvas {
    display: block;
    cursor: col-resize;
  }

  .scroll-container {
    flex: 1;
    overflow: auto;
    scroll-behavior: smooth;
  }

  canvas {
    display: block;
    cursor: crosshair;
  }
</style>
