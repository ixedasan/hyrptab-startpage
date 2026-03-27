/**
 * bookmarks.js
 *
 * "frequent" tile  → user-pinned links, grid layout, editable
 * "bookmarks" tile → bookmarks bar tree (folders + links), scrollable, no visible scrollbar
 * All links open in the same tab.
 */

const Bookmarks = (() => {

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────

  function getFaviconUrl(url) {
    try {
      const { hostname } = new URL(url);
      return `https://www.google.com/s2/favicons?sz=32&domain=${hostname}`;
    } catch { return null; }
  }

  function shortTitle(title, url) {
    if (title && title.trim()) return title.trim();
    try { return new URL(url).hostname.replace(/^www\./, ''); }
    catch { return url; }
  }

  // ─────────────────────────────────────────────
  // PINNED (frequent) — user-managed grid
  // ─────────────────────────────────────────────

  const STORAGE_KEY = 'pinnedLinks';

  function loadPinned(cb) {
    chrome.storage.local.get([STORAGE_KEY], (r) => cb(r[STORAGE_KEY] || []));
  }

  function savePinned(pins, cb) {
    chrome.storage.local.set({ [STORAGE_KEY]: pins }, cb);
  }

  let editMode = false;

  function renderPinned() {
    const grid = document.getElementById('pinned-grid');
    const editBtn = document.getElementById('pinned-edit-btn');
    if (!grid) return;

    loadPinned((pins) => {
      grid.innerHTML = '';

      pins.forEach((pin, idx) => {
        const cell = document.createElement('div');
        cell.className = 'pinned-cell';

        // Remove button (edit mode)
        const removeBtn = document.createElement('button');
        removeBtn.className = 'pinned-remove';
        removeBtn.textContent = '✕';
        removeBtn.title = 'Remove';
        removeBtn.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          loadPinned((p) => { p.splice(idx, 1); savePinned(p, renderPinned); });
        });

        // Link
        const a = document.createElement('a');
        a.href = pin.url;
        a.className = 'pinned-link';
        a.title = pin.title || pin.url;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          if (editMode) return;
          window.location.href = pin.url;
        });

        // Favicon
        const ico = document.createElement('div');
        ico.className = 'pinned-favicon';
        const faviconUrl = getFaviconUrl(pin.url);
        if (faviconUrl) {
          const img = document.createElement('img');
          img.src = faviconUrl;
          img.alt = '';
          img.onerror = () => { img.style.display = 'none'; ico.textContent = '⬡'; };
          ico.appendChild(img);
        } else {
          ico.textContent = '⬡';
        }

        // Label
        const lbl = document.createElement('div');
        lbl.className = 'pinned-label';
        lbl.textContent = shortTitle(pin.title, pin.url);

        a.appendChild(ico);
        a.appendChild(lbl);
        cell.appendChild(removeBtn);
        cell.appendChild(a);
        grid.appendChild(cell);
      });

      // "Add" cell
      const addCell = document.createElement('div');
      addCell.className = 'pinned-cell pinned-add-cell';
      addCell.title = 'Pin a link';
      addCell.innerHTML = `<span class="pinned-add-icon">+</span><span class="pinned-add-label">add</span>`;
      addCell.addEventListener('click', () => openAddModal());
      grid.appendChild(addCell);

      grid.classList.toggle('edit-mode', editMode);
      if (editBtn) editBtn.textContent = editMode ? 'done' : 'edit';
    });
  }

  function openAddModal() {
    document.getElementById('pin-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'pin-modal';
    overlay.className = 'pin-modal-overlay';
    overlay.innerHTML = `
      <div class="pin-modal">
        <div class="pin-modal-tag">pin a link</div>
        <div class="pin-modal-field">
          <label>url</label>
          <input id="pin-url-input" type="text" placeholder="https://example.com" spellcheck="false" autocomplete="off" />
        </div>
        <div class="pin-modal-field">
          <label>name <span style="color:var(--text-dimmer)">(optional)</span></label>
          <input id="pin-name-input" type="text" placeholder="auto-detected" spellcheck="false" autocomplete="off" />
        </div>
        <div class="pin-modal-actions">
          <button id="pin-cancel-btn">cancel</button>
          <button id="pin-save-btn" class="pin-save">pin</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const urlInput  = document.getElementById('pin-url-input');
    const nameInput = document.getElementById('pin-name-input');
    urlInput.focus();

    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.getElementById('pin-cancel-btn').addEventListener('click', () => overlay.remove());
    document.getElementById('pin-save-btn').addEventListener('click', () => {
      let url = urlInput.value.trim();
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      const title = nameInput.value.trim() || '';
      loadPinned((pins) => {
        pins.push({ url, title });
        savePinned(pins, () => { overlay.remove(); renderPinned(); });
      });
    });
    [urlInput, nameInput].forEach(inp => {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('pin-save-btn').click();
        if (e.key === 'Escape') overlay.remove();
      });
    });
  }

  function initPinned() {
    const editBtn = document.getElementById('pinned-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => { editMode = !editMode; renderPinned(); });
    }
    renderPinned();
  }

  // ─────────────────────────────────────────────
  // BOOKMARKS BAR — tree with folders
  // ─────────────────────────────────────────────

  function createBookmarkLink(node) {
    const a = document.createElement('a');
    a.className = 'link-item bm-link';
    a.href = node.url;
    a.title = node.title || node.url;
    a.addEventListener('click', (e) => { e.preventDefault(); window.location.href = node.url; });

    const ico = document.createElement('span');
    ico.className = 'link-favicon';
    const faviconUrl = getFaviconUrl(node.url);
    if (faviconUrl) {
      const img = document.createElement('img');
      img.src = faviconUrl; img.alt = '';
      img.onerror = () => { img.style.display = 'none'; ico.textContent = '⬡'; };
      ico.appendChild(img);
    } else { ico.textContent = '⬡'; }

    const lbl = document.createElement('span');
    lbl.className = 'link-name';
    lbl.textContent = shortTitle(node.title, node.url);

    a.appendChild(ico); a.appendChild(lbl);
    return a;
  }

  function createFolderEl(node) {
    const wrap = document.createElement('div');
    wrap.className = 'bm-folder';

    const header = document.createElement('div');
    header.className = 'bm-folder-header';
    header.innerHTML = `<span class="bm-folder-arrow">▸</span><span class="bm-folder-name">${node.title || 'folder'}</span>`;

    const children = document.createElement('div');
    children.className = 'bm-folder-children';
    children.style.display = 'none';

    header.addEventListener('click', () => {
      const open = children.style.display !== 'none';
      children.style.display = open ? 'none' : 'block';
      header.querySelector('.bm-folder-arrow').textContent = open ? '▸' : '▾';
    });

    (node.children || []).forEach(child => {
      if (child.url) children.appendChild(createBookmarkLink(child));
      else if (child.children) children.appendChild(createFolderEl(child));
    });

    wrap.appendChild(header);
    wrap.appendChild(children);
    return wrap;
  }

  function loadBookmarksBar() {
    const container = document.getElementById('bookmarks-list');
    if (!container) return;
    if (!chrome.bookmarks) {
      container.innerHTML = '<div class="link-placeholder">bookmarks unavailable</div>';
      return;
    }

    // Node id "1" = Bookmarks Bar
    chrome.bookmarks.getSubTree('1', ([barNode]) => {
      container.innerHTML = '';
      const items = barNode?.children || [];
      if (items.length === 0) {
        container.innerHTML = '<div class="link-placeholder">bookmarks bar is empty</div>';
        return;
      }
      items.forEach(item => {
        if (item.url) container.appendChild(createBookmarkLink(item));
        else container.appendChild(createFolderEl(item));
      });
    });
  }

  // ─────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────

  function init() {
    initPinned();
    loadBookmarksBar();
  }

  return { init };
})();
