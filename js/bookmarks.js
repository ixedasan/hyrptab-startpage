/**
 * bookmarks.js — Loads Chrome bookmarks and top sites via the extensions API
 */

const Bookmarks = (() => {

  function getFavicon(url) {
    try {
      const u = new URL(url);
      return `https://www.google.com/s2/favicons?sz=32&domain=${u.hostname}`;
    } catch {
      return null;
    }
  }

  function getShortName(title, url) {
    if (title && title.trim()) return title.trim();
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  function createLinkItem(title, url) {
    const a = document.createElement('a');
    a.className = 'link-item';
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = title || url;

    const faviconEl = document.createElement('span');
    faviconEl.className = 'link-favicon';

    const faviconUrl = getFavicon(url);
    if (faviconUrl) {
      const img = document.createElement('img');
      img.src = faviconUrl;
      img.alt = '';
      img.onerror = () => { img.style.display='none'; faviconEl.textContent = '⬡'; };
      faviconEl.appendChild(img);
    } else {
      faviconEl.textContent = '⬡';
    }

    const nameEl = document.createElement('span');
    nameEl.className = 'link-name';
    nameEl.textContent = getShortName(title, url);

    a.appendChild(faviconEl);
    a.appendChild(nameEl);
    return a;
  }

  // ── Flatten bookmarks tree ──
  function flattenBookmarks(nodes, results = [], depth = 0) {
    for (const node of nodes) {
      if (node.url && depth > 0) {
        results.push({ title: node.title, url: node.url });
      }
      if (node.children) {
        flattenBookmarks(node.children, results, depth + 1);
      }
    }
    return results;
  }

  function loadBookmarks() {
    const container = document.getElementById('bookmarks-list');
    if (!container) return;

    if (!chrome.bookmarks) {
      container.innerHTML = '<div class="link-placeholder">bookmarks unavailable</div>';
      return;
    }

    chrome.bookmarks.getTree((tree) => {
      const all = flattenBookmarks(tree);
      container.innerHTML = '';

      if (all.length === 0) {
        container.innerHTML = '<div class="link-placeholder">no bookmarks found</div>';
        return;
      }

      // Show max 20 most recent (tree order = most recently added)
      const shown = all.slice(-20).reverse();
      shown.forEach(({ title, url }) => {
        container.appendChild(createLinkItem(title, url));
      });
    });
  }

  function loadTopSites() {
    const container = document.getElementById('topsites-list');
    if (!container) return;

    if (!chrome.topSites) {
      container.innerHTML = '<div class="link-placeholder">top sites unavailable</div>';
      return;
    }

    chrome.topSites.get((sites) => {
      container.innerHTML = '';

      if (!sites || sites.length === 0) {
        container.innerHTML = '<div class="link-placeholder">no top sites</div>';
        return;
      }

      sites.slice(0, 12).forEach(({ title, url }) => {
        container.appendChild(createLinkItem(title, url));
      });
    });
  }

  function init() {
    loadBookmarks();
    loadTopSites();
  }

  return { init };
})();
