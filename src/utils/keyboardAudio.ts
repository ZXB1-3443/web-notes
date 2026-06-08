let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.error('Web Audio API not supported or failed to initialize', e);
    return null;
  }
}

/**
 * Procedurally synthesizes a satisfying keyboard sound.
 * Supports 'thocky' (deep, soft, creamy foam sound) and 'mechanical' (crisp, clacky switch feel).
 * No external file dependencies, highly responsive, zero-latency.
 */
export function playKeySound(key: string, profile: 'thocky' | 'mechanical' = 'thocky', volume: number = 1.0) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Wake context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // 1. Setup profile-specific variables
    let clackFreq = 2500;
    let clackQ = 5;
    let clackLevel = 0.8;

    let thockFreq = 280;
    let thockQ = 3.5;
    let thockLevel = 1.3;

    let pingFreq = 5800;
    let pingQ = 14;
    let pingLevel = 0.12;

    let envDecay = 0.025; // SNAP decay

    if (profile === 'thocky') {
      // Deep but clean damp-foam/creamy-lubed-switch thock profile without muddy sub-bass rumble
      pingLevel = 0; // Thocky switches have no metallic ping
      
      if (key === ' ') { // Spacebar: Satisfyingly deep thock but with sub-bass cut
        thockFreq = 145 + Math.random() * 10;
        thockQ = 2.5;
        thockLevel = 1.7;

        clackFreq = 650 + Math.random() * 100;
        clackQ = 1.8;
        clackLevel = 0.65;
        envDecay = 0.065;
      } else if (key === 'Enter') { // Enter: Thick, soft, bottom-out thud
        thockFreq = 190 + Math.random() * 15;
        thockQ = 2.8;
        thockLevel = 1.4;

        clackFreq = 850 + Math.random() * 120;
        clackQ = 2.4;
        clackLevel = 0.6;
        envDecay = 0.05;
      } else if (key === 'Backspace') { // Backspace: Snappy, round pop
        thockFreq = 220 + Math.random() * 20;
        thockQ = 3.2;
        thockLevel = 1.2;

        clackFreq = 1100 + Math.random() * 150;
        clackQ = 2.8;
        clackLevel = 0.65;
        envDecay = 0.035;
      } else if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(key)) {
        // Modifiers: Extra damp soft sound
        thockFreq = 180;
        thockQ = 2.5;
        thockLevel = 1.0;

        clackFreq = 750;
        clackQ = 2.2;
        clackLevel = 0.45;
        envDecay = 0.04;
      } else {
        // Regular characters: Sweet, round, organic creamy clack-thocks
        const randSeed = Math.random();
        thockFreq = 205 + randSeed * 45;
        thockQ = 3.0;
        thockLevel = 1.3;

        clackFreq = 950 + randSeed * 250;
        clackQ = 2.8;
        clackLevel = 0.6;
        envDecay = 0.036;
      }
    } else {
      // 'mechanical': Crisp, high-impact mechanical housing clack & spring ring
      if (key === ' ') { // Spacebar
        thockFreq = 125 + Math.random() * 15;
        thockQ = 2.2;
        thockLevel = 2.4;

        clackFreq = 1100 + Math.random() * 150;
        clackQ = 2.8;
        clackLevel = 0.7;

        pingFreq = 3500;
        pingQ = 8;
        pingLevel = 0.08;

        envDecay = 0.055;
      } else if (key === 'Enter') { // Enter
        thockFreq = 185 + Math.random() * 20;
        thockQ = 2.8;
        thockLevel = 1.7;

        clackFreq = 1700 + Math.random() * 200;
        clackQ = 4;
        clackLevel = 0.85;

        pingFreq = 4500;
        pingQ = 10;
        pingLevel = 0.1;

        envDecay = 0.045;
      } else if (key === 'Backspace') { // Backspace
        thockFreq = 310 + Math.random() * 30;
        thockQ = 3.8;
        thockLevel = 1.1;

        clackFreq = 2800 + Math.random() * 300;
        clackQ = 6;
        clackLevel = 0.9;

        pingFreq = 6500;
        pingQ = 16;
        pingLevel = 0.14;

        envDecay = 0.022;
      } else if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(key)) {
        thockFreq = 210;
        thockQ = 3.0;
        thockLevel = 0.9;

        clackFreq = 2000;
        clackQ = 4;
        clackLevel = 0.5;

        pingFreq = 4100;
        pingQ = 8;
        pingLevel = 0.05;

        envDecay = 0.035;
      } else {
        const randSeed = Math.random();
        thockFreq = 250 + randSeed * 70;
        thockQ = 3.5;
        thockLevel = 1.3;

        clackFreq = 2200 + randSeed * 600;
        clackQ = 5;
        clackLevel = 0.8;

        pingFreq = 5400 + randSeed * 1000;
        pingQ = 14;
        pingLevel = 0.12;

        envDecay = 0.026;
      }
    }

    // 2. Synthesize White Noise Base
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * 0.08));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      channelData[i] = Math.random() * 2 - 1;
    }
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;

    // 3. Noise Gate & Envelope Decay
    const noiseGainNode = ctx.createGain();
    noiseGainNode.gain.setValueAtTime(1.0, now);
    noiseGainNode.gain.exponentialRampToValueAtTime(0.001, now + envDecay);

    noiseNode.connect(noiseGainNode);

    // 4. Clack Filter (high transient plastic click)
    const clackFilter = ctx.createBiquadFilter();
    clackFilter.type = 'bandpass';
    clackFilter.frequency.setValueAtTime(clackFreq, now);
    clackFilter.Q.setValueAtTime(clackQ, now);

    const clackGain = ctx.createGain();
    clackGain.gain.setValueAtTime(clackLevel, now);

    noiseGainNode.connect(clackFilter);
    clackFilter.connect(clackGain);

    // 5. Thock Filter (deep chamber resonance)
    const thockFilter = ctx.createBiquadFilter();
    thockFilter.type = 'bandpass';
    thockFilter.frequency.setValueAtTime(thockFreq, now);
    thockFilter.Q.setValueAtTime(thockQ, now);

    const thockGain = ctx.createGain();
    thockGain.gain.setValueAtTime(thockLevel, now);

    noiseGainNode.connect(thockFilter);
    thockFilter.connect(thockGain);

    // 6. Spring Ring/Metal Ping (Only synthesized if pingLevel > 0)
    let pingGain: GainNode | null = null;
    let pingFilter: BiquadFilterNode | null = null;
    if (pingLevel > 0) {
      pingFilter = ctx.createBiquadFilter();
      pingFilter.type = 'bandpass';
      pingFilter.frequency.setValueAtTime(pingFreq, now);
      pingFilter.Q.setValueAtTime(pingQ, now);

      pingGain = ctx.createGain();
      pingGain.gain.setValueAtTime(pingLevel, now);

      noiseGainNode.connect(pingFilter);
      pingFilter.connect(pingGain);
    }

    // 7. Extra direct tone synthesis to give "Thock" more weight/buttery body in 'thocky' mode
    let bodyToneNode: OscillatorNode | null = null;
    let bodyGainNode: GainNode | null = null;
    if (profile === 'thocky') {
      bodyToneNode = ctx.createOscillator();
      bodyToneNode.type = 'sine';
      // start at slightly higher pitch, sweep down
      bodyToneNode.frequency.setValueAtTime(thockFreq * 1.3, now);
      bodyToneNode.frequency.exponentialRampToValueAtTime(thockFreq, now + envDecay * 1.5);

      bodyGainNode = ctx.createGain();
      // Muted, high-end punch instead of dominant sub-bass rumble
      bodyGainNode.gain.setValueAtTime(0.3, now);
      bodyGainNode.gain.exponentialRampToValueAtTime(0.001, now + envDecay * 1.5);

      bodyToneNode.connect(bodyGainNode);
    }

    // 8. Output Mixer
    const masterGainGate = ctx.createGain();
    // Allow substantial level adjusted by dynamic volume
    const baseVolume = profile === 'thocky' ? 1.5 : 1.3;
    masterGainGate.gain.setValueAtTime(baseVolume * volume, now);

    clackGain.connect(masterGainGate);
    thockGain.connect(masterGainGate);
    if (pingGain) {
      pingGain.connect(masterGainGate);
    }
    if (bodyGainNode) {
      bodyGainNode.connect(masterGainGate);
    }

    // For thocky profile, add a lowpass filter over the master output to smooth out harsh highs
    if (profile === 'thocky') {
      const smoothingFilter = ctx.createBiquadFilter();
      smoothingFilter.type = 'lowpass';
      smoothingFilter.frequency.setValueAtTime(1600, now);
      masterGainGate.connect(smoothingFilter);
      smoothingFilter.connect(ctx.destination);
    } else {
      masterGainGate.connect(ctx.destination);
    }

    // Trigger physical impact excitation
    noiseNode.start(now);
    noiseNode.stop(now + envDecay + 0.02);

    if (bodyToneNode) {
      bodyToneNode.start(now);
      bodyToneNode.stop(now + envDecay * 1.5 + 0.01);
    }
  } catch (e) {
    console.error('Error playing procedural keyboard sound', e);
  }
}

/**
 * Procedurally synthesizes a rich metallic typewriter bell ('ding') chime.
 * Instant start, elegant physical resonance decay, zero external buffers.
 */
export function playTypewriterBell(volume: number = 0.5) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Dual oscillator synthesis modeling hand-crafted iron bell harmonics
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1480, now);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2150, now);

    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();

    // Sharp strike attack with logarithmic tail
    gain1.gain.setValueAtTime(0.22 * volume, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

    gain2.gain.setValueAtTime(0.09 * volume, now);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(950, now);

    osc1.connect(gain1);
    osc2.connect(gain2);

    gain1.connect(filter);
    gain2.connect(filter);
    filter.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);

    osc1.stop(now + 1.2);
    osc2.stop(now + 0.8);
  } catch (e) {
    console.warn('Typewriter bell synthesis failed: ', e);
  }
}
