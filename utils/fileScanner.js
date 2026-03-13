/**
 * utils/fileScanner.js
 * Scans a directory for PDF and EPUB files
 */

const fs = require('fs');
const path = require('path');

const SUPPORTED_EXTENSIONS = ['.pdf', '.epub'];
const MAX_FILES = 500;
const WARNING_THRESHOLD = 300;

/**
 * Recursively scans a folder for supported ebook files
 * @param {string} folderPath - Path to the folder to scan
 * @param {boolean} recursive - Whether to scan subdirectories
 * @returns {Promise<{files: FileInfo[], warning: string|null}>}
 */
async function scanFolder(folderPath, recursive = false) {
  const files = [];

  try {
    await walkDir(folderPath, files, recursive);
  } catch (err) {
    throw new Error(`Failed to scan folder: ${err.message}`);
  }

  // Sort: PDFs first, then EPUBs, alphabetically within each group
  files.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'pdf' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  let warning = null;
  const trimmed = files.slice(0, MAX_FILES);

  if (files.length > MAX_FILES) {
    warning = `Found ${files.length} files. Only the first ${MAX_FILES} will be processed (hard limit).`;
  } else if (files.length > WARNING_THRESHOLD) {
    warning = `Found ${files.length} files. Processing large batches may take a while.`;
  }

  return { files: trimmed, total: files.length, warning };
}

/**
 * Recursively walks a directory and collects supported files
 * @param {string} dirPath - Current directory path
 * @param {FileInfo[]} collector - Array to push results into
 * @param {boolean} recursive - Whether to go into subdirectories
 */
async function walkDir(dirPath, collector, recursive) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory() && recursive) {
      await walkDir(fullPath, collector, recursive);
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) continue;

    const stat = fs.statSync(fullPath);
    const type = ext === '.pdf' ? 'pdf' : 'epub';

    collector.push({
      id: generateId(fullPath),
      name: entry.name,
      path: fullPath,
      type,
      size: stat.size,
      sizeFormatted: formatBytes(stat.size),
      status: type === 'epub' ? 'skipped' : 'pending',
      error: null,
      outputPath: null,
    });
  }
}

/**
 * Generate a simple hash-based ID for a file path
 * @param {string} filePath
 * @returns {string}
 */
function generateId(filePath) {
  let hash = 0;
  for (let i = 0; i < filePath.length; i++) {
    const char = filePath.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + Date.now().toString(36);
}

/**
 * Format bytes into human-readable string
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

module.exports = { scanFolder, formatBytes };
