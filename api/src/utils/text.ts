import { createHash } from 'crypto';

export function normalizeText(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function hashCanonical(canonical: string): string {
  return createHash('sha256').update(canonical).digest('hex');
}


