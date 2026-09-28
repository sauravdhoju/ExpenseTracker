/**
 * Local transaction automation pipeline:
 *   queued SMS/notification -> parse -> classify -> map account -> dedupe -> categorize -> save -> notify.
 *
 * Runs inside the short-lived headless JS task started by the native listeners (and again whenever the
 * app comes to the foreground, as a fallback). Everything happens on-device; nothing is sent anywhere.
 */
import { initDatabase } from '../database/db';
import * as automationRepo from '../database/automationRepo';
import * as accountRepo from '../database/accountRepo';
import * as categoryRepo from '../database/categoryRepo';
import * as transactionRepo from '../database/transactionRepo';
import * as dailyTrackingRepo from '../database/dailyTrackingRepo';
import { getAllSettings } from '../database/settingsRepo';
import { formatCurrency } from '../constants/currencies';
import { dismissDetectedNotification, notifyDetectedTransaction } from '../services/notificationService';
import { todayISO } from '../utils/date';
import { parseMessage } from './parser';
import { findDuplicate, DUPLICATE_WINDOW_MS } from './dedupe';
import { merchantKey, suggestCategoryName } from './categorize';
import * as native from './native';
import type { Account, AppSettings, CategoryKind, TransactionType } from '../types';
import type { AutomationEvent, DetectedTransaction, ParsedMessage } from './types';

export type ProcessOutcome = 'created' | 'review' | 'duplicate' | 'skipped';

export function syncNativeConfig(settings: AppSettings): void {
  native.setNativeConfig({
    enabled: settings.automationEnabled,
    sms: settings.automationSmsEnabled,
    notifications: settings.automationNotificationsEnabled,
    allowedPackages: settings.automationAllowedApps,
  });
}

function sourceAllowed(event: AutomationEvent, settings: AppSettings): boolean {
  if (!settings.automationEnabled) return false;
  if (event.source === 'sms') return settings.automationSmsEnabled;
  return settings.automationNotificationsEnabled && settings.automationAllowedApps.includes(event.sender);
}

function categoryKindFor(kind: DetectedTransaction['kind']): CategoryKind | null {
  if (kind === 'expense') return 'expense';
  if (kind === 'income') return 'income';
  return null;
}

async function resolveCategoryId(parsed: ParsedMessage, text: string): Promise<string | null> {
  const kind = categoryKindFor(parsed.kind as DetectedTransaction['kind']);
  if (!kind) return null;
  if (parsed.merchant) {
    const learned = await automationRepo.getMerchantRuleCategory(merchantKey(parsed.merchant));
    if (learned) return learned;
  }
  const name = suggestCategoryName(`${parsed.merchant ?? ''} ${text}`, kind);
  if (!name) return null;
  const categories = await categoryRepo.getCategoriesByKind(kind);
  return categories.find((c) => c.name === name)?.id ?? null;
}

function findCashAccount(accounts: Account[], excludeId: string | null): Account | undefined {
  return accounts.find((a) => a.isActive && a.type === 'cash' && a.id !== excludeId);
}

export function titleFor(d: Pick<DetectedTransaction, 'kind' | 'merchant' | 'channel'>): string {
  if (d.kind === 'atm_withdrawal') return 'ATM withdrawal';
  if (d.merchant) return d.merchant;
  if (d.kind === 'income') return d.channel ? `${d.channel} credit` : 'Bank credit';
  if (d.kind === 'transfer') return d.channel ? `${d.channel} transfer` : 'Transfer';
  return d.channel ? `${d.channel} payment` : 'Bank debit';
}

function notesFor(d: Pick<DetectedTransaction, 'source' | 'channel' | 'reference'>): string {
  const parts = [`Auto-detected from ${d.source === 'sms' ? 'SMS' : 'notification'}`];
  if (d.channel) parts.push(d.channel);
  if (d.reference) parts.push(`Ref ${d.reference}`);
  return parts.join(' · ');
}

function transactionTypeFor(kind: DetectedTransaction['kind']): TransactionType {
  if (kind === 'income') return 'income';
  if (kind === 'expense') return 'expense';
  return 'transfer';
}

async function createLinkedTransaction(
  d: DetectedTransaction,
  opts: { accountId: string; toAccountId: string | null; categoryId: string | null; type?: TransactionType; title?: string }
): Promise<string> {
  const type = opts.type ?? transactionTypeFor(d.kind);
  const transaction = await transactionRepo.createTransaction({
    type,
    amount: d.amount,
    accountId: opts.accountId,
    toAccountId: type === 'transfer' ? opts.toAccountId : null,
    categoryId: type === 'transfer' ? null : opts.categoryId,
    title: opts.title?.trim() || titleFor(d),
    notes: notesFor(d),
    date: d.date,
    time: d.time,
  });
  await dailyTrackingRepo.markTracked(todayISO());
  return transaction.id;
}

export async function processEvent(event: AutomationEvent, settings: AppSettings): Promise<ProcessOutcome> {
  if (!sourceAllowed(event, settings)) return 'skipped';
  if (await automationRepo.eventExists(event.id)) return 'skipped';

  const parsed = parseMessage(event);
  // LOW confidence and non-transactions (OTP, promos, requests, balance inquiries) never create anything.
  if (parsed.kind === 'non_transaction' || parsed.confidence === 'low' || parsed.amount === null) return 'skipped';
  const kind = parsed.kind;
  const amount = parsed.amount;
  const rawText = [event.title, event.body].filter(Boolean).join('\n');

  const identifiers = [
    ...(parsed.accountHint ? [automationRepo.accountIdentifier(parsed.accountHint)] : []),
    automationRepo.sourceIdentifier(event.source, event.sender),
  ];
  const accountId = await automationRepo.findMappedAccountId(identifiers);
  const channel = parsed.channel ?? (event.source === 'notification' ? event.appName : null);

  const base = {
    eventId: event.id,
    source: event.source,
    sender: event.sender,
    rawText,
    kind,
    amount,
    currency: parsed.currency,
    accountHint: parsed.accountHint,
    accountId,
    channel,
    merchant: parsed.merchant,
    reference: parsed.reference,
    date: parsed.date,
    time: parsed.time,
    receivedAt: event.receivedAt,
    confidence: parsed.confidence,
  };

  const candidates = await automationRepo.getDedupeCandidates(
    event.receivedAt - DUPLICATE_WINDOW_MS,
    event.receivedAt + DUPLICATE_WINDOW_MS,
    amount
  );
  const duplicate = findDuplicate({ id: event.id, ...base }, candidates);
  if (duplicate) {
    // Keep one record, but let the second message fill in whatever the first one was missing.
    await automationRepo.updateDetected(duplicate.id, {
      merchant: duplicate.merchant ?? parsed.merchant,
      channel: duplicate.channel ?? channel,
      reference: duplicate.reference ?? parsed.reference,
      accountId: duplicate.accountId ?? (duplicate.status === 'pending' ? accountId : undefined),
    });
    await automationRepo.insertDetected({
      ...base,
      categoryId: null,
      status: 'duplicate',
      transactionId: null,
      duplicateOf: duplicate.id,
    });
    return 'duplicate';
  }

  const categoryId = settings.automationAutoCategorize ? await resolveCategoryId(parsed, rawText) : null;

  const accounts = await accountRepo.getAllAccounts();
  const cashAccount = kind === 'atm_withdrawal' ? findCashAccount(accounts, accountId) : undefined;
  const canCreate =
    settings.automationAutoCreate &&
    parsed.confidence === 'high' &&
    !!accountId &&
    (kind === 'expense' || kind === 'income' || (kind === 'atm_withdrawal' && !!cashAccount));

  if (!canCreate && !settings.automationReviewUncertain) return 'skipped';

  const detected = await automationRepo.insertDetected({
    ...base,
    categoryId,
    status: canCreate ? 'confirmed' : 'pending',
    transactionId: null,
    duplicateOf: null,
  });

  if (canCreate && accountId) {
    const transactionId = await createLinkedTransaction(detected, {
      accountId,
      toAccountId: cashAccount?.id ?? null,
      categoryId,
    });
    await automationRepo.updateDetected(detected.id, { transactionId });
    detected.transactionId = transactionId;
  }

  if (settings.notificationsEnabled) {
    await postNotification(detected, accounts, settings).catch(() => {});
  }
  return canCreate ? 'created' : 'review';
}

async function postNotification(d: DetectedTransaction, accounts: Account[], settings: AppSettings) {
  const amount = formatCurrency(d.amount, settings.currency);
  const account = accounts.find((a) => a.id === d.accountId);
  const accountLabel = account
    ? `${account.name}${d.accountHint ? ` ••••${d.accountHint}` : ''}`
    : d.accountHint
      ? `Account ••••${d.accountHint}`
      : null;
  const lines = [[amount, d.merchant ?? d.channel].filter(Boolean).join(' — '), accountLabel].filter(Boolean);

  if (d.status === 'confirmed') {
    const heading = {
      expense: 'Expense detected',
      income: 'Income detected',
      atm_withdrawal: 'ATM withdrawal detected',
      transfer: 'Transfer detected',
    }[d.kind];
    await notifyDetectedTransaction(heading, lines.join('\n'), {
      kind: 'detected',
      detectionId: d.id,
      transactionId: d.transactionId,
    });
  } else {
    await notifyDetectedTransaction('Transaction needs review', lines.join('\n'), {
      kind: 'review',
      detectionId: d.id,
    });
  }
}

let drainPromise: Promise<number> | null = null;

/**
 * Processes every queued native event. Safe to call repeatedly/concurrently: calls share one run,
 * and each event id is recorded so a redelivered event is never counted twice.
 * Returns how many events produced a transaction or review item.
 */
export function drainAutomationQueue(): Promise<number> {
  if (!native.isAutomationSupported()) return Promise.resolve(0);
  if (drainPromise) return drainPromise;
  drainPromise = (async () => {
    let changed = 0;
    try {
      await initDatabase();
      // Loop: new events can be queued while earlier ones are being processed.
      for (let round = 0; round < 5; round++) {
        const events = native.getQueuedEvents();
        if (events.length === 0) break;
        const settings = await getAllSettings();
        for (const event of events) {
          try {
            const outcome = await processEvent(event, settings);
            if (outcome === 'created' || outcome === 'review') changed++;
          } catch (error) {
            console.warn('[automation] failed to process event', error);
          }
        }
        native.removeQueuedEvents(events.map((e) => e.id));
      }
    } finally {
      drainPromise = null;
    }
    return changed;
  })();
  return drainPromise;
}

// ---- User actions -----------------------------------------------------------------------------

export interface ConfirmDetectionInput {
  type: TransactionType; // expense | income | transfer
  accountId: string;
  toAccountId?: string | null;
  categoryId: string | null;
  title?: string;
  rememberAccount: boolean;
}

export async function confirmDetection(id: string, input: ConfirmDetectionInput): Promise<void> {
  const detected = await automationRepo.getDetectedById(id);
  if (!detected || detected.status !== 'pending') return;

  const transactionId = await createLinkedTransaction(detected, {
    accountId: input.accountId,
    toAccountId: input.toAccountId ?? null,
    categoryId: input.categoryId,
    type: input.type,
    title: input.title,
  });
  await automationRepo.updateDetected(id, {
    status: 'confirmed',
    transactionId,
    accountId: input.accountId,
    categoryId: input.categoryId,
  });

  if (input.rememberAccount) {
    const identifier = detected.accountHint
      ? automationRepo.accountIdentifier(detected.accountHint)
      : automationRepo.sourceIdentifier(detected.source, detected.sender);
    await automationRepo.upsertAccountMapping(identifier, input.accountId);
  }
  if (detected.merchant && input.categoryId && input.type !== 'transfer') {
    await automationRepo.upsertMerchantRule(merchantKey(detected.merchant), detected.merchant, input.categoryId);
  }
  await dismissDetectedNotification(id);
}

export async function ignoreDetection(id: string): Promise<void> {
  await automationRepo.updateDetected(id, { status: 'ignored' });
  await dismissDetectedNotification(id);
}

/** Notification "Undo": removes the auto-created transaction (reversing its balance effect). */
export async function undoDetection(id: string): Promise<boolean> {
  const detected = await automationRepo.getDetectedById(id);
  if (!detected || detected.status !== 'confirmed') return false;
  if (detected.transactionId) await transactionRepo.deleteTransaction(detected.transactionId);
  await automationRepo.updateDetected(id, { status: 'undone', transactionId: null });
  return true;
}

/**
 * Learning from corrections: when the user changes the category of an auto-detected transaction,
 * remember "merchant -> category" so the next transaction from that merchant is categorized the same way.
 */
export async function learnFromTransactionEdit(transactionId: string, categoryId: string | null): Promise<void> {
  if (!categoryId) return;
  const detected = await automationRepo.getDetectedByTransactionId(transactionId);
  if (!detected || detected.categoryId === categoryId) return;
  if (detected.merchant) {
    await automationRepo.upsertMerchantRule(merchantKey(detected.merchant), detected.merchant, categoryId);
  }
  await automationRepo.updateDetected(detected.id, { categoryId });
}
