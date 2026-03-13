/**
 * utils/helpers.js
 * Shared utility functions
 */

/**
 * Format milliseconds into human-readable duration
 * @param {number} ms
 * @returns {string}
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const remaining = s % 60;
  if (m < 60) return remaining > 0 ? `${m}m ${remaining}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return `${h}h ${mins}m`;
}

/**
 * Estimate remaining time based on progress
 * @param {number} startTime - Timestamp when processing started
 * @param {number} completed - Number of completed files
 * @param {number} total - Total number of files to process
 * @returns {string}
 */
function estimateTimeRemaining(startTime, completed, total) {
  if (completed === 0) return 'Calculating...';
  const elapsed = Date.now() - startTime;
  const avgPerFile = elapsed / completed;
  const remaining = (total - completed) * avgPerFile;
  return formatDuration(Math.round(remaining));
}

/**
 * Sanitize a filename by removing illegal characters
 * @param {string} name
 * @returns {string}
 */
function sanitizeFilename(name) {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Truncate a string to a max length with ellipsis
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
function truncate(str, maxLength = 50) {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Escape HTML special characters
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(str).replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Chunk an array into smaller arrays of a given size
 * @param {Array} arr
 * @param {number} size
 * @returns {Array[]}
 */
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Sleep for a given number of milliseconds
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  formatDuration,
  estimateTimeRemaining,
  sanitizeFilename,
  truncate,
  escapeHtml,
  chunkArray,
  sleep,
};
