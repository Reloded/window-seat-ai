/**
 * Logger utility for Window Seat AI
 * 
 * Simple, robust logging system with:
 * - Log levels (debug, info, warn, error)
 * - Service context (automatic tagging)
 * - Timestamp capture
 * - In-memory log buffer (persisted to AsyncStorage)
 * - Export capability for crash analysis
 * 
 * Usage:
 *   import { createLogger } from '../utils/logger';
 *   const log = createLogger('NarrationService');
 *   log.info('Starting download', { flightNumber: 'BA123' });
 *   log.error('Download failed', error);
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Log levels with priority (higher = more severe)
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Check for React Native __DEV__ global (Metro bundler provides this)
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

// Configuration
const CONFIG = {
  minLevel: isDev ? 'debug' : 'info',  // Show debug only in dev
  maxBufferSize: 500,                     // Keep last 500 log entries
  persistKey: 'windowseat_logs',          // AsyncStorage key
  persistInterval: 5000,                  // Save to storage every 5s
  enableConsole: true,                    // Always log to console
  enablePersist: true,                    // Persist logs for crash review
};

// In-memory log buffer
let logBuffer = [];
let persistTimeout = null;
let isInitialized = false;

/**
 * Format a log entry for console output
 */
function formatForConsole(entry) {
  const time = entry.timestamp.split('T')[1].split('.')[0]; // HH:MM:SS
  const prefix = `[${time}][${entry.service}]`;
  
  if (entry.data) {
    return `${prefix} ${entry.message}`;
  }
  return `${prefix} ${entry.message}`;
}

/**
 * Serialize error objects for storage
 */
function serializeError(error) {
  if (!error) return null;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'), // First 5 lines
    };
  }
  if (typeof error === 'object') {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch {
      return String(error);
    }
  }
  return String(error);
}

/**
 * Serialize data for storage (handles circular refs, errors, etc.)
 */
function serializeData(data) {
  if (data === undefined) return undefined;
  if (data === null) return null;
  if (data instanceof Error) return serializeError(data);
  
  try {
    // Test if serializable
    JSON.stringify(data);
    return data;
  } catch {
    // Handle circular references or non-serializable objects
    if (typeof data === 'object') {
      const result = {};
      for (const key of Object.keys(data)) {
        try {
          result[key] = serializeData(data[key]);
        } catch {
          result[key] = '[Unserializable]';
        }
      }
      return result;
    }
    return String(data);
  }
}

/**
 * Add entry to buffer and schedule persistence
 */
function addToBuffer(entry) {
  logBuffer.push(entry);
  
  // Trim buffer if too large
  if (logBuffer.length > CONFIG.maxBufferSize) {
    logBuffer = logBuffer.slice(-CONFIG.maxBufferSize);
  }
  
  // Schedule persistence
  if (CONFIG.enablePersist && !persistTimeout) {
    persistTimeout = setTimeout(persistLogs, CONFIG.persistInterval);
  }
}

/**
 * Persist logs to AsyncStorage
 */
async function persistLogs() {
  persistTimeout = null;
  
  if (!CONFIG.enablePersist || logBuffer.length === 0) return;
  
  try {
    // Keep only recent logs for storage (last 200)
    const logsToSave = logBuffer.slice(-200);
    await AsyncStorage.setItem(CONFIG.persistKey, JSON.stringify({
      savedAt: new Date().toISOString(),
      logs: logsToSave,
    }));
  } catch (error) {
    // Don't log this error to avoid infinite loop
    console.warn('[Logger] Failed to persist logs:', error?.message);
  }
}

/**
 * Load persisted logs on startup
 */
async function initializeLogger() {
  if (isInitialized) return;
  isInitialized = true;
  
  try {
    const stored = await AsyncStorage.getItem(CONFIG.persistKey);
    if (stored) {
      const { logs } = JSON.parse(stored);
      if (Array.isArray(logs)) {
        // Prepend old logs, mark them as restored
        logBuffer = [
          ...logs.map(l => ({ ...l, restored: true })),
          ...logBuffer,
        ].slice(-CONFIG.maxBufferSize);
      }
    }
  } catch (error) {
    console.warn('[Logger] Failed to load persisted logs:', error?.message);
  }
}

/**
 * Core logging function
 */
function log(level, service, message, data) {
  // Check log level
  if (LOG_LEVELS[level] < LOG_LEVELS[CONFIG.minLevel]) {
    return;
  }
  
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
    data: serializeData(data),
  };
  
  // Console output
  if (CONFIG.enableConsole) {
    const formatted = formatForConsole(entry);
    const consoleMethod = level === 'debug' ? 'log' : level;
    
    if (data !== undefined) {
      console[consoleMethod](formatted, data);
    } else {
      console[consoleMethod](formatted);
    }
  }
  
  // Buffer for persistence
  addToBuffer(entry);
}

/**
 * Create a logger instance for a specific service
 */
export function createLogger(serviceName) {
  // Initialize on first logger creation
  if (!isInitialized) {
    initializeLogger();
  }
  
  return {
    debug: (message, data) => log('debug', serviceName, message, data),
    info: (message, data) => log('info', serviceName, message, data),
    warn: (message, data) => log('warn', serviceName, message, data),
    error: (message, data) => log('error', serviceName, message, data),
    
    // Convenience method for timing operations
    time: (label) => {
      const start = Date.now();
      return {
        end: (extraData) => {
          const duration = Date.now() - start;
          log('debug', serviceName, `${label} took ${duration}ms`, extraData);
          return duration;
        },
      };
    },
  };
}

/**
 * Get all buffered logs (for export/debugging)
 */
export function getLogs(options = {}) {
  const { level, service, limit = 100, since } = options;
  
  let filtered = logBuffer;
  
  if (level) {
    const minPriority = LOG_LEVELS[level] || 0;
    filtered = filtered.filter(l => LOG_LEVELS[l.level] >= minPriority);
  }
  
  if (service) {
    filtered = filtered.filter(l => l.service === service);
  }
  
  if (since) {
    const sinceDate = new Date(since);
    filtered = filtered.filter(l => new Date(l.timestamp) >= sinceDate);
  }
  
  return filtered.slice(-limit);
}

/**
 * Export logs as a formatted string (for sharing/debugging)
 */
export function exportLogs(options = {}) {
  const logs = getLogs({ limit: 200, ...options });
  
  const lines = logs.map(entry => {
    const time = entry.timestamp.replace('T', ' ').split('.')[0];
    const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : '';
    return `[${time}][${entry.level.toUpperCase()}][${entry.service}] ${entry.message}${dataStr}`;
  });
  
  return lines.join('\n');
}

/**
 * Clear all logs (for privacy/cleanup)
 */
export async function clearLogs() {
  logBuffer = [];
  try {
    await AsyncStorage.removeItem(CONFIG.persistKey);
  } catch (error) {
    console.warn('[Logger] Failed to clear persisted logs:', error?.message);
  }
}

/**
 * Force immediate persistence (call before app close if needed)
 */
export async function flushLogs() {
  if (persistTimeout) {
    clearTimeout(persistTimeout);
    persistTimeout = null;
  }
  await persistLogs();
}

/**
 * Get recent errors only (useful for crash reports)
 */
export function getRecentErrors(limit = 20) {
  return getLogs({ level: 'error', limit });
}

// Default logger for one-off logging
export const logger = createLogger('App');

export default { createLogger, getLogs, exportLogs, clearLogs, flushLogs, getRecentErrors };
