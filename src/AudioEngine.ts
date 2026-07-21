export class AudioEngine {
  private ctx: AudioContext | null = null;
  private panner: PannerNode | null = null;
  private oscs: { node: OscillatorNode | BiquadFilterNode; gain: GainNode }[] = [];
  private filter: BiquadFilterNode | null = null;
  private reverb: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private externalSource: MediaElementAudioSourceNode | null = null;
  private externalGain: GainNode | null = null;
  private filterLfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private offset = 0;
  private params = { 
    baseFreq: 220, speed: 0.1, radius: 5, filter: 2000, resonance: 1, 
    reverb: 0.3, mode: 'sine', waveform: 'sine' as OscillatorType, 
    bandwidth: 5, synthVolume: 1.0, filterType: 'bandpass' as BiquadFilterType,
    lfoRate: 0.5, lfoAmount: 0, chaos: 0, entropy: 0
  };
  private lastUpdate = performance.now();
  private running = false;

  async init() {
    this.ctx = new AudioContext();
    const bufferSize = 2 * this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

    this.panner = this.ctx.createPanner();
    this.panner.panningModel = 'HRTF';
    this.panner.distanceModel = 'inverse';

    this.filter = this.ctx.createBiquadFilter();
    this.dryGain = this.ctx.createGain();
    this.wetGain = this.ctx.createGain();
    this.externalGain = this.ctx.createGain();
    this.reverbGain = this.ctx.createGain();
    
    this.filterLfo = this.ctx.createOscillator();
    this.lfoGain = this.ctx.createGain();
    this.filterLfo.connect(this.lfoGain);
    this.filterLfo.start();
    
    const revLen = 3 * this.ctx.sampleRate;
    const revBuffer = this.ctx.createBuffer(2, revLen, this.ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = revBuffer.getChannelData(c);
      for (let j = 0; j < revLen; j++) data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / revLen, 2.5);
    }
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = revBuffer;

    this.setupBank();
    this.filter.connect(this.dryGain);
    this.filter.connect(this.reverb);
    this.reverb.connect(this.reverbGain);
    this.reverbGain.connect(this.wetGain);
    this.dryGain.connect(this.panner);
    this.wetGain.connect(this.panner);
    this.externalGain.connect(this.panner);
    this.panner.connect(this.ctx.destination);
    this.updateLoop();
  }

  private setupBank() {
    if (!this.ctx || !this.filter || !this.lfoGain) return;
    this.oscs.forEach(item => { if (item.node instanceof OscillatorNode) item.node.stop(); item.node.disconnect(); item.gain.disconnect(); });
    this.oscs = [];
    if (this.noiseSource) { this.noiseSource.stop(); this.noiseSource.disconnect(); }
    if (this.params.mode === 'noise' && this.noiseBuffer) {
      this.noiseSource = this.ctx.createBufferSource();
      this.noiseSource.buffer = this.noiseBuffer;
      this.noiseSource.loop = true;
      this.noiseSource.start();
    }
    for (let i = 0; i < 10; i++) {
      const gain = this.ctx.createGain();
      let node: OscillatorNode | BiquadFilterNode;
      if (this.params.mode === 'noise') {
        node = this.ctx.createBiquadFilter();
        node.type = this.params.filterType;
        node.Q.value = this.params.bandwidth;
        this.noiseSource?.connect(node);
        this.lfoGain.connect(node.frequency);
      } else {
        node = this.ctx.createOscillator();
        node.type = this.params.waveform;
        node.start();
        this.lfoGain.connect(node.detune);
      }
      node.connect(gain);
      gain.connect(this.filter);
      this.oscs.push({ node, gain });
    }
  }

  private updateLoop = () => {
    if (!this.ctx) return;
    const now = performance.now();
    const dt = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;
    if (this.running) {
      this.offset += this.params.speed * dt;
      this.oscs.forEach((item, i) => {
        const rawOctave = (i / this.oscs.length) * 10 + this.offset;
        const wrappedOctave = ((rawOctave % 10) + 10) % 10;
        const jitter = (Math.random() - 0.5) * this.params.entropy * 100;
        const freq = this.params.baseFreq * Math.pow(2, wrappedOctave - 5) + jitter;
        item.node.frequency.setTargetAtTime(freq, this.ctx!.currentTime, 0.05);
        const volume = Math.pow(Math.sin((wrappedOctave / 10) * Math.PI), 2);
        item.gain.gain.setTargetAtTime(volume * (this.params.mode === 'noise' ? 4.0 : 0.4), this.ctx!.currentTime, 0.05);
      });
      const angle = this.offset * Math.PI * 2;
      const chaosR = Math.sin(this.offset * 1.7) * this.params.chaos;
      const chaosY = Math.cos(this.offset * 2.3) * this.params.chaos;
      const r = Math.max(0.1, this.params.radius + chaosR);
      this.panner?.positionX.setTargetAtTime(Math.cos(angle) * r, this.ctx!.currentTime, 0.05);
      this.panner?.positionZ.setTargetAtTime(Math.sin(angle) * r, this.ctx!.currentTime, 0.05);
      this.panner?.positionY.setTargetAtTime(Math.sin(angle * 2) * 2 + chaosY, this.ctx!.currentTime, 0.05);
    }
    requestAnimationFrame(this.updateLoop);
  }

  setExternalSource(element: HTMLMediaElement) {
    if (!this.ctx || !this.externalGain) return;
    if (!this.externalSource) {
      this.externalSource = this.ctx.createMediaElementSource(element);
      this.externalSource.connect(this.externalGain);
    }
  }

  updateParams(p: any) {
    const rebuild = p.mode !== this.params.mode && p.mode !== 'track' || p.waveform !== this.params.waveform || p.filterType !== this.params.filterType;
    this.params = p;
    if (rebuild) this.setupBank();
    if (this.ctx && this.filter && this.dryGain && this.wetGain && this.externalGain && this.filterLfo && this.lfoGain) {
      this.filter.frequency.setTargetAtTime(p.filter, this.ctx.currentTime, 0.05);
      const synthV = p.mode === 'track' ? (p.synthVolume * 2.0) : 1.0;
      this.dryGain.gain.setTargetAtTime((1 - p.reverb) * synthV, this.ctx.currentTime, 0.05);
      this.wetGain.gain.setTargetAtTime(p.reverb * synthV * 2.5, this.ctx.currentTime, 0.05);
      this.externalGain.gain.setTargetAtTime(p.mode === 'track' ? 0.8 : 0, this.ctx.currentTime, 0.1);
      this.filterLfo.frequency.setTargetAtTime(p.lfoRate, this.ctx.currentTime, 0.05);
      this.lfoGain.gain.setTargetAtTime(p.lfoAmount, this.ctx.currentTime, 0.05);
    }
  }

  getState() {
    const angle = this.offset * Math.PI * 2;
    const chaosR = Math.sin(this.offset * 1.7) * this.params.chaos;
    const chaosY = Math.cos(this.offset * 2.3) * this.params.chaos;
    const r = Math.max(0.1, this.params.radius + chaosR);
    return { offset: this.offset, pos: { x: Math.cos(angle) * r, y: Math.sin(angle * 2) * 2 + chaosY, z: Math.sin(angle) * r } };
  }

  start() { this.running = true; this.ctx?.resume(); this.updateParams(this.params); }
  stop() { this.running = false; [this.dryGain, this.wetGain, this.externalGain].forEach(g => g?.gain.setTargetAtTime(0, this.ctx!.currentTime, 0.05)); }
}