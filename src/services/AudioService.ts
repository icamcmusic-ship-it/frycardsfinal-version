import { useAudioStore } from '../stores/audioStore';

/**
 * AudioService manages preloading and playing game sound effects.
 * NOTE: Sounds are currently loaded from assets.mixkit.co. If production 
 * Content Security Policy (CSP) or egress rules are restricted, 
 * these may fail to load. In such cases, whitelist mixkit or host 
 * the assets locally.
 */
const SOUNDS = {
  click: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  hover: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  success: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  error: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
  pack_shake: 'https://assets.mixkit.co/active_storage/sfx/2590/2590-preview.mp3',
  pack_open: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  card_reveal: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3',
  rare_reveal: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
  mythic_reveal: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', // Placeholder
  divine_reveal: 'https://assets.mixkit.co/active_storage/sfx/2015/2015-preview.mp3', // Placeholder
  god_pack: 'https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3', // High energy win sound
  god_pack_alarm: 'https://assets.mixkit.co/active_storage/sfx/994/994-preview.mp3', // Loud alarm/siren sound
  gold_gain: 'https://assets.mixkit.co/active_storage/sfx/2015/2015-preview.mp3',
  gem_gain: 'https://assets.mixkit.co/active_storage/sfx/2016/2016-preview.mp3',
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
    const { audioEnabled, sfxEnabled, masterVolume, sfxVolume } = useAudioStore.getState();
    if (!audioEnabled || !sfxEnabled) return;

    this.initContext();
    const buffer = this.buffers.get(soundName);
    if (!buffer || !this.audioContext) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = (masterVolume / 100) * (sfxVolume / 100);

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    source.start(0);
  }
}

export const audioService = AudioService.getInstance();
