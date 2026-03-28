/**
 * bookmarks.js
 *
 * "frequent" tile  → user-pinned links in named groups, grid layout,
 *                    drag-to-reorder within groups, add/remove/rename groups,
 *                    edit link name/url inline
 * "bookmarks" tile → bookmarks bar tree (folders + links), hidden scrollbar
 * All links open in the same tab.
 */

const Bookmarks = (() => {

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────

  function getFaviconUrl(url) {
    try { return `https://www.google.com/s2/favicons?sz=32&domain=${new URL(url).hostname}`; }
    catch { return null; }
  }

  function shortTitle(title, url) {
    if (title && title.trim()) return title.trim();
    try { return new URL(url).hostname.replace(/^www\./, ''); }
    catch { return url; }
  }

  // ─────────────────────────────────────────────
  // Storage — groups: [{ id, name, items: [{ id, url, title }] }]
  // ─────────────────────────────────────────────

  const STORAGE_KEY = 'pinnedGroups';

  function loadGroups(cb) {
    chrome.storage.local.get([STORAGE_KEY], (r) => {
      let groups = r[STORAGE_KEY];
      if (!groups || !Array.isArray(groups) || groups.length === 0) {
        groups = [{ id: uid(), name: 'pinned', items: [] }];
      }
      cb(groups);
    });
  }

  function saveGroups(groups, cb) {
    chrome.storage.local.set({ [STORAGE_KEY]: groups }, cb || (() => {}));
  }

  function uid() { return Math.random().toString(36).slice(2, 9); }

  // ─────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────

  let editMode = false;
  let activeGroupId = null;
  let dragState = null; // { groupId, itemId, el, ghost, startX, startY }

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  function render() {
    const root = document.getElementById('pinned-root');
    const editBtn = document.getElementById('pinned-edit-btn');
    if (!root) return;

    loadGroups((groups) => {
      // Restore active group or default to first
      if (!activeGroupId || !groups.find(g => g.id === activeGroupId)) {
        activeGroupId = groups[0].id;
      }

      root.innerHTML = '';

      // ── Group tabs bar ──
      const tabBar = document.createElement('div');
      tabBar.className = 'pg-tabbar';

      groups.forEach(group => {
        const tab = document.createElement('div');
        tab.className = 'pg-tab' + (group.id === activeGroupId ? ' active' : '');
        tab.dataset.gid = group.id;

        if (editMode) {
          // Editable name
          const nameInput = document.createElement('input');
          nameInput.className = 'pg-tab-input';
          nameInput.value = group.name;
          nameInput.spellcheck = false;
          nameInput.addEventListener('blur', () => {
            const val = nameInput.value.trim();
            if (val) {
              loadGroups((gs) => {
                const g = gs.find(g => g.id === group.id);
                if (g) { g.name = val; saveGroups(gs, render); }
              });
            }
          });
          nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') nameInput.blur();
            e.stopPropagation();
          });
          tab.appendChild(nameInput);

          // Delete group button (only if >1 group)
          if (groups.length > 1) {
            const delBtn = document.createElement('button');
            delBtn.className = 'pg-tab-del';
            delBtn.textContent = '✕';
            delBtn.title = 'Delete group';
            delBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              if (!confirm(`Delete group "${group.name}" and all its links?`)) return;
              loadGroups((gs) => {
                const idx = gs.findIndex(g => g.id === group.id);
                gs.splice(idx, 1);
                if (activeGroupId === group.id) activeGroupId = gs[0].id;
                saveGroups(gs, render);
              });
            });
            tab.appendChild(delBtn);
          }
        } else {
          tab.textContent = group.name;
          tab.addEventListener('click', () => {
            activeGroupId = group.id;
            render();
          });
        }

        tabBar.appendChild(tab);
      });

      // Add group button
      if (editMode) {
        const addTab = document.createElement('button');
        addTab.className = 'pg-tab-add';
        addTab.textContent = '+';
        addTab.title = 'New group';
        addTab.addEventListener('click', () => {
          loadGroups((gs) => {
            const newGroup = { id: uid(), name: 'group ' + (gs.length + 1), items: [] };
            gs.push(newGroup);
            activeGroupId = newGroup.id;
            saveGroups(gs, render);
          });
        });
        tabBar.appendChild(addTab);
      }

      root.appendChild(tabBar);

      // ── Active group grid ──
      const activeGroup = groups.find(g => g.id === activeGroupId) || groups[0];

      const grid = document.createElement('div');
      grid.className = 'pinned-grid' + (editMode ? ' edit-mode' : '');
      grid.dataset.gid = activeGroup.id;

      activeGroup.items.forEach((item, idx) => {
        grid.appendChild(makePinnedCell(item, idx, activeGroup, groups));
      });

      // Add cell
      const addCell = document.createElement('div');
      addCell.className = 'pinned-cell pinned-add-cell';
      addCell.title = 'Pin a link';
      addCell.innerHTML = `<span class="pinned-add-icon">+</span><span class="pinned-add-label">add</span>`;
      addCell.addEventListener('click', () => openAddModal(activeGroup.id));
      grid.appendChild(addCell);

      root.appendChild(grid);

      if (editBtn) editBtn.textContent = editMode ? 'done' : 'edit';

      // Activate tab click after re-render (non-edit mode tabs)
      if (!editMode) {
        root.querySelectorAll('.pg-tab').forEach(tab => {
          tab.addEventListener('click', () => {
            activeGroupId = tab.dataset.gid;
            render();
          });
        });
      }
    });
  }

  // ── Build one pinned cell ──
  function makePinnedCell(item, idx, group, allGroups) {
    const cell = document.createElement('div');
    cell.className = 'pinned-cell';
    cell.dataset.iid = item.id;
    cell.draggable = editMode;

    // ── Remove button ──
    const removeBtn = document.createElement('button');
    removeBtn.className = 'pinned-remove';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      loadGroups((gs) => {
        const g = gs.find(g => g.id === group.id);
        if (!g) return;
        g.items.splice(g.items.findIndex(i => i.id === item.id), 1);
        saveGroups(gs, render);
      });
    });

    // ── Edit button (pencil) ──
    const editItemBtn = document.createElement('button');
    editItemBtn.className = 'pinned-edit-item';
    editItemBtn.textContent = '✎';
    editItemBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      openEditModal(item, group.id);
    });

    // ── Move-to-group button (only if multiple groups) ──
    let moveBtn = null;
    if (allGroups.length > 1) {
      moveBtn = document.createElement('button');
      moveBtn.className = 'pinned-move-btn';
      moveBtn.textContent = '⇄';
      moveBtn.title = 'Move to group';

      const moveMenu = document.createElement('div');
      moveMenu.className = 'pinned-move-menu';
      allGroups.filter(g => g.id !== group.id).forEach(g => {
        const opt = document.createElement('button');
        opt.textContent = g.name;
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          loadGroups((gs) => {
            const srcGroup = gs.find(x => x.id === group.id);
            const dstGroup = gs.find(x => x.id === g.id);
            if (!srcGroup || !dstGroup) return;
            const itemIdx = srcGroup.items.findIndex(i => i.id === item.id);
            const [moved] = srcGroup.items.splice(itemIdx, 1);
            dstGroup.items.push(moved);
            saveGroups(gs, render);
          });
        });
        moveMenu.appendChild(opt);
      });

      moveBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        moveMenu.classList.toggle('open');
      });

      document.addEventListener('click', () => moveMenu.classList.remove('open'), { once: true });
      cell.appendChild(moveMenu);
    }

    // ── Link ──
    const a = document.createElement('a');
    a.href = item.url;
    a.className = 'pinned-link';
    a.title = item.title || item.url;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (editMode) return;
      window.location.href = item.url;
    });

    const ico = document.createElement('div');
    ico.className = 'pinned-favicon';
    const faviconUrl = getFaviconUrl(item.url);
    if (faviconUrl) {
      const img = document.createElement('img');
      img.src = faviconUrl; img.alt = '';
      img.onerror = () => { img.style.display = 'none'; ico.textContent = '⬡'; };
      ico.appendChild(img);
    } else { ico.textContent = '⬡'; }

    const lbl = document.createElement('div');
    lbl.className = 'pinned-label';
    lbl.textContent = shortTitle(item.title, item.url);

    a.appendChild(ico); a.appendChild(lbl);
    cell.appendChild(removeBtn);
    cell.appendChild(editItemBtn);
    if (moveBtn) cell.appendChild(moveBtn);
    cell.appendChild(a);

    // ── Drag-to-reorder (edit mode) ──
    if (editMode) {
      cell.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        startDrag(e, cell, item.id, group.id);
      });
    }

    return cell;
  }

  // ─────────────────────────────────────────────
  // Drag-to-reorder
  // ─────────────────────────────────────────────

  function startDrag(e, el, itemId, groupId) {
    const rect = el.getBoundingClientRect();
    const ghost = el.cloneNode(true);
    ghost.style.cssText = `
      position:fixed; pointer-events:none; z-index:9000; opacity:0.85;
      width:${rect.width}px; height:${rect.height}px;
      left:${rect.left}px; top:${rect.top}px;
      transition:none; border:1px solid var(--accent);
      background:color-mix(in srgb,var(--bg2) 95%,var(--accent));
      transform:scale(1.05);
    `;
    document.body.appendChild(ghost);
    el.style.opacity = '0.3';

    dragState = { itemId, groupId, el, ghost, startX: e.clientX, startY: e.clientY, rectLeft: rect.left, rectTop: rect.top };

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd, { once: true });
  }

  function onDragMove(e) {
    if (!dragState) return;
    const { ghost, rectLeft, rectTop, startX, startY } = dragState;
    ghost.style.left = (rectLeft + e.clientX - startX) + 'px';
    ghost.style.top  = (rectTop  + e.clientY - startY) + 'px';

    // Highlight potential drop target
    document.querySelectorAll('.pinned-cell').forEach(c => c.classList.remove('drag-over'));
    const target = getDragTarget(e.clientX, e.clientY);
    if (target && target !== dragState.el) target.classList.add('drag-over');
  }

  function onDragEnd(e) {
    document.removeEventListener('mousemove', onDragMove);
    if (!dragState) return;
    const { itemId, groupId, el, ghost } = dragState;
    ghost.remove();
    el.style.opacity = '';
    document.querySelectorAll('.pinned-cell').forEach(c => c.classList.remove('drag-over'));

    const target = getDragTarget(e.clientX, e.clientY);
    if (target && target !== el && target.dataset.iid) {
      const targetId = target.dataset.iid;
      loadGroups((gs) => {
        const g = gs.find(g => g.id === groupId);
        if (!g) return;
        const fromIdx = g.items.findIndex(i => i.id === itemId);
        const toIdx   = g.items.findIndex(i => i.id === targetId);
        if (fromIdx === -1 || toIdx === -1) return;
        const [moved] = g.items.splice(fromIdx, 1);
        g.items.splice(toIdx, 0, moved);
        saveGroups(gs, render);
      });
    }

    dragState = null;
  }

  function getDragTarget(x, y) {
    const grid = document.querySelector('.pinned-grid');
    if (!grid) return null;
    for (const cell of grid.querySelectorAll('.pinned-cell:not(.pinned-add-cell)')) {
      const r = cell.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return cell;
    }
    return null;
  }

  // ─────────────────────────────────────────────
  // Modals
  // ─────────────────────────────────────────────

  function openAddModal(groupId) {
    document.getElementById('pin-modal')?.remove();
    const overlay = makeModalOverlay('pin a link', [
      { id: 'pin-url-input',  label: 'url',  placeholder: 'https://example.com' },
      { id: 'pin-name-input', label: 'name', placeholder: 'auto-detected', optional: true },
    ], 'pin', (vals) => {
      let url = vals['pin-url-input'].trim();
      if (!url) return false;
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      const title = vals['pin-name-input'].trim() || '';
      loadGroups((gs) => {
        const g = gs.find(g => g.id === groupId);
        if (g) { g.items.push({ id: uid(), url, title }); saveGroups(gs, render); }
      });
      return true;
    });
    document.body.appendChild(overlay);
    overlay.querySelector('input').focus();
  }

  function openEditModal(item, groupId) {
    document.getElementById('pin-modal')?.remove();
    const overlay = makeModalOverlay('edit link', [
      { id: 'pin-url-input',  label: 'url',  placeholder: 'https://example.com', value: item.url },
      { id: 'pin-name-input', label: 'name', placeholder: 'auto-detected', value: item.title, optional: true },
    ], 'save', (vals) => {
      let url = vals['pin-url-input'].trim();
      if (!url) return false;
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      const title = vals['pin-name-input'].trim() || '';
      loadGroups((gs) => {
        const g = gs.find(g => g.id === groupId);
        if (!g) return;
        const it = g.items.find(i => i.id === item.id);
        if (it) { it.url = url; it.title = title; saveGroups(gs, render); }
      });
      return true;
    });
    document.body.appendChild(overlay);
    overlay.querySelector('input').focus();
  }

  function makeModalOverlay(tagText, fields, confirmLabel, onConfirm) {
    const overlay = document.createElement('div');
    overlay.id = 'pin-modal';
    overlay.className = 'pin-modal-overlay';

    const fieldsHTML = fields.map(f => `
      <div class="pin-modal-field">
        <label>${f.label}${f.optional ? ' <span style="color:var(--text-dimmer)">(optional)</span>' : ''}</label>
        <input id="${f.id}" type="text" placeholder="${f.placeholder}" value="${(f.value || '').replace(/"/g,'&quot;')}" spellcheck="false" autocomplete="off" />
      </div>
    `).join('');

    overlay.innerHTML = `
      <div class="pin-modal">
        <div class="pin-modal-tag">${tagText}</div>
        ${fieldsHTML}
        <div class="pin-modal-actions">
          <button id="pin-cancel-btn">cancel</button>
          <button id="pin-save-btn" class="pin-save">${confirmLabel}</button>
        </div>
      </div>
    `;

    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#pin-cancel-btn').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#pin-save-btn').addEventListener('click', () => {
      const vals = {};
      fields.forEach(f => { vals[f.id] = overlay.querySelector(`#${f.id}`).value; });
      if (onConfirm(vals)) overlay.remove();
    });
    overlay.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') overlay.querySelector('#pin-save-btn').click();
        if (e.key === 'Escape') overlay.remove();
        e.stopPropagation();
      });
    });

    return overlay;
  }

  // ─────────────────────────────────────────────
  // BOOKMARKS BAR — tree with folders, hidden scrollbar
  // ─────────────────────────────────────────────

  function createBookmarkLink(node) {
    const a = document.createElement('a');
    a.className = 'link-item bm-link';
    a.href = node.url; a.title = node.title || node.url;
    a.addEventListener('click', (e) => { e.preventDefault(); window.location.href = node.url; });

    const ico = document.createElement('span');
    ico.className = 'link-favicon';
    const fu = getFaviconUrl(node.url);
    if (fu) {
      const img = document.createElement('img');
      img.src = fu; img.alt = '';
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

    wrap.appendChild(header); wrap.appendChild(children);
    return wrap;
  }

  function loadBookmarksBar() {
    const container = document.getElementById('bookmarks-list');
    if (!container) return;
    if (!chrome.bookmarks) {
      container.innerHTML = '<div class="link-placeholder">bookmarks unavailable</div>';
      return;
    }
    chrome.bookmarks.getSubTree('1', ([barNode]) => {
      container.innerHTML = '';
      const items = barNode?.children || [];
      if (!items.length) {
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
    const editBtn = document.getElementById('pinned-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => { editMode = !editMode; render(); });
    }
    render();
    loadBookmarksBar();
  }

  return { init };
})();
