/**
 * Format bytes to human-readable string
 * @param {number} bytes - Number of bytes
 * @param {number} decimals - Decimal places (default: 1)
 * @returns {string} Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));

  return `${value} ${sizes[i]}`;
}
