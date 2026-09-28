/**
 * Duplicate detection: the same payment often arrives twice — a bank SMS ("debited NPR 5300 by FonePay")
 * and a payment-app notification ("Payment successful NPR 5300"). Pure so it can be unit tested.
 */
import type { AutomationSource, DetectedKind } from './types';

export const DUPLICATE_WINDOW_MS = 15 * 60 * 1000;
// Resends of the identical message (e.g. an app re-posting its notification) arrive close together.
const RESEND_WINDOW_MS = 3 * 60 * 1000;

export interface DedupeRecord {
  id: string;
  source: AutomationSource;
  sender: string;
  rawText: string;
  kind: DetectedKind;
  amount: number;
  accountHint: string | null;
  channel: string | null;
  reference: string | null;
  receivedAt: number;
}

function kindsCompatible(a: DetectedKind, b: DetectedKind): boolean {
  if (a === b) return true;
  // A bank "debited" SMS and a wallet "loaded" notification describe the same money movement.
  const pair = new Set([a, b]);
  return pair.has('expense') && pair.has('transfer');
}

function normalizeRef(ref: string): string {
  return ref.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function referencesMatch(a: string, b: string): boolean {
  const na = normalizeRef(a);
  const nb = normalizeRef(b);
  return na === nb || (na.length >= 6 && nb.length >= 6 && (na.endsWith(nb) || nb.endsWith(na)));
}

export function isDuplicate(candidate: DedupeRecord, existing: DedupeRecord): boolean {
  if (candidate.id === existing.id) return false;
  if (Math.abs(candidate.amount - existing.amount) > 0.009) return false;

  const sameOrigin = candidate.source === existing.source && candidate.sender === existing.sender;

  if (candidate.reference && existing.reference) {
    if (referencesMatch(candidate.reference, existing.reference)) return true;
    // One sender never reuses a reference, but a bank and a wallet number the same payment differently.
    if (sameOrigin) return false;
  }

  const gap = Math.abs(candidate.receivedAt - existing.receivedAt);
  if (gap > DUPLICATE_WINDOW_MS) return false;
  if (!kindsCompatible(candidate.kind, existing.kind)) return false;
  if (candidate.accountHint && existing.accountHint && candidate.accountHint !== existing.accountHint) {
    return false;
  }
  if (
    candidate.channel &&
    existing.channel &&
    candidate.channel !== existing.channel &&
    candidate.source === existing.source
  ) {
    return false;
  }

  if (sameOrigin) {
    // Same channel: only an identical resend counts; two NPR 150 coffees in 10 minutes are two expenses.
    return candidate.rawText === existing.rawText && gap <= RESEND_WINDOW_MS;
  }

  // Different channels (SMS vs app notification, or two apps) reporting the same amount close together.
  return true;
}

export function findDuplicate<T extends DedupeRecord>(candidate: DedupeRecord, recent: T[]): T | null {
  return recent.find((r) => isDuplicate(candidate, r)) ?? null;
}
