/**
 * converter/pdfConverter.js
 * Extracts content from PDF and converts to EPUB
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const TEMP_DIR = path.join(os.tmpdir(), 'ebook-converter');

/**
 * Convert a PDF file to EPUB format
 * @param {string} pdfPath - Path to the source PDF file
 * @param {Function} onProgress - Progress callback (0–100)
 * @returns {Promise<string>} - Path to the generated EPUB
 */
async function convertPdfToEpub(pdfPath, onProgress) {
  // Ensure temp directory exists
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  onProgress?.(5);

  // ── Step 1: Extract text from PDF ─────────────────────────────────
  let pdfData;
  try {
    pdfData = await extractPdfContent(pdfPath, onProgress);
  } catch (err) {
    throw new Error(`PDF extraction failed: ${err.message}`);
  }

  onProgress?.(50);

  // ── Step 2: Derive title and author ───────────────────────────────
  const title = deriveTitle(pdfPath, pdfData.info);
  const author = pdfData.info?.Author || 'Unknown Author';

  // ── Step 3: Generate EPUB ─────────────────────────────────────────
  const epubName = path.basename(pdfPath, '.pdf') + '.epub';
  const outputPath = path.join(TEMP_DIR, epubName);

  const { generateEpub } = require('./epubGenerator');

  try {
    await generateEpub({
      title,
      author,
      pages: pdfData.pages,
      outputPath,
      onProgress: (p) => {
        // Map 50–100 range for EPUB generation phase
        onProgress?.(50 + Math.floor(p * 0.5));
      },
    });
  } catch (err) {
    throw new Error(`EPUB generation failed: ${err.message}`);
  }

  return outputPath;
}

/**
 * Extract text content from a PDF file
 * @param {string} pdfPath
 * @param {Function} onProgress
 * @returns {Promise<{pages: string[], info: object}>}
 */
async function extractPdfContent(pdfPath, onProgress) {
  const pdfParse = require('pdf-parse');

  const dataBuffer = fs.readFileSync(pdfPath);

  let currentPage = 0;
  let totalPages = 0;
  const pages = [];

  const options = {
    // Called for each page during parsing
    pagerender: async (pageData) => {
      const textContent = await pageData.getTextContent();
      let pageText = '';

      let lastY = null;
      for (const item of textContent.items) {
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += '\n';
        }
        pageText += item.str;
        lastY = item.transform[5];
      }

      pages.push(pageText);
      currentPage++;

      if (totalPages > 0) {
        const extractProgress = Math.floor((currentPage / totalPages) * 40) + 5;
        onProgress?.(Math.min(extractProgress, 45));
      }

      return pageText;
    },
  };

  const data = await pdfParse(dataBuffer, options);
  totalPages = data.numpages;

  // Fallback: if pagerender didn't populate pages, split by page markers
  if (pages.length === 0 && data.text) {
    const rawPages = data.text.split(/\f/).filter(p => p.trim().length > 0);
    pages.push(...rawPages);
  }

  // Ensure at least one page of content
  if (pages.length === 0) {
    pages.push(data.text || 'No text content could be extracted from this PDF.');
  }

  return {
    pages,
    info: data.info || {},
    numPages: data.numpages,
  };
}

/**
 * Derive a clean title from PDF metadata or filename
 * @param {string} filePath
 * @param {object} info - PDF metadata
 * @returns {string}
 */
function deriveTitle(filePath, info) {
  if (info?.Title && info.Title.trim().length > 0) {
    return info.Title.trim();
  }
  // Fall back to filename without extension
  return path.basename(filePath, path.extname(filePath))
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { convertPdfToEpub };
