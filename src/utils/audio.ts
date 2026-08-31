/**
 * Velvety, Warm & Cinematic YouTube Video Sound Design Engine
 * Republic of Valoria - Presidential Battle Engine
 * 100% self-contained procedural audio, zero external asset dependencies.
 * Specially engineered for luxury YouTube video motion graphics & documentaries (Vox, Lemmino style).
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private noiseBuffer: AudioBuffer | null = null;
  private masterGain: GainNode | null = null;
  private masterWarmthFilter: BiquadFilterNode | null = null;
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
      if (!this.masterGain || !this.masterCompressor || !this.masterWaveshaper || !this.masterWarmthFilter) {
        this.masterGain = this.ctx.createGain();
        // Controlled master gain for velvety background mix levels
        this.masterGain.gain.setValueAtTime(0.65, this.ctx.currentTime);

        // Master Warmth Lowpass Filter (Rolls off all harsh digital frequencies > 3.8kHz)
        this.masterWarmthFilter = this.ctx.createBiquadFilter();
        this.masterWarmthFilter.type = 'lowpass';
        this.masterWarmthFilter.frequency.setValueAtTime(3800, this.ctx.currentTime);
        this.masterWarmthFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

        // Warm Analog Soft-Knee Waveshaper (Gentle Sigmoid Tube Saturation for deep low-end warmth)
        this.masterWaveshaper = this.ctx.createWaveShaper();
        const curveSamples = 1024;
        const curve = new Float32Array(curveSamples);
        const k = 1.15; // Gentle warm saturation
        for (let i = 0; i < curveSamples; i++) {
          const x = (i * 2) / curveSamples - 1;
          curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
        }
        this.masterWaveshaper.curve = curve;
        this.masterWaveshaper.oversample = '2x';

        // Gentle Studio Mastering Compressor (Smooth dynamics, no harsh clipping)
        this.masterCompressor = this.ctx.createDynamicsCompressor();
        this.masterCompressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
        this.masterCompressor.knee.setValueAtTime(12, this.ctx.currentTime);
        this.masterCompressor.ratio.setValueAtTime(3.0, this.ctx.currentTime);
        this.masterCompressor.attack.setValueAtTime(0.012, this.ctx.currentTime);
        this.masterCompressor.release.setValueAtTime(0.25, this.ctx.currentTime);

        // Chain: Inputs -> masterGain -> masterWarmthFilter -> waveshaper -> compressor -> destination
        this.masterGain.connect(this.masterWarmthFilter);
        this.masterWarmthFilter.connect(this.masterWaveshaper);
        this.masterWaveshaper.connect(this.masterCompressor);
        this.masterCompressor.connect(this.ctx.destination);
      }

      return { ctx: this.ctx, masterOut: this.masterGain };
    } catch {
      return null;
    }
  }

  /**
   * Cached smooth low-passed noise buffer for organic tactile textures.
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
   * 1. Muffled Mahogany Wood Block / Assembly Thud (Gavel)
   * Warm, deep, rounded wooden knock with rich 42Hz floor sub-thump. Zero harsh crackle.
   */
  public playGavel() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Layer 1: Warm Wood Knock Body (95Hz Triangle through 350Hz steep lowpass)
    const bodyOsc = ctx.createOscillator();
    const bodyFilter = ctx.createBiquadFilter();
    const bodyGain = ctx.createGain();

    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(115, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(75, now + 0.22);

    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(350, now);
    bodyFilter.Q.setValueAtTime(1.5, now);

    bodyGain.gain.setValueAtTime(0.001, now);
    bodyGain.gain.linearRampToValueAtTime(0.65, now + 0.008);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    bodyOsc.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(masterOut);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.3);

    // Layer 2: Deep 42Hz Cinematic Floor Sub-Thump
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(65, now);
    subOsc.frequency.exponentialRampToValueAtTime(38, now + 0.35);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.75, now + 0.01);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    subOsc.connect(subGain);
    subGain.connect(masterOut);
    subOsc.start(now);
    subOsc.stop(now + 0.5);
  }

  /**
   * 2. Cinematic Bass Drop & Dark Trailer Swell (Attack Sting)
   * Dark, velvety, warm trailer braam & 808 sub drop. Zero piercing lasers.
   */
  public playAttackSting() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Layer 1: Warm Detuned Low-Brass Swell (C2 [65Hz] & G2 [98Hz] through 420Hz lowpass)
    [65.4, 98.0, 130.8].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq * (1 + (idx === 1 ? 0.006 : -0.006)), now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.95, now + 0.7);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, now);
      filter.frequency.exponentialRampToValueAtTime(180, now + 0.7);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.35 - idx * 0.08, now + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterOut);

      osc.start(now);
      osc.stop(now + 0.8);
    });

    // Layer 2: 808-Style Cinematic Sub-Bass Drop (85Hz -> 28Hz with smooth decay)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(85, now + 0.02);
    subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.85);

    subGain.gain.setValueAtTime(0.001, now + 0.02);
    subGain.gain.linearRampToValueAtTime(0.85, now + 0.05);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    subOsc.connect(subGain);
    subGain.connect(masterOut);
    subOsc.start(now + 0.02);
    subOsc.stop(now + 0.95);
  }

  /**
   * 3. Warm Ethereal Glass / Rhodes Chime (Vote Reveal Ding)
   * Soft, dreamy, round crystal chime (Apple UI / luxury motion graphic style). Zero piercing highs.
   */
  public playVoteRevealDing() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Pure warm sine triad (C6 [1046Hz], E6 [1318Hz], G6 [1568Hz]) through 2.4kHz lowpass
    const chord = [1046.5, 1318.5, 1567.98];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.025);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, now);

      gain.gain.setValueAtTime(0.001, now + idx * 0.025);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.025 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.025 + 0.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterOut);

      osc.start(now + idx * 0.025);
      osc.stop(now + idx * 0.025 + 0.85);
    });

    // Warm Rhodes-Style Body Undertone
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(140, now);
    bodyGain.gain.setValueAtTime(0.001, now);
    bodyGain.gain.linearRampToValueAtTime(0.2, now + 0.015);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(masterOut);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.5);
  }

  /**
   * 4. Dark Cinematic Sub Boom & Tape Stop (Elimination Buzzer)
   * Deep 38Hz reality-show sub boom + smooth tape-stop pitch dive. Zero harsh glitch.
   */
  public playEliminationBuzzer() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Layer 1: Filtered Tape-Stop Drop (160Hz -> 30Hz through 280Hz lowpass)
    const tapeOsc = ctx.createOscillator();
    const tapeFilter = ctx.createBiquadFilter();
    const tapeGain = ctx.createGain();

    tapeOsc.type = 'triangle';
    tapeOsc.frequency.setValueAtTime(160, now);
    tapeOsc.frequency.exponentialRampToValueAtTime(30, now + 0.65);

    tapeFilter.type = 'lowpass';
    tapeFilter.frequency.setValueAtTime(280, now);
    tapeFilter.frequency.exponentialRampToValueAtTime(80, now + 0.65);

    tapeGain.gain.setValueAtTime(0.001, now);
    tapeGain.gain.linearRampToValueAtTime(0.45, now + 0.02);
    tapeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    tapeOsc.connect(tapeFilter);
    tapeFilter.connect(tapeGain);
    tapeGain.connect(masterOut);
    tapeOsc.start(now);
    tapeOsc.stop(now + 0.8);

    // Layer 2: Deep 38Hz Cinematic Reality Sub Boom
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(70, now + 0.04);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 1.1);

    subGain.gain.setValueAtTime(0.001, now + 0.04);
    subGain.gain.linearRampToValueAtTime(0.85, now + 0.08);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    subOsc.connect(subGain);
    subGain.connect(masterOut);
    subOsc.start(now + 0.04);
    subOsc.stop(now + 1.25);
  }

  /**
   * 5. Muffled Tape Deck / Camera Shutter Click (CCTV Beep)
   * Tactile, quiet, authentic cassette tape click & soft optical blip (ASMR documentary style).
   */
  public playCCTVBeep() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Tactile Muffled Mechanical Click (Filtered at 1.4kHz, 12ms)
    const clickOsc = ctx.createOscillator();
    const clickFilter = ctx.createBiquadFilter();
    const clickGain = ctx.createGain();

    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(780, now);
    clickOsc.frequency.exponentialRampToValueAtTime(180, now + 0.035);

    clickFilter.type = 'lowpass';
    clickFilter.frequency.setValueAtTime(1400, now);

    clickGain.gain.setValueAtTime(0.001, now);
    clickGain.gain.linearRampToValueAtTime(0.12, now + 0.004);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    clickOsc.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(masterOut);
    clickOsc.start(now);
    clickOsc.stop(now + 0.05);

    // Warm Lowline Hum Pulse (60Hz, 40ms)
    const humOsc = ctx.createOscillator();
    const humGain = ctx.createGain();
    humOsc.type = 'sine';
    humOsc.frequency.setValueAtTime(60, now);
    humGain.gain.setValueAtTime(0.08, now);
    humGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    humOsc.connect(humGain);
    humGain.connect(masterOut);
    humOsc.start(now);
    humOsc.stop(now + 0.06);
  }

  /**
   * 6. Dark Cello Swell & Low Ominous Drone (Betrayal Stab)
   * Deep D Minor chord swell (D2, A2, F3) through 380Hz lowpass + deep 50Hz sub tremor. No high screech.
   */
  public playBetrayalStab() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Dark D Minor Low String Swell (D2 [73.4Hz], A2 [110Hz], F3 [174.6Hz])
    const chord = [73.4, 110.0, 174.6];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq * (1 + (idx === 1 ? 0.004 : -0.004)), now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.96, now + 0.7);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.32 - idx * 0.06, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterOut);

      osc.start(now);
      osc.stop(now + 0.8);
    });

    // Deep Sub Tremor (50Hz -> 22Hz)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(55, now);
    subOsc.frequency.exponentialRampToValueAtTime(22, now + 0.8);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.75, now + 0.03);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    subOsc.connect(subGain);
    subGain.connect(masterOut);
    subOsc.start(now);
    subOsc.stop(now + 0.9);
  }

  /**
   * 7. Tactical Muffled Sonar Ping (Betrayal Alarm)
   * Smooth, rhythmic 520Hz sine ping with synchronized 45Hz gentle heartbeat thud.
   */
  public playBetrayalAlarm() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Smooth Sonar Ping (520Hz with 15ms soft attack)
    const pingOsc = ctx.createOscillator();
    const pingFilter = ctx.createBiquadFilter();
    const pingGain = ctx.createGain();

    pingOsc.type = 'sine';
    pingOsc.frequency.setValueAtTime(520, now);
    pingOsc.frequency.exponentialRampToValueAtTime(380, now + 0.28);

    pingFilter.type = 'lowpass';
    pingFilter.frequency.setValueAtTime(1200, now);

    pingGain.gain.setValueAtTime(0.001, now);
    pingGain.gain.linearRampToValueAtTime(0.24, now + 0.015);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    pingOsc.connect(pingFilter);
    pingFilter.connect(pingGain);
    pingGain.connect(masterOut);
    pingOsc.start(now);
    pingOsc.stop(now + 0.35);

    // Subtle 45Hz Heartbeat Sub-Pulse
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(45, now);
    subGain.gain.setValueAtTime(0.45, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    subOsc.connect(subGain);
    subGain.connect(masterOut);
    subOsc.start(now);
    subOsc.stop(now + 0.25);
  }

  /**
   * 8. Tactile Card / Paper Plop (Ballot Drop)
   * Tactile ASMR-style thick paper card placement / soft leather stamp plop.
   */
  public playBallotDrop() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Mechanical Card Plop (140Hz -> 60Hz triangle with 45ms decay)
    const plopOsc = ctx.createOscillator();
    const plopFilter = ctx.createBiquadFilter();
    const plopGain = ctx.createGain();

    plopOsc.type = 'triangle';
    plopOsc.frequency.setValueAtTime(140, now);
    plopOsc.frequency.exponentialRampToValueAtTime(60, now + 0.06);

    plopFilter.type = 'lowpass';
    plopFilter.frequency.setValueAtTime(450, now);

    plopGain.gain.setValueAtTime(0.001, now);
    plopGain.gain.linearRampToValueAtTime(0.55, now + 0.006);
    plopGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    plopOsc.connect(plopFilter);
    plopFilter.connect(plopGain);
    plopGain.connect(masterOut);
    plopOsc.start(now);
    plopOsc.stop(now + 0.09);

    // Subtle 48Hz Box Bottom Resonator
    const boxOsc = ctx.createOscillator();
    const boxGain = ctx.createGain();
    boxOsc.type = 'sine';
    boxOsc.frequency.setValueAtTime(48, now);
    boxGain.gain.setValueAtTime(0.45, now);
    boxGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    boxOsc.connect(boxGain);
    boxGain.connect(masterOut);
    boxOsc.start(now);
    boxOsc.stop(now + 0.18);
  }

  /**
   * 9. Delicate Luxury Gold Chime (Cash Chime)
   * Soft staggered sine taps (1.8k, 2.4k, 3.2k) with golden ratio shimmer & 2.8kHz lowpass warmth.
   */
  public playCashChime() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Staggered Warm Coin Taps (Filtered at 2.8kHz)
    const coinTimes = [0.00, 0.035, 0.075];
    const coinFreqs = [1800, 2400, 3100];

    coinTimes.forEach((t, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(coinFreqs[idx], now + t);
      osc.frequency.exponentialRampToValueAtTime(coinFreqs[idx] * 0.96, now + t + 0.15);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2800, now);

      gain.gain.setValueAtTime(0.001, now + t);
      gain.gain.linearRampToValueAtTime(0.16, now + t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.18);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterOut);
      osc.start(now + t);
      osc.stop(now + t + 0.2);
    });

    // Warm Velvet Bell Bloom (1.5kHz with long soft decay)
    const bellOsc = ctx.createOscillator();
    const bellFilter = ctx.createBiquadFilter();
    const bellGain = ctx.createGain();

    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(1567.98, now + 0.07); // G6

    bellFilter.type = 'lowpass';
    bellFilter.frequency.setValueAtTime(2400, now);

    bellGain.gain.setValueAtTime(0.001, now + 0.07);
    bellGain.gain.linearRampToValueAtTime(0.18, now + 0.07 + 0.02);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07 + 0.85);

    bellOsc.connect(bellFilter);
    bellFilter.connect(bellGain);
    bellGain.connect(masterOut);
    bellOsc.start(now + 0.07);
    bellOsc.stop(now + 0.95);
  }

  /**
   * 10. Velvety Smooth Bass Whoosh (Swap Whoosh)
   * Low-frequency air displacement swept 120Hz -> 950Hz -> 160Hz + 65Hz sub whoosh with stereo pan.
   */
  public playSwapWhoosh() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Layer 1: Smooth Aerodynamic Noise Sweep (120Hz -> 950Hz -> 160Hz)
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.getNoiseBuffer(ctx);

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(120, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(950, now + 0.12);
    noiseFilter.frequency.exponentialRampToValueAtTime(160, now + 0.28);
    noiseFilter.Q.setValueAtTime(2.0, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.35, now + 0.12);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    // Smooth Stereo Panning Sweep
    let panner: StereoPannerNode | null = null;
    if (typeof (ctx as any).createStereoPanner === 'function') {
      panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(-0.65, now);
      panner.pan.linearRampToValueAtTime(0.65, now + 0.28);
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

    // Layer 2: 65Hz Sub-Bass Whoosh Body
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(80, now);
    subOsc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
    subOsc.frequency.exponentialRampToValueAtTime(50, now + 0.28);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.45, now + 0.12);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    subOsc.connect(subGain);
    subGain.connect(masterOut);
    subOsc.start(now);
    subOsc.stop(now + 0.32);
  }

  /**
   * 11. Subtle UI Pop / Studio Cue (Speech Beep)
   * Understated, soft organic 540Hz warm wooden UI bubble at low gain (0.05).
   */
  public playSpeechBeep() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.06);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterOut);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * 12. Majestic French Horn & Warm Brass Swell (Fanfare)
   * Warm Hans Zimmer style French horn chords filtered at 750Hz + 42Hz timpani drum booms.
   */
  public playFanfare() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Warm French Horn Chords in C Major:
    // Chord 1 (C Major): [130.8Hz, 196.0Hz, 261.6Hz, 329.6Hz]
    // Chord 2 (F Major): [174.6Hz, 220.0Hz, 261.6Hz, 349.2Hz]
    // Chord 3 (G Major): [196.0Hz, 246.9Hz, 293.7Hz, 392.0Hz]
    // Chord 4 (Grand C): [130.8Hz, 196.0Hz, 261.6Hz, 329.6Hz, 523.2Hz] sustained 2.0s
    const chords = [
      { time: 0.00, dur: 0.55, notes: [130.8, 196.0, 261.6, 329.6] },
      { time: 0.60, dur: 0.55, notes: [174.6, 220.0, 261.6, 349.2] },
      { time: 1.20, dur: 0.60, notes: [196.0, 246.9, 293.7, 392.0] },
      { time: 1.85, dur: 1.90, notes: [130.8, 196.0, 261.6, 329.6, 523.2] },
    ];

    chords.forEach(c => {
      c.notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = idx === 0 ? 'sine' : 'triangle';
        const detune = (idx % 2 === 0 ? 0.004 : -0.004);
        osc.frequency.setValueAtTime(freq * (1 + detune), now + c.time);

        // Warm French Horn Filter Sweep (Filtered at 750Hz)
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now + c.time);
        filter.frequency.linearRampToValueAtTime(750, now + c.time + 0.08);
        filter.frequency.exponentialRampToValueAtTime(320, now + c.time + c.dur);

        const amp = (0.22 / Math.sqrt(c.notes.length));
        gain.gain.setValueAtTime(0.001, now + c.time);
        gain.gain.linearRampToValueAtTime(amp, now + c.time + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + c.time + c.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterOut);

        osc.start(now + c.time);
        osc.stop(now + c.time + c.dur + 0.1);
      });

      // Warm 42Hz Orchestral Timpani Drum Boom
      const drumOsc = ctx.createOscillator();
      const drumGain = ctx.createGain();
      drumOsc.type = 'sine';
      drumOsc.frequency.setValueAtTime(80, now + c.time);
      drumOsc.frequency.exponentialRampToValueAtTime(38, now + c.time + 0.35);

      drumGain.gain.setValueAtTime(0.55, now + c.time);
      drumGain.gain.exponentialRampToValueAtTime(0.001, now + c.time + 0.45);

      drumOsc.connect(drumGain);
      drumGain.connect(masterOut);
      drumOsc.start(now + c.time);
      drumOsc.stop(now + c.time + 0.5);
    });
  }

  // =========================================================================
  // 20 NEW UNIQUE PRESIDENTIAL CHARACTER SOUND EFFECTS
  // =========================================================================

  /**
   * 1. Gov. Ray Callahan (THE BORDER GOVERNOR)
   * Heavy steel perimeter gate latch drop + desert wind sub boom (48Hz).
   */
  public playBorderGovernorHammerGate() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Steel Gate Latch Drop (180Hz -> 65Hz)
    const latchOsc = ctx.createOscillator();
    const latchFilter = ctx.createBiquadFilter();
    const latchGain = ctx.createGain();

    latchOsc.type = 'triangle';
    latchOsc.frequency.setValueAtTime(180, now);
    latchOsc.frequency.exponentialRampToValueAtTime(65, now + 0.08);

    latchFilter.type = 'lowpass';
    latchFilter.frequency.setValueAtTime(800, now);

    latchGain.gain.setValueAtTime(0.001, now);
    latchGain.gain.linearRampToValueAtTime(0.65, now + 0.006);
    latchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    latchOsc.connect(latchFilter);
    latchFilter.connect(latchGain);
    latchGain.connect(masterOut);
    latchOsc.start(now);
    latchOsc.stop(now + 0.14);

    // Deep Desert Perimeter Sub Thud (48Hz)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(58, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.35);

    subGain.gain.setValueAtTime(0.7, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    subOsc.connect(subGain);
    subGain.connect(masterOut);
    subOsc.start(now);
    subOsc.stop(now + 0.5);
  }

  /**
   * 2. Dr. Vivienne Chen (THE NEUROTECH VISIONARY)
   * Soft crystalline neural synapse ping with rotary delay (1.8kHz lowpass).
   */
  public playNeurotechSynapseChime() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    const synapseFreqs = [1760, 2217.46, 2637];
    synapseFreqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.03);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now);

      gain.gain.setValueAtTime(0.001, now + idx * 0.03);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.03 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.6);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterOut);
      osc.start(now + idx * 0.03);
      osc.stop(now + idx * 0.03 + 0.65);
    });
  }

  /**
   * 3. Prosecutor Sterling Archer (THE CARTEL CRUSADER)
   * Tactile steel handcuffs ratchet snap + courtroom oak bench knock (75Hz).
   */
  public playCartelProsecutorHandcuffSnap() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Handcuff Ratchet Clicks
    [0.0, 0.025, 0.05].forEach((offset) => {
      const clickOsc = ctx.createOscillator();
      const clickFilter = ctx.createBiquadFilter();
      const clickGain = ctx.createGain();

      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(950, now + offset);
      clickOsc.frequency.exponentialRampToValueAtTime(240, now + offset + 0.02);

      clickFilter.type = 'lowpass';
      clickFilter.frequency.setValueAtTime(1600, now + offset);

      clickGain.gain.setValueAtTime(0.35, now + offset);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.025);

      clickOsc.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(masterOut);
      clickOsc.start(now + offset);
      clickOsc.stop(now + offset + 0.03);
    });

    // Oak Bench Knock (75Hz)
    const benchOsc = ctx.createOscillator();
    const benchGain = ctx.createGain();
    benchOsc.type = 'sine';
    benchOsc.frequency.setValueAtTime(85, now + 0.06);
    benchOsc.frequency.exponentialRampToValueAtTime(45, now + 0.28);

    benchGain.gain.setValueAtTime(0.65, now + 0.06);
    benchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    benchOsc.connect(benchGain);
    benchGain.connect(masterOut);
    benchOsc.start(now + 0.06);
    benchOsc.stop(now + 0.4);
  }

  /**
   * 4. Pastor Elijah Vance (THE TELEVANGELIST)
   * Warm Hammond gospel drawbar organ swell with deep bass pedal (55Hz).
   */
  public playTelevangelistPipeOrganSwell() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Gospel Drawbar Chord (F Major: F3 [174Hz], A3 [220Hz], C4 [261Hz], F4 [349Hz])
    [174.6, 220.0, 261.6, 349.2].forEach((freq) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterOut);
      osc.start(now);
      osc.stop(now + 1.0);
    });

    // Deep Cathedral Bass Pedal (55Hz)
    const pedalOsc = ctx.createOscillator();
    const pedalGain = ctx.createGain();
    pedalOsc.type = 'sine';
    pedalOsc.frequency.setValueAtTime(55, now);
    pedalGain.gain.setValueAtTime(0.55, now);
    pedalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    pedalOsc.connect(pedalGain);
    pedalGain.connect(masterOut);
    pedalOsc.start(now);
    pedalOsc.stop(now + 0.9);
  }

  /**
   * 5. Kendra "The Shark" Sterling (THE DISTRESSED-DEBT QUEEN)
   * Heavy casino chip cascade + solid platinum bullion bar drop on felt.
   */
  public playDistressedDebtCashStack() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Ceramic Chip Taps (Filtered at 2.4kHz)
    [0.0, 0.03, 0.065, 0.1].forEach((offset, idx) => {
      const chipOsc = ctx.createOscillator();
      const chipFilter = ctx.createBiquadFilter();
      const chipGain = ctx.createGain();

      chipOsc.type = 'sine';
      chipOsc.frequency.setValueAtTime(1900 + idx * 250, now + offset);

      chipFilter.type = 'lowpass';
      chipFilter.frequency.setValueAtTime(2400, now + offset);

      chipGain.gain.setValueAtTime(0.18, now + offset);
      chipGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);

      chipOsc.connect(chipFilter);
      chipFilter.connect(chipGain);
      chipGain.connect(masterOut);
      chipOsc.start(now + offset);
      chipOsc.stop(now + offset + 0.09);
    });

    // Heavy Platinum Bar Felt Thud (140Hz -> 50Hz)
    const barOsc = ctx.createOscillator();
    const barGain = ctx.createGain();
    barOsc.type = 'triangle';
    barOsc.frequency.setValueAtTime(140, now + 0.08);
    barOsc.frequency.exponentialRampToValueAtTime(45, now + 0.28);

    barGain.gain.setValueAtTime(0.65, now + 0.08);
    barGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    barOsc.connect(barGain);
    barGain.connect(masterOut);
    barOsc.start(now + 0.08);
    barOsc.stop(now + 0.4);
  }

  /**
   * 6. Sheriff Colton "Colt" Briggs (THE RURAL SHERIFF)
   * Tactile brass boot spur jingle + deep shotgun rack slide and wooden porch thud (60Hz).
   */
  public playRuralSheriffBootSpur() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Brass Spur Jingle (1.6kHz triangle clinks)
    [0.0, 0.02, 0.04].forEach((offset, idx) => {
      const spurOsc = ctx.createOscillator();
      const spurFilter = ctx.createBiquadFilter();
      const spurGain = ctx.createGain();

      spurOsc.type = 'triangle';
      spurOsc.frequency.setValueAtTime(1450 + idx * 180, now + offset);

      spurFilter.type = 'lowpass';
      spurFilter.frequency.setValueAtTime(2000, now + offset);

      spurGain.gain.setValueAtTime(0.16, now + offset);
      spurGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.06);

      spurOsc.connect(spurFilter);
      spurFilter.connect(spurGain);
      spurGain.connect(masterOut);
      spurOsc.start(now + offset);
      spurOsc.stop(now + offset + 0.07);
    });

    // Wooden Porch Thud (60Hz)
    const porchOsc = ctx.createOscillator();
    const porchGain = ctx.createGain();
    porchOsc.type = 'sine';
    porchOsc.frequency.setValueAtTime(75, now + 0.05);
    porchOsc.frequency.exponentialRampToValueAtTime(40, now + 0.28);

    porchGain.gain.setValueAtTime(0.65, now + 0.05);
    porchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    porchOsc.connect(porchGain);
    porchGain.connect(masterOut);
    porchOsc.start(now + 0.05);
    porchOsc.stop(now + 0.4);
  }

  /**
   * 7. Ambassador Maya Lin (THE HOSTAGE NEGOTIATOR)
   * Titanium attache case latch snap + soft diplomat whisper tone.
   */
  public playNegotiatorSecretBriefcase() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Precision Titanium Snap
    const snapOsc = ctx.createOscillator();
    const snapFilter = ctx.createBiquadFilter();
    const snapGain = ctx.createGain();

    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(820, now);
    snapOsc.frequency.exponentialRampToValueAtTime(190, now + 0.03);

    snapFilter.type = 'lowpass';
    snapFilter.frequency.setValueAtTime(1400, now);

    snapGain.gain.setValueAtTime(0.35, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    snapOsc.connect(snapFilter);
    snapFilter.connect(snapGain);
    snapGain.connect(masterOut);
    snapOsc.start(now);
    snapOsc.stop(now + 0.05);

    // Diplomatic Room Harmony (Eb Major chord)
    [311.1, 392.0, 466.2].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + 0.02);

      gain.gain.setValueAtTime(0.001, now + 0.02);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc.connect(gain);
      gain.connect(masterOut);
      osc.start(now + 0.02);
      osc.stop(now + 0.7);
    });
  }

  /**
   * 8. Declan "Iron" Hayes (THE COAL RIDGE MAYOR)
   * Deep underground mine pickaxe strike on iron ore (130Hz -> 45Hz) with reverb.
   */
  public playCoalMayorPickaxeStrike() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Cast-Iron Strike Crack (240Hz -> 85Hz)
    const pickOsc = ctx.createOscillator();
    const pickFilter = ctx.createBiquadFilter();
    const pickGain = ctx.createGain();

    pickOsc.type = 'triangle';
    pickOsc.frequency.setValueAtTime(240, now);
    pickOsc.frequency.exponentialRampToValueAtTime(85, now + 0.09);

    pickFilter.type = 'lowpass';
    pickFilter.frequency.setValueAtTime(650, now);

    pickGain.gain.setValueAtTime(0.7, now);
    pickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    pickOsc.connect(pickFilter);
    pickFilter.connect(pickGain);
    pickGain.connect(masterOut);
    pickOsc.start(now);
    pickOsc.stop(now + 0.14);

    // Deep Mine Cave Sub Boom (45Hz)
    const caveOsc = ctx.createOscillator();
    const caveGain = ctx.createGain();
    caveOsc.type = 'sine';
    caveOsc.frequency.setValueAtTime(65, now + 0.02);
    caveOsc.frequency.exponentialRampToValueAtTime(36, now + 0.45);

    caveGain.gain.setValueAtTime(0.8, now + 0.02);
    caveGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    caveOsc.connect(caveGain);
    caveGain.connect(masterOut);
    caveOsc.start(now + 0.02);
    caveOsc.stop(now + 0.6);
  }

  /**
   * 9. Dr. Jonathan Sterling (THE BIG PHARMA CEO)
   * Medical glass vial clink + cleanroom airlock seal hum (1.4kHz).
   */
  public playBigPharmaVialClick() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Medical Glass Clink (1600Hz & 2200Hz sine tap)
    [1600, 2200].forEach((freq) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterOut);
      osc.start(now);
      osc.stop(now + 0.2);
    });

    // Airlock Pressurized Cleanroom Hum
    const airOsc = ctx.createOscillator();
    const airGain = ctx.createGain();
    airOsc.type = 'triangle';
    airOsc.frequency.setValueAtTime(110, now + 0.04);
    airOsc.frequency.exponentialRampToValueAtTime(70, now + 0.3);

    airGain.gain.setValueAtTime(0.35, now + 0.04);
    airGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    airOsc.connect(airGain);
    airGain.connect(masterOut);
    airOsc.start(now + 0.04);
    airOsc.stop(now + 0.4);
  }

  /**
   * 10. Tariq Al-Fassi (THE SOVEREIGN WEALTH ARBITRATOR)
   * Heavy Swiss bank vault door pneumatic decompression & slow turn (35Hz).
   */
  public playSovereignWealthVaultDoor() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Vault Decompression Pressure Hiss
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.getNoiseBuffer(ctx);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(450, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.35, now + 0.06);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterOut);
    noiseSource.start(now);
    noiseSource.stop(now + 0.32);

    // Deep Subterranean Vault Turn (35Hz)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(60, now + 0.04);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.55);

    subGain.gain.setValueAtTime(0.85, now + 0.04);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    subOsc.connect(subGain);
    subGain.connect(masterOut);
    subOsc.start(now + 0.04);
    subOsc.stop(now + 0.7);
  }

  /**
   * 11. Gia Moretti (THE VIRAL PODCASTER)
   * Studio mic mute toggle + digital audience notification pop (580Hz).
   */
  public playViralPodcasterLivestreamBeep() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Digital Notification Pop (580Hz -> 720Hz)
    const popOsc = ctx.createOscillator();
    const popGain = ctx.createGain();

    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(580, now);
    popOsc.frequency.exponentialRampToValueAtTime(720, now + 0.04);

    popGain.gain.setValueAtTime(0.001, now);
    popGain.gain.linearRampToValueAtTime(0.25, now + 0.008);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    popOsc.connect(popGain);
    popGain.connect(masterOut);
    popOsc.start(now);
    popOsc.stop(now + 0.09);
  }

  /**
   * 12. Colonel Arthur "Warhawk" Price (THE SPECIAL OPS COMMANDER)
   * Suppressed rifle bolt chambering click + tactical sub-bass impact (50Hz).
   */
  public playSpecialOpsRifleBolt() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Suppressed Bolt Double Click
    [0.0, 0.035].forEach((offset) => {
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(620, now + offset);
      clickOsc.frequency.exponentialRampToValueAtTime(140, now + offset + 0.025);

      clickGain.gain.setValueAtTime(0.4, now + offset);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.03);

      clickOsc.connect(clickGain);
      clickGain.connect(masterOut);
      clickOsc.start(now + offset);
      clickOsc.stop(now + offset + 0.035);
    });

    // Tactical Low Sub Punch (50Hz)
    const punchOsc = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punchOsc.type = 'sine';
    punchOsc.frequency.setValueAtTime(75, now + 0.04);
    punchOsc.frequency.exponentialRampToValueAtTime(32, now + 0.3);

    punchGain.gain.setValueAtTime(0.75, now + 0.04);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    punchOsc.connect(punchGain);
    punchGain.connect(masterOut);
    punchOsc.start(now + 0.04);
    punchOsc.stop(now + 0.4);
  }

  /**
   * 13. Senator Diana Ross (THE DEFICIT HAWK)
   * Rubber audit rejection stamp slam + mechanical adding machine lever pull.
   */
  public playDeficitHawkRedPenStamp() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Audit Rejection Stamp Thud (160Hz -> 60Hz)
    const stampOsc = ctx.createOscillator();
    const stampFilter = ctx.createBiquadFilter();
    const stampGain = ctx.createGain();

    stampOsc.type = 'triangle';
    stampOsc.frequency.setValueAtTime(160, now);
    stampOsc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

    stampFilter.type = 'lowpass';
    stampFilter.frequency.setValueAtTime(500, now);

    stampGain.gain.setValueAtTime(0.65, now);
    stampGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    stampOsc.connect(stampFilter);
    stampFilter.connect(stampGain);
    stampGain.connect(masterOut);
    stampOsc.start(now);
    stampOsc.stop(now + 0.14);
  }

  /**
   * 14. Baron Henrik Von Falken (THE ENERGY DYNAST)
   * Velvet chamber string plucking (C Minor) + grandfather clock chime.
   */
  public playEnergyDynastHarpsichordChime() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Chamber String Pluck (C Minor: C3 [130.8Hz], Eb3 [155.5Hz], G3 [196Hz])
    [130.8, 155.5, 196.0].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.025);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, now + idx * 0.025);

      gain.gain.setValueAtTime(0.001, now + idx * 0.025);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.025 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.025 + 0.7);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterOut);
      osc.start(now + idx * 0.025);
      osc.stop(now + idx * 0.025 + 0.75);
    });
  }

  /**
   * 15. Sora "Glitch" Kim (THE AI ETHICAL HACKER)
   * Mechanical keyboard key clack + clean sub-bass system reboot glide.
   */
  public playEthicalHackerKeyboardClack() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Mechanical Key Switches (Filtered at 1.4kHz)
    [0.0, 0.035, 0.07].forEach((offset) => {
      const keyOsc = ctx.createOscillator();
      const keyGain = ctx.createGain();
      keyOsc.type = 'triangle';
      keyOsc.frequency.setValueAtTime(900, now + offset);
      keyOsc.frequency.exponentialRampToValueAtTime(280, now + offset + 0.02);

      keyGain.gain.setValueAtTime(0.25, now + offset);
      keyGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.025);

      keyOsc.connect(keyGain);
      keyGain.connect(masterOut);
      keyOsc.start(now + offset);
      keyOsc.stop(now + offset + 0.03);
    });

    // Sub-Bass Reboot Sweep (45Hz -> 90Hz -> 35Hz)
    const rebootOsc = ctx.createOscillator();
    const rebootGain = ctx.createGain();
    rebootOsc.type = 'sine';
    rebootOsc.frequency.setValueAtTime(45, now + 0.07);
    rebootOsc.frequency.exponentialRampToValueAtTime(90, now + 0.15);
    rebootOsc.frequency.exponentialRampToValueAtTime(35, now + 0.4);

    rebootGain.gain.setValueAtTime(0.001, now + 0.07);
    rebootGain.gain.linearRampToValueAtTime(0.55, now + 0.15);
    rebootGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    rebootOsc.connect(rebootGain);
    rebootGain.connect(masterOut);
    rebootOsc.start(now + 0.07);
    rebootOsc.stop(now + 0.5);
  }

  /**
   * 16. Captain Douglas Mercer (THE AIRLINE UNION CHIEF)
   * Aircraft cabin chime (Ding-Dong: F#5 -> D5) + low jet engine rumble.
   */
  public playAirlineChiefCabinChime() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Classic Cabin Chime (High F#5 [740Hz] -> Low D5 [587Hz])
    const chimeNotes = [
      { f: 739.99, t: 0.00, d: 0.4 },
      { f: 587.33, t: 0.22, d: 0.6 }
    ];

    chimeNotes.forEach((n) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.f, now + n.t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now + n.t);

      gain.gain.setValueAtTime(0.001, now + n.t);
      gain.gain.linearRampToValueAtTime(0.24, now + n.t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterOut);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.05);
    });

    // Jet Engine Low Rumble (50Hz)
    const jetOsc = ctx.createOscillator();
    const jetGain = ctx.createGain();
    jetOsc.type = 'sine';
    jetOsc.frequency.setValueAtTime(50, now);
    jetGain.gain.setValueAtTime(0.35, now);
    jetGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    jetOsc.connect(jetGain);
    jetGain.connect(masterOut);
    jetOsc.start(now);
    jetOsc.stop(now + 0.75);
  }

  /**
   * 17. Dr. Leila Kassam (THE CRISIS EPIDEMIOLOGIST)
   * Bio-containment respirator air release + warm cardiac monitor ping.
   */
  public playEpidemiologistRespiratorBreath() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Cleanroom Respirator Air Release
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.getNoiseBuffer(ctx);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(450, now);
    noiseFilter.Q.setValueAtTime(2.0, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.25, now + 0.04);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterOut);
    noiseSource.start(now);
    noiseSource.stop(now + 0.25);

    // Warm Cardiac Monitor Ping (620Hz)
    const pingOsc = ctx.createOscillator();
    const pingGain = ctx.createGain();
    pingOsc.type = 'sine';
    pingOsc.frequency.setValueAtTime(620, now + 0.08);

    pingGain.gain.setValueAtTime(0.001, now + 0.08);
    pingGain.gain.linearRampToValueAtTime(0.2, now + 0.09);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    pingOsc.connect(pingGain);
    pingGain.connect(masterOut);
    pingOsc.start(now + 0.08);
    pingOsc.stop(now + 0.4);
  }

  /**
   * 18. Judge Malcolm Winters (THE CONSTITUTIONAL PURIST)
   * African teakwood gavel strike with deep courtroom reverberation (72Hz).
   */
  public playConstitutionalGavelResonance() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Hardwood Gavel Knock (140Hz -> 65Hz)
    const gavelOsc = ctx.createOscillator();
    const gavelFilter = ctx.createBiquadFilter();
    const gavelGain = ctx.createGain();

    gavelOsc.type = 'triangle';
    gavelOsc.frequency.setValueAtTime(140, now);
    gavelOsc.frequency.exponentialRampToValueAtTime(65, now + 0.12);

    gavelFilter.type = 'lowpass';
    gavelFilter.frequency.setValueAtTime(450, now);

    gavelGain.gain.setValueAtTime(0.001, now);
    gavelGain.gain.linearRampToValueAtTime(0.7, now + 0.006);
    gavelGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    gavelOsc.connect(gavelFilter);
    gavelFilter.connect(gavelGain);
    gavelGain.connect(masterOut);
    gavelOsc.start(now);
    gavelOsc.stop(now + 0.28);

    // Deep Courtroom Bench Sub-Drop (72Hz -> 35Hz)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(72, now);
    subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.45);

    subGain.gain.setValueAtTime(0.75, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    subOsc.connect(subGain);
    subGain.connect(masterOut);
    subOsc.start(now);
    subOsc.stop(now + 0.6);
  }

  /**
   * 19. Victoria "Vicky" Sterling (THE POPULIST HEIRESS)
   * Camera strobe flashbulb recharge whine + soft luxury glass chime.
   */
  public playPopulistHeiressFlashbulb() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Flashbulb Inverter Charge Whine (400Hz -> 1800Hz)
    const flashOsc = ctx.createOscillator();
    const flashGain = ctx.createGain();

    flashOsc.type = 'sine';
    flashOsc.frequency.setValueAtTime(400, now);
    flashOsc.frequency.exponentialRampToValueAtTime(1800, now + 0.12);

    flashGain.gain.setValueAtTime(0.001, now);
    flashGain.gain.linearRampToValueAtTime(0.16, now + 0.06);
    flashGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    flashOsc.connect(flashGain);
    flashGain.connect(masterOut);
    flashOsc.start(now);
    flashOsc.stop(now + 0.16);

    // Champagne Glass Chime (2093Hz C7)
    const glassOsc = ctx.createOscillator();
    const glassGain = ctx.createGain();
    glassOsc.type = 'sine';
    glassOsc.frequency.setValueAtTime(2093, now + 0.08);

    glassGain.gain.setValueAtTime(0.001, now + 0.08);
    glassGain.gain.linearRampToValueAtTime(0.18, now + 0.09);
    glassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    glassOsc.connect(glassGain);
    glassGain.connect(masterOut);
    glassOsc.start(now + 0.08);
    glassOsc.stop(now + 0.6);
  }

  /**
   * 20. Commander Victor Thorne (THE SPACE FLEET ADMIRAL)
   * Orbital ion thruster pulse + high-vacuum sub bass rumble (32Hz).
   */
  public playSpaceAdmiralThrusterPulse() {
    if (!this.enabled) return;
    const sys = this.initContext();
    if (!sys) return;
    const { ctx, masterOut } = sys;
    const now = ctx.currentTime;

    // Ion Thruster Plasma Swell (140Hz -> 320Hz)
    const plasmaOsc = ctx.createOscillator();
    const plasmaFilter = ctx.createBiquadFilter();
    const plasmaGain = ctx.createGain();

    plasmaOsc.type = 'triangle';
    plasmaOsc.frequency.setValueAtTime(140, now);
    plasmaOsc.frequency.exponentialRampToValueAtTime(320, now + 0.15);
    plasmaOsc.frequency.exponentialRampToValueAtTime(90, now + 0.45);

    plasmaFilter.type = 'lowpass';
    plasmaFilter.frequency.setValueAtTime(600, now);

    plasmaGain.gain.setValueAtTime(0.001, now);
    plasmaGain.gain.linearRampToValueAtTime(0.45, now + 0.08);
    plasmaGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    plasmaOsc.connect(plasmaFilter);
    plasmaFilter.connect(plasmaGain);
    plasmaGain.connect(masterOut);
    plasmaOsc.start(now);
    plasmaOsc.stop(now + 0.55);

    // Deep Cosmic Sub-Bass Rumble (32Hz)
    const spaceSub = ctx.createOscillator();
    const spaceSubGain = ctx.createGain();
    spaceSub.type = 'sine';
    spaceSub.frequency.setValueAtTime(50, now);
    spaceSub.frequency.exponentialRampToValueAtTime(26, now + 0.7);

    spaceSubGain.gain.setValueAtTime(0.8, now);
    spaceSubGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    spaceSub.connect(spaceSubGain);
    spaceSubGain.connect(masterOut);
    spaceSub.start(now);
    spaceSub.stop(now + 0.9);
  }

  // =========================================================================
  // PRESIDENTIAL CANDIDATE SIGNATURE SOUND DISPATCHER
  // =========================================================================

  /**
   * Plays the custom presidential sound motif for any of the 31 candidates.
   */
  public playCandidateSignature(candidateId: string, type: 'speech' | 'action' = 'speech'): void {
    if (!this.enabled) return;

    switch (candidateId) {
      // Original 11 Candidates
      case 'jax-alvarez':
        this.playGavel();
        break;
      case 'elena-rostova':
        this.playVoteRevealDing();
        break;
      case 'marcus-vance':
        this.playAttackSting();
        break;
      case 'camilla-laurent':
        this.playBallotDrop();
        break;
      case 'art-sterling':
        this.playCashChime();
        break;
      case 'dmitri-voronin':
        this.playEliminationBuzzer();
        break;
      case 'silas-thorne':
        this.playCCTVBeep();
        break;
      case 'amara-chen':
        this.playSpeechBeep();
        break;
      case 'damian-cross':
        this.playBetrayalAlarm();
        break;
      case 'beatrice-holloway':
        this.playFanfare();
        break;
      case 'julian-mercer':
        this.playSwapWhoosh();
        break;

      // 20 New Presidential Candidates (and legacy ID support)
      case 'ray-callahan':
      case 'raymond-callahan':
        this.playBorderGovernorHammerGate();
        break;
      case 'vivienne-zhao':
      case 'vivienne-chen':
        this.playNeurotechSynapseChime();
        break;
      case 'garrick-stone':
      case 'sterling-archer':
        this.playCartelProsecutorHandcuffSnap();
        break;
      case 'elijah-haddon':
      case 'elijah-vance':
        this.playTelevangelistPipeOrganSwell();
        break;
      case 'kendra-vane':
      case 'kendra-sterling':
        this.playDistressedDebtCashStack();
        break;
      case 'colt-briggs':
      case 'colton-briggs':
        this.playRuralSheriffBootSpur();
        break;
      case 'maya-lin':
        this.playNegotiatorSecretBriefcase();
        break;
      case 'declan-hayes':
        this.playCoalMayorPickaxeStrike();
        break;
      case 'jonathan-richter':
      case 'jonathan-sterling':
        this.playBigPharmaVialClick();
        break;
      case 'tariq-fassi':
      case 'tariq-al-fassi':
        this.playSovereignWealthVaultDoor();
        break;
      case 'gia-moretti':
        this.playViralPodcasterLivestreamBeep();
        break;
      case 'roland-price':
      case 'arthur-price':
        this.playSpecialOpsRifleBolt();
        break;
      case 'diana-albright':
      case 'diana-ross':
        this.playDeficitHawkRedPenStamp();
        break;
      case 'henrik-falken':
      case 'henrik-von-falken':
        this.playEnergyDynastHarpsichordChime();
        break;
      case 'sora-kim':
        this.playEthicalHackerKeyboardClack();
        break;
      case 'douglas-wade':
      case 'douglas-mercer':
        this.playAirlineChiefCabinChime();
        break;
      case 'leila-kassam':
        this.playEpidemiologistRespiratorBreath();
        break;
      case 'malcolm-winters':
        this.playConstitutionalGavelResonance();
        break;
      case 'victoria-sterling':
        this.playPopulistHeiressFlashbulb();
        break;
      case 'cassian-drake':
      case 'victor-thorne':
        this.playSpaceAdmiralThrusterPulse();
        break;

      // Default fallback
      default:
        this.playSpeechBeep();
        break;
    }
  }
}

export const sounds = new SoundManager();


