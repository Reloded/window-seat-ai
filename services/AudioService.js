import { Audio } from 'expo-av';
import { EventEmitter } from './base';

class AudioService extends EventEmitter {
  constructor() {
    super();
    this.sound = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.currentUri = null;
    this.playbackStatus = null;
    this.defaultVolume = 0.8;
  }

  setDefaultVolume(volume) {
    this.defaultVolume = Math.max(0, Math.min(1, volume));
  }

  getDefaultVolume() {
    return this.defaultVolume;
  }

  async initialize() {
    // Configure audio mode for background playback
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }

  async loadAudio(uri) {
    // Unload any existing sound
    await this.unload();

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false, volume: this.defaultVolume },
        this.onPlaybackStatusUpdate.bind(this)
      );

      this.sound = sound;
      this.currentUri = uri;
      return true;
    } catch (error) {
      console.error('Failed to load audio:', error);
      return false;
    }
  }

  onPlaybackStatusUpdate(status) {
    this.playbackStatus = status;

    if (status.isLoaded) {
      this.isPlaying = status.isPlaying;
      this.isPaused = !status.isPlaying && status.positionMillis > 0;

      if (status.didJustFinish) {
        this.isPlaying = false;
        this.isPaused = false;
        this.emit('finished');
      }
    }

    this.emit('statusUpdate', status);
  }

  async play() {
    if (!this.sound) return false;

    try {
      await this.sound.playAsync();
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
    if (!this.sound) return false;

    try {
      await this.sound.pauseAsync();
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
    if (!this.sound) return false;

    try {
      await this.sound.stopAsync();
      await this.sound.setPositionAsync(0);
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
    if (this.sound) {
      try {
        await this.sound.unloadAsync();
      } catch (error) {
        console.error('Failed to unload audio:', error);
      }
      this.sound = null;
      this.currentUri = null;
      this.isPlaying = false;
      this.isPaused = false;
    }
  }

  async setVolume(volume) {
    if (!this.sound) return false;

    try {
      await this.sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
      return true;
    } catch (error) {
      console.error('Failed to set volume:', error);
      return false;
    }
  }

  async seekTo(positionMillis) {
    if (!this.sound) return false;

    try {
      await this.sound.setPositionAsync(positionMillis);
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
