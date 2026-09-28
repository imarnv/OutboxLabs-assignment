const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normaliseRecipients(list: string[]): { valid: string[]; duplicates: number; invalid: string[] } {
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  let duplicates = 0;
  for (const raw of list) {
    const e = raw.trim().toLowerCase();
    if (!e) continue;
    if (!EMAIL_RE.test(e)) {
      invalid.push(raw);
      continue;
    }
    if (seen.has(e)) {
      duplicates++;
      continue;
    }
    seen.add(e);
    valid.push(e);
  }
  return { valid, duplicates, invalid };
}
