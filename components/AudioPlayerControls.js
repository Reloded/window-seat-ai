import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { narrationService } from '../services';

export function AudioPlayerControls({ style, showQueueControls = true }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [queueStatus, setQueueStatus] = useState({
    isActive: false,
    currentIndex: 0,
    totalCount: 0,
    currentCheckpoint: null,
  });

  useEffect(() => {
    const unsubscribeAudio = narrationService.subscribeToAudio((event, data) => {
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

    const unsubscribeQueue = narrationService.subscribeToQueue((status) => {
      setQueueStatus(status);
    });

    return () => {
      unsubscribeAudio();
      unsubscribeQueue();
    };
  }, []);

  const handlePlayPause = async () => {
    if (isPlaying) {
      await narrationService.pauseAudio();
    } else if (isPaused) {
      await narrationService.resumeAudio();
    }
  };

  const handleStop = async () => {
    if (queueStatus.isActive) {
      narrationService.stopQueue();
    } else {
      await narrationService.stopAudio();
    }
  };

  const handlePlayAll = async () => {
    await narrationService.startQueue(0);
  };

  const handleSkipPrevious = async () => {
    await narrationService.skipPrevious();
  };

  const handleSkipNext = async () => {
    await narrationService.skipNext();
  };

  // Check if we have a queue available
  const queueCheckpoints = narrationService.getQueueCheckpoints();
  const hasQueue = queueCheckpoints.length > 0;

  // Show Play All button when queue is available but not active
  if (showQueueControls && hasQueue && !queueStatus.isActive && !isPlaying && !isPaused) {
    return (
      <View style={[styles.container, style]} accessibilityRole="toolbar">
        <TouchableOpacity
          style={styles.playAllButton}
          onPress={handlePlayAll}
          accessibilityLabel={`Play all ${queueCheckpoints.length} narrations`}
          accessibilityHint="Plays all checkpoint narrations in sequence"
          accessibilityRole="button"
        >
          <Text style={styles.playAllIcon} accessibilityElementsHidden>▶</Text>
          <Text style={styles.playAllText} accessibilityElementsHidden>Play All ({queueCheckpoints.length})</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!hasAudio && !isPlaying && !isPaused && !queueStatus.isActive) {
    return null;
  }

  const statusLabel = queueStatus.isActive
    ? `Playing ${queueStatus.currentIndex + 1} of ${queueStatus.totalCount}: ${queueStatus.currentCheckpoint?.name || 'Loading'}`
    : isPlaying ? 'Playing' : isPaused ? 'Paused' : 'Ready';

  return (
    <View style={[styles.container, style]} accessibilityRole="toolbar" accessibilityLabel="Audio player controls">
      {/* Skip Previous - only in queue mode */}
      {queueStatus.isActive && (
        <TouchableOpacity
          style={[styles.button, styles.skipButton]}
          onPress={handleSkipPrevious}
          disabled={queueStatus.currentIndex === 0}
          accessibilityLabel="Previous"
          accessibilityHint="Go to previous narration"
          accessibilityRole="button"
          accessibilityState={{ disabled: queueStatus.currentIndex === 0 }}
        >
          <Text style={[
            styles.buttonIcon,
            queueStatus.currentIndex === 0 && styles.buttonIconDisabled
          ]} accessibilityElementsHidden>⏮</Text>
        </TouchableOpacity>
      )}

      {/* Play/Pause */}
      <TouchableOpacity
        style={[styles.button, styles.playPauseButton]}
        onPress={handlePlayPause}
        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        accessibilityHint={isPlaying ? 'Pause audio playback' : 'Resume audio playback'}
        accessibilityRole="button"
      >
        <Text style={styles.buttonIcon} accessibilityElementsHidden>
          {isPlaying ? '⏸' : '▶'}
        </Text>
      </TouchableOpacity>

      {/* Status */}
      <View
        style={styles.statusContainer}
        accessibilityRole="text"
        accessibilityLabel={statusLabel}
        accessibilityLiveRegion="polite"
      >
        <View style={[styles.statusDot, isPlaying && styles.statusDotPlaying]} accessibilityElementsHidden />
        {queueStatus.isActive ? (
          <View style={styles.queueInfo} accessibilityElementsHidden>
            <Text style={styles.queueProgress}>
              {queueStatus.currentIndex + 1}/{queueStatus.totalCount}
            </Text>
            <Text style={styles.queueName} numberOfLines={1}>
              {queueStatus.currentCheckpoint?.name || 'Loading...'}
            </Text>
          </View>
        ) : (
          <Text style={styles.statusText} accessibilityElementsHidden>
            {isPlaying ? 'PLAYING' : isPaused ? 'PAUSED' : 'READY'}
          </Text>
        )}
      </View>

      {/* Skip Next - only in queue mode */}
      {queueStatus.isActive && (
        <TouchableOpacity
          style={[styles.button, styles.skipButton]}
          onPress={handleSkipNext}
          disabled={queueStatus.currentIndex >= queueStatus.totalCount - 1}
          accessibilityLabel="Next"
          accessibilityHint="Skip to next narration"
          accessibilityRole="button"
          accessibilityState={{ disabled: queueStatus.currentIndex >= queueStatus.totalCount - 1 }}
        >
          <Text style={[
            styles.buttonIcon,
            queueStatus.currentIndex >= queueStatus.totalCount - 1 && styles.buttonIconDisabled
          ]} accessibilityElementsHidden>⏭</Text>
        </TouchableOpacity>
      )}

      {/* Stop */}
      <TouchableOpacity
        style={[styles.button, styles.stopButton]}
        onPress={handleStop}
        accessibilityLabel="Stop"
        accessibilityHint="Stop audio playback"
        accessibilityRole="button"
      >
        <Text style={styles.buttonIcon} accessibilityElementsHidden>⏹</Text>
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
    gap: 10,
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
  skipButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  buttonIcon: {
    fontSize: 16,
    color: '#0a1628',
  },
  buttonIconDisabled: {
    opacity: 0.3,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 100,
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
  queueInfo: {
    flex: 1,
  },
  queueProgress: {
    color: '#00d4ff',
    fontSize: 12,
    fontWeight: '700',
  },
  queueName: {
    color: '#ffffff',
    fontSize: 11,
    opacity: 0.8,
    maxWidth: 120,
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00d4ff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
  },
  playAllIcon: {
    fontSize: 14,
    color: '#0a1628',
  },
  playAllText: {
    color: '#0a1628',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default AudioPlayerControls;
