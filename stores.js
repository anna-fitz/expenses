// Store names: slugs, aliases (merged or renamed stores), and the lists the pickers show.
// Pure functions over the `merchants` map ({ [slug]: { name, category, count, hidden, mergedInto } }).
export const slug = s => String(s).toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "store";

// Follow mergedInto up to 10 hops; stop on a cycle or a missing target.
export function canonicalSlug(merchants, nameOrSlug) {
  let id = slug(nameOrSlug);
  const seen = new Set();
  while (merchants[id] && merchants[id].mergedInto && !seen.has(id) && seen.size < 10) {
    seen.add(id);
    const next = merchants[id].mergedInto;
    if (!merchants[next]) break;
    id = next;
  }
  return id;
}
export function canonicalName(merchants, name) {
  const m = merchants[canonicalSlug(merchants, name)];
  return m && m.name ? m.name : String(name);
}
const byName = (a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" });

// Visible stores matching q by their own name or any alias name. One row per canonical store.
export function pickerStores(merchants, q) {
  const ql = String(q || "").trim().toLowerCase(), out = new Map();
  for (const [id, m] of Object.entries(merchants)) {
    if (!m || !m.name) continue;
    const isAlias = !!m.mergedInto, target = isAlias ? canonicalSlug(merchants, id) : id, t = merchants[target];
    if (!t || !t.name || t.hidden) continue;
    const own = m.name.toLowerCase();
    if (ql && !own.includes(ql)) continue;
    const row = out.get(target) || { id: target, name: t.name, category: t.category || "", alsoCalled: null, exact: false, direct: false };
    if (!isAlias) { row.direct = true; row.alsoCalled = null; }
    else if (ql && !row.direct && !row.alsoCalled) row.alsoCalled = m.name;
    if (ql && own === ql) row.exact = true;
    out.set(target, row);
  }
  return [...out.values()].map(({ direct, ...r }) => r).sort(byName);
}
export function removedStores(merchants) {
  return Object.entries(merchants).filter(([, m]) => m && m.name && m.hidden && !m.mergedInto)
    .map(([id, m]) => ({ id, name: m.name })).sort(byName);
}
export function planRename(merchants, id, newName) {
  const name = String(newName || "").trim().replace(/\s+/g, " ");
  if (!name) return { kind: "empty" };
  const newId = slug(name);
  if (newId === id) return { kind: "same", name };
  const other = merchants[newId];
  if (other && other.name && !other.hidden) return { kind: "conflict", targetId: newId, targetName: other.name };
  return { kind: "move", newId, name };
}
