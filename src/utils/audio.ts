/**
 * Studio-Grade Cinematic Web Audio API Synthesizer
 * Republic of Valoria - Presidential Battle Engine
 * 100% self-contained procedural audio, zero external asset dependencies.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private noiseBuffer: AudioBuffer | null = null;
  private masterGain: GainNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private masterWaveshaper: WaveShaperNode | null = null;

  /**
   * Initializes and maintains the Web Audio Context and studio mastering chain.
   */
  private initContext(): { ctx: AudioContext; masterOut: GainNode } | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      // Initialize Studio Mastering Bus if not already created
      if (!this.masterGain || !this.masterCompressor || !this.masterWaveshaper) {
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

        // Warm Analog Soft-Knee Waveshaper (Gentle Sigmoid Tube Saturation)
        this.masterWaveshaper = this.ctx.createWaveShaper();
        const curveSamples = 1024;
        const curve = new Float32Array(curveSamples);
        const k = 1.35; // Gentle saturation factor
        for (let i = 0; i < curveSamples; i++) {
          const x = (i * 2) / curveSamples - 1;
          curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
        }
        this.masterWaveshaper.curve = curve;
        this.masterWaveshaper.oversample = '2x';

        // Hollywood Mastering Dynamics Compressor
        this.masterCompressor = this.ctx.createDynamicsCompressor();
        this.masterCompressor.threshold.setValueAtTime(-16, this.ctx.currentTime);
        this.masterCompressor.knee.setValueAtTime(10, this.ctx.currentTime);
        this.masterCompressor.ratio.setValueAtTime(4, this.ctx.currentTime);
        this.masterCompressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.masterCompressor.release.setValueAtTime(0.22, this.ctx.currentTime);

        // Chain: Inputs -> masterGain -> waveshaper -> compressor -> destination
        this.masterGain.connect(this.masterWaveshaper);
        this.masterWaveshaper.connect(this.masterCompressor);
        this.masterCompressor.connect(this.ctx.destination);
      }

      return { ctx: this.ctx, masterOut: this.masterGain };
    } catch {
      return null;
    }
  }

  /**
   * Cached high-definition white noise buffer for physical modeling, squelches, and textures.
   */
  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const bufferSize = ctx.sampleRate * 2.0; // 2 seconds
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  /**
   * 1. Presidential Mahogany Assembly Gavel Strike
   * Multi-layer: Sharp wood impact click + mahogany chamber formants + 42Hz floor sub-thump.
   */
  public playGavel() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Layer 1: High-pass Wood Impact Transient
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.getNoiseBuffer(ctx);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2800, now);
    noiseFilter.Q.setValueAtTime(4.0, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterOut);
    noiseSource.start(now);
    noiseSource.stop(now + 0.02);

    // Layer 2: Dual Mahogany Hollow Chamber Formants (142Hz & 228Hz)
    [142, 228].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.35);

      gain.gain.setValueAtTime(0.55 - idx * 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(masterOut);
      osc.start(now);
      osc.stop(now + 0.4);
    });

    // Layer 3: Acoustic Floor Sub-Thump
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(75, now);
    subOsc.frequency.exponentialRampToValueAtTime(38, now + 0.4);

    subGain.gain.setValueAtTime(0.8, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    subOsc.connect(subGain);
    subGain.connect(masterOut);
    subOsc.start(now);
    subOsc.stop(now + 0.6);
  }

  /**
   * 2. Hollywood Action Trailer Braam & Energy Clash
   * Multi-layer: FM cyber laser slice + detuned low-brass supersaw chord + cinema sub-drop.
   */
  public playAttackSting() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Layer 1: FM Cyber Laser Slice Transient (Cutting high-end impact)
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const carrierGain = ctx.createGain();

    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(2400, now);
    carrier.frequency.exponentialRampToValueAtTime(180, now + 0.12);

    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(600, now);
    modulator.frequency.exponentialRampToValueAtTime(120, now + 0.12);

    modGain.gain.setValueAtTime(1400, now);
    modGain.gain.exponentialRampToValueAtTime(50, now + 0.12);

    carrierGain.gain.setValueAtTime(0.45, now);
    carrierGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(carrierGain);
    carrierGain.connect(masterOut);

    modulator.start(now);
    carrier.start(now);
    modulator.stop(now + 0.16);
    carrier.stop(now + 0.16);

    // Layer 2: Hollywood Low-Brass Trailer "BRAAM" (Detuned Supersaw Quad Chord)
    const braamNotes = [65.4, 98.0, 130.8, 164.8]; // C2, G2, C3, E3
    braamNotes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq * (1 + (idx % 2 === 0 ? 0.008 : -0.008)), now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.94, now + 0.8);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, now);
      filter.frequency.exponentialRampToValueAtTime(350, now + 0.85);
      filter.Q.setValueAtTime(3.5, now);

      gain.gain.setValueAtTime(0.32, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterOut);

      osc.start(now + 0.01);
      osc.stop(now + 0.95);
    });

    // Layer 3: Cinema Sub-Drop Shockwave
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(95, now + 0.05);
    subOsc.frequency.exponentialRampToValueAtTime(24, now + 0.85);

    subGain.gain.setValueAtTime(0.85, now + 0.05);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    subOsc.connect(subGain);
    subGain.connect(masterOut);
    subOsc.start(now + 0.05);
    subOsc.stop(now + 0.95);
  }

  /**
   * 3. Celestial Crystal Glass Chime
   * Multi-layer: Non-integer metallic chime overtones + Major 9th pad bloom + warm body anchor.
   */
  public playVoteRevealDing() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Layer 1: Inharmonic Metallic Chime Ratios (1046.5Hz, 2888Hz, 5651Hz, 9345Hz)
    const bellRatios = [1.0, 2.76, 5.4, 8.93];
    const baseFreq = 1046.5; // C6
    bellRatios.forEach((ratio, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * ratio, now);

      const amp = (0.28 / (idx + 1));
      gain.gain.setValueAtTime(amp, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (0.9 - idx * 0.15));

      osc.connect(gain);
      gain.connect(masterOut);
      osc.start(now);
      osc.stop(now + 0.95);
    });

    // Layer 2: Celestial Shimmering Major 9th Chord Bloom (C6, E6, G6, B6, D7)
    const chordFreqs = [1046.5, 1318.5, 1567.98, 1975.5, 2349.3];
    chordFreqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.025);

      gain.gain.setValueAtTime(0.001, now + idx * 0.025);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.025 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.025 + 1.2);

      osc.connect(gain);
      gain.connect(masterOut);
      osc.start(now + idx * 0.025);
      osc.stop(now + idx * 0.025 + 1.25);
    });

    // Layer 3: Warm Acoustic Foundation
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(155, now);
    subGain.gain.setValueAtTime(0.25, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    subOsc.connect(subGain);
    subGain.connect(masterOut);
    subOsc.start(now);
    subOsc.stop(now + 0.55);
  }

  /**
   * 4. Digital EMP Shutdown & Heavy Reality Doom
   * Multi-layer: Electrical glitch spark + resonant power-down plunge + 35Hz doom sub-drop.
   */
  public playEliminationBuzzer() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Layer 1: Digital EMP Electrical Glitch Burst
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.getNoiseBuffer(ctx);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(4200, now);

    const glitchGain = ctx.createGain();
    glitchGain.gain.setValueAtTime(0.65, now);
    glitchGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(glitchGain);
    glitchGain.connect(masterOut);
    noiseSource.start(now);
    noiseSource.stop(now + 0.09);

    // Layer 2: Power-Down Pitch Collapse (Resonant Sawtooth Dive)
    const sawOsc = ctx.createOscillator();
    const sawFilter = ctx.createBiquadFilter();
    const sawGain = ctx.createGain();

    sawOsc.type = 'sawtooth';
    sawOsc.frequency.setValueAtTime(220, now);
    sawOsc.frequency.exponentialRampToValueAtTime(28, now + 0.75);

    sawFilter.type = 'lowpass';
    sawFilter.frequency.setValueAtTime(1800, now);
    sawFilter.frequency.exponentialRampToValueAtTime(120, now + 0.75);
    sawFilter.Q.setValueAtTime(5.5, now);

    sawGain.gain.setValueAtTime(0.55, now);
    sawGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    sawOsc.connect(sawFilter);
    sawFilter.connect(sawGain);
    sawGain.connect(masterOut);
    sawOsc.start(now);
    sawOsc.stop(now + 0.9);

    // Layer 3: Cinema Sub Doom Drop (Heavy Floor Impact)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(80, now + 0.05);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 1.2);

    subGain.gain.setValueAtTime(0.9, now + 0.05);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    subOsc.connect(subGain);
    subGain.connect(masterOut);
    subOsc.start(now + 0.05);
    subOsc.stop(now + 1.45);
  }

  /**
   * 5. Classified Intelligence Wiretap & CRT Monitor Blip
   * Multi-layer: Tactical radio squelch static + dual CRT flyback chirp + optical lens tick.
   */
  public playCCTVBeep() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Layer 1: Tactical Radio Squelch Static Burst
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.getNoiseBuffer(ctx);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(3400, now);
    noiseFilter.Q.setValueAtTime(3.5, now);

    const squelchGain = ctx.createGain();
    squelchGain.gain.setValueAtTime(0.35, now);
    squelchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(squelchGain);
    squelchGain.connect(masterOut);
    noiseSource.start(now);
    noiseSource.stop(now + 0.03);

    // Layer 2: Dual CRT Flyback Chirp (1850Hz & 2650Hz)
    [1850, 2650].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.01);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.65, now + idx * 0.01 + 0.045);

      gain.gain.setValueAtTime(0.2, now + idx * 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.01 + 0.05);

      osc.connect(gain);
      gain.connect(masterOut);
      osc.start(now + idx * 0.01);
      osc.stop(now + idx * 0.01 + 0.055);
    });

    // Layer 3: 60Hz Ground Loop Line Hum Pulse
    const humOsc = ctx.createOscillator();
    const humGain = ctx.createGain();
    humOsc.type = 'sine';
    humOsc.frequency.setValueAtTime(60, now);
    humGain.gain.setValueAtTime(0.18, now);
    humGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    humOsc.connect(humGain);
    humGain.connect(masterOut);
    humOsc.start(now);
    humOsc.stop(now + 0.07);
  }

  /**
   * 6. Psycho Thriller Horror Sting (Bernard Herrmann Microtonal Cluster)
   * Multi-layer: Microtonal screech cluster (C#6/D6/G6/G#6) + metallic blade strike + abyss sub-drop.
   */
  public playBetrayalStab() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Layer 1: Microtonal Screeching Cluster (C#6 [1108Hz], D6 [1174Hz], G6 [1567Hz], G#6 [1661Hz])
    const clusterFreqs = [1108.7, 1174.6, 1567.98, 1661.2];
    clusterFreqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.88, now + 0.6);

      // 12Hz Shiver Pitch Jitter LFO
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(12 + idx * 2, now);
      lfoGain.gain.setValueAtTime(18, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc.connect(gain);
      gain.connect(masterOut);

      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 0.7);
      osc.stop(now + 0.7);
    });

    // Layer 2: Metallic Blade Strike Clash Transient
    const bladeOsc = ctx.createOscillator();
    const bladeGain = ctx.createGain();
    bladeOsc.type = 'square';
    bladeOsc.frequency.setValueAtTime(3200, now);
    bladeOsc.frequency.exponentialRampToValueAtTime(450, now + 0.08);

    bladeGain.gain.setValueAtTime(0.4, now);
    bladeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    bladeOsc.connect(bladeGain);
    bladeGain.connect(masterOut);
    bladeOsc.start(now);
    bladeOsc.stop(now + 0.1);

    // Layer 3: Abyss Sub-Drop & Panic Heart-Drop
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(75, now);
    subOsc.frequency.exponentialRampToValueAtTime(22, now + 0.8);

    subGain.gain.setValueAtTime(0.85, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    subOsc.connect(subGain);
    subGain.connect(masterOut);
    subOsc.start(now);
    subOsc.stop(now + 0.9);
  }

  /**
   * 7. Tactical Breach Klaxon Siren (Crimson Alarm)
   * Multi-layer: Devil's interval sweeping tritone siren (440Hz <-> 622Hz) + industrial distortion.
   */
  public playBetrayalAlarm() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Layer 1: Sweeping Tritone Siren (A4 [440Hz] <-> D#5 [622Hz])
    const freqs = [440, 622.25];
    freqs.forEach(f => {
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);

      // 8Hz Triangle Modulation
      lfo.type = 'triangle';
      lfo.frequency.setValueAtTime(8, now);
      lfoGain.gain.setValueAtTime(90, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.Q.setValueAtTime(2.5, now);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterOut);

      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 0.5);
      osc.stop(now + 0.5);
    });

    // Layer 2: Synchronized Rhythmic Heartbeat Thump
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(55, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

    subGain.gain.setValueAtTime(0.65, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    subOsc.connect(subGain);
    subGain.connect(masterOut);
    subOsc.start(now);
    subOsc.stop(now + 0.35);
  }

  /**
   * 8. Diplomatic Parchment & Heavy Iron Stamp (Ballot Drop)
   * Multi-layer: Textured paper unseal friction + mechanical iron stamp slam + 52Hz box resonance.
   */
  public playBallotDrop() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Layer 1: Parchment Friction Noise Impulse
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.getNoiseBuffer(ctx);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2800, now);
    noiseFilter.Q.setValueAtTime(3.0, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.45, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterOut);
    noiseSource.start(now);
    noiseSource.stop(now + 0.025);

    // Layer 2: Iron Stamp Mechanical Slam (260Hz -> 75Hz punch)
    const punchOsc = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punchOsc.type = 'triangle';
    punchOsc.frequency.setValueAtTime(260, now);
    punchOsc.frequency.exponentialRampToValueAtTime(75, now + 0.08);

    punchGain.gain.setValueAtTime(0.7, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    punchOsc.connect(punchGain);
    punchGain.connect(masterOut);
    punchOsc.start(now);
    punchOsc.stop(now + 0.1);

    // Layer 3: Mahogany Ballot Box Resonator (52Hz Sub Thud)
    const boxOsc = ctx.createOscillator();
    const boxGain = ctx.createGain();
    boxOsc.type = 'sine';
    boxOsc.frequency.setValueAtTime(52, now);
    boxGain.gain.setValueAtTime(0.75, now);
    boxGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    boxOsc.connect(boxGain);
    boxGain.connect(masterOut);
    boxOsc.start(now);
    boxOsc.stop(now + 0.25);
  }

  /**
   * 9. Golden Treasury Mint & Casino Bailout Cascade (Cash Chime)
   * Multi-layer: 5-coin staggered cascade + golden ratio bell bloom (1.0 : 2.76 : 5.4) + vault lock click.
   */
  public playCashChime() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Layer 1: 5-Coin Solid Gold Staggered Cascade
    const coinTimes = [0.00, 0.022, 0.050, 0.085, 0.125];
    const coinFreqs = [2200, 3100, 4400, 5800, 7200];

    coinTimes.forEach((timeOffset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(coinFreqs[idx], now + timeOffset);
      osc.frequency.exponentialRampToValueAtTime(coinFreqs[idx] * 0.95, now + timeOffset + 0.12);

      gain.gain.setValueAtTime(0.22, now + timeOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.14);

      osc.connect(gain);
      gain.connect(masterOut);
      osc.start(now + timeOffset);
      osc.stop(now + timeOffset + 0.15);
    });

    // Layer 2: Golden Ratio Metallic Bell Bloom (1.0 : 2.76 : 5.4)
    const bellRatios = [1.0, 2.76, 5.4];
    const fundamental = 1567.98; // G6
    bellRatios.forEach((r, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(fundamental * r, now + 0.12);

      gain.gain.setValueAtTime(0.25 / (idx + 1), now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12 + 1.2);

      osc.connect(gain);
      gain.connect(masterOut);
      osc.start(now + 0.12);
      osc.stop(now + 0.12 + 1.25);
    });

    // Layer 3: Vault Lock Mechanism Snap Click
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(320, now + 0.12);
    clickOsc.frequency.exponentialRampToValueAtTime(90, now + 0.15);

    clickGain.gain.setValueAtTime(0.4, now + 0.12);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    clickOsc.connect(clickGain);
    clickGain.connect(masterOut);
    clickOsc.start(now + 0.12);
    clickOsc.stop(now + 0.17);
  }

  /**
   * 10. Cinema Air-Displacement Doppler Swoosh (Swap Whoosh)
   * Multi-layer: Swept aerodynamic bandpass noise + tonal air-cutter pitch curve + 3D stereo panner.
   */
  public playSwapWhoosh() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Layer 1: Aerodynamic Swept Bandpass White Noise
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.getNoiseBuffer(ctx);

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(180, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(3800, now + 0.12);
    noiseFilter.frequency.exponentialRampToValueAtTime(280, now + 0.28);
    noiseFilter.Q.setValueAtTime(4.0, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.01, now);
    noiseGain.gain.linearRampToValueAtTime(0.45, now + 0.12);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    // 3D Stereo Panner Sweep (Left -0.85 -> Right +0.85)
    let panner: StereoPannerNode | null = null;
    if (typeof (ctx as any).createStereoPanner === 'function') {
      panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(-0.85, now);
      panner.pan.linearRampToValueAtTime(0.85, now + 0.28);
    }

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    if (panner) {
      noiseGain.connect(panner);
      panner.connect(masterOut);
    } else {
      noiseGain.connect(masterOut);
    }

    noiseSource.start(now);
    noiseSource.stop(now + 0.32);

    // Layer 2: Tonal Air-Blade Pitch Curve
    const toneOsc = ctx.createOscillator();
    const toneGain = ctx.createGain();
    toneOsc.type = 'sine';
    toneOsc.frequency.setValueAtTime(220, now);
    toneOsc.frequency.exponentialRampToValueAtTime(680, now + 0.12);
    toneOsc.frequency.exponentialRampToValueAtTime(140, now + 0.28);

    toneGain.gain.setValueAtTime(0.01, now);
    toneGain.gain.linearRampToValueAtTime(0.25, now + 0.12);
    toneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.29);

    toneOsc.connect(toneGain);
    toneGain.connect(masterOut);
    toneOsc.start(now);
    toneOsc.stop(now + 0.31);
  }

  /**
   * 11. Broadcast Studio Mic Activation Cue (Speech Beep)
   * Multi-layer: Pure 880Hz (A5) studio fundamental with raised-cosine anti-click envelope + 2640Hz harmonic sheen.
   */
  public playSpeechBeep() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Layer 1: Studio Fundamental Sine (880Hz A5)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);

    // Raised-cosine envelope: 8ms soft attack, 85ms decay
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(masterOut);
    osc.start(now);
    osc.stop(now + 0.1);

    // Layer 2: High-register Sheen (2640Hz E7 at -22dB)
    const overtone = ctx.createOscillator();
    const overGain = ctx.createGain();
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(2640, now);

    overGain.gain.setValueAtTime(0.001, now);
    overGain.gain.linearRampToValueAtTime(0.035, now + 0.008);
    overGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    overtone.connect(overGain);
    overGain.connect(masterOut);
    overtone.start(now);
    overtone.stop(now + 0.09);
  }

  /**
   * 12. Grand Presidential Inauguration Brass Symphony (Fanfare)
   * Multi-layer: 6-voice polyphonic brass section (trumpets/horns) + 4-chord C Major progression + 45Hz timpani boom.
   */
  public playFanfare() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // 4-Chord Triumphant Presidential Progression:
    // Call: G4 (0.0s) -> C5 (0.18s) -> E5 (0.36s)
    // Chord 1 (I - C Major): 0.54s [C3, G3, C4, E4, G4, C5]
    // Chord 2 (IV - F Major): 1.05s [F3, A3, C4, F4, A4, F5]
    // Chord 3 (V - G Major): 1.55s [G3, B3, D4, G4, B4, G5]
    // Chord 4 (Grand I - C Royal): 2.10s [C3, G3, E4, G4, C5, E5, G5, C6] sustained 2.4s

    const chords = [
      { time: 0.54, dur: 0.45, notes: [130.8, 196.0, 261.6, 329.6, 392.0, 523.2] },
      { time: 1.05, dur: 0.45, notes: [174.6, 220.0, 261.6, 349.2, 440.0, 698.4] },
      { time: 1.55, dur: 0.50, notes: [196.0, 246.9, 293.7, 392.0, 493.9, 784.0] },
      { time: 2.10, dur: 2.20, notes: [130.8, 196.0, 329.6, 392.0, 523.2, 659.2, 783.9, 1046.5] },
    ];

    // Opening Trumpet Fanfare Call
    const callNotes = [
      { f: 392.0, t: 0.00, d: 0.16 }, // G4
      { f: 523.25, t: 0.18, d: 0.16 }, // C5
      { f: 659.25, t: 0.36, d: 0.16 }, // E5
    ];

    callNotes.forEach(n => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.f, now + n.t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2800, now + n.t);
      filter.frequency.exponentialRampToValueAtTime(1200, now + n.t + n.d);

      gain.gain.setValueAtTime(0.001, now + n.t);
      gain.gain.linearRampToValueAtTime(0.28, now + n.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterOut);

      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.05);
    });

    // Polyphonic Brass Chord Voicings
    chords.forEach(c => {
      c.notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = idx < 2 ? 'sawtooth' : 'triangle';
        // Subtle detuning for lush orchestral ensemble width
        const detune = (idx % 2 === 0 ? 0.006 : -0.006);
        osc.frequency.setValueAtTime(freq * (1 + detune), now + c.time);

        // Brass Lip-Pressure Dynamic Filter Sweep
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, now + c.time);
        filter.frequency.linearRampToValueAtTime(3600, now + c.time + 0.06);
        filter.frequency.exponentialRampToValueAtTime(1600, now + c.time + c.dur);

        const amp = (0.24 / Math.sqrt(c.notes.length));
        gain.gain.setValueAtTime(0.001, now + c.time);
        gain.gain.linearRampToValueAtTime(amp, now + c.time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + c.time + c.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterOut);

        osc.start(now + c.time);
        osc.stop(now + c.time + c.dur + 0.08);
      });

      // Orchestral Timpani Drum Boom on Grand Cadences
      const drumOsc = ctx.createOscillator();
      const drumGain = ctx.createGain();
      drumOsc.type = 'sine';
      drumOsc.frequency.setValueAtTime(90, now + c.time);
      drumOsc.frequency.exponentialRampToValueAtTime(42, now + c.time + 0.35);

      drumGain.gain.setValueAtTime(0.75, now + c.time);
      drumGain.gain.exponentialRampToValueAtTime(0.001, now + c.time + 0.45);

      drumOsc.connect(drumGain);
      drumGain.connect(masterOut);
      drumOsc.start(now + c.time);
      drumOsc.stop(now + c.time + 0.5);
    });
  }
}

export const sounds = new SoundManager();
