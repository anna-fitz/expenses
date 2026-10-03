// Accessibility plumbing shared by every screen: layers, focus, announcements, toasts, titles.
export const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $id = id => document.getElementById(id);

// A stable way to find "the same control" after a re-render replaces the DOM.
function keyOf(el) {
  if (!el || el === document.body || !el.tagName) return null;
  if (el.id) return "#" + CSS.escape(el.id);
  if (el.tagName === "INPUT" && el.name) return `input[name="${CSS.escape(el.name)}"][value="${CSS.escape(el.value)}"]`;
  if (el.dataset && el.dataset.act) return `[data-act="${CSS.escape(el.dataset.act)}"]`
    + (el.dataset.id ? `[data-id="${CSS.escape(el.dataset.id)}"]` : "") + (el.dataset.k ? `[data-k="${CSS.escape(el.dataset.k)}"]` : "");
  return null;
}
export function keepFocus(fn, fallbackSel) {
  const k = keyOf(document.activeElement);
  fn();
  const lost = !document.activeElement || document.activeElement === document.body;
  if (k && lost) {
    const el = document.querySelector(k) || (fallbackSel && document.querySelector(fallbackSel));
    if (el) { if (el.tagName === "H1") el.tabIndex = -1; el.focus({ preventScroll: true }); }
  }
}

export function setTitle(screen) { document.title = screen ? `${screen} · Expenses` : "Expenses"; }

let opener = null, lastTitle = "";
export function openLayer(html, opts = {}) {
  const l = $id("layer"), wasHidden = l.hidden, prevTitle = lastTitle;
  if (wasHidden) { opener = keyOf(opts.opener || document.activeElement); hideToast(); }
  keepFocus(() => { l.innerHTML = html; });
  l.hidden = false; l.setAttribute("aria-labelledby", "layer-title");
  $id("app").inert = true;
  const t = $id("layer-title"); lastTitle = t ? t.textContent.trim() : "";
  setTitle(lastTitle);
  if (t && (wasHidden || lastTitle !== prevTitle || !l.contains(document.activeElement))) { t.tabIndex = -1; t.focus(); }
}
export function resetLayer() {
  const l = $id("layer"); l.hidden = true; l.innerHTML = ""; l.removeAttribute("aria-labelledby");
  $id("app").inert = false; lastTitle = ""; opener = null;
}
export function closeLayer(after) {
  const k = opener; resetLayer();
  if (after) after();
  const el = (k && document.querySelector(k)) || document.querySelector("#app h1");
  if (el) { if (el.tagName === "H1") el.tabIndex = -1; el.focus({ preventScroll: true }); }
}

let annTimer;
export function announce(text) {
  const a = $id("announcer"); if (!a) return;
  a.textContent = ""; clearTimeout(annTimer);
  annTimer = setTimeout(() => { a.textContent = text; }, 50);
}

let toastTimer;
export function hideToast() { clearTimeout(toastTimer); const t = $id("toast"); if (t) { t.hidden = true; t.innerHTML = ""; } }
// Toasts with actions (Undo, Edit) stay until dismissed: WCAG 2.2.1 Timing adjustable.
export function toast(msg, actions = []) {
  const t = $id("toast");
  t.innerHTML = `<span>${esc(msg)}</span>`
    + actions.map((a, i) => `<button type="button" data-toast="${i}">${esc(a.label)}</button>`).join("")
    + (actions.length ? `<button type="button" data-toast="x" class="x" aria-label="Dismiss">✕</button>` : "");
  t.hidden = false;
  t.onclick = ev => {
    const b = ev.target.closest("[data-toast]"); if (!b) return;
    hideToast(); if (b.dataset.toast !== "x") actions[+b.dataset.toast].run();
  };
  clearTimeout(toastTimer);
  if (!actions.length) toastTimer = setTimeout(hideToast, 4000);
}
