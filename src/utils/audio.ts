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
}

export const sounds = new SoundManager();

