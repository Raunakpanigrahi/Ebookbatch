# Phase 1 Answers

**Q1. Find the addFiles() function completely.**
It processes files strictly sequentially using a `for...of` loop with an `await` on the IPC insertion.
```javascript
  const addedBooks = [];
  for (const f of unique) {
    if (window.electronAPI && window.electronAPI.library) {
      try {
        const res = await window.electronAPI.library.addBook({ ... });
```
It does NOT use `Promise.all`.

**Q2. Find loadCoversFor() completely.**
When called after bulk add, it receives the `addedBooks` array natively representing the successfully staged additions. It is called exactly once per bulk add, situated precisely at the tail end of `addFiles()`:
```javascript
  // Async cover extraction
  loadCoversFor(addedBooks);
```

**Q3. Concurrency Limits:**
There is no hard concurrency limit configured precisely because the extraction loop executes sequentially under a standard `for...of` await boundary.
```javascript
async function loadCoversFor(files) {
  for (const f of files) {
    ...
      const b64Data = await extractCoverBase64(f);
```

**Q4. extractCoverBase64() Mutable State:**
It does not consume node-level globals or overwrite sibling instances. 
```javascript
async function extractCoverBase64(file) {
  const result = await window.electronAPI.readFileBase64(file.path);
```

**Q5. IPC Layer (main.js) saveCover handler:**
It writes natively using `fs.writeFileSync` inside a synchronously dispatched handle wrapper:
```javascript
ipcMain.handle('library:saveCover', (event, bookId, base64Data) => {
  ...
    fs.writeFileSync(coverPath, buffer);
    const db = getLibraryDb();
    ...
      db[index].coverImage = coverUrl;
      saveLibraryDb(db);
```
Since main IPC dispatches process in chronological ticks across the Node runtime, file handles are entirely sequentially secured.

**Q6. renderLibraryGrid() triggers:**
During a bulk add:
```javascript
  renderLibraryGrid();
  showUI();

  // Async cover extraction
  loadCoversFor(addedBooks);
```
It fires exactly once *before* extraction occurs, guaranteeing the blank DOM placeholders exist prior to extraction loop invocation. Additionally, it triggers once *after* universally completing:
```javascript
  // After all extractions are done, do a single full render to catch any
  renderLibraryGrid();
```
