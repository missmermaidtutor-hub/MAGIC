// Generate a Tibetan singing bowl WAV file
const fs = require('fs');

const SAMPLE_RATE = 44100;
const DURATION = 5; // seconds
const NUM_SAMPLES = SAMPLE_RATE * DURATION;

// Singing bowl frequencies (fundamental + harmonics)
const tones = [
  { freq: 220,  amp: 0.35, decay: 0.6 },  // fundamental
  { freq: 440,  amp: 0.25, decay: 0.8 },  // 2nd harmonic
  { freq: 660,  amp: 0.15, decay: 1.0 },  // 3rd harmonic
  { freq: 880,  amp: 0.10, decay: 1.2 },  // 4th harmonic
  { freq: 1320, amp: 0.08, decay: 1.5 },  // 6th harmonic (shimmer)
  { freq: 1760, amp: 0.04, decay: 1.8 },  // high overtone
];

// Generate samples
const samples = new Float32Array(NUM_SAMPLES);
for (let i = 0; i < NUM_SAMPLES; i++) {
  const t = i / SAMPLE_RATE;
  let val = 0;
  for (const tone of tones) {
    // Exponential decay envelope
    const env = Math.exp(-t * tone.decay);
    // Slight vibrato for realism
    const vibrato = 1 + 0.002 * Math.sin(2 * Math.PI * 4.5 * t);
    val += tone.amp * env * Math.sin(2 * Math.PI * tone.freq * vibrato * t);
  }
  // Soft attack (first 50ms)
  if (t < 0.05) val *= t / 0.05;
  samples[i] = val;
}

// Normalize
let max = 0;
for (let i = 0; i < NUM_SAMPLES; i++) {
  if (Math.abs(samples[i]) > max) max = Math.abs(samples[i]);
}
const scale = max > 0 ? 0.9 / max : 1;

// Convert to 16-bit PCM
const pcm = Buffer.alloc(NUM_SAMPLES * 2);
for (let i = 0; i < NUM_SAMPLES; i++) {
  const s = Math.max(-1, Math.min(1, samples[i] * scale));
  const val = Math.round(s * 32767);
  pcm.writeInt16LE(val, i * 2);
}

// Write WAV header + data
const dataSize = pcm.length;
const fileSize = 36 + dataSize;
const header = Buffer.alloc(44);

header.write('RIFF', 0);
header.writeUInt32LE(fileSize, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);       // fmt chunk size
header.writeUInt16LE(1, 20);        // PCM
header.writeUInt16LE(1, 22);        // mono
header.writeUInt32LE(SAMPLE_RATE, 24);
header.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
header.writeUInt16LE(2, 32);        // block align
header.writeUInt16LE(16, 34);       // bits per sample
header.write('data', 36);
header.writeUInt32LE(dataSize, 40);

const wav = Buffer.concat([header, pcm]);
fs.writeFileSync('./assets/singing-bowl.wav', wav);
console.log(`Generated singing-bowl.wav (${(wav.length / 1024).toFixed(0)} KB, ${DURATION}s)`);
