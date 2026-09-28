import { findDuplicate, isDuplicate, type DedupeRecord } from '../dedupe';
import { merchantKey, suggestCategoryName } from '../categorize';

const T0 = new Date(2026, 8, 23, 13, 54).getTime();

function record(overrides: Partial<DedupeRecord>): DedupeRecord {
  return {
    id: Math.random().toString(36),
    source: 'sms',
    sender: 'NABIL',
    rawText: 'debited NPR 5300',
    kind: 'expense',
    amount: 5300,
    accountHint: '6334',
    channel: 'FonePay',
    reference: null,
    receivedAt: T0,
    ...overrides,
  };
}

describe('duplicate detection', () => {
  it('matches a bank SMS with the payment-app notification for the same payment', () => {
    const sms = record({ reference: 'FPQR:1300043687' });
    const notif = record({
      source: 'notification',
      sender: 'com.f1soft.esewa',
      rawText: 'Payment successful NPR 5300',
      accountHint: null,
      channel: 'eSewa',
      reference: 'TXN-88A1',
      receivedAt: T0 + 40_000,
    });
    expect(isDuplicate(notif, sms)).toBe(true);
  });

  it('matches on a shared reference even outside the time window', () => {
    const a = record({ reference: 'FPQR:1300043687' });
    const b = record({ source: 'notification', sender: 'app', reference: '1300043687', receivedAt: T0 + 3 * 3600_000 });
    expect(isDuplicate(b, a)).toBe(true);
  });

  it('does not merge two separate same-amount payments from the same sender', () => {
    const a = record({ rawText: 'debited NPR 150 at Cafe', amount: 150 });
    const b = record({ rawText: 'debited NPR 150 at Cafe ref 2', amount: 150, receivedAt: T0 + 5 * 60_000 });
    expect(isDuplicate(b, a)).toBe(false);
  });

  it('treats an identical resend as a duplicate', () => {
    const a = record({});
    expect(isDuplicate(record({ receivedAt: T0 + 30_000 }), a)).toBe(true);
  });

  it('keeps different accounts, amounts, or distant times apart', () => {
    const a = record({ source: 'notification', sender: 'app' });
    expect(isDuplicate(record({ accountHint: '1111' }), a)).toBe(false);
    expect(isDuplicate(record({ amount: 5301 }), a)).toBe(false);
    expect(isDuplicate(record({ receivedAt: T0 + 20 * 60_000 }), a)).toBe(false);
  });

  it('keeps same-sender records with different references apart', () => {
    const a = record({ reference: 'FPQR:1' });
    expect(isDuplicate(record({ reference: 'FPQR:2' }), a)).toBe(false);
  });

  it('findDuplicate returns the matching record', () => {
    const match = record({ source: 'notification', sender: 'app' });
    expect(findDuplicate(record({}), [record({ amount: 1 }), match])).toBe(match);
  });
});

describe('categorization', () => {
  it('suggests built-in categories', () => {
    expect(suggestCategoryName('Bhatbhateni', 'expense')).toBe('Shopping');
    expect(suggestCategoryName('Foodmandu order', 'expense')).toBe('Food & Dining');
    expect(suggestCategoryName('Nepal Telecom topup', 'expense')).toBe('Bills & Utilities');
    expect(suggestCategoryName('salary for September credited', 'income')).toBe('Salary');
    expect(suggestCategoryName('ABC Traders', 'expense')).toBeNull();
  });

  it('normalizes merchant keys', () => {
    expect(merchantKey('  ABC  Store. ')).toBe('abc store');
    expect(merchantKey('abc-store')).toBe('abc store');
  });
});
