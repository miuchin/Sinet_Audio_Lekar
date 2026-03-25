/*
  SINET Audio Engine
  File: js/audio/audio-engine.js
  Version: 4.8
  Notes:
    - Reliable oscillator play
    - Proper stats for timer UI
    - Pause/Resume preserves elapsed time
*/

export class SinetAudioEngine {
  constructor(opts = {}) {
    this.audioContext = null;
    this.masterGain = null;
    this.compressor = null;
    this._boostEnabled = false;
    this._oscType = "sine";
    this.oscillators = [];
    this.isPlaying = false;

    // v15.4.7 — audible carrier for sub-50Hz
    this.subCarrierHz = Number(opts.subCarrierHz) || 210;
    this.subCarrierThresholdHz = Number(opts.subCarrierThresholdHz) || 50;
    this.normalizeLoudness = opts.normalizeLoudness !== false;

    this.currentSequence = [];
    this.currentIndex = 0;
    this.totalDurationSec = 0;
    this.durationPerFreq = 0;

    // Optional per-frequency durations (seconds), aligned to sequence indices
    this._durationsSec = null;

    this._tickTimer = null;
    this._stepStartedAt = 0;
    this._resumeOffsetSec = 0;

    this.onTick = opts.onTick || null;
    this.onFreqChange = opts.onFreqChange || null;
    this.onComplete = opts.onComplete || null;
    this.onSkip = opts.onSkip || null;

    // Desired output state; do not force-create AudioContext before a user gesture.
    this._desiredMasterGain = Math.min(1.6, Math.max(0, Number(opts.masterGain) || 0.75));

    // Skip/disable support
    this._disabled = new Set();
  }

  init() {
    if (!this.audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      this.masterGain = this.audioContext.createGain();
      // Audio Engine v2: optional boost (compressor/limiter) after master gain
      this.compressor = this.audioContext.createDynamicsCompressor();
      // Conservative defaults; boosted profile will tighten threshold/ratio
      try {
        this.compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);
        this.compressor.knee.setValueAtTime(20, this.audioContext.currentTime);
        this.compressor.ratio.setValueAtTime(6, this.audioContext.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
        this.compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);
      } catch(_) {}

      // Split output: direct -> destination, and media -> MediaStreamDestination (iOS background best-effort)
      this.outGainDirect = this.audioContext.createGain();
      this.outGainMedia = this.audioContext.createGain();
      this.mediaDest = this.audioContext.createMediaStreamDestination();
      this.outGainDirect.gain.value = 1;
      this.outGainMedia.gain.value = 0;

      // Route: masterGain -> (compressor) -> outputs
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.outGainDirect);
      this.outGainDirect.connect(this.audioContext.destination);
      this.compressor.connect(this.outGainMedia);
      this.outGainMedia.connect(this.mediaDest);

      this.masterGain.gain.value = this._desiredMasterGain; // louder default (user adjustable)
      this.setBoostEnabled(this._boostEnabled);

    }
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }
  }

  _carrierForSubHz(hz) {
    const x = Math.max(0, Number(hz) || 0);
    if (x <= 0) return Math.max(40, Number(this.subCarrierHz) || 210);
    if (x < 8) return 200;
    if (x < 12) return 205;
    if (x < 20) return 210;
    if (x < 32) return 215;
    return 220;
  }

  _toneNormalizationGain(hz) {
    if (!this.normalizeLoudness) return 1;
    const f = (hz > 0 && hz < this.subCarrierThresholdHz) ? this._carrierForSubHz(hz) : Math.max(1, Number(hz) || 0);
    let gain = 1;
    if (f < 90) gain = 1.55;
    else if (f < 140) gain = 1.38;
    else if (f < 200) gain = 1.22;
    else if (f < 260) gain = 1.10;
    else if (f < 700) gain = 1.0;
    else if (f < 1600) gain = 0.94;
    else if (f < 3200) gain = 0.88;
    else gain = 0.82;
    return Math.max(0.65, Math.min(1.65, gain));
  }

  playFrequency(freq) {
    this.stopOscillator();
    this.init();

    const ctx = this.audioContext;
    const hz = Math.max(0, Number(freq) || 0);

    // If frequency is sub-audible, render as AM on a fixed carrier (default 200 Hz)
    if (hz > 0 && hz < this.subCarrierThresholdHz) {
      const carrierHz = this._carrierForSubHz(hz);

      const carrier = ctx.createOscillator();
      carrier.type = this._oscType || "sine";
      carrier.frequency.setValueAtTime(carrierHz, ctx.currentTime);

      // Amplitude node: 0.5 offset so gain stays >= 0
      const amp = ctx.createGain();
      amp.gain.setValueAtTime(0.5, ctx.currentTime);

      const mod = ctx.createOscillator();
      mod.type = "sine";
      mod.frequency.setValueAtTime(hz, ctx.currentTime);

      // Depth 0.5 so gain swings 0..1
      const depth = ctx.createGain();
      depth.gain.setValueAtTime(0.5, ctx.currentTime);

      mod.connect(depth);
      depth.connect(amp.gain);

      const toneGain = ctx.createGain();
      toneGain.gain.setValueAtTime(this._toneNormalizationGain(hz), ctx.currentTime);
      carrier.connect(amp);
      amp.connect(toneGain);
      toneGain.connect(this.masterGain);

      mod.start();
      carrier.start();

      this.oscillators.push(carrier, mod, amp, toneGain, depth);
      this.isPlaying = true;
      return;
    }

    // Normal audible oscillator
    if (hz <= 0) return;
    const osc = ctx.createOscillator();
    osc.type = this._oscType || "sine";
    osc.frequency.setValueAtTime(hz, ctx.currentTime);
    const toneGain = ctx.createGain();
    toneGain.gain.setValueAtTime(this._toneNormalizationGain(hz), ctx.currentTime);
    osc.connect(toneGain);
    toneGain.connect(this.masterGain);
    osc.start();

    this.oscillators.push(osc, toneGain);
    this.isPlaying = true;
  }

  stopOscillator() {
    for (const osc of this.oscillators) {
      try { if (typeof osc.stop === "function") osc.stop(); } catch(e) {}
      try { if (typeof osc.disconnect === "function") osc.disconnect(); } catch(e) {}
    }
    this.oscillators = [];
    this.isPlaying = false;
  }

  loadSequence(list, totalDurationSec, startIndex = 0, elapsedInCurrentFreq = 0, durationsSec = null) {
    this.currentSequence = Array.isArray(list) ? list : [];
    this.totalDurationSec = Math.max(0, Number(totalDurationSec) || 0);
    this.currentIndex = Math.max(0, Number(startIndex) || 0);

    this._disabled = new Set();

    // Optional: per-frequency durations (seconds), aligned to original indices
    this._durationsSec = null;
    if (Array.isArray(durationsSec) && durationsSec.length === this.currentSequence.length) {
      this._durationsSec = durationsSec.map(v => Math.max(0, Number(v) || 0));
      const sum = this._durationsSec.reduce((acc, v) => acc + (Number(v) || 0), 0);
      if (!this.totalDurationSec || this.totalDurationSec < sum) this.totalDurationSec = sum;
    }

    const n = Math.max(1, this.currentSequence.length);
    this.durationPerFreq = this.totalDurationSec / n;
    this._resumeOffsetSec = Math.max(0, Number(elapsedInCurrentFreq) || 0);
  }


  _durFor(index) {
    const i = Number(index);
    if (this._durationsSec && Number.isFinite(i) && i >= 0 && i < this._durationsSec.length) {
      const v = Number(this._durationsSec[i]);
      if (Number.isFinite(v) && v > 0) return v;
    }
    return Math.max(0, Number(this.durationPerFreq) || 0);
  }

  _isEnabledIndex(i) {
    return !this._disabled.has(Number(i));
  }

  _enabledCount() {
    const n = this.currentSequence.length || 0;
    let c = 0;
    for (let i = 0; i < n; i++) if (this._isEnabledIndex(i)) c++;
    return c;
  }


  isEnabled(index) {
    return this._isEnabledIndex(index);
  }

  setEnabled(index, enabled) {
    const i = Number(index);
    if (!Number.isFinite(i)) return;
    if (enabled) this._disabled.delete(i);
    else this._disabled.add(i);
  }

  skipCurrent() {
    // disable current and move to next immediately
    const i = this.currentIndex;
    this.setEnabled(i, false);

    // stop current sound & timer
    this.stopOscillator();
    if (this._tickTimer) clearInterval(this._tickTimer);
    this._tickTimer = null;

    this._resumeOffsetSec = 0;
    this.currentIndex += 1;
    this._runStep();
  }
  play() {
    this.init();
    this._runStep();
  }

  _runStep() {
    // auto-skip disabled items
    while (this.currentIndex < this.currentSequence.length && this._disabled.has(this.currentIndex)) {
      const skippedObj = this.currentSequence[this.currentIndex] || {};
      this.onSkip && this.onSkip(skippedObj, this._buildStats(0));
      this.currentIndex += 1;
    }

    if (this.currentIndex >= this.currentSequence.length) {
      this.stop();
      this.onComplete && this.onComplete();
      return;
    }

    const obj = this.currentSequence[this.currentIndex] || {};
    const hz = Number(obj.value) || 0;

    this.playFrequency(hz);
    this._stepStartedAt = this.audioContext.currentTime;

    const stepDur = this._durFor(this.currentIndex);
    const timeLeft = Math.max(0, stepDur - this._resumeOffsetSec);

    // immediate callback
    this.onFreqChange && this.onFreqChange(obj, this._buildStats(this._resumeOffsetSec));

    if (this._tickTimer) clearInterval(this._tickTimer);
    this._tickTimer = setInterval(() => {
      if (!this.isPlaying) return;

      const elapsedSinceStart = this.audioContext.currentTime - this._stepStartedAt;
      const elapsedInFreq = this._resumeOffsetSec + elapsedSinceStart;

      this.onTick && this.onTick(this._buildStats(elapsedInFreq));

      if (elapsedSinceStart >= timeLeft) {
        clearInterval(this._tickTimer);
        this._tickTimer = null;
        this._resumeOffsetSec = 0;
        this.currentIndex += 1;
        this._runStep();
      }
    }, 200);
  }

  _buildStats(elapsedInFreq) {
    const totalItems = this.currentSequence.length || 0;
    const elapsedIn = Math.max(0, Number(elapsedInFreq) || 0);

    // Track totals should ignore disabled items
    let enabledTotalItems = 0;
    let currentPos = 0; // position among enabled items (0-based)
    let totalTrackSec = 0;
    let elapsedTrackSec = 0;

    for (let i = 0; i < totalItems; i++) {
      if (!this._isEnabledIndex(i)) continue;
      const d = this._durFor(i);
      enabledTotalItems += 1;
      totalTrackSec += d;

      if (i < this.currentIndex) {
        currentPos += 1;
        elapsedTrackSec += d;
      } else if (i === this.currentIndex) {
        elapsedTrackSec += Math.max(0, Math.min(d, elapsedIn));
      }
    }

    const durationCurrentSec = this._durFor(this.currentIndex);

    return {
      currentIndex: this.currentIndex,
      totalItems,
      enabledTotalItems,
      currentPos,
      elapsedInFreq: elapsedIn,
      durationPerFreq: Math.max(0, Number(this.durationPerFreq) || 0),
      durationCurrentSec,
      totalDurationSec: Math.max(0, Number(this.totalDurationSec) || 0),
      totalTrackSec: Math.max(0, Number(totalTrackSec) || 0),
      elapsedTrackSec: Math.max(0, Number(elapsedTrackSec) || 0),
      hasPerFreqDurations: !!this._durationsSec
    };
  }

  pause() {
    let elapsed = 0;
    if (this.isPlaying && this.audioContext) {
      elapsed = this._resumeOffsetSec + (this.audioContext.currentTime - this._stepStartedAt);
    }
    this._resumeOffsetSec = Math.max(0, elapsed);

    this.stopOscillator();
    if (this._tickTimer) clearInterval(this._tickTimer);
    this._tickTimer = null;
    return this.getState();
  }

  stop() {
    this.pause();
    this.currentIndex = 0;
    this._resumeOffsetSec = 0;
  }


// Alias used by UI (now playing list, skip logic)
getStats() {
  // best-effort: build a stats object similar to _buildStats
  const elapsed = this._resumeOffsetSec || 0;
  return this._buildStats(elapsed);
}

  getState() {
    return this._buildStats(this._resumeOffsetSec);
  }
  // Enable HTMLMediaElement output via MediaStream (best-effort; helps iOS lock-screen/background in some cases)
  enableMediaOutput(audioEl) {
    this.init();
    if (!this.mediaDest || !this.outGainMedia || !this.outGainDirect) return false;
    if (!audioEl) return false;
    try {
      audioEl.srcObject = this.mediaDest.stream;
      audioEl.preload = "auto";
      audioEl.playsInline = true;
      audioEl.setAttribute("playsinline", "");
      audioEl.muted = false;

      // IMPORTANT (iOS Safari): srcObject/play may "succeed" but still produce silence.
      // Strategy:
      //  1) enable media path
      //  2) keep direct path ON until <audio> confirms 'playing'
      //  3) if not playing within a short timeout, fallback to direct path
      this.outGainMedia.gain.value = 1;
      this.outGainDirect.gain.value = 1;

      let switched = false;
      const switchToMedia = () => {
        if (switched) return;
        switched = true;
        try { this.outGainDirect.gain.value = 0; } catch(_) {}
      };
      const fallback = () => {
        try { this.outGainDirect.gain.value = 1; this.outGainMedia.gain.value = 0; } catch(_) {}
      };

      audioEl.addEventListener?.('playing', switchToMedia, { once: true });
      audioEl.addEventListener?.('error', fallback, { once: true });

      const p = audioEl.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => fallback());
      }

      setTimeout(() => {
        try {
          if (!switched) {
            // If the media element is not actually playing, don't risk muting the direct path.
            if (audioEl.paused || audioEl.readyState < 2) fallback();
          }
        } catch(_) { fallback(); }
      }, 900);

      return true;
    } catch (e) {
      // Fallback: keep direct output
      try { this.outGainDirect.gain.value = 1; this.outGainMedia.gain.value = 0; } catch(_) {}
      return false;
    }
  }

  disableMediaOutput() {
    try {
      if (this.outGainDirect) this.outGainDirect.gain.value = 1;
      if (this.outGainMedia) this.outGainMedia.gain.value = 0;
    } catch(_) {}
  }

  getMediaStream() {
    return this.mediaDest ? this.mediaDest.stream : null;
  }

  setMasterVolume(v) {
    const x = Math.min(1.6, Math.max(0, Number(v)));
    this._desiredMasterGain = x;
    if (!this.audioContext || !this.masterGain) return;
    try { this.masterGain.gain.setValueAtTime(x, this.audioContext.currentTime); } catch(_) { try { this.masterGain.gain.value = x; } catch(_) {} }
  }

  getMasterVolume() {
    try { return this.masterGain ? (Number(this.masterGain?.gain?.value) || 0) : this._desiredMasterGain; } catch(_) { return this._desiredMasterGain || 0; }
  }

  setNormalizeLoudness(on) {
    this.normalizeLoudness = !!on;
  }

  setBoostEnabled(on) {
    this._boostEnabled = !!on;
    if (!this.audioContext || !this.compressor) return;
    const t = this.audioContext.currentTime;
    try {
      if (this._boostEnabled) {
        this.compressor.threshold.setValueAtTime(-32, t);
        this.compressor.knee.setValueAtTime(16, t);
        this.compressor.ratio.setValueAtTime(12, t);
        this.compressor.attack.setValueAtTime(0.002, t);
        this.compressor.release.setValueAtTime(0.20, t);
      } else {
        this.compressor.threshold.setValueAtTime(-24, t);
        this.compressor.knee.setValueAtTime(20, t);
        this.compressor.ratio.setValueAtTime(6, t);
        this.compressor.attack.setValueAtTime(0.003, t);
        this.compressor.release.setValueAtTime(0.25, t);
      }
    } catch(_) {}
  }

  setOscType(type) {
    const allowed = new Set(["sine","triangle","square","sawtooth"]);
    const t = (type||"").toString().toLowerCase();
    if (allowed.has(t)) this._oscType = t;
  }

}
