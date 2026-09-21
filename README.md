# Song Arrangement Generator (Web Audio Stem Arranger)

A local, client-side web application designed for musicians to assemble full tracks from ready-made stems (riffs, drums, bass, leads, FX). 

Built with **TypeScript**, **React**, **Vite**, and **Web Audio API** with a sample-accurate look-ahead scheduler.

---

## Features (Slice 1 MVP)

- **Local Stem Ingestion**:
  - Chrome File System Access API (`window.showDirectoryPicker()`) reads `.wav` files directly from a selected folder without uploading.
  - Drag-and-drop file fallback (works across browsers).
- **Intelligent Stem Detection**:
  - Parses pattern `section_instrument[Variant].wav` (e.g. `verse1_kick.wav`, `chorus_guitarA.wav`, `breakdown_bass.wav`, `fx_riser.wav`).
  - Automatic bars calculation: $\text{beats} = \text{duration} \times \frac{\text{BPM}}{60}$, $\text{bars} = \lfloor \frac{\text{beats}}{\text{beatsPerBar}} + 0.05 \rfloor$.
  - Remainder calculated and displayed as decay/reverb tail in seconds (`+0.22s`).
- **Editable Metadata & Preservation**:
  - Edit `section`, `instrument`, `variant`, `bars`, and `meter` (4/4 or 3/4) directly in the Stems Library panel.
  - Manual edits are strictly preserved upon BPM adjustments.
- **Ableton-Style Arrangement Timeline**:
  - Horizontal track lanes automatically created for each detected instrument plus a dedicated **FX** track.
  - Beat-snapped drag-and-drop placement from library.
  - Horizontal clip movement with collision rejection (no overlaps allowed on the same track).
  - Per-track **Mute (M)** and **Solo (S)** with smooth gain transitions.
- **Sample-Accurate Web Audio Playback**:
  - Look-ahead clock loop using `AudioContext.currentTime`.
  - Full tail playback (stems play to completion, naturally overlapping subsequent clips).
  - Timeline scrubbing by clicking anywhere on the bar/beat ruler.
  - Spacebar toggle for Play/Stop.
- **Persistence Layer**:
  - Isolated behind a `ProjectStorage` interface (currently backed by `localStorage`, ready for cloud storage in future slices).
  - Preserves BPM, clip positions, and manual stem edits across reloads (stems re-bind upon opening the folder).

---

## Quick Start

### 1. Installation

```bash
npm install
```

### 2. Generate Synthetic Test Stems

To test without your own stems, run the built-in synthesis script:

```bash
npm run generate-stems
```

This creates realistic rhythmic/melodic test stems in `test-stems/`:
- `verse1_kick.wav` (4 bars, 4/4)
- `verse1_bass.wav` (4 bars, 4/4)
- `chorus_kick.wav` (4 bars, 4/4)
- `chorus_guitarA.wav` (4 bars, 4/4)
- `breakdown_bass.wav` (4 bars, 4/4)
- `fx_riser.wav` (2 bars, 4/4)
- `verse1_piano.wav` (4 bars, 3/4)

### 3. Start Development Server

```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## Available Scripts

- `npm run dev` - Run Vite development server with HMR.
- `npm run build` - TypeScript type check and production bundle compilation into `dist/`.
- `npm run preview` - Preview the built production application locally.
- `npm test` - Run Vitest unit tests (parsing, tempo, bars, tail, collision checks, storage).
- `npm run lint` - Run ESLint checks.
- `npm run generate-stems` - Generate synthetic test WAV stems.

---

## How to Test Manually

1. Start the app with `npm run dev`.
2. Click **"Open stems folder"** and select the `test-stems` folder (or drag and drop `.wav` files into the left panel).
3. Observe that:
   - Each stem has its `section`, `instrument`, `variant`, `bars`, and `tail` automatically parsed.
   - Corresponding track lanes appear on the timeline (`KICK`, `BASS`, `GUITAR`, `PIANO`, `FX`).
4. Drag stems from the library onto their matching timeline tracks.
   - Notice beat snapping.
   - Attempting to overlap clips or place them on the wrong track shows an error and rejects the placement.
5. Hit **Play** (or press `Space`):
   - Red playhead advances smoothly.
   - Stems trigger in tempo without drift.
   - Reverb tails ring out cleanly over subsequent clips.
6. Test **Mute (M)** and **Solo (S)** on track headers.
7. Click anywhere on the top ruler to scrub the playhead.
8. Edit a stem's field in the library (e.g. change bars or section). Change the project BPM in the header: notice that manually edited stems preserve their values, while non-edited stems recalculate.
9. Refresh the page: reopen the folder and notice your arrangement and edits are restored from local storage.

---

## Deploy to Vercel

The application compiles as a 100% client-side static SPA (no server functions, zero server audio limits).

### Steps to Deploy:
1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of stem arrangement app"
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git branch -M main
   git push -u origin main
   ```
2. Go to [Vercel Dashboard](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Set the project configuration:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Click **Deploy**.
6. **Vercel Domains & HTTPS**:
   - Production deploys run on `main`.
   - Every Pull Request generates an automatic preview URL.
   - Vercel automatically supplies HTTPS on `*.vercel.app` domains, ensuring Chrome's `window.showDirectoryPicker()` functions properly.

---

## Architecture & Layers

- `src/model/`: Pure TypeScript data structures, tempo/bar/tail formulas, regex stem parser, and timeline collision detectors. No React or Web Audio dependencies.
- `src/storage/`: `ProjectStorage` abstraction interface allowing zero-refactor migration from `localStorage` to future cloud storage backends.
- `src/audio/`: `AudioEngine` (in-memory buffer cache, Web Audio context, gain nodes) and `Scheduler` (Chris Wilson look-ahead clock scheduling buffer sources).
- `src/ui/`: Modular React components styled with flat dark theme aesthetics.

---

## Roadmap & Next Slices (TODO)

- [ ] **Arrangement Generator**: Genre-based algorithmic generator, lock controls, A/B/C section variants.
- [ ] **Transitions**: Crossfading between adjacent clips, mute pauses, fill insertions.
- [ ] **Export**: Client-side offline audio rendering to master WAV file, and `.rpp` Reaper project export.
- [ ] **Audio Analysis**: Key detection, BPM detection, and real-time time-stretching.
- [ ] **Multi-Meter Timeline Support**: Full mixed-meter ruler display (3/4 interleaved with 4/4 sections).

