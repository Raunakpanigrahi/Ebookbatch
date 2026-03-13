/**
 * converter/epubGenerator.js
 * Generates a valid EPUB 2.0 archive from extracted content
 */

const JSZip = require('jszip');
const path = require('path');
const { sanitizeFilename } = require('../utils/helpers');

/**
 * Generate an EPUB file from extracted PDF content
 * @param {object} opts
 * @param {string} opts.title - Book title
 * @param {string} opts.author - Book author (optional)
 * @param {string[]} opts.pages - Array of page text content
 * @param {string} opts.outputPath - Where to save the EPUB
 * @param {Function} opts.onProgress - Progress callback (0–100)
 * @returns {Promise<string>} - Path to the generated EPUB file
 */
async function generateEpub({ title, author = 'Unknown Author', pages, outputPath, onProgress }) {
  const zip = new JSZip();

  onProgress?.(10);

  // ── 1. mimetype (must be first, uncompressed) ───────────────────────
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  onProgress?.(15);

  // ── 2. META-INF/container.xml ────────────────────────────────────────
  zip.folder('META-INF').file('container.xml', buildContainerXml());

  onProgress?.(20);

  // ── 3. OEBPS content ─────────────────────────────────────────────────
  const oebps = zip.folder('OEBPS');
  const bookId = generateUUID();
  const safeTitle = sanitizeFilename(title);

  // Split pages into chapters (every 10 pages = 1 chapter)
  const chapters = splitIntoChapters(pages, 10);

  onProgress?.(25);

  // Generate chapter XHTML files
  const chapterFiles = [];
  for (let i = 0; i < chapters.length; i++) {
    const chapterId = `chapter${i + 1}`;
    const chapterTitle = chapters.length > 1 ? `Chapter ${i + 1}` : safeTitle;
    const xhtml = buildChapterXhtml(chapterTitle, chapters[i]);
    oebps.file(`${chapterId}.xhtml`, xhtml);
    chapterFiles.push({ id: chapterId, title: chapterTitle, file: `${chapterId}.xhtml` });

    // Report progress for chapter generation (25–60%)
    const chapterProgress = 25 + Math.floor(((i + 1) / chapters.length) * 35);
    onProgress?.(chapterProgress);
  }

  // ── 4. Stylesheet ────────────────────────────────────────────────────
  oebps.file('styles.css', buildStylesheet());

  onProgress?.(65);

  // ── 5. content.opf ───────────────────────────────────────────────────
  oebps.file('content.opf', buildContentOpf({
    bookId,
    title: safeTitle,
    author,
    chapters: chapterFiles,
  }));

  onProgress?.(75);

  // ── 6. toc.ncx ───────────────────────────────────────────────────────
  oebps.file('toc.ncx', buildTocNcx({
    bookId,
    title: safeTitle,
    author,
    chapters: chapterFiles,
  }));

  onProgress?.(85);

  // ── 7. Generate ZIP buffer ────────────────────────────────────────────
  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  onProgress?.(95);

  // ── 8. Write to disk ──────────────────────────────────────────────────
  const fs = require('fs');
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, buffer);

  onProgress?.(100);

  return outputPath;
}

// ─── XML/HTML Builders ────────────────────────────────────────────────────────

function buildContainerXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
}

function buildContentOpf({ bookId, title, author, chapters }) {
  const manifestItems = chapters.map(ch =>
    `    <item id="${ch.id}" href="${ch.file}" media-type="application/xhtml+xml"/>`
  ).join('\n');

  const spineItems = chapters.map(ch =>
    `    <itemref idref="${ch.id}"/>`
  ).join('\n');

  const now = new Date().toISOString().split('T')[0];

  return `<?xml version="1.0" encoding="UTF-8"?>
<package version="2.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="BookId" opf:scheme="UUID">${bookId}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator opf:role="aut">${escapeXml(author)}</dc:creator>
    <dc:language>en</dc:language>
    <dc:date opf:event="publication">${now}</dc:date>
    <dc:publisher>Ebook Batch Converter</dc:publisher>
    <meta name="cover" content="cover"/>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="styles.css" media-type="text/css"/>
${manifestItems}
  </manifest>
  <spine toc="ncx">
${spineItems}
  </spine>
</package>`;
}

function buildTocNcx({ bookId, title, author, chapters }) {
  const navPoints = chapters.map((ch, i) =>
    `  <navPoint id="${ch.id}" playOrder="${i + 1}">
    <navLabel><text>${escapeXml(ch.title)}</text></navLabel>
    <content src="${ch.file}"/>
  </navPoint>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <docAuthor><text>${escapeXml(author)}</text></docAuthor>
  <navMap>
${navPoints}
  </navMap>
</ncx>`;
}

function buildChapterXhtml(title, paragraphs) {
  const paragraphHtml = paragraphs
    .filter(p => p.trim().length > 0)
    .map(p => `  <p>${escapeXml(p.trim())}</p>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head>
  <meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8"/>
  <title>${escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <h1>${escapeXml(title)}</h1>
${paragraphHtml || '  <p><em>No content extracted for this section.</em></p>'}
</body>
</html>`;
}

function buildStylesheet() {
  return `body {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1em;
  line-height: 1.6;
  margin: 1em 2em;
  color: #1a1a1a;
}

h1 {
  font-size: 1.6em;
  font-weight: bold;
  margin-bottom: 1em;
  border-bottom: 1px solid #ccc;
  padding-bottom: 0.4em;
}

p {
  margin: 0.6em 0;
  text-indent: 1.5em;
  text-align: justify;
}

p:first-of-type {
  text-indent: 0;
}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Split pages array into chapters of N pages each
 */
function splitIntoChapters(pages, pagesPerChapter) {
  const chapters = [];
  for (let i = 0; i < pages.length; i += pagesPerChapter) {
    const chunkPages = pages.slice(i, i + pagesPerChapter);
    // Each "page" of text becomes a paragraph
    const paragraphs = chunkPages.flatMap(page =>
      page.split(/\n{2,}/).filter(p => p.trim().length > 0)
    );
    chapters.push(paragraphs.length > 0 ? paragraphs : ['[Empty page]']);
  }
  return chapters.length > 0 ? chapters : [['No content could be extracted from this PDF.']];
}

/**
 * Escape XML special characters
 */
function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate a simple UUID v4
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

module.exports = { generateEpub };
