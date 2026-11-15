import { ObstacleKind, RadioStation, WeatherKind } from './types';

const RADIO_CYCLE: RadioStation[] = ['off', 'bollywood', 'techno', 'street'];

/**
 * Clean, crisp Web Audio SFX + Procedural Radio synthesizer for Santa Cruz Micro Arcade.
 * Zero continuous engine drone or buzzing background oscillators.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private radioGain: GainNode | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private muted = false;
  private unlocked = false;
  private radioStation: RadioStation = 'off';
  private radioActive = false;
  private radioTimerId: number | null = null;
  private radioStep = 0;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.65, this.ctx.currentTime, 0.04);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public init(): void {
    if (this.unlocked && this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.65;
    this.masterGain.connect(this.ctx.destination);

    // Pre-bake 1 second of white noise for clean impact/scatter bursts
    const sampleRate = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, sampleRate, sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < sampleRate; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Smooth triangle-wave police siren (only active during pursuit)
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 660;

    const sirenFilter = this.ctx.createBiquadFilter();
    sirenFilter.type = 'lowpass';
    sirenFilter.frequency.value = 1400;

    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;

    this.sirenOsc.connect(sirenFilter);
    sirenFilter.connect(this.sirenGain);
    this.sirenGain.connect(this.masterGain);
    this.sirenOsc.start();

    this.radioGain = this.ctx.createGain();
    this.radioGain.gain.value = 0.34;
    this.radioGain.connect(this.masterGain);

    this.unlocked = true;
    if (this.radioActive && this.radioStation !== 'off') {
      this.startRadioLoop();
    }
  }

  public getRadioStation(): RadioStation {
    return this.radioStation;
  }

  public setRadioActive(active: boolean): void {
    this.radioActive = active;
    if (!active) {
      this.stopRadioLoop();
    } else if (this.radioStation !== 'off') {
      this.init();
      this.startRadioLoop();
    }
  }

  public setRadioStation(station: RadioStation): RadioStation {
    this.radioStation = station;
    this.radioStep = 0;
    this.stopRadioLoop();
    if (this.ctx && this.masterGain) {
      this.playRadioTuneClick();
    }
    if (this.radioActive && this.radioStation !== 'off') {
      this.init();
      this.startRadioLoop();
    }
    return this.radioStation;
  }

  public cycleRadioStation(): RadioStation {
    const idx = RADIO_CYCLE.indexOf(this.radioStation);
    const next = RADIO_CYCLE[(idx + 1) % RADIO_CYCLE.length];
    return this.setRadioStation(next);
  }

  private playRadioTuneClick(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.Q.value = 1.6;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.095);
  }

  private stopRadioLoop(): void {
    if (this.radioTimerId !== null) {
      window.clearInterval(this.radioTimerId);
      this.radioTimerId = null;
    }
  }

  private startRadioLoop(): void {
    this.stopRadioLoop();
    if (!this.ctx || !this.radioGain || !this.radioActive || this.radioStation === 'off') {
      return;
    }
    const intervalMs =
      this.radioStation === 'bollywood' ? 130 : this.radioStation === 'techno' ? 115 : 240;
    this.tickRadioStep();
    this.radioTimerId = window.setInterval(() => {
      this.tickRadioStep();
    }, intervalMs);
  }

  private tickRadioStep(): void {
    if (!this.ctx || !this.radioGain || !this.radioActive || this.radioStation === 'off') {
      return;
    }
    if (this.ctx.state === 'suspended') return;

    const step = this.radioStep % 32;
    this.radioStep++;
    const now = this.ctx.currentTime;

    if (this.radioStation === 'bollywood') {
      this.playBollywoodStep(step, now);
    } else if (this.radioStation === 'techno') {
      this.playTechnoStep(step, now);
    } else if (this.radioStation === 'street') {
      this.playStreetAmbientStep(step, now);
    }
  }

  private playBollywoodStep(step: number, now: number): void {
    if (!this.ctx || !this.radioGain) return;
    const local = step % 16;

    // Dholak / Tabla groove: deep "dha" & crisp "na" percussion
    if (local === 0 || local === 6 || local === 10) {
      const dha = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      dha.type = 'sine';
      dha.frequency.setValueAtTime(145, now);
      dha.frequency.exponentialRampToValueAtTime(68, now + 0.095);
      g.gain.setValueAtTime(0.28, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      dha.connect(g);
      g.connect(this.radioGain);
      dha.start(now);
      dha.stop(now + 0.12);
    }
    if (local === 2 || local === 4 || local === 8 || local === 12 || local === 14) {
      const na = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      na.type = 'triangle';
      na.frequency.setValueAtTime(local === 4 || local === 12 ? 340 : 280, now);
      na.frequency.exponentialRampToValueAtTime(210, now + 0.055);
      g.gain.setValueAtTime(local === 4 || local === 12 ? 0.18 : 0.1, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
      na.connect(g);
      g.connect(this.radioGain);
      na.start(now);
      na.stop(now + 0.075);
    }

    // Manjira bell shimmer on off-beats
    if (local % 4 === 2 && this.noiseBuffer) {
      const n = this.ctx.createBufferSource();
      n.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'highpass';
      bp.frequency.setValueAtTime(6200, now);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.045, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      n.connect(bp);
      bp.connect(g);
      g.connect(this.radioGain);
      n.start(now);
      n.stop(now + 0.06);
    }

    // Retro 70s filmy disco bass (C3, Eb3, F3, G3)
    const bassPattern: (number | null)[] = [
      130.81, null, 196.0, null, 155.56, null, 174.61, 196.0,
      130.81, null, 196.0, null, 116.54, null, 146.83, null,
    ];
    const bassFreq = bassPattern[local];
    if (bassFreq) {
      const bass = this.ctx.createOscillator();
      const bf = this.ctx.createBiquadFilter();
      const bg = this.ctx.createGain();
      bass.type = 'sawtooth';
      bass.frequency.setValueAtTime(bassFreq, now);
      bf.type = 'lowpass';
      bf.frequency.setValueAtTime(460, now);
      bg.gain.setValueAtTime(0.14, now);
      bg.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      bass.connect(bf);
      bf.connect(bg);
      bg.connect(this.radioGain);
      bass.start(now);
      bass.stop(now + 0.21);
    }

    // Classic Shivranjani / Bhairavi sitar-brass hook melody
    const melody32: (number | null)[] = [
      523.25, null, 622.25, 587.33, 523.25, null, 466.16, null,
      392.0, 466.16, 523.25, null, 587.33, 622.25, 587.33, null,
      698.46, null, 622.25, 587.33, 523.25, null, 587.33, null,
      466.16, null, 392.0, 466.16, 523.25, null, null, null,
    ];
    const leadFreq = melody32[step];
    if (leadFreq) {
      const osc = this.ctx.createOscillator();
      const filt = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(leadFreq * 0.985, now);
      osc.frequency.exponentialRampToValueAtTime(leadFreq, now + 0.025);
      filt.type = 'bandpass';
      filt.frequency.setValueAtTime(1650, now);
      filt.Q.value = 1.8;
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.13, now + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(filt);
      filt.connect(g);
      g.connect(this.radioGain);
      osc.start(now);
      osc.stop(now + 0.24);
    }
  }

  private playTechnoStep(step: number, now: number): void {
    if (!this.ctx || !this.radioGain) return;
    const local = step % 16;

    // 4-on-the-floor punchy kick
    if (local % 4 === 0) {
      const kick = this.ctx.createOscillator();
      const kg = this.ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(132, now);
      kick.frequency.exponentialRampToValueAtTime(42, now + 0.09);
      kg.gain.setValueAtTime(0.38, now);
      kg.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      kick.connect(kg);
      kg.connect(this.radioGain);
      kick.start(now);
      kick.stop(now + 0.15);
    }

    // Snappy off-beat & 16th hi-hats
    if (this.noiseBuffer && (local % 4 === 2 || local % 2 === 1)) {
      const isOpen = local % 4 === 2;
      const hat = this.ctx.createBufferSource();
      hat.buffer = this.noiseBuffer;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(isOpen ? 6800 : 8400, now);
      const hg = this.ctx.createGain();
      hg.gain.setValueAtTime(isOpen ? 0.095 : 0.04, now);
      hg.gain.exponentialRampToValueAtTime(0.001, now + (isOpen ? 0.085 : 0.035));
      hat.connect(hp);
      hp.connect(hg);
      hg.connect(this.radioGain);
      hat.start(now);
      hat.stop(now + (isOpen ? 0.095 : 0.045));
    }

    // Clap on beats 2 & 4
    if (this.noiseBuffer && (local === 4 || local === 12)) {
      const clap = this.ctx.createBufferSource();
      clap.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1550, now);
      bp.Q.value = 1.3;
      const cg = this.ctx.createGain();
      cg.gain.setValueAtTime(0.12, now);
      cg.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      clap.connect(bp);
      bp.connect(cg);
      cg.connect(this.radioGain);
      clap.start(now);
      clap.stop(now + 0.1);
    }

    // Rolling 16th acid-filtered bassline (A minor)
    const bassNotes = [
      110, 110, 220, 110, 110, 130.81, 110, 146.83,
      110, 110, 220, 110, 98.0, 110, 130.81, 164.81,
    ];
    const bFreq = bassNotes[local];
    const acid = this.ctx.createOscillator();
    const af = this.ctx.createBiquadFilter();
    const ag = this.ctx.createGain();
    acid.type = 'sawtooth';
    acid.frequency.setValueAtTime(bFreq, now);
    af.type = 'lowpass';
    const cutoff = local % 4 === 2 ? 1250 : 540;
    af.frequency.setValueAtTime(cutoff, now);
    af.frequency.exponentialRampToValueAtTime(210, now + 0.09);
    af.Q.value = 4.2;
    ag.gain.setValueAtTime(0.14, now);
    ag.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    acid.connect(af);
    af.connect(ag);
    ag.connect(this.radioGain);
    acid.start(now);
    acid.stop(now + 0.11);

    // Neon synth arp stab every bar / half-bar
    if (step % 8 === 3 || step % 16 === 14) {
      const chord = step < 16 ? [440, 523.25, 659.25] : [392, 493.88, 587.33];
      for (const f of chord) {
        const stab = this.ctx.createOscillator();
        const sf = this.ctx.createBiquadFilter();
        const sg = this.ctx.createGain();
        stab.type = 'sawtooth';
        stab.frequency.setValueAtTime(f, now);
        sf.type = 'lowpass';
        sf.frequency.setValueAtTime(2200, now);
        sf.frequency.exponentialRampToValueAtTime(480, now + 0.16);
        sg.gain.setValueAtTime(0.045, now);
        sg.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
        stab.connect(sf);
        sf.connect(sg);
        sg.connect(this.radioGain);
        stab.start(now);
        stab.stop(now + 0.18);
      }
    }
  }

  private playStreetAmbientStep(step: number, now: number): void {
    if (!this.ctx || !this.radioGain) return;

    // Gentle warm bazaar crowd / traffic bed wash every 8 steps
    if (this.noiseBuffer && step % 8 === 0) {
      const murmur = this.ctx.createBufferSource();
      murmur.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(520 + (step % 16) * 18, now);
      bp.Q.value = 0.75;
      const mg = this.ctx.createGain();
      mg.gain.setValueAtTime(0.001, now);
      mg.gain.linearRampToValueAtTime(0.09, now + 0.45);
      mg.gain.linearRampToValueAtTime(0.075, now + 1.35);
      mg.gain.exponentialRampToValueAtTime(0.001, now + 1.9);
      murmur.connect(bp);
      bp.connect(mg);
      mg.connect(this.radioGain);
      murmur.start(now);
      murmur.stop(now + 1.95);
    }

    // Soft tanpura / street flute fifth drone pulse
    if (step % 16 === 0 || step % 16 === 8) {
      const droneFreqs = step % 16 === 0 ? [146.83, 220.0] : [164.81, 220.0];
      for (const f of droneFreqs) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.045, now + 0.35);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.75);
        osc.connect(g);
        g.connect(this.radioGain);
        osc.start(now);
        osc.stop(now + 1.8);
      }
    }

    // Distant auto-rickshaw / scooter double-beep in bazaar traffic
    if (step === 5 || step === 21) {
      const hornFreq = step === 5 ? 495 : 580;
      for (let i = 0; i < 2; i++) {
        const osc = this.ctx.createOscillator();
        const f = this.ctx.createBiquadFilter();
        const g = this.ctx.createGain();
        const t = now + i * 0.14;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(hornFreq, t);
        f.type = 'bandpass';
        f.frequency.setValueAtTime(1100, t);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.065, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        osc.connect(f);
        f.connect(g);
        g.connect(this.radioGain);
        osc.start(t);
        osc.stop(t + 0.1);
      }
    }

    // Roadside vendor / temple brass bell chime
    if (step === 12 || step === 27) {
      const bell = this.ctx.createOscillator();
      const bg = this.ctx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(step === 12 ? 1174.66 : 1396.91, now);
      bg.gain.setValueAtTime(0.055, now);
      bg.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      bell.connect(bg);
      bg.connect(this.radioGain);
      bell.start(now);
      bell.stop(now + 0.58);
    }
  }

  public updateSiren(policeActive: boolean, policeDistance: number, elapsed: number): void {
    if (!this.ctx || !this.sirenOsc || !this.sirenGain) return;
    const t = this.ctx.currentTime;

    if (policeActive) {
      const phase = (elapsed * 2.4) % 1;
      const targetFreq = phase < 0.5 ? 780 : 540;
      const proximity = Math.max(0.18, Math.min(1, 1 - policeDistance / 80));
      this.sirenOsc.frequency.setTargetAtTime(targetFreq, t, 0.035);
      this.sirenGain.gain.setTargetAtTime(0.085 * proximity, t, 0.05);
    } else {
      this.sirenGain.gain.setTargetAtTime(0, t, 0.06);
    }
  }

  /**
   * Loud, punchy dual-tone Bolivian Micro Air Horn!
   */
  public playAirHorn(): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Dual-chord brassy air horn blast (two quick honks: short + long)
    const blasts = [
      { start: 0.0, dur: 0.14 },
      { start: 0.17, dur: 0.34 },
    ];
    const chordFreqs = [349.23, 440.0, 523.25]; // F4 + A4 + C5 brassy air horn

    for (const blast of blasts) {
      for (const freq of chordFreqs) {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + blast.start);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1650, now + blast.start);
        filter.Q.value = 1.2;

        gain.gain.setValueAtTime(0.001, now + blast.start);
        gain.gain.linearRampToValueAtTime(0.14, now + blast.start + 0.02);
        gain.gain.setValueAtTime(0.13, now + blast.start + blast.dur - 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + blast.start + blast.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + blast.start);
        osc.stop(now + blast.start + blast.dur + 0.02);
      }
    }
  }

  public playCollision(intensity: number): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const clamped = Math.max(0.25, Math.min(1.2, intensity));

    // Crisp filtered crunch
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900 * clamped, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + 0.25);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.32 * clamped, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.28);

    // Solid low-end thud
    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(130, now);
    thud.frequency.exponentialRampToValueAtTime(34, now + 0.2);
    thudGain.gain.setValueAtTime(0.42 * clamped, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    thud.connect(thudGain);
    thudGain.connect(this.masterGain);
    thud.start(now);
    thud.stop(now + 0.24);
  }

  public playPickupSuccess(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const start = now + i * 0.055;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.26);
    });
  }

  public playPoliceAlert(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const start = now + i * 0.14;
      osc.frequency.setValueAtTime(i % 2 === 0 ? 880 : 660, start);
      gain.gain.setValueAtTime(0.14, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.13);
    }
  }

  public playPoliceEscape(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const start = now + idx * 0.075;
      osc.frequency.setValueAtTime(f, start);
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.34);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  }

  public playStartle(kind: ObstacleKind): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (kind === 'cow') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.linearRampToValueAtTime(124, now + 0.28);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    } else if (kind === 'dog') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.08);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    } else if (kind === 'caiman') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(135, now);
      osc.frequency.exponentialRampToValueAtTime(72, now + 0.24);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    }

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playCinematicRumble(intensity = 0.7): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(75, now + 0.42);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.24 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.46);
  }

  public playFinishStage(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    fanfare.forEach((f, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const start = now + i * 0.065;
      osc.frequency.setValueAtTime(f, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.36);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.38);
    });
  }

  public playRealmShift(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [392.0, 493.88, 587.33, 783.99];
    notes.forEach((f, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const start = now + i * 0.09;
      osc.frequency.setValueAtTime(f, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.58);
    });
  }

  public playTrashScatter(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2100, now);
    filter.Q.value = 1.4;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.12);
  }

  public playNearMiss(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.08);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playCameraToggle(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.06);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playGameOver(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const freqs = [330, 293.66, 246.94, 185.0];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const start = now + idx * 0.15;
      osc.frequency.setValueAtTime(f, start);
      gain.gain.setValueAtTime(0.22, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.34);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  }

  public playMachineGunShot(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1450, now);
    filter.Q.value = 1.1;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.07);

    const punch = this.ctx.createOscillator();
    const pGain = this.ctx.createGain();
    punch.type = 'triangle';
    punch.frequency.setValueAtTime(190, now);
    punch.frequency.exponentialRampToValueAtTime(62, now + 0.055);
    pGain.gain.setValueAtTime(0.15, now);
    pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    punch.connect(pGain);
    pGain.connect(this.masterGain);
    punch.start(now);
    punch.stop(now + 0.065);
  }

  public playObstacleDestroy(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1250, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.22);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.25);

    const ping = this.ctx.createOscillator();
    const pGain = this.ctx.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(580, now);
    ping.frequency.exponentialRampToValueAtTime(880, now + 0.12);
    pGain.gain.setValueAtTime(0.12, now);
    pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    ping.connect(pGain);
    pGain.connect(this.masterGain);
    ping.start(now);
    ping.stop(now + 0.15);
  }

  public playArrowShoot(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(720, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.14);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playArrowHit(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.14);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playMudSplash(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(480, now);
    filter.frequency.exponentialRampToValueAtTime(160, now + 0.18);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.2);
  }

  public playForkMerge(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [523.25, 783.99].forEach((f, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const start = now + i * 0.08;
      osc.frequency.setValueAtTime(f, start);
      gain.gain.setValueAtTime(0.14, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.26);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.28);
    });
  }

  public playFuelPickup(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const freqs = [330, 440, 587.33];
    freqs.forEach((f, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const start = now + i * 0.05;
      osc.frequency.setValueAtTime(f, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.2);
    });
  }

  public playBoosterPickup(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 698.46, 880, 1174.66];
    notes.forEach((f, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const start = now + i * 0.045;
      osc.frequency.setValueAtTime(f, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.17, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.24);
    });
  }

  public playShieldBlock(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playLowFuelBeep(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playWeatherShift(weather: WeatherKind): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    if (weather === 'sunny') {
      [523.25, 659.25, 783.99].forEach((f, i) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const start = now + i * 0.06;
        osc.frequency.setValueAtTime(f, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.11, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(start);
        osc.stop(start + 0.3);
      });
      return;
    }

    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      const startFreq =
        weather === 'blizzard' ? 1650 : weather === 'dusty' ? 680 : weather === 'heavyRain' ? 980 : 1250;
      const endFreq =
        weather === 'blizzard' ? 520 : weather === 'dusty' ? 320 : weather === 'heavyRain' ? 420 : 480;
      filter.frequency.setValueAtTime(startFreq, now);
      filter.frequency.exponentialRampToValueAtTime(endFreq, now + 0.6);
      filter.Q.value = weather === 'blizzard' ? 2.4 : 1.2;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(weather === 'blizzard' ? 0.18 : 0.15, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start(now);
      noise.stop(now + 0.68);
    }

    if (weather === 'blizzard') {
      [880, 1174.66].forEach((f, i) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const start = now + i * 0.09;
        osc.frequency.setValueAtTime(f, start);
        osc.frequency.exponentialRampToValueAtTime(f * 0.85, start + 0.35);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.07, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.38);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(start);
        osc.stop(start + 0.4);
      });
    } else if (weather === 'monsoon') {
      this.playThunderClap();
    }
  }

  public playTrafficHornReact(jammed: boolean): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Quick AI car response beep (higher single or double chirp)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    const baseFreq = jammed ? 340 : 480;
    osc.frequency.setValueAtTime(baseFreq, now + 0.08);
    osc.frequency.setValueAtTime(baseFreq * 1.12, now + 0.16);
    gain.gain.setValueAtTime(0.001, now + 0.08);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now + 0.08);
    osc.stop(now + 0.3);

    // Tire screech / brake chirp
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(jammed ? 1900 : 1450, now + 0.04);
      filter.Q.value = 4.2;
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.001, now + 0.04);
      nGain.gain.linearRampToValueAtTime(0.08, now + 0.07);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.masterGain);
      noise.start(now + 0.04);
      noise.stop(now + 0.25);
    }
  }

  public playThunderClap(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240, now);
    filter.frequency.exponentialRampToValueAtTime(55, now + 0.85);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.88);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.9);
  }

  public dispose(): void {
    this.radioActive = false;
    this.stopRadioLoop();
    try {
      this.sirenOsc?.stop();
      if (this.ctx && this.ctx.state !== 'closed') {
        void this.ctx.close();
      }
    } catch {
      // ignore cleanup errors
    }
    this.ctx = null;
    this.radioGain = null;
    this.unlocked = false;
  }
}
