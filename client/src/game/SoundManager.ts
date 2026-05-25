class SoundManager {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private musicEnabled: boolean = true;
  private bgMusic: HTMLAudioElement | null = null;
  
  private playlist: string[] = [
    "/Musik/Velvet_Aisles.mp3"
  ];
  private currentTrackIndex = 0;

  constructor() {
    this.initAudioElement();
    // Autoplay policy: Browser will block unless user has interacted
    this.startMusic();
  }

  private initAudioElement() {
    if (this.bgMusic) {
      this.bgMusic.pause();
      this.bgMusic.removeEventListener("ended", this.playNextTrack);
    }
    
    this.bgMusic = new Audio(this.playlist[this.currentTrackIndex]);
    this.bgMusic.volume = 0.15;
    
    // When track ends, play the next one
    this.bgMusic.addEventListener("ended", this.playNextTrack);
  }

  private playNextTrack = () => {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
    this.initAudioElement();
    if (this.musicEnabled) {
      this.bgMusic?.play().catch(e => console.warn("Autoplay prevented:", e));
    }
  };

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  isSoundEnabled() {
    return this.soundEnabled;
  }

  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (enabled) {
      if (this.bgMusic) {
        this.bgMusic.muted = false;
        this.bgMusic.volume = 0.15;
      }
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  isMusicEnabled() {
    return this.musicEnabled;
  }

  // Retro button click
  playClick() {
    if (!this.soundEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      console.warn("Audio failed:", e);
    }
  }

  // Scanner beep SFX
  playScannerBeep() {
    if (!this.soundEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1100, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.05, this.ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.07);
    } catch (e) {
      console.warn("Audio failed:", e);
    }
  }

  // Box pickup/drop cardboard rustle sound
  playBoxSFX() {
    if (!this.soundEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const bufferSize = this.ctx.sampleRate * 0.12;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(250, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
    } catch (e) {
      console.warn("Audio failed:", e);
    }
  }

  // Restocking plop SFX
  playRestock() {
    if (!this.soundEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.09);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch (e) {
      console.warn("Audio failed:", e);
    }
  }

  // Cash register cha-ching sound
  playCashRegister() {
    if (!this.soundEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const time = this.ctx.currentTime;

      // Coin 1 (B5 note)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(987.77, time);
      gain1.gain.setValueAtTime(0.05, time);
      gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(time);
      osc1.stop(time + 0.4);

      // Coin 2 (E6 note, slightly delayed)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1318.51, time + 0.05);
      gain2.gain.setValueAtTime(0.03, time + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(time + 0.05);
      osc2.stop(time + 0.45);

      // Cash slam (muffled noise burst)
      const bufferSize = this.ctx.sampleRate * 0.08;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(800, time);

      const gainNoise = this.ctx.createGain();
      gainNoise.gain.setValueAtTime(0.03, time);
      gainNoise.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

      noise.connect(filter);
      filter.connect(gainNoise);
      gainNoise.connect(this.ctx.destination);
      noise.start(time);
    } catch (e) {
      console.warn("Audio failed:", e);
    }
  }

  // Wood/metal placement construction sound
  playBuild() {
    if (!this.soundEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const time = this.ctx.currentTime;
      
      const oscThump = this.ctx.createOscillator();
      const gainThump = this.ctx.createGain();
      oscThump.type = "triangle";
      oscThump.frequency.setValueAtTime(120, time);
      oscThump.frequency.linearRampToValueAtTime(45, time + 0.12);
      gainThump.gain.setValueAtTime(0.15, time);
      gainThump.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      oscThump.connect(gainThump);
      gainThump.connect(this.ctx.destination);
      oscThump.start(time);
      oscThump.stop(time + 0.15);

      const oscClick = this.ctx.createOscillator();
      const gainClick = this.ctx.createGain();
      oscClick.type = "sine";
      oscClick.frequency.setValueAtTime(600, time);
      gainClick.gain.setValueAtTime(0.03, time);
      gainClick.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
      oscClick.connect(gainClick);
      gainClick.connect(this.ctx.destination);
      oscClick.start(time);
      oscClick.stop(time + 0.05);
    } catch (e) {
      console.warn("Audio failed:", e);
    }
  }

  // Custom Background Music
  private startMusic() {
    if (this.bgMusic) {
      this.bgMusic.play().catch(e => {
        console.warn("Autoplay/Playback blocked:", e);
      });
    }
  }

  private stopMusic() {
    if (this.bgMusic) {
      this.bgMusic.pause();
    }
  }
}

export const soundManager = new SoundManager();
