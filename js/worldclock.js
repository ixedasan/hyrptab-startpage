/**
 * worldclock.js
 * Configurable world clocks (add/remove cities/timezones) + quick unit converter.
 * Persists to chrome.storage.
 */

const WorldClock = (() => {

  const STORAGE_KEY = 'worldClocks';

  const DEFAULT_CLOCKS = [
    { id: '1', label: 'New York',  tz: 'America/New_York' },
    { id: '2', label: 'London',    tz: 'Europe/London' },
    { id: '3', label: 'Tokyo',     tz: 'Asia/Tokyo' },
    { id: '4', label: 'UTC',       tz: 'UTC' },
  ];

  // Common timezones for the picker
  const TZ_LIST = [
    'UTC',
    'America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
    'America/Sao_Paulo','America/Toronto','America/Mexico_City','America/Vancouver',
    'Europe/London','Europe/Paris','Europe/Berlin','Europe/Madrid','Europe/Rome',
    'Europe/Amsterdam','Europe/Stockholm','Europe/Warsaw','Europe/Kiev',
    'Europe/Istanbul','Africa/Cairo','Africa/Johannesburg','Africa/Lagos',
    'Asia/Dubai','Asia/Kolkata','Asia/Dhaka','Asia/Bangkok','Asia/Singapore',
    'Asia/Shanghai','Asia/Tokyo','Asia/Seoul','Asia/Hong_Kong',
    'Australia/Sydney','Australia/Melbourne','Pacific/Auckland','Pacific/Honolulu',
  ];

  // ── Unit converter config ──
  const CONVERTERS = [
    {
      id: 'temp', label: '°C ↔ °F',
      aLabel: '°C', bLabel: '°F',
      aToB: v => v * 9/5 + 32,
      bToA: v => (v - 32) * 5/9,
    },
    {
      id: 'length', label: 'km ↔ mi',
      aLabel: 'km', bLabel: 'mi',
      aToB: v => v * 0.621371,
      bToA: v => v / 0.621371,
    },
    {
      id: 'pxrem', label: 'px ↔ rem',
      aLabel: 'px', bLabel: 'rem',
      aToB: v => v / 16,
      bToA: v => v * 16,
    },
    {
      id: 'kg', label: 'kg ↔ lb',
      aLabel: 'kg', bLabel: 'lb',
      aToB: v => v * 2.20462,
      bToA: v => v / 2.20462,
    },
    {
      id: 'bytes', label: 'MB ↔ MiB',
      aLabel: 'MB', bLabel: 'MiB',
      aToB: v => v * 1000000 / 1048576,
      bToA: v => v * 1048576 / 1000000,
    },
  ];

  let clocks = [];
  let clockInterval = null;
  let activeConverter = CONVERTERS[0];
  let editingClocks = false;

  // ─────────────────────────────────────────────
  // Storage
  // ─────────────────────────────────────────────

  function loadClocks(cb) {
    chrome.storage.local.get([STORAGE_KEY], (r) => {
      cb(r[STORAGE_KEY] || DEFAULT_CLOCKS.map(c => ({ ...c })));
    });
  }

  function saveClocks(data) {
    chrome.storage.local.set({ [STORAGE_KEY]: data });
  }

  function uid() { return Math.random().toString(36).slice(2, 9); }

  // ─────────────────────────────────────────────
  // Clock rendering
  // ─────────────────────────────────────────────

  function formatTZ(tz) {
    try {
      const now = new Date();
      return now.toLocaleTimeString('en-GB', {
        timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false
      });
    } catch { return '--:--'; }
  }

  function getDayOffset(tz) {
    try {
      const now = new Date();
      const local = now.toLocaleDateString('en-CA');
      const remote = now.toLocaleDateString('en-CA', { timeZone: tz });
      const diff = (new Date(remote) - new Date(local)) / 86400000;
      if (diff === 1) return '+1';
      if (diff === -1) return '-1';
      return '';
    } catch { return ''; }
  }

  function tickClocks() {
    clocks.forEach(({ id, tz }) => {
      const timeEl = document.getElementById(`wc-time-${id}`);
      if (timeEl) timeEl.textContent = formatTZ(tz);
    });
  }

  function renderClocks(container) {
    container.innerHTML = '';
    clocks.forEach((clock) => {
      const row = document.createElement('div');
      row.className = 'wc-row';

      const labelEl = document.createElement('div');
      labelEl.className = 'wc-label';
      labelEl.textContent = clock.label;

      const timeEl = document.createElement('div');
      timeEl.className = 'wc-time';
      timeEl.id = `wc-time-${clock.id}`;
      timeEl.textContent = formatTZ(clock.tz);

      const metaEl = document.createElement('div');
      metaEl.className = 'wc-meta';
      const offset = getDayOffset(clock.tz);
      if (offset) { const badge = document.createElement('span'); badge.className = 'wc-offset'; badge.textContent = offset; metaEl.appendChild(badge); }

      if (editingClocks) {
        const delBtn = document.createElement('button');
        delBtn.className = 'wc-del';
        delBtn.textContent = '✕';
        delBtn.addEventListener('click', () => {
          clocks = clocks.filter(c => c.id !== clock.id);
          saveClocks(clocks);
          renderClocks(container);
        });
        row.appendChild(delBtn);
      }

      row.appendChild(labelEl);
      row.appendChild(timeEl);
      row.appendChild(metaEl);
      container.appendChild(row);
    });
  }

  // ─────────────────────────────────────────────
  // Add clock modal
  // ─────────────────────────────────────────────

  function openAddClockModal(onAdd) {
    document.getElementById('wc-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'wc-modal';
    overlay.className = 'pin-modal-overlay';

    const tzOptions = TZ_LIST.map(tz => `<option value="${tz}">${tz.replace(/_/g,' ')}</option>`).join('');

    overlay.innerHTML = `
      <div class="pin-modal">
        <div class="pin-modal-tag">add world clock</div>
        <div class="pin-modal-field">
          <label>city / label</label>
          <input id="wc-label-input" type="text" placeholder="e.g. Berlin" spellcheck="false" autocomplete="off" />
        </div>
        <div class="pin-modal-field">
          <label>timezone</label>
          <select id="wc-tz-select" class="wc-tz-select">
            ${tzOptions}
          </select>
        </div>
        <div class="pin-modal-actions">
          <button id="wc-cancel">cancel</button>
          <button id="wc-confirm" class="pin-save">add</button>
        </div>
      </div>`;

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#wc-cancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#wc-confirm').addEventListener('click', () => {
      const label = overlay.querySelector('#wc-label-input').value.trim();
      const tz    = overlay.querySelector('#wc-tz-select').value;
      if (!label) return;
      onAdd({ id: uid(), label, tz });
      overlay.remove();
    });
    overlay.querySelector('#wc-label-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') overlay.querySelector('#wc-confirm').click();
      if (e.key === 'Escape') overlay.remove();
      e.stopPropagation();
    });

    document.body.appendChild(overlay);
    overlay.querySelector('#wc-label-input').focus();
  }

  // ─────────────────────────────────────────────
  // Unit converter rendering
  // ─────────────────────────────────────────────

  function fmt(n) {
    if (!isFinite(n)) return '—';
    const abs = Math.abs(n);
    if (abs === 0) return '0';
    if (abs < 0.001) return n.toExponential(3);
    if (abs < 1) return parseFloat(n.toPrecision(4)).toString();
    if (abs < 10000) return parseFloat(n.toPrecision(6)).toString();
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  function renderConverter(container) {
    container.innerHTML = '';

    // Converter tabs
    const tabs = document.createElement('div');
    tabs.className = 'uc-tabs';
    CONVERTERS.forEach(conv => {
      const btn = document.createElement('button');
      btn.className = 'uc-tab' + (conv.id === activeConverter.id ? ' active' : '');
      btn.textContent = conv.label;
      btn.addEventListener('click', () => { activeConverter = conv; renderConverter(container); });
      tabs.appendChild(btn);
    });
    container.appendChild(tabs);

    // Converter inputs
    const body = document.createElement('div');
    body.className = 'uc-body';

    const aWrap = document.createElement('div'); aWrap.className = 'uc-field';
    const aInput = document.createElement('input');
    aInput.className = 'uc-input'; aInput.type = 'number'; aInput.placeholder = '0';
    aInput.spellcheck = false; aInput.autocomplete = 'off';
    const aLabel = document.createElement('span'); aLabel.className = 'uc-unit'; aLabel.textContent = activeConverter.aLabel;
    aWrap.appendChild(aInput); aWrap.appendChild(aLabel);

    const arrow = document.createElement('div'); arrow.className = 'uc-arrow'; arrow.textContent = '⇆';

    const bWrap = document.createElement('div'); bWrap.className = 'uc-field';
    const bInput = document.createElement('input');
    bInput.className = 'uc-input'; bInput.type = 'number'; bInput.placeholder = '0';
    bInput.spellcheck = false; bInput.autocomplete = 'off';
    const bLabel = document.createElement('span'); bLabel.className = 'uc-unit'; bLabel.textContent = activeConverter.bLabel;
    bWrap.appendChild(bInput); bWrap.appendChild(bLabel);

    aInput.addEventListener('input', () => {
      const v = parseFloat(aInput.value);
      bInput.value = isNaN(v) ? '' : fmt(activeConverter.aToB(v));
    });
    bInput.addEventListener('input', () => {
      const v = parseFloat(bInput.value);
      aInput.value = isNaN(v) ? '' : fmt(activeConverter.bToA(v));
    });

    // Stop keyboard events from bubbling to search
    [aInput, bInput].forEach(inp => {
      inp.addEventListener('keydown', e => e.stopPropagation());
    });

    body.appendChild(aWrap); body.appendChild(arrow); body.appendChild(bWrap);
    container.appendChild(body);
  }

  // ─────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────

  function init() {
    const tile = document.getElementById('tile-worldclock');
    if (!tile) return;

    const clocksContainer  = document.getElementById('wc-clocks');
    const converterContainer = document.getElementById('wc-converter');
    const editBtn  = document.getElementById('wc-edit-btn');
    const addBtn   = document.getElementById('wc-add-btn');

    if (!clocksContainer || !converterContainer) return;

    loadClocks((saved) => {
      clocks = saved;
      renderClocks(clocksContainer);
      renderConverter(converterContainer);

      if (clockInterval) clearInterval(clockInterval);
      clockInterval = setInterval(tickClocks, 1000);
    });

    if (editBtn) {
      editBtn.addEventListener('click', () => {
        editingClocks = !editingClocks;
        editBtn.textContent = editingClocks ? 'done' : 'edit';
        renderClocks(clocksContainer);
      });
    }

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        openAddClockModal((newClock) => {
          clocks.push(newClock);
          saveClocks(clocks);
          renderClocks(clocksContainer);
        });
      });
    }
  }

  return { init };
})();
