/**
 * Rule-based transaction parser for bank SMS and payment-app notifications.
 *
 * Pure and dependency-free so it can run in the headless background task and in unit tests.
 * No AI, no network: keyword rules + regular expressions only.
 */
import type { AutomationEvent, Confidence, DetectedKind, ParsedMessage } from './types';

const CURRENCY = String.raw`(?:NPR|NRs\.?|Rs\.?|रु\.?|INR)`;
const NUMBER = String.raw`(\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)`;
const AMOUNT_RE = new RegExp(
  `${CURRENCY}\\s*[:.]?\\s*${NUMBER}|${NUMBER}\\s*${CURRENCY}(?![a-z])`,
  'gi'
);
// Amount written without a currency, right after a transaction verb ("debited by 5300").
const BARE_AMOUNT_RE =
  /\b(?:debited|credited|paid|withdrawn|received|deposited|deducted)\s+(?:by|of|with|for|amount)?\s*:?\s*(\d[\d,]*(?:\.\d{1,2})?)/i;
// Context that marks an amount as a balance/limit rather than the transaction amount.
const BALANCE_CONTEXT_RE = /(?:\bbal(?:ance)?|\bavl|available|\blimit)\b[^\d]{0,15}$/i;

const NON_TRANSACTION_RULES: RegExp[] = [
  /\botp\b|one[- ]time password|verification code|security code|\bpin\b\s*(?:is|:)/i,
  /payment request|request(?:ed|s)? (?:you )?(?:to pay|money|payment|for)/i,
  /\b(?:failed|declined|unsuccessful|could not be processed|insufficient)\b/i,
  /\blog(?:ged)?[ -]?in\b|\bsign(?:ed)?[ -]in\b|password (?:changed|reset)|new device/i,
  /will be (?:debited|charged|deducted)|\bis due\b|due date|\breminder\b/i,
];
// Promotions only count as non-transactions when there is no strong debit/credit verb.
const PROMO_RE = /\b(?:offer|discount|win|chance|t&c|hurry|limited time|up to \d+%)/i;

const WALLET_LOAD_RE = /wallet load|load(?:ed)? (?:to|into|in) (?:your )?(?:[a-z]+ )?wallet|bank to wallet/i;
const TRANSFER_RE = /\btransferred\b|fund transfer|\btransfer(?:red)? to\b|\bsent to\b/i;
const ATM_RE = /withdraw|\batm\b[^.]{0,30}cash|cash[^.]{0,30}\batm\b/i;
const STRONG_EXPENSE_RE = /\bdebited\b|\bdebit of\b|\bdeducted\b/i;
const STRONG_INCOME_RE = /\bcredited\b|\bdeposited\b|\bcredit of\b/i;
const WEAK_INCOME_RE = /\breceived\b(?!\s+by)|\bsalary\b|\brefund(?:ed)?\b|\bcashback\b|\breversed\b/i;
const WEAK_EXPENSE_RE =
  /\bpaid\b|payment (?:of|successful|done|completed|made)|successfully paid|\bpurchase\b|\bspent\b|\bcharged\b|\bpos\b/i;

const CHANNELS: [RegExp, string][] = [
  [/fone ?pay/i, 'FonePay'],
  [/\besewa\b/i, 'eSewa'],
  [/\bkhalti\b/i, 'Khalti'],
  [/\bime ?pay\b/i, 'IME Pay'],
  [/connect ?ips/i, 'ConnectIPS'],
  [/mobile banking|\bm-?banking\b/i, 'Mobile Banking'],
  [/\bpos\b/i, 'POS'],
  [/\batm\b/i, 'ATM'],
  [/\bqr\b/i, 'QR'],
];

const KNOWN_MERCHANTS: [RegExp, string][] = [
  [/bhat-?bhateni/i, 'Bhatbhateni'],
  [/big ?mart/i, 'Big Mart'],
  [/sales ?berry/i, 'Salesberry'],
  [/\bdaraz\b/i, 'Daraz'],
  [/food ?mandu/i, 'Foodmandu'],
  [/\bpathao\b/i, 'Pathao'],
  [/\bindrive\b/i, 'inDrive'],
  [/\btootle\b/i, 'Tootle'],
  [/nepal telecom|\bntc\b/i, 'Nepal Telecom'],
  [/\bncell\b/i, 'Ncell'],
  [/nepal electricity|\bnea\b/i, 'Nepal Electricity Authority'],
  [/world ?link/i, 'WorldLink'],
  [/\bvianet\b/i, 'Vianet'],
  [/dish ?home/i, 'DishHome'],
  [/nepal oil/i, 'Nepal Oil Corporation'],
  [/\bkfc\b/i, 'KFC'],
  [/\bnetflix\b/i, 'Netflix'],
  [/\bspotify\b/i, 'Spotify'],
  [/\bqfx\b/i, 'QFX Cinemas'],
];

const MERCHANT_STOP = String.raw`(?=\s+(?:on|for|via|using|ref|from|with|is|has|was|dated|through|by|txn|remarks?)\b|[,.;\n]|\s+${CURRENCY}|$)`;
const MERCHANT_PATTERNS: RegExp[] = [
  new RegExp(
    String.raw`(?:paid|payment|sent|transferred|purchase|spent)\s+(?:of\s+)?(?:amount\s+)?(?:${CURRENCY}\s*[:.]?\s*[\d,]+(?:\.\d{1,2})?\s+)?(?:to|at)\s+([^,.;\n]+?)${MERCHANT_STOP}`,
    'i'
  ),
  new RegExp(String.raw`\b(?:at|merchant\s*:?)\s+([^,.;\n]+?)${MERCHANT_STOP}`, 'i'),
  new RegExp(String.raw`\bfrom\s+([^,.;\n]+?)${MERCHANT_STOP}`, 'i'),
];
const NOT_A_MERCHANT_RE = /^(?:your|you|a\/c|acc|account|wallet|card|bank|the|mobile|atm)\b|^[\dxX*#\s-]+$/i;

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
// Dates further than this from the arrival time are treated as unreliable (e.g. BS dates like 2083-06-07).
const MAX_DATE_DRIFT_MS = 7 * 86400000;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toHHmm(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseNumber(raw: string): number {
  return parseFloat(raw.replace(/,/g, ''));
}

function to24h(hour: number, meridiem: string | undefined): number {
  if (!meridiem) return hour;
  const pm = meridiem.toLowerCase() === 'pm';
  if (hour === 12) return pm ? 12 : 0;
  return pm ? hour + 12 : hour;
}

interface AmountMatch {
  value: number;
  currency: string | null;
  index: number;
}

function findAmount(text: string, anchorIndex: number): AmountMatch | null {
  const matches: AmountMatch[] = [];
  for (const m of text.matchAll(AMOUNT_RE)) {
    const raw = m[1] ?? m[2];
    const index = m.index ?? 0;
    if (!raw || BALANCE_CONTEXT_RE.test(text.slice(Math.max(0, index - 25), index))) continue;
    const value = parseNumber(raw);
    if (!(value > 0)) continue;
    const currencyMatch = m[0].match(new RegExp(CURRENCY, 'i'));
    matches.push({ value, currency: normalizeCurrency(currencyMatch?.[0] ?? null), index });
  }
  if (matches.length > 0) {
    // Prefer the amount closest to the transaction verb; bank SMS often also quote a balance.
    return matches.reduce((best, m) =>
      Math.abs(m.index - anchorIndex) < Math.abs(best.index - anchorIndex) ? m : best
    );
  }
  const bare = text.match(BARE_AMOUNT_RE);
  if (bare) {
    const value = parseNumber(bare[1]);
    if (value > 0) return { value, currency: null, index: bare.index ?? 0 };
  }
  return null;
}

function normalizeCurrency(raw: string | null): string | null {
  if (!raw) return null;
  const upper = raw.toUpperCase().replace(/\./g, '');
  if (upper === 'INR') return 'INR';
  return 'NPR'; // Rs / NRs / रु in Nepali bank messages
}

interface KindMatch {
  kind: DetectedKind;
  strong: boolean;
  index: number;
}

function classify(text: string): KindMatch {
  const nonTx = { kind: 'non_transaction' as const, strong: false, index: 0 };
  if (NON_TRANSACTION_RULES.some((re) => re.test(text))) return nonTx;

  const at = (re: RegExp) => {
    const m = text.match(re);
    return m ? (m.index ?? 0) : -1;
  };

  const walletLoad = at(WALLET_LOAD_RE);
  if (walletLoad >= 0) return { kind: 'transfer', strong: false, index: walletLoad };

  const atm = at(ATM_RE);
  if (atm >= 0) return { kind: 'atm_withdrawal', strong: true, index: atm };

  const strongExpense = at(STRONG_EXPENSE_RE);
  const strongIncome = at(STRONG_INCOME_RE);
  const transfer = at(TRANSFER_RE);

  // "debited ... for fund transfer to" is a transfer; "credited ... transferred from X" is income.
  if (strongExpense >= 0 && transfer >= 0) return { kind: 'transfer', strong: false, index: strongExpense };
  if (strongExpense >= 0) return { kind: 'expense', strong: true, index: strongExpense };
  if (strongIncome >= 0) return { kind: 'income', strong: true, index: strongIncome };
  if (transfer >= 0) return { kind: 'transfer', strong: false, index: transfer };

  if (PROMO_RE.test(text)) return nonTx;

  const weakIncome = at(WEAK_INCOME_RE);
  if (weakIncome >= 0) return { kind: 'income', strong: false, index: weakIncome };
  const weakExpense = at(WEAK_EXPENSE_RE);
  if (weakExpense >= 0) return { kind: 'expense', strong: false, index: weakExpense };

  return nonTx;
}

function findAccountHint(text: string): string | null {
  const masked = text.match(/(?:##|[xX*]{2,})(\d{3,6})\b/);
  if (masked) return masked[1].slice(-4);
  const labelled = text.match(
    /\b(?:a\/c|acc(?:oun)?t|card)\b(?:\s*(?:no\.?|number|ending(?:\s+(?:with|in))?))?\s*[:.#-]?\s*[xX*#\d-]*?(\d{4})\b/i
  );
  return labelled ? labelled[1] : null;
}

function findDateTime(text: string, receivedAt: number): { date: string; time: string; fromMessage: boolean } {
  const received = new Date(receivedAt);
  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;

  const ymd = text.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  const dmy = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/);
  const named = text.match(
    /\b(\d{1,2})[-\s]?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-\s,]*(\d{2,4})\b/i
  );
  if (ymd) {
    [year, month, day] = [Number(ymd[1]), Number(ymd[2]), Number(ymd[3])];
  } else if (dmy) {
    [day, month, year] = [Number(dmy[1]), Number(dmy[2]), Number(dmy[3])];
  } else if (named) {
    day = Number(named[1]);
    month = MONTHS[named[2].toLowerCase()];
    year = Number(named[3]);
    if (year < 100) year += 2000;
  }

  const timeMatch = text.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?\b/i);
  let hour: number | null = null;
  let minute: number | null = null;
  if (timeMatch) {
    const h = to24h(Number(timeMatch[1]), timeMatch[3]);
    const m = Number(timeMatch[2]);
    if (h < 24 && m < 60) [hour, minute] = [h, m];
  }

  if (year && month && day && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
    const candidate = new Date(year, month - 1, day, hour ?? 0, minute ?? 0);
    const sameDay = candidate.getMonth() === month - 1 && candidate.getDate() === day;
    if (sameDay && Math.abs(candidate.getTime() - receivedAt) <= MAX_DATE_DRIFT_MS) {
      return {
        date: toISO(candidate),
        time: hour !== null ? `${pad(hour)}:${pad(minute ?? 0)}` : toHHmm(received),
        fromMessage: true,
      };
    }
  }

  return {
    date: toISO(received),
    time: hour !== null ? `${pad(hour)}:${pad(minute ?? 0)}` : toHHmm(received),
    fromMessage: false,
  };
}

function findChannel(text: string): string | null {
  let best: { label: string; index: number } | null = null;
  for (const [re, label] of CHANNELS) {
    const m = text.match(re);
    if (m && (best === null || (m.index ?? 0) < best.index)) best = { label, index: m.index ?? 0 };
  }
  return best?.label ?? null;
}

function findReference(text: string): string | null {
  // "by:FonePay:FPQR:1300043687" -> "FPQR:1300043687"
  const colonChain = text.match(/\bby\s*:\s*[A-Za-z][A-Za-z ]*?\s*:\s*([A-Za-z0-9]+(?::[A-Za-z0-9]+)*)/);
  if (colonChain && /\d/.test(colonChain[1])) return colonChain[1];

  const labelled = /\b(?:ref(?:erence)?|txn|trans(?:action)?|trace)\.?\s*(?:no|id|code|#)?\.?\s*[:#-]?\s*([A-Za-z0-9][A-Za-z0-9:/-]{4,})/gi;
  for (const m of text.matchAll(labelled)) {
    if (/\d/.test(m[1])) return m[1].replace(/[:/-]+$/, '');
  }
  return null;
}

function cleanMerchant(raw: string): string | null {
  const cleaned = raw.replace(/\s+/g, ' ').replace(/[\s:-]+$/, '').trim();
  if (cleaned.length < 2 || cleaned.length > 40) return null;
  if (NOT_A_MERCHANT_RE.test(cleaned)) return null;
  if (CHANNELS.some(([re]) => re.test(cleaned) && cleaned.split(' ').length === 1)) return null;
  return cleaned;
}

function findMerchant(text: string, kind: DetectedKind): string | null {
  for (const [re, label] of KNOWN_MERCHANTS) {
    if (re.test(text)) return label;
  }
  const patterns = kind === 'income' ? [MERCHANT_PATTERNS[2]] : MERCHANT_PATTERNS.slice(0, 2);
  for (const re of patterns) {
    const m = text.match(re);
    const merchant = m ? cleanMerchant(m[1]) : null;
    if (merchant) return merchant;
  }
  return null;
}

function scoreConfidence(
  kind: DetectedKind,
  strong: boolean,
  amount: AmountMatch | null,
  accountHint: string | null,
  channel: string | null
): Confidence {
  if (kind === 'non_transaction' || !amount) return 'low';
  // A transfer's destination is never known from one message, so it always needs a human look.
  if (kind === 'transfer') return 'medium';
  if (!amount.currency) return 'medium';
  if (strong) return 'high';
  return accountHint || channel ? 'high' : 'medium';
}

export function parseMessage(event: Pick<AutomationEvent, 'title' | 'body' | 'receivedAt'>): ParsedMessage {
  const text = [event.title, event.body].filter(Boolean).join(' \n').replace(/\s+/g, ' ').trim();
  const { kind, strong, index } = classify(text);
  const amount = kind === 'non_transaction' ? null : findAmount(text, index);
  const accountHint = findAccountHint(text);
  const channel = findChannel(text);
  const { date, time, fromMessage } = findDateTime(text, event.receivedAt);

  return {
    kind,
    amount: amount?.value ?? null,
    currency: amount?.currency ?? null,
    accountHint,
    date,
    time,
    dateFromMessage: fromMessage,
    channel,
    merchant: kind === 'non_transaction' ? null : findMerchant(text, kind),
    reference: findReference(text),
    confidence: scoreConfidence(kind, strong, amount, accountHint, channel),
  };
}
