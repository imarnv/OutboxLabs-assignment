const EMAIL_RE = /[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

export interface ParsedLeads {
  emails: string[];
  duplicates: number;
}

// Scan for anything that looks like an address instead of parsing columns, so any CSV layout works.
export function parseLeads(text: string): ParsedLeads {
  const seen = new Set<string>();
  const emails: string[] = [];
  let duplicates = 0;
  for (const match of text.matchAll(EMAIL_RE)) {
    const e = match[0].toLowerCase().replace(/\.+$/, '');
    if (seen.has(e)) {
      duplicates++;
      continue;
    }
    seen.add(e);
    emails.push(e);
  }
  return { emails, duplicates };
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
