import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { narrationService } from '../services';

export function AudioPlayerControls({ style }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);

  useEffect(() => {
    const unsubscribe = narrationService.subscribeToAudio((event, data) => {
      switch (event) {
        case 'playing':
          setIsPlaying(true);
          setIsPaused(false);
          setHasAudio(true);
          break;
        case 'paused':
          setIsPlaying(false);
          setIsPaused(true);
          break;
        case 'stopped':
        case 'finished':
          setIsPlaying(false);
          setIsPaused(false);
          break;
        case 'statusUpdate':
          if (data?.isLoaded) {
            setHasAudio(true);
          }
          break;
      }
    });

    return unsubscribe;
  }, []);

  const handlePlayPause = async () => {
    if (isPlaying) {
      await narrationService.pauseAudio();
    } else if (isPaused) {
      await narrationService.resumeAudio();
    }
  };

  const handleStop = async () => {
    await narrationService.stopAudio();
  };

  if (!hasAudio && !isPlaying && !isPaused) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.button, styles.playPauseButton]}
        onPress={handlePlayPause}
      >
        <Text style={styles.buttonIcon}>
          {isPlaying ? '⏸' : '▶'}
        </Text>
      </TouchableOpacity>

      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, isPlaying && styles.statusDotPlaying]} />
        <Text style={styles.statusText}>
          {isPlaying ? 'PLAYING' : isPaused ? 'PAUSED' : 'READY'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.stopButton]}
        onPress={handleStop}
      >
        <Text style={styles.buttonIcon}>⏹</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 15,
    gap: 15,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseButton: {
    backgroundColor: '#00d4ff',
  },
  stopButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonIcon: {
    fontSize: 16,
    color: '#0a1628',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
  },
  statusDotPlaying: {
    backgroundColor: '#00ff88',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
});

export default AudioPlayerControls;
