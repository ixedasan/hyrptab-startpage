/**
 * calculator.js — Keyboard + click calculator, expression display, history
 */

const Calculator = (() => {

  let expr = '';
  let lastResult = '0';
  let justEvaluated = false;

  const OPS = new Set(['+', '−', '×', '÷']);

  function getResultEl() { return document.getElementById('calc-result'); }
  function getExprEl()   { return document.getElementById('calc-expr'); }

  function setDisplay(result, expression) {
    const r = getResultEl();
    const e = getExprEl();
    if (r) r.textContent = result;
    if (e) e.textContent = expression || '';
  }

  function evaluate() {
    if (!expr) return;
    try {
      // Translate display chars → JS operators
      const jsExpr = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-');
      // eslint-disable-next-line no-eval
      let result = Function('"use strict"; return (' + jsExpr + ')')();
      if (!isFinite(result)) { setDisplay('Error', expr); expr = ''; return; }
      // Round floating point noise
      result = parseFloat(result.toPrecision(12));
      lastResult = String(result);
      setDisplay(lastResult, expr + ' =');
      expr = lastResult;
      justEvaluated = true;
    } catch {
      setDisplay('Error', expr);
      expr = '';
    }
  }

  function push(val) {
    const isOp = OPS.has(val);

    if (val === 'C') {
      expr = ''; lastResult = '0'; justEvaluated = false;
      setDisplay('0', ''); return;
    }

    if (val === '=') {
      if (!justEvaluated) evaluate();
      return;
    }

    if (val === '±') {
      if (expr === '' || expr === '0') return;
      if (expr.startsWith('-')) expr = expr.slice(1);
      else expr = '-' + expr;
      setDisplay(expr, ''); return;
    }

    if (val === '%') {
      try {
        const num = parseFloat(expr);
        if (!isNaN(num)) { expr = String(num / 100); setDisplay(expr, ''); }
      } catch { /* ignore */ }
      return;
    }

    if (justEvaluated) {
      // If user types an operator after =, continue from result; otherwise start fresh
      if (isOp) {
        justEvaluated = false;
        expr = lastResult + val;
      } else {
        expr = val;
        justEvaluated = false;
      }
      setDisplay(expr, '');
      return;
    }

    // Prevent double operators
    if (isOp && expr.length > 0 && OPS.has(expr[expr.length - 1])) {
      expr = expr.slice(0, -1) + val;
    } else {
      expr += val;
    }

    setDisplay(expr, '');
  }

  function handleKey(e) {
    // Only when not in an input
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    // Only when on WS2
    const ws2 = document.getElementById('ws-2');
    if (!ws2 || !ws2.classList.contains('active')) return;

    const key = e.key;
    if (key >= '0' && key <= '9') { push(key); return; }
    if (key === '.') { push('.'); return; }
    if (key === '+') { push('+'); return; }
    if (key === '-') { push('−'); return; }
    if (key === '*') { push('×'); return; }
    if (key === '/') { e.preventDefault(); push('÷'); return; }
    if (key === 'Enter' || key === '=') { push('='); return; }
    if (key === 'Escape' || key === 'c' || key === 'C') { push('C'); return; }
    if (key === 'Backspace') {
      if (justEvaluated) { push('C'); return; }
      expr = expr.slice(0, -1);
      setDisplay(expr || '0', '');
    }
    if (key === '%') { push('%'); return; }
  }

  function init() {
    // Button clicks
    document.querySelectorAll('.calc-btn').forEach(btn => {
      btn.addEventListener('click', () => push(btn.dataset.val));
    });

    // Keyboard
    document.addEventListener('keydown', handleKey);

    setDisplay('0', '');
  }

  return { init };
})();
