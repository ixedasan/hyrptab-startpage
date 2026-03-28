/**
 * pomodoro.js — Pomodoro timer with ring progress, session tracking, persistence
 */

const Pomodoro = (() => {

  const CIRCUMFERENCE = 2 * Math.PI * 54; // matches SVG r=54

  let totalSecs = 25 * 60;
  let remaining = totalSecs;
  let running = false;
  let interval = null;
  let sessions = 0;

  function pad(n) { return String(n).padStart(2, '0'); }

  function formatTime(s) {
    return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  }

  function setRing(ratio) {
    const fill = document.getElementById('pomo-ring-fill');
    if (!fill) return;
    fill.style.strokeDashoffset = CIRCUMFERENCE * (1 - ratio);
  }

  function updateDisplay() {
    const timeEl  = document.getElementById('pomo-time');
    if (timeEl) timeEl.textContent = formatTime(remaining);
    setRing(remaining / totalSecs);
  }

  function tick() {
    if (remaining <= 0) {
      clearInterval(interval);
      running = false;
      updateStartBtn();
      onComplete();
      return;
    }
    remaining--;
    updateDisplay();
  }

  function onComplete() {
    sessions++;
    updateDots();
    // Flash the ring green briefly
    const fill = document.getElementById('pomo-ring-fill');
    if (fill) {
      fill.style.stroke = 'var(--accent3)';
      setTimeout(() => { if (fill) fill.style.stroke = 'var(--accent)'; }, 1500);
    }
    chrome.storage.local.set({ pomoSessions: sessions });
  }

  function updateStartBtn() {
    const btn = document.getElementById('pomo-start');
    if (!btn) return;
    btn.textContent = running ? 'pause' : 'start';
    btn.classList.toggle('running', running);
  }

  function updateDots() {
    const dotsEl = document.getElementById('pomo-dots');
    if (!dotsEl) return;
    dotsEl.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const dot = document.createElement('div');
      dot.className = 'pomo-dot' + (i < sessions % 4 ? ' done' : '');
      dotsEl.appendChild(dot);
    }
  }

  function setMode(mins, label) {
    clearInterval(interval);
    running = false;
    totalSecs = mins * 60;
    remaining = totalSecs;
    updateDisplay();
    updateStartBtn();

    const labelEl = document.getElementById('pomo-label');
    if (labelEl) labelEl.textContent = label;

    document.querySelectorAll('.pomo-mode').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.mins) === mins);
    });
  }

  function init() {
    // Restore sessions from storage
    chrome.storage.local.get(['pomoSessions'], ({ pomoSessions }) => {
      if (pomoSessions) { sessions = pomoSessions; updateDots(); }
    });

    updateDisplay();
    updateDots();

    // Mode tabs
    document.querySelectorAll('.pomo-mode').forEach(btn => {
      btn.addEventListener('click', () => setMode(parseInt(btn.dataset.mins), btn.dataset.label));
    });

    // Start/pause
    const startBtn = document.getElementById('pomo-start');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (running) {
          clearInterval(interval);
          running = false;
        } else {
          if (remaining === 0) { remaining = totalSecs; updateDisplay(); }
          interval = setInterval(tick, 1000);
          running = true;
        }
        updateStartBtn();
      });
    }

    // Reset
    const resetBtn = document.getElementById('pomo-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        clearInterval(interval);
        running = false;
        remaining = totalSecs;
        updateDisplay();
        updateStartBtn();
      });
    }
  }

  return { init };
})();
