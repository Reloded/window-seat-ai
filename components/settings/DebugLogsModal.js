import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Platform,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLogs, getRecentErrors, exportLogs } from '../../utils/logger';

// Try to import expo-clipboard, fall back to Share API
let Clipboard = null;
try {
  Clipboard = require('expo-clipboard');
} catch (e) {
  // expo-clipboard not installed, will use Share fallback
}

const LEVEL_COLORS = {
  error: '#ff453a',
  warn: '#ff9f0a',
  info: '#00d4ff',
  debug: '#8e8e93',
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'errors', label: 'Errors' },
  { key: 'ElevenLabsService', label: 'ElevenLabs' },
  { key: 'NarrationService', label: 'Narration' },
];

export function DebugLogsModal({ visible, onClose }) {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [copied, setCopied] = useState(false);

  const loadLogs = useCallback(() => {
    let filtered;
    
    if (filter === 'all') {
      filtered = getLogs({ limit: 200 });
    } else if (filter === 'errors') {
      filtered = getRecentErrors(100);
    } else {
      // Filter by service name
      filtered = getLogs({ service: filter, limit: 200 });
    }
    
    // Reverse to show newest first
    setLogs([...filtered].reverse());
  }, [filter]);

  useEffect(() => {
    if (visible) {
      loadLogs();
    }
  }, [visible, loadLogs]);

  const handleRefresh = () => {
    loadLogs();
  };

  const handleCopyAll = async () => {
    try {
      const exportedLogs = exportLogs({ limit: 500 });
      
      // Try clipboard first if available
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(exportedLogs);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback to Share API
        await Share.share({
          message: exportedLogs,
          title: 'Window Seat AI Debug Logs',
        });
      }
    } catch (error) {
      console.error('Failed to copy/share logs:', error);
      // Show alert as last resort
      Alert.alert(
        'Export Failed',
        'Could not copy or share logs. Check console for details.'
      );
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return timestamp;
    }
  };

  const renderLogEntry = (entry, index) => {
    const levelColor = LEVEL_COLORS[entry.level] || LEVEL_COLORS.debug;
    
    return (
      <View key={`${entry.timestamp}-${index}`} style={styles.logEntry}>
        <View style={styles.logHeader}>
          <Text style={styles.timestamp}>{formatTimestamp(entry.timestamp)}</Text>
          <Text style={[styles.level, { color: levelColor }]}>
            {entry.level.toUpperCase()}
          </Text>
          <Text style={styles.service}>{entry.service}</Text>
        </View>
        <Text style={styles.message}>{entry.message}</Text>
        {entry.data && (
          <Text style={styles.data}>
            {typeof entry.data === 'object' 
              ? JSON.stringify(entry.data, null, 2) 
              : String(entry.data)}
          </Text>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Debug Logs</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterButton,
                  filter === f.key && styles.filterButtonActive,
                ]}
                onPress={() => setFilter(f.key)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filter === f.key && styles.filterButtonTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleRefresh}>
            <Text style={styles.actionButtonText}>🔄 Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, copied && styles.actionButtonSuccess]} 
            onPress={handleCopyAll}
          >
            <Text style={[styles.actionButtonText, copied && styles.actionButtonTextSuccess]}>
              {copied ? '✓ Copied!' : (Clipboard ? '📋 Copy All' : '📤 Export')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Log Count */}
        <Text style={styles.logCount}>
          {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
        </Text>

        {/* Logs List */}
        <ScrollView 
          style={styles.logsList}
          contentContainerStyle={styles.logsContent}
        >
          {logs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No logs found</Text>
              <Text style={styles.emptyStateSubtext}>
                {filter === 'errors' 
                  ? 'No errors recorded. That\'s good!' 
                  : 'Try a different filter or check back later'}
              </Text>
            </View>
          ) : (
            logs.map(renderLogEntry)
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backButtonText: {
    color: '#00d4ff',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 60,
  },
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterScroll: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#00d4ff',
  },
  filterButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#0a1628',
    fontWeight: '600',
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  actionButtonSuccess: {
    backgroundColor: 'rgba(48, 209, 88, 0.2)',
  },
  actionButtonText: {
    color: '#00d4ff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonTextSuccess: {
    color: '#30d158',
  },
  logCount: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  logsList: {
    flex: 1,
  },
  logsContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  logEntry: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  timestamp: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  level: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
  },
  service: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontStyle: 'italic',
  },
  message: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18,
  },
  data: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: 8,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
