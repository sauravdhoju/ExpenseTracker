import { getAllRecurring, updateNextOccurrence } from '../database/recurringRepo';
import { createTransaction } from '../database/transactionRepo';
import { createBill } from '../database/billRepo';
import { getSetting } from '../database/settingsRepo';
import { todayISO } from '../utils/date';
import { nextOccurrenceForSystem } from '../utils/bsDate';
import type { RecurringTransaction } from '../types';

/**
 * Materializes any recurring transactions whose next occurrence has arrived
 * into real transactions + bill reminders, then advances their schedule.
 * Safe to call on every app start (idempotent per-day: it only fires once
 * next_occurrence has been advanced past today).
 *
 * "Monthly"/"yearly" follow the user's current calendar preference (AD or
 * BS) rather than a per-recurrence field, consistent with how budgets and
 * reports resolve their calendar — see mobile date/calendar architecture.
 */
export async function processDueRecurringTransactions(): Promise<RecurringTransaction[]> {
  const all = await getAllRecurring();
  const today = todayISO();
  const dateSystem = (await getSetting('dateSystem')) ?? 'AD';
  const processed: RecurringTransaction[] = [];

  for (const r of all) {
    if (!r.isActive) continue;
    if (r.endDate && r.endDate < today) continue;

    let cursor = r.nextOccurrence;
    let iterations = 0;
    while (cursor <= today && iterations < 366) {
      await createTransaction({
        type: r.type,
        amount: r.amount,
        accountId: r.accountId,
        categoryId: r.categoryId,
        title: r.title,
        date: cursor,
        recurringId: r.id,
      });

      if (r.type === 'expense') {
        await createBill({
          title: r.title,
          amount: r.amount,
          dueDate: cursor,
          recurringId: r.id,
        });
      }

      cursor = nextOccurrenceForSystem(cursor, r.frequency, dateSystem);
      iterations += 1;
    }

    if (cursor !== r.nextOccurrence) {
      await updateNextOccurrence(r.id, cursor);
      processed.push({ ...r, nextOccurrence: cursor });
    }
  }

  return processed;
}
