import { useAudioStore } from '../stores/audioStore';

/**
 * AudioService manages preloading and playing game sound effects.
 * NOTE: Sounds are currently loaded from assets.mixkit.co. If production 
 * Content Security Policy (CSP) or egress rules are restricted, 
 * these may fail to load. In such cases, whitelist mixkit or host 
 * the assets locally.
 */
const SOUNDS = {
  click: '/sounds/click.mp3',
  hover: '/sounds/hover.mp3',
  success: '/sounds/success.mp3',
  error: '/sounds/error.mp3',
  pack_shake: '/sounds/pack_shake.mp3',
  pack_open: '/sounds/pack_open.mp3',
  card_reveal: '/sounds/card_reveal.mp3',
  rare_reveal: '/sounds/rare_reveal.mp3',
  mythic_reveal: '/sounds/mythic_reveal.mp3',
  divine_reveal: '/sounds/divine_reveal.mp3',
  god_pack: '/sounds/god_pack.mp3',
  god_pack_alarm: '/sounds/god_pack_alarm.mp3',
  gold_gain: '/sounds/gold_gain.mp3',
  gem_gain: '/sounds/gem_gain.mp3',
};

class AudioService {
  private static instance: AudioService;
  private audioContext: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();

  private constructor() {}

  static getInstance() {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  private async initContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async preload() {
    await this.initContext();
    const loadPromises = Object.entries(SOUNDS).map(async ([name, url]) => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
        this.buffers.set(name, audioBuffer);
      } catch (err) {
        console.error(`Failed to load sound: ${name}`, err);
      }
    });
    await Promise.all(loadPromises);
  }

  play(soundName: keyof typeof SOUNDS) {
    try {
      const { audioEnabled, sfxEnabled, masterVolume, sfxVolume } = useAudioStore.getState();
      if (!audioEnabled || !sfxEnabled) return;

      this.initContext().catch(() => {});
      const buffer = this.buffers.get(soundName);
      if (!buffer || !this.audioContext) return;

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;

      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = (masterVolume / 100) * (sfxVolume / 100);

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      source.start(0);
    } catch (e) {
      // Silently no-op if something goes wrong
    }
  }
}

export const audioService = AudioService.getInstance();
