import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { EventEmitter } from './base';

class AudioService extends EventEmitter {
  constructor() {
    super();
    this.player = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.currentUri = null;
    this.playbackStatus = null;
    this.defaultVolume = 0.8;
    this.statusSubscription = null;
    this.wasPlaying = false;
  }

  setDefaultVolume(volume) {
    this.defaultVolume = Math.max(0, Math.min(1, volume));
    if (this.player) {
      this.player.volume = this.defaultVolume;
    }
  }

  getDefaultVolume() {
    return this.defaultVolume;
  }

  async initialize() {
    // Configure audio mode for background playback
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
    });
  }

  async loadAudio(uri) {
    // Unload any existing player
    await this.unload();

    try {
      // Create a new player with the audio source
      this.player = createAudioPlayer({ uri });
      this.player.volume = this.defaultVolume;
      this.currentUri = uri;

      // Subscribe to status updates
      this.statusSubscription = this.player.addListener('playbackStatusUpdate', (status) => {
        this.onPlaybackStatusUpdate(status);
      });

      return true;
    } catch (error) {
      console.error('Failed to load audio:', error);
      return false;
    }
  }

  onPlaybackStatusUpdate(status) {
    const currentTime = status.currentTime || 0;
    const duration = status.duration || 0;
    const playing = status.playing || false;

    // Convert to legacy format for compatibility
    this.playbackStatus = {
      isLoaded: true,
      isPlaying: playing,
      positionMillis: currentTime * 1000,
      durationMillis: duration * 1000,
      didJustFinish: this.wasPlaying && !playing && currentTime >= duration - 0.1 && duration > 0,
    };

    this.isPlaying = playing;
    this.isPaused = !playing && currentTime > 0;

    if (this.playbackStatus.didJustFinish) {
      this.isPlaying = false;
      this.isPaused = false;
      this.emit('finished');
    }

    this.wasPlaying = playing;
    this.emit('statusUpdate', this.playbackStatus);
  }

  async play() {
    if (!this.player) return false;

    try {
      this.player.play();
      this.isPlaying = true;
      this.isPaused = false;
      this.emit('playing');
      return true;
    } catch (error) {
      console.error('Failed to play audio:', error);
      return false;
    }
  }

  async pause() {
    if (!this.player) return false;

    try {
      this.player.pause();
      this.isPlaying = false;
      this.isPaused = true;
      this.emit('paused');
      return true;
    } catch (error) {
      console.error('Failed to pause audio:', error);
      return false;
    }
  }

  async stop() {
    if (!this.player) return false;

    try {
      this.player.pause();
      this.player.seekTo(0);
      this.isPlaying = false;
      this.isPaused = false;
      this.emit('stopped');
      return true;
    } catch (error) {
      console.error('Failed to stop audio:', error);
      return false;
    }
  }

  async unload() {
    if (this.statusSubscription) {
      this.statusSubscription.remove();
      this.statusSubscription = null;
    }
    if (this.player) {
      try {
        this.player.remove();
      } catch (error) {
        console.error('Failed to unload audio:', error);
      }
      this.player = null;
      this.currentUri = null;
      this.isPlaying = false;
      this.isPaused = false;
      this.wasPlaying = false;
    }
  }

  async setVolume(volume) {
    if (!this.player) return false;

    try {
      this.player.volume = Math.max(0, Math.min(1, volume));
      return true;
    } catch (error) {
      console.error('Failed to set volume:', error);
      return false;
    }
  }

  async seekTo(positionMillis) {
    if (!this.player) return false;

    try {
      // expo-audio uses seconds, not milliseconds
      this.player.seekTo(positionMillis / 1000);
      return true;
    } catch (error) {
      console.error('Failed to seek:', error);
      return false;
    }
  }

  getStatus() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentUri: this.currentUri,
      playbackStatus: this.playbackStatus,
    };
  }

  getDuration() {
    return this.playbackStatus?.durationMillis || 0;
  }

  getPosition() {
    return this.playbackStatus?.positionMillis || 0;
  }

  // Convenience method to load and play immediately
  async playUri(uri) {
    const loaded = await this.loadAudio(uri);
    if (loaded) {
      return await this.play();
    }
    return false;
  }
}

export const audioService = new AudioService();
export { AudioService };
