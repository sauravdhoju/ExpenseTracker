import { parseMessage } from '../parser';

const RECEIVED = new Date(2026, 8, 23, 13, 54, 0).getTime(); // 2026-09-23 13:54 local

function parse(body: string, title: string | null = null, receivedAt = RECEIVED) {
  return parseMessage({ title, body, receivedAt });
}

describe('parseMessage', () => {
  it('parses the reference FonePay debit SMS', () => {
    const r = parse(
      'Dear user, Your account ##6334 is debited by NPR 5300 on 2026-09-23 13:53:07 by:FonePay:FPQR:1300043687'
    );
    expect(r).toMatchObject({
      kind: 'expense',
      amount: 5300,
      currency: 'NPR',
      accountHint: '6334',
      date: '2026-09-23',
      time: '13:53',
      dateFromMessage: true,
      channel: 'FonePay',
      reference: 'FPQR:1300043687',
      merchant: null,
      confidence: 'high',
    });
  });

  it('detects income', () => {
    const r = parse('Your A/C 0123XXXX6334 has been credited by NPR 25,000.00 on 22/09/2026. Avl Bal NPR 40,120.50');
    expect(r).toMatchObject({ kind: 'income', amount: 25000, accountHint: '6334', date: '2026-09-22', confidence: 'high' });
  });

  it('ignores the available balance when choosing the amount', () => {
    const r = parse('Avl Bal: NPR 90,000. Your a/c ##6334 debited by NPR 1,250.50 for POS purchase at ABC Store');
    expect(r.amount).toBe(1250.5);
    expect(r.merchant).toBe('ABC Store');
  });

  it('detects ATM withdrawals', () => {
    const r = parse('NPR 10000 withdrawn from your a/c ##6334 at ATM Newroad');
    expect(r).toMatchObject({ kind: 'atm_withdrawal', amount: 10000, confidence: 'high' });
  });

  it('detects a wallet notification payment with merchant', () => {
    const r = parse('Payment of Rs. 850 to Bhatbhateni Supermarket successful', 'eSewa');
    expect(r).toMatchObject({ kind: 'expense', amount: 850, channel: 'eSewa', merchant: 'Bhatbhateni', confidence: 'high' });
  });

  it('extracts a free-form merchant', () => {
    const r = parse('You paid NPR 1,850 to ABC Store via FonePay. Txn ID: 9A7F21C3');
    expect(r).toMatchObject({ kind: 'expense', amount: 1850, merchant: 'ABC Store', reference: '9A7F21C3' });
  });

  it('treats transfers as needing review', () => {
    const r = parse('NPR 2000 debited from ##6334 for fund transfer to 0987XXXX1122');
    expect(r).toMatchObject({ kind: 'transfer', amount: 2000, confidence: 'medium' });
  });

  it('detects wallet loads as transfers', () => {
    expect(parse('Wallet load of NPR 1000 from Nabil Bank successful').kind).toBe('transfer');
  });

  it('gives medium confidence to an amount without currency', () => {
    expect(parse('Your account ##6334 debited by 5300').confidence).toBe('medium');
  });

  it.each([
    'Your OTP for transaction of NPR 5000 is 482913. Do not share.',
    'Ram has sent you a payment request of NPR 500',
    'Transaction of NPR 500 failed due to insufficient balance',
    'Your available balance is NPR 12,000 as of 23-09-2026',
    'New login to your mobile banking from a new device',
    'Get 20% cashback up to Rs 200 on your next payment. T&C apply',
    'NPR 1200 will be debited from your account on 2026-10-01 for your loan EMI',
  ])('rejects non-transaction: %s', (body) => {
    const r = parse(body);
    expect(r.kind).toBe('non_transaction');
    expect(r.confidence).toBe('low');
  });

  it('falls back to the arrival date when the message date is implausible (e.g. a BS date)', () => {
    const r = parse('Your a/c ##6334 debited by NPR 500 on 2083-06-07');
    expect(r.date).toBe('2026-09-23');
    expect(r.dateFromMessage).toBe(false);
  });

  it('parses named-month dates and 12h times', () => {
    const r = parse('NPR 450 debited from ##6334 on 21-Sep-2026 04:05 PM');
    expect(r).toMatchObject({ date: '2026-09-21', time: '16:05' });
  });
});

describe('parseMessage account hints', () => {
  it('does not mistake a single-# reference for an account', () => {
    expect(parseMessage({ title: null, body: 'Paid NPR 300 via eSewa. Ref #123456', receivedAt: RECEIVED }).accountHint).toBeNull();
  });
});
