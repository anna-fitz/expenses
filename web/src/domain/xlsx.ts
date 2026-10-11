// Just enough of .xlsx to read the old settle-up spreadsheet in the browser: no library, one sheet's cells at a time.
// An .xlsx is a zip of XML files. `inflate` undoes zip's "deflate" compression (DecompressionStream in the browser, zlib in tests).
export type Inflate = (data: Uint8Array) => Promise<Uint8Array>;
export type Cell = { v: string; f?: string };
export type Sheet = { name: string; cells: Record<string, Cell> };   // keyed "C12"

const u16 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u32 = (b: Uint8Array, i: number) => (u16(b, i) | (u16(b, i + 2) << 16)) >>> 0;
const utf8 = new TextDecoder();

async function unzip(buf: Uint8Array, inflate: Inflate): Promise<Record<string, string>> {
  let eocd = buf.length - 22;
  while (eocd >= 0 && u32(buf, eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("not a zip");
  const files: Record<string, string> = {};
  let p = u32(buf, eocd + 16);
  for (let n = u16(buf, eocd + 10); n > 0; n--) {
    const method = u16(buf, p + 10), size = u32(buf, p + 20), nameLen = u16(buf, p + 28), extra = u16(buf, p + 30), comment = u16(buf, p + 32);
    const name = utf8.decode(buf.subarray(p + 46, p + 46 + nameLen)), local = u32(buf, p + 42);
    p += 46 + nameLen + extra + comment;
    if (!name.endsWith(".xml") && !name.endsWith(".rels")) continue;
    const start = local + 30 + u16(buf, local + 26) + u16(buf, local + 28), raw = buf.subarray(start, start + size);
    files[name] = utf8.decode(method === 8 ? await inflate(raw) : raw);
  }
  return files;
}

const unescape = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const texts = (x: string) => [...x.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => unescape(m[1])).join("");

export async function readXlsx(buf: Uint8Array, inflate: Inflate): Promise<Sheet[]> {
  const files = await unzip(buf, inflate), get = (p: string) => files[p] || "";
  const shared = [...get("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1]));
  const rels: Record<string, string> = {};
  for (const m of get("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b[^>]*>/g)) {
    const id = m[0].match(/\bId="([^"]+)"/)?.[1], target = m[0].match(/\bTarget="([^"]+)"/)?.[1];
    if (id && target) rels[id] = target.replace(/^\/?(xl\/)?/, "xl/");
  }
  return [...get("xl/workbook.xml").matchAll(/<sheet\b[^>]*>/g)].map((m) => {
    const name = unescape(m[0].match(/\bname="([^"]*)"/)?.[1] || ""), rid = m[0].match(/\br:id="([^"]+)"/)?.[1] || "";
    const cells: Record<string, Cell> = {};
    for (const c of get(rels[rid]).matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const [, ref, attrs, inner = ""] = c, type = attrs.match(/\bt="(\w+)"/)?.[1];
      const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1], f = inner.match(/<f[^>]*>([\s\S]*?)<\/f>/)?.[1];
      const val = type === "s" ? shared[Number(v)] : type === "inlineStr" ? texts(inner) : v !== undefined ? unescape(v) : undefined;
      if (val !== undefined || f) cells[ref] = { v: val ?? "", ...(f ? { f: unescape(f) } : {}) };
    }
    return { name, cells };
  });
}

// Spreadsheet day numbers count from 1899-12-30.
export function serialToISO(n: number): string {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000);
  return d.toISOString().slice(0, 10);
}
