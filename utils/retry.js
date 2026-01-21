/**
 * Retry utility with exponential backoff
 *
 * Provides robust retry logic for flaky API calls with:
 * - Exponential backoff with jitter
 * - Configurable retry conditions
 * - Progress callbacks
 */

/**
 * Default retry configuration
 */
const DEFAULT_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitterFactor: 0.1, // 10% jitter
};

/**
 * Errors that should trigger a retry
 */
const RETRYABLE_ERRORS = [
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'ENOTFOUND',
  'fetch failed',
  'network request failed',
  'Failed to fetch',
];

/**
 * HTTP status codes that should trigger a retry
 */
const RETRYABLE_STATUS_CODES = [
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
];

/**
 * Check if an error is retryable
 * @param {Error} error - The error to check
 * @returns {boolean}
 */
export function isRetryableError(error) {
  if (!error) return false;

  // Check error message
  const message = error.message?.toLowerCase() || '';
  if (RETRYABLE_ERRORS.some(e => message.includes(e.toLowerCase()))) {
    return true;
  }

  // Check for network errors
  if (error.name === 'TypeError' && message.includes('fetch')) {
    return true;
  }

  return false;
}

/**
 * Check if an HTTP status code is retryable
 * @param {number} status - HTTP status code
 * @returns {boolean}
 */
export function isRetryableStatus(status) {
  return RETRYABLE_STATUS_CODES.includes(status);
}

/**
 * Calculate delay with exponential backoff and jitter
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {Object} config - Retry configuration
 * @returns {number} Delay in milliseconds
 */
export function calculateDelay(attempt, config = DEFAULT_CONFIG) {
  const { initialDelayMs, maxDelayMs, backoffMultiplier, jitterFactor } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  // Exponential backoff
  const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Add jitter (random variation to prevent thundering herd)
  const jitter = cappedDelay * jitterFactor * (Math.random() * 2 - 1);

  return Math.round(cappedDelay + jitter);
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Duration in milliseconds
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 *
 * @param {Function} fn - Async function to execute
 * @param {Object} [options] - Retry options
 * @param {number} [options.maxRetries=3] - Maximum number of retries
 * @param {number} [options.initialDelayMs=1000] - Initial delay between retries
 * @param {number} [options.maxDelayMs=10000] - Maximum delay between retries
 * @param {number} [options.backoffMultiplier=2] - Backoff multiplier
 * @param {Function} [options.shouldRetry] - Custom function to determine if should retry
 * @param {Function} [options.onRetry] - Callback called before each retry
 * @returns {Promise<any>} Result of the function
 */
export async function withRetry(fn, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  const { maxRetries, shouldRetry, onRetry } = config;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const canRetry = attempt < maxRetries;
      const shouldAttemptRetry = shouldRetry
        ? shouldRetry(error, attempt)
        : isRetryableError(error);

      if (!canRetry || !shouldAttemptRetry) {
        throw error;
      }

      // Calculate delay
      const delay = calculateDelay(attempt, config);

      // Call onRetry callback
      if (onRetry) {
        onRetry({
          attempt: attempt + 1,
          maxRetries,
          delay,
          error,
        });
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Wrapper for fetch with retry logic
 *
 * @param {string} url - URL to fetch
 * @param {Object} [fetchOptions] - Fetch options
 * @param {Object} [retryOptions] - Retry options
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, fetchOptions = {}, retryOptions = {}) {
  const shouldRetry = (error, response) => {
    // Retry on network errors
    if (isRetryableError(error)) {
      return true;
    }
    // Retry on retryable status codes
    if (response && isRetryableStatus(response.status)) {
      return true;
    }
    return false;
  };

  return withRetry(
    async () => {
      const response = await fetch(url, fetchOptions);

      // Check if response status is retryable
      if (isRetryableStatus(response.status)) {
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        error.response = response;
        throw error;
      }

      return response;
    },
    {
      ...retryOptions,
      shouldRetry: (error) => shouldRetry(error, error.response),
    }
  );
}

export default {
  withRetry,
  fetchWithRetry,
  isRetryableError,
  isRetryableStatus,
  calculateDelay,
  sleep,
};
