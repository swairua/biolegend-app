export function sanitizeText(input: unknown): string {
  if (input === null || input === undefined) return '';
  let s = String(input);
  // Normalize common problematic typography to ASCII equivalents
  s = s
    // Curly single quotes/apostrophes to straight apostrophe
    .replace(/[\u2018\u2019\uFF07]/g, "'")
    // Curly double quotes to straight double quote
    .replace(/[\u201C\u201D]/g, '"')
    // En dash / Em dash to simple hyphen
    .replace(/[\u2013\u2014]/g, '-')
    // Ellipsis to three dots
    .replace(/\u2026/g, '...')
    // Non‑breaking space to normal space
    .replace(/\u00A0/g, ' ')
    // Replacement character(s) often appearing from bad encoding
    .replace(/\uFFFD+/g, "'");
  return s;
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;');
}

export function sanitizeAndEscape(input: unknown): string {
  return escapeHtml(sanitizeText(input));
}
