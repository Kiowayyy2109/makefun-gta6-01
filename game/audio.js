// Sound: everything is synthesized with WebAudio — engine hum, horn,
// gunshot, siren, coin chime, footsteps and a small looping bass melody.
// No audio files are loaded. All calls are safe before the first gesture.
export function createAudio() {
  const A = {
    ctx: null, master: null, muted: false,
    engineOsc: null, engineGain: null, musicTimer: null, musicStep: 0,
    ensure() {
      if (this.ctx) return true;
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return false;
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.4;
        this.master.connect(this.ctx.destination);
        // Engine: a low sawtooth whose pitch follows speed, started once.
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.value = 55;
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 420;
        this.engineOsc.connect(filter);
        filter.connect(this.engineGain);
        this.engineGain.connect(this.master);
        this.engineOsc.start();
        this.startMusic();
        return true;
      } catch (e) { return false; }
    },
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); },
    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.value = m ? 0 : 0.4;
    },
    tone(freq, dur, type, vol, slideTo) {
      if (!this.ctx || this.muted) return;
      try {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + dur);
        g.gain.setValueAtTime(vol || 0.2, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
        o.connect(g); g.connect(this.master);
        o.start(); o.stop(this.ctx.currentTime + dur + 0.02);
      } catch (e) {}
    },
    noise(dur, vol, low) {
      if (!this.ctx || this.muted) return;
      try {
        const len = Math.floor(this.ctx.sampleRate * dur);
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = low || 1800;
        const g = this.ctx.createGain();
        g.gain.value = vol || 0.3;
        src.connect(f); f.connect(g); g.connect(this.master);
        src.start();
      } catch (e) {}
    },
    engine(speed01, driving) {
      if (!this.ctx || !this.engineOsc) return;
      const target = driving ? 0.05 + speed01 * 0.11 : 0.0;
      this.engineGain.gain.setTargetAtTime(this.muted ? 0 : target, this.ctx.currentTime, 0.1);
      this.engineOsc.frequency.setTargetAtTime(52 + speed01 * 130, this.ctx.currentTime, 0.08);
    },
    horn() { this.tone(370, 0.35, 'square', 0.16); this.tone(466, 0.35, 'square', 0.12); },
    // Two-tone horn: a major third, the way a city car horn sounds.
    gunshot() { this.noise(0.16, 0.5, 3200); this.tone(140, 0.1, 'square', 0.2, 60); },
    swing() { this.noise(0.12, 0.14, 900); },
    click() { this.tone(900, 0.06, 'square', 0.1); },
    reload() { this.tone(500, 0.07, 'square', 0.12); setTimeout(() => this.tone(700, 0.07, 'square', 0.12), 90); },
    coin() {
      this.tone(880, 0.12, 'sine', 0.22);
      setTimeout(() => this.tone(1318, 0.22, 'sine', 0.22), 110);
    },
    step() { this.noise(0.05, 0.06, 500); },
    crash() { this.noise(0.3, 0.45, 700); this.tone(90, 0.25, 'sawtooth', 0.25, 45); },
    siren() { this.tone(720, 0.5, 'sine', 0.07, 980); },
    busted() { this.tone(220, 0.5, 'sawtooth', 0.2, 110); },
    startMusic() {
      // A lazy bass line + sparse lead, stepped every 300 ms.
      const bass = [55, 55, 65.4, 49, 55, 55, 82.4, 73.4];
      const lead = [220, 0, 261.6, 0, 329.6, 0, 261.6, 196];
      this.musicTimer = setInterval(() => {
        if (!this.ctx || this.muted) return;
        const i = this.musicStep % 8;
        this.musicStep++;
        if (bass[i]) this.tone(bass[i], 0.28, 'triangle', 0.1);
        if (lead[i]) this.tone(lead[i], 0.22, 'sine', 0.05);
      }, 300);
    },
  };
  return A;
}
