/**
 * clock.js — Live clock and date for all workspaces
 */

const Clock = (() => {

  const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function pad(n) { return String(n).padStart(2, '0'); }

  function update() {
    const now = new Date();
    const h = pad(now.getHours());
    const m = pad(now.getMinutes());
    const s = now.getSeconds();
    const dateStr = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;
    const fullDateStr = `${DAYS[now.getDay()].toLowerCase()}, ${now.getDate()} ${MONTHS[now.getMonth()].toLowerCase()} ${now.getFullYear()}`;

    // WS1 clock
    const elH = document.getElementById('clock-h');
    const elM = document.getElementById('clock-m');
    if (elH) elH.textContent = h;
    if (elM) elM.textContent = m;

    // Seconds progress bar
    const fill = document.getElementById('clock-secs-fill');
    if (fill) fill.style.width = `${(s / 59) * 100}%`;

    // Date strings
    ['clock-date-full', 'clock-date-full-2', 'clock-date-full-3'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = fullDateStr;
    });

    // WS2
    const h2 = document.getElementById('clock-h-2');
    const m2 = document.getElementById('clock-m-2');
    if (h2) h2.textContent = h;
    if (m2) m2.textContent = m;

    // WS3
    const h3 = document.getElementById('clock-h-3');
    const m3 = document.getElementById('clock-m-3');
    if (h3) h3.textContent = h;
    if (m3) m3.textContent = m;

    // Status bar
    const barTime = document.getElementById('bar-time');
    if (barTime) barTime.textContent = `${h}:${m}:${pad(s)}`;

    const barDate = document.getElementById('bar-date');
    if (barDate) barDate.textContent = dateStr;
  }

  function init() {
    update();
    setInterval(update, 1000);
  }

  return { init };
})();
