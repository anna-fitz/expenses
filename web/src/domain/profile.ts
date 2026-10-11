// One visible character (a grapheme) that is an emoji: covers skin tones, flags, and joined emoji like 👩🏽‍💻.
export function isOneEmoji(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  const parts = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(t)];
  return parts.length === 1 && /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(t);
}
// The part after @; empty removes it. Same rules as the current app.
export function normalizeVenmo(s: string): { value: string; ok: boolean } {
  const value = s.trim().replace(/^@/, "");
  return { value, ok: !value || /^[A-Za-z0-9_-]{5,30}$/.test(value) };
}
