/**
 * converter/queueManager.js
 * Manages the conversion queue with configurable concurrency
 */

const CONCURRENCY = 3; // Process 3 files at a time

/**
 * Process a queue of files with limited concurrency
 * @param {object[]} queue - Array of file objects with .path property
 * @param {Function} processor - Async function to process each file
 * @param {Function} onItemStart - Called when a file starts processing
 * @param {Function} onItemComplete - Called when a file finishes
 * @param {Function} onOverallProgress - Called with overall progress (0–100)
 * @returns {Promise<object[]>} - Results array
 */
async function processQueue({
  queue,
  processor,
  onItemStart,
  onItemComplete,
  onOverallProgress,
  getCancelled,
}) {
  const results = new Array(queue.length).fill(null);
  const total = queue.length;
  let completed = 0;
  let index = 0;

  /**
   * Worker: picks next item and processes it
   */
  async function worker() {
    while (index < queue.length) {
      // Check if cancelled
      if (getCancelled?.()) break;

      const currentIndex = index++;
      const item = queue[currentIndex];

      onItemStart?.(item, currentIndex);

      try {
        const result = await processor(item);
        results[currentIndex] = { ...item, ...result, success: true };
        onItemComplete?.(item, currentIndex, result, null);
      } catch (err) {
        results[currentIndex] = { ...item, success: false, error: err.message };
        onItemComplete?.(item, currentIndex, null, err);
      }

      completed++;
      const progress = Math.round((completed / total) * 100);
      onOverallProgress?.(progress, completed, total);
    }
  }

  // Launch N concurrent workers
  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  return results;
}

/**
 * Creates a cancellable queue controller
 * @returns {{ cancelled: boolean, cancel: Function, reset: Function }}
 */
function createQueueController() {
  let cancelled = false;
  return {
    get cancelled() { return cancelled; },
    cancel() { cancelled = true; },
    reset() { cancelled = false; },
  };
}

module.exports = { processQueue, createQueueController, CONCURRENCY };
