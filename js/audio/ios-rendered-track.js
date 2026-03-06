/* 
  🚩 START: iOS Rendered Track (WAV in RAM) — Web-only background workaround
  File: js/audio/ios-rendered-track.js
  Version: 1.1 (SINET v15.6.5)
  Author: miuchins | Co-author: SINET AI

  Purpose:
    - WebKit/iOS often suspends WebAudio timers/AudioContext in background/lock-screen.
    - HTMLMediaElement (<audio>) is more likely to continue playing when screen locks.
    - This module renders a protocol (sequence of frequencies + durations) into a WAV Blob (RAM-only),
      so it can be played by <audio> as a single continuous "music track".

  Notes:
    - This does NOT write any file to disk. It creates a Blob URL in memory.
    - Large durations will consume RAM. Use reasonable protocol lengths.
*/
/* 🚩 END HEADER */

export function estimateWavBytes(totalSeconds, sampleRate=22050, channels=1, bitsPerSample=16) {
  const sec = Math.max(0, Number(totalSeconds) || 0);
  const sr = Math.max(8000, Number(sampleRate) || 22050);
  const ch = Math.max(1, Number(channels) || 1);
  const bps = (Number(bitsPerSample) === 8) ? 8 : 16;
  const bytesPerSample = (bps / 8);
  const dataBytes = Math.floor(sec * sr) * ch * bytesPerSample;
  // WAV header is 44 bytes
  return 44 + dataBytes;
}

function _clamp(x, lo=-1, hi=1) { return Math.max(lo, Math.min(hi, x)); }

function _writeString(view, offset, str) {
  for (let i=0;i<str.length;i++) view.setUint8(offset+i, str.charCodeAt(i));
}
function _writeUint32LE(view, offset, v) { view.setUint32(offset, v>>>0, true); }
function _writeUint16LE(view, offset, v) { view.setUint16(offset, v>>>0, true); }

/**
 * Render protocol to WAV Blob URL.
 * 
 * @param {Object} opts
 * @param {Array<Object>} opts.sequence Array of frequency objects; must include .value (Hz). 
 * @param {Array<number>|null} opts.durationsSec Optional durations per item (seconds). If null, uses uniform duration.
 * @param {number} opts.totalSec Total duration in seconds (used for uniform duration fallback).
 * @param {number} opts.sampleRate Default 22050 to reduce size.
 * @param {number} opts.channels Default 1 (mono).
 * @param {number} opts.gain Linear gain (0..1).
 * @param {number} opts.subCarrierHz Carrier used for sub-audible (<threshold) AM rendering.
 * @param {number} opts.subThresholdHz Threshold for AM route.
 * @param {number} opts.fadeMs Fade-in/out per step to reduce clicks.
 * @param {AbortSignal|null} opts.signal Optional AbortSignal to cancel render.
 * @returns {Promise<{url:string, blob:Blob, bytes:number, totalSec:number, sampleRate:number, channels:number}>}
 */
export async function renderProtocolToWavBlobURL(opts = {}) {
  const seq = Array.isArray(opts.sequence) ? opts.sequence : [];
  const totalSec = Math.max(0, Number(opts.totalSec) || 0);
  const sr = Math.max(8000, Number(opts.sampleRate) || 22050);
  const ch = Math.max(1, Number(opts.channels) || 1);
  const gain = _clamp(Number(opts.gain) || 0.25, 0, 1);
  const subCarrierHz = Math.max(40, Number(opts.subCarrierHz) || 200);
  const subThresholdHz = Math.max(1, Number(opts.subThresholdHz) || 50);
  const fadeMs = Math.max(0, Number(opts.fadeMs) || 12);
  const signal = opts.signal || null;

  if (!seq.length) throw new Error("Empty sequence");
  const durs = Array.isArray(opts.durationsSec) && opts.durationsSec.length === seq.length
    ? opts.durationsSec.map(x => Math.max(0, Number(x)||0))
    : null;

  const uniformDur = durs ? 0 : (seq.length ? (totalSec / seq.length) : 0);

  // total samples
  let totalSamples = 0;
  for (let i=0;i<seq.length;i++) {
    const dur = durs ? durs[i] : uniformDur;
    totalSamples += Math.floor(dur * sr);
  }
  totalSamples = Math.max(0, totalSamples);

  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample/8;
  const dataBytes = totalSamples * ch * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  // RIFF header
  _writeString(view, 0, "RIFF");
  _writeUint32LE(view, 4, 36 + dataBytes);
  _writeString(view, 8, "WAVE");
  _writeString(view, 12, "fmt ");
  _writeUint32LE(view, 16, 16); // PCM
  _writeUint16LE(view, 20, 1);  // PCM format
  _writeUint16LE(view, 22, ch);
  _writeUint32LE(view, 24, sr);
  _writeUint32LE(view, 28, sr * ch * bytesPerSample);
  _writeUint16LE(view, 32, ch * bytesPerSample);
  _writeUint16LE(view, 34, bitsPerSample);
  _writeString(view, 36, "data");
  _writeUint32LE(view, 40, dataBytes);

  // Rendering loop (PCM Int16)
  const fadeSamples = Math.floor((fadeMs/1000) * sr);
  let sampleIndex = 0;
  let byteOffset = 44;

  // Use time-slicing to keep UI responsive during render (foreground)
  const YIELD_EVERY = 200000; // samples

  for (let i=0;i<seq.length;i++) {
    if (signal && signal.aborted) throw new Error("Render aborted");
    const hz = Math.max(0, Number(seq[i]?.value) || 0);
    const dur = durs ? durs[i] : uniformDur;
    const stepSamples = Math.floor(dur * sr);
    if (stepSamples <= 0 || hz <= 0) {
      // silence step
      for (let n=0;n<stepSamples;n++) {
        const s = 0;
        // mono or duplicate for channels
        for (let c=0;c<ch;c++) { view.setInt16(byteOffset, 0, true); byteOffset += 2; }
        sampleIndex++;
        if (sampleIndex % YIELD_EVERY === 0) await Promise.resolve();
      }
      continue;
    }

    // phase increments
    const twoPi = Math.PI * 2;
    let phase = 0;
    let phaseMod = 0;
    const inc = twoPi * hz / sr;

    let useAM = (hz < subThresholdHz);
    const incCarrier = twoPi * subCarrierHz / sr;
    const incMod = twoPi * hz / sr;

    for (let n=0;n<stepSamples;n++) {
      if (signal && signal.aborted) throw new Error("Render aborted");

      // fade envelope per step to reduce clicks
      let env = 1;
      if (fadeSamples > 0) {
        if (n < fadeSamples) env = n / fadeSamples;
        else if (n > stepSamples - fadeSamples) env = Math.max(0, (stepSamples - n) / fadeSamples);
      }

      let val;
      if (useAM) {
        // AM: carrier * (0.5 + 0.5*sin(mod))
        val = Math.sin(phase) * (0.5 + 0.5 * Math.sin(phaseMod));
        phase += incCarrier;
        phaseMod += incMod;
      } else {
        val = Math.sin(phase);
        phase += inc;
      }

      // normalize phases to avoid float overflow over long tracks
      if (phase > 1e9) phase = phase % twoPi;
      if (phaseMod > 1e9) phaseMod = phaseMod % twoPi;

      const out = _clamp(val * gain * env, -1, 1);
      const pcm = (out < 0) ? Math.floor(out * 32768) : Math.floor(out * 32767);

      for (let c=0;c<ch;c++) {
        view.setInt16(byteOffset, pcm, true);
        byteOffset += 2;
      }

      sampleIndex++;
      if (sampleIndex % YIELD_EVERY === 0) await Promise.resolve();
    }
  }

  const blob = new Blob([buffer], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);
  return { url, blob, bytes: (44+dataBytes), totalSec, sampleRate: sr, channels: ch };
}
/* 🚩 END: iOS Rendered Track (WAV in RAM) */ 
