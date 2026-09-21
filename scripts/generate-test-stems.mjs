import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.resolve(__dirname, '../test-stems');
const SAMPLE_RATE = 44100;
const DEFAULT_BPM = 140;

function createWavBuffer(sampleRate, samples) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // RIFF identifier
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1 size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // audio format (1 = PCM)
  buffer.writeUInt16LE(1, 22);  // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate (SampleRate * NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(2, 32);  // block align
  buffer.writeUInt16LE(16, 34); // bits per sample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    // Clamp to -1.0 .. 1.0
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const intSample = Math.floor(clamped < 0 ? clamped * 32768 : clamped * 32767);
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

// Generate sound functions
function generateKick(bpm, bars, meterBeats, tailSec) {
  const beatSec = 60 / bpm;
  const nominalSec = bars * meterBeats * beatSec;
  const totalSec = nominalSec + tailSec;
  const totalSamples = Math.floor(totalSec * SAMPLE_RATE);
  const samples = new Float32Array(totalSamples);

  const totalBeats = bars * meterBeats;
  for (let b = 0; b < totalBeats; b++) {
    const beatStartSample = Math.floor(b * beatSec * SAMPLE_RATE);
    const hitDuration = 0.25; // 250ms kick drum decay
    const hitSamples = Math.floor(hitDuration * SAMPLE_RATE);

    for (let i = 0; i < hitSamples && (beatStartSample + i) < totalSamples; i++) {
      const t = i / SAMPLE_RATE;
      const env = Math.exp(-12 * t);
      // Frequency drops from 140Hz to 45Hz
      const freq = 45 + 95 * Math.exp(-30 * t);
      const phase = 2 * Math.PI * freq * t;
      const val = Math.sin(phase) * env;
      samples[beatStartSample + i] += val * 0.85;
    }
  }

  return samples;
}

function generateBass(bpm, bars, meterBeats, tailSec, rootFreq = 82.41) { // E2
  const beatSec = 60 / bpm;
  const nominalSec = bars * meterBeats * beatSec;
  const totalSec = nominalSec + tailSec;
  const totalSamples = Math.floor(totalSec * SAMPLE_RATE);
  const samples = new Float32Array(totalSamples);

  // 8th-note driving bass
  const noteDuration = beatSec / 2;
  const totalNotes = bars * meterBeats * 2;

  // Melody pattern in semitone offsets
  const pattern = [0, 0, 3, 0, 5, 0, 3, 2];

  for (let n = 0; n < totalNotes; n++) {
    const noteStart = Math.floor(n * noteDuration * SAMPLE_RATE);
    const noteLength = Math.floor(noteDuration * 0.85 * SAMPLE_RATE);
    const semitone = pattern[n % pattern.length];
    const freq = rootFreq * Math.pow(2, semitone / 12);

    for (let i = 0; i < noteLength && (noteStart + i) < totalSamples; i++) {
      const t = i / SAMPLE_RATE;
      const env = Math.exp(-5 * (t / (noteDuration * 0.85)));
      // Sawtooth approximated with harmonics
      let wave = Math.sin(2 * Math.PI * freq * t) +
                 0.5 * Math.sin(2 * Math.PI * freq * 2 * t) +
                 0.25 * Math.sin(2 * Math.PI * freq * 3 * t);
      samples[noteStart + i] += wave * env * 0.45;
    }
  }

  // Add subtle tail ringing
  if (tailSec > 0) {
    const tailStart = Math.floor(nominalSec * SAMPLE_RATE);
    for (let i = tailStart; i < totalSamples; i++) {
      const t = (i - tailStart) / SAMPLE_RATE;
      const env = Math.exp(-6 * t) * (1 - t / tailSec);
      samples[i] += Math.sin(2 * Math.PI * rootFreq * (i / SAMPLE_RATE)) * env * 0.2;
    }
  }

  return samples;
}

function generateGuitar(bpm, bars, meterBeats, tailSec) {
  const beatSec = 60 / bpm;
  const nominalSec = bars * meterBeats * beatSec;
  const totalSec = nominalSec + tailSec;
  const totalSamples = Math.floor(totalSec * SAMPLE_RATE);
  const samples = new Float32Array(totalSamples);

  const totalBeats = bars * meterBeats;
  // Chords: E5 (164.81, 246.94), G5 (196.0, 293.66), D5 (146.83, 220.0)
  const chords = [
    [164.81, 246.94, 329.63],
    [164.81, 246.94, 329.63],
    [196.00, 293.66, 392.00],
    [146.83, 220.00, 293.66],
  ];

  for (let b = 0; b < totalBeats; b++) {
    const beatStart = Math.floor(b * beatSec * SAMPLE_RATE);
    const chord = chords[Math.floor(b / meterBeats) % chords.length];
    const hitLength = Math.floor(beatSec * 0.95 * SAMPLE_RATE);

    for (let i = 0; i < hitLength && (beatStart + i) < totalSamples; i++) {
      const t = i / SAMPLE_RATE;
      const env = Math.exp(-3.5 * t);
      let chordSample = 0;
      for (const f of chord) {
        chordSample += Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 3 * t);
      }
      samples[beatStart + i] += (chordSample / chord.length) * env * 0.5;
    }
  }

  // Ringing reverb tail at the end of section
  const tailStart = Math.floor(nominalSec * SAMPLE_RATE);
  const lastChord = chords[(chords.length - 1)];
  for (let i = tailStart; i < totalSamples; i++) {
    const t = (i - tailStart) / SAMPLE_RATE;
    const env = Math.max(0, 1 - t / tailSec) * Math.exp(-3 * t);
    let chordSample = 0;
    for (const f of lastChord) {
      chordSample += Math.sin(2 * Math.PI * f * (i / SAMPLE_RATE));
    }
    samples[i] += (chordSample / lastChord.length) * env * 0.35;
  }

  return samples;
}

function generateFxRiser(bpm, bars, meterBeats, tailSec) {
  const beatSec = 60 / bpm;
  const nominalSec = bars * meterBeats * beatSec;
  const totalSec = nominalSec + tailSec;
  const totalSamples = Math.floor(totalSec * SAMPLE_RATE);
  const samples = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    if (t < nominalSec) {
      // Exponential riser sweep from 100Hz to 2000Hz
      const progress = t / nominalSec;
      const freq = 100 * Math.pow(20, progress);
      const noise = (Math.random() * 2 - 1) * 0.2 * progress;
      const sine = Math.sin(2 * Math.PI * freq * t) * 0.4 * progress;
      samples[i] = (sine + noise) * (0.2 + 0.8 * progress);
    } else {
      // Reverb tail wash
      const tailProgress = (t - nominalSec) / tailSec;
      const env = Math.exp(-4 * tailProgress);
      const noise = (Math.random() * 2 - 1) * 0.3 * env;
      samples[i] = noise;
    }
  }

  return samples;
}

// Ensure directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log(`Generating synthetic stems at ${DEFAULT_BPM} BPM into ${OUTPUT_DIR}...`);

const stems = [
  { name: 'verse1_kick.wav', gen: () => generateKick(DEFAULT_BPM, 4, 4, 0.22) },
  { name: 'verse1_bass.wav', gen: () => generateBass(DEFAULT_BPM, 4, 4, 0.28, 82.41) },
  { name: 'chorus_kick.wav', gen: () => generateKick(DEFAULT_BPM, 4, 4, 0.25) },
  { name: 'chorus_guitarA.wav', gen: () => generateGuitar(DEFAULT_BPM, 4, 4, 0.45) },
  { name: 'breakdown_bass.wav', gen: () => generateBass(DEFAULT_BPM, 4, 4, 0.35, 73.42) },
  { name: 'fx_riser.wav', gen: () => generateFxRiser(DEFAULT_BPM, 2, 4, 0.65) },
  // 3/4 stem example for testing meters
  { name: 'verse1_piano.wav', gen: () => generateGuitar(DEFAULT_BPM, 4, 3, 0.30) },
];

for (const stem of stems) {
  const samples = stem.gen();
  const buffer = createWavBuffer(SAMPLE_RATE, samples);
  const filePath = path.join(OUTPUT_DIR, stem.name);
  fs.writeFileSync(filePath, buffer);
  const durationSec = (samples.length / SAMPLE_RATE).toFixed(3);
  console.log(`✓ ${stem.name} (${durationSec}s)`);
}

console.log('All synthetic stems generated successfully!');

