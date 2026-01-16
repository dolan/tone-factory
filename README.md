# Tone Factory

A browser-based musical lick and melody generator with a piano roll editor, audio preview, and MIDI export.

![Tone Factory Screenshot](screenshot.png)

## Features

- **Smart Generation Algorithms**
  - **Scale Runs** - Flowing melodic lines following scale patterns
  - **Arpeggios** - Chord-tone based patterns with musical movement
  - **Motif Development** - Generates and develops musical motifs with variations

- **Piano Roll Editor**
  - Click to create notes
  - Drag to move notes
  - Drag edges to resize
  - Delete key to remove selected note
  - Shift+drag or drag ruler to select regions
  - Regenerate only selected portions

- **Music Theory Engine**
  - 12 keys (C through B)
  - Multiple scales (Major, Minor, Dorian, Mixolydian, Pentatonic, Blues)
  - Configurable rhythm feel (Straight, Swing, Triplet)
  - Adjustable tempo and length

- **Export & Playback**
  - Real-time audio preview with loop toggle
  - Export to standard MIDI file for DAW import

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/tone-factory.git
cd tone-factory

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

## Usage

1. **Configure your parameters** - Select key, scale, tempo, length, and rhythm feel
2. **Choose an algorithm** - Pick from Scale Runs, Arpeggios, or Motif
3. **Generate** - Click "Generate" to create a new lick
4. **Edit** - Fine-tune notes in the piano roll
5. **Regenerate Selection** - Select a region and regenerate just that portion
6. **Export** - Download as MIDI for your DAW

## Tech Stack

- [Svelte](https://svelte.dev/) - Frontend framework
- [Vite](https://vitejs.dev/) - Build tool
- [Tone.js](https://tonejs.github.io/) - Web Audio synthesis
- [tonal](https://github.com/tonaljs/tonal) - Music theory library
- [@tonejs/midi](https://github.com/Tonejs/Midi) - MIDI file generation

## License

MIT

---

*Generate a lick, tweak it, export to MIDI for your DAW.*
