# 📚 Ebook Batch Converter

A modern desktop application to batch convert PDF files to EPUB format.  
Built with **Electron + Node.js** · **Vanilla HTML/CSS/JS** · No frontend frameworks.

> Built with passion by **Raunak Panigrahi**

---

## ✨ Features

| Feature | Details |
|---|---|
| 📁 Folder Selection | Pick any local folder to scan for PDF/EPUB files |
| 🖱️ Drag & Drop | Drag folders or files directly into the app |
| ⚡ Batch Conversion | Convert up to 500 PDF files to EPUB |
| 🔄 Queue System | 3 concurrent conversions, async processing |
| 📊 Live Progress | Per-file status + overall progress bar |
| 🔍 Search & Filter | Search by filename, filter by type/status |
| 📦 Export Options | Save to folder or export all as ZIP |
| 🌙 Dark / Light Mode | Toggle with persistent preference |
| 📈 Statistics | Total, Converted, Skipped, Failed counts |
| ⏱️ ETA Display | Estimated time remaining + elapsed time |

---

## 📁 Project Structure

```
ebook-converter/
├── main.js                  # Electron main process
├── preload.js               # Secure context bridge (IPC)
├── package.json
├── README.md
│
├── renderer/
│   ├── index.html           # Main UI
│   ├── styles.css           # Styling (dark/light themes)
│   └── script.js            # UI logic & state management
│
├── converter/
│   ├── pdfConverter.js      # PDF text extraction
│   ├── epubGenerator.js     # EPUB 2.0 packaging (JSZip)
│   └── queueManager.js      # Concurrency queue helper
│
└── utils/
    ├── fileScanner.js       # Folder scanning
    └── helpers.js           # Shared utilities
```

---

## 🚀 Installation & Setup

### Prerequisites

- **Node.js** v18 or higher → https://nodejs.org
- **npm** (comes with Node.js)

### Step 1 — Clone / Download the project

Place the `ebook-converter` folder wherever you like on your system.

### Step 2 — Install dependencies

Open a terminal in the project root and run:

```bash
cd ebook-converter
npm install
```

This installs:
- `electron` — desktop app runtime
- `pdf-parse` — PDF text extraction
- `jszip` — EPUB packaging
- `archiver` — ZIP export

### Step 3 — Run the app

```bash
npm start
```

The app window will open automatically.

---

## 🖥️ How to Use

1. **Select a Folder** — Click "Select Folder" or drag a folder into the drop zone
2. **Review Files** — PDF files show as "Pending", EPUB files show as "Already EPUB"
3. **Convert** — Click "Convert All PDFs" to start batch conversion
   - Files process 3 at a time (configurable in `converter/queueManager.js`)
   - Watch live status updates per row
4. **Export** — After conversion:
   - "Save to Folder" — copies EPUBs to a chosen directory
   - "Export as ZIP" — bundles all converted EPUBs into a ZIP archive

### Tips

- Use the **search bar** to find files by name
- Use **filter tabs** (All / PDF / EPUB / Pending / Done) to focus on specific files
- Click the **🔄 icon** on any failed file to retry just that file
- Toggle **Dark/Light mode** with the sidebar button

---

## ⚙️ Configuration

### Concurrency (files processed simultaneously)

Edit `converter/queueManager.js`:
```js
const CONCURRENCY = 3; // Change to 4 or 5 for faster processing
```

### File limits

Edit `utils/fileScanner.js`:
```js
const MAX_FILES = 500;          // Hard cap
const WARNING_THRESHOLD = 300;  // Warning shown above this count
```

---

## 🏗️ Build for Distribution

To package the app as a distributable:

```bash
# Install electron-builder
npm install --save-dev electron-builder

# Add to package.json scripts:
# "build": "electron-builder"

npm run build
```

The packaged app will appear in a `dist/` folder.

---

## 📝 EPUB Output Format

Generated EPUBs follow the **EPUB 2.0** standard:

```
mimetype                     (uncompressed)
META-INF/container.xml
OEBPS/content.opf            (metadata + manifest)
OEBPS/toc.ncx                (navigation)
OEBPS/chapter1.xhtml         (content chapters)
OEBPS/chapter2.xhtml
...
OEBPS/styles.css
```

Chapters are split every 10 PDF pages for readability.

---

## 🐛 Troubleshooting

| Issue | Solution |
|---|---|
| `Cannot find module 'pdf-parse'` | Run `npm install` again |
| Files show "Failed" | Check if the PDF is password-protected or corrupt |
| Conversion is slow | Reduce file batch size or close other apps |
| App won't launch | Ensure Node.js 18+ is installed |

---

## 📄 License

MIT — free to use, modify, and distribute.

---

*Ebook Batch Converter — Built with passion by Raunak Panigrahi*
